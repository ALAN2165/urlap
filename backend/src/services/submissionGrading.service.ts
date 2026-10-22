import { prisma } from '../config/db';
import { gradeSqlSubmission } from './sqlGrader.service';
import { checkForStruggleAlert } from './alertDetection.service';

async function recordCompletion(userId: string, challengeId: string, points: number): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const { count } = await tx.challengeCompletion.createMany({ data: [{ userId, challengeId, pointsEarned: points }], skipDuplicates: true });
    if (count === 0) return 0;
    await tx.user.update({ where: { id: userId }, data: { totalPoints: { increment: points } } });
    return points;
  });
}

/**
 * Grades one stored submission and writes the result. Never throws: any failure is saved as RUNTIME_ERROR.
 * SQL goes straight to the transactional sandbox engine (no Docker, no queue). Docker is only loaded for other languages.
 */
export async function gradeSubmissionById(submissionId: string): Promise<void> {
  try {
    const sub = await prisma.submission.findUniqueOrThrow({
      where: { id: submissionId },
      select: { userId: true, challengeId: true, language: true, code: true },
    });
    const challenge = await prisma.challenge.findUniqueOrThrow({ where: { id: sub.challengeId }, include: { testCases: true } });
    await prisma.submission.update({ where: { id: submissionId }, data: { status: 'RUNNING' } });

    let status: string;
    let allPassed: boolean;
    let output = '';
    let errorMsg = '';
    let runtimeMs = 0;
    let resultJson: string | null = null;

    if (sub.language === 'SQL') {
      const result = await gradeSqlSubmission(challenge, sub.code);
      status = result.status;
      allPassed = result.passed;
      output = result.output;
      errorMsg = result.errorMessage;
      runtimeMs = result.runtimeMs;
      resultJson = JSON.stringify({
        columns: result.resultColumns, rows: result.resultRows, totalRows: result.totalRows,
        expectedRowCount: result.expectedRowCount, failureReason: result.failureReason, panels: result.panels,
      });
    } else {
      const { runInSandbox } = await import('./sandbox/dockerRunner');
      allPassed = true;
      status = 'ACCEPTED';
      for (const testCase of challenge.testCases) {
        const result = await runInSandbox(sub.language as any, sub.code, testCase.input, challenge.timeLimitMs, challenge.memoryLimitMb);
        runtimeMs += result.runtimeMs;
        output = result.stdout;
        errorMsg = result.stderr;
        if (result.timedOut) { status = 'TIME_LIMIT_EXCEEDED'; allPassed = false; break; }
        if (result.exitCode !== 0) { status = 'RUNTIME_ERROR'; allPassed = false; break; }
        if (result.stdout.trim() !== testCase.expectedOutput.trim()) { status = 'WRONG_ANSWER'; allPassed = false; break; }
      }
    }

    const pointsAwarded = allPassed ? await recordCompletion(sub.userId, sub.challengeId, challenge.points) : 0;

    await prisma.submission.update({
      where: { id: submissionId },
      data: { status: status as any, actualOutput: output, errorMessage: errorMsg || null, resultJson, runtimeMs, pointsAwarded },
    });

    try {
      await checkForStruggleAlert(sub.userId, sub.challengeId, status);
    } catch (alertErr) {
      console.error(`[grading] Struggle-alert check failed for submission ${submissionId}:`, alertErr);
    }
  } catch (err: any) {
    console.error(`[grading] Submission ${submissionId} crashed:`, err);
    await prisma.submission
      .update({ where: { id: submissionId }, data: { status: 'RUNTIME_ERROR', errorMessage: err?.message || 'Internal grading error.', pointsAwarded: 0 } })
      .catch((updateErr) => console.error('[grading] Even the failure-update failed:', updateErr));
  }
}