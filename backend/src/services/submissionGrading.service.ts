import { prisma } from '../config/db';
import { gradeSqlSubmission } from './sqlGrader.service';
import { checkForStruggleAlert } from './alertDetection.service';

interface Award { base: number; penalty: number; net: number; firstSolve: boolean }

/** Sum of the point penalties of every hint this student has unlocked on this challenge (persisted in HintUsage). */
async function hintPenaltyFor(userId: string, challengeId: string): Promise<number> {
  const usages = await prisma.hintUsage.findMany({
    where: { userId, hint: { challengeId } },
    select: { hint: { select: { pointPenalty: true } } },
  });
  return usages.reduce((sum, u) => sum + u.hint.pointPenalty, 0);
}

/** Records the first solve and adds the NET points (base minus hint penalties, never below 0) to the student's total.
 *  A second solve of the same challenge awards nothing: the unique (user, challenge) record prevents point farming. */
async function recordCompletion(userId: string, challengeId: string, base: number): Promise<Award> {
  const penalty = await hintPenaltyFor(userId, challengeId);
  const net = Math.max(0, base - penalty);

  const firstSolve = await prisma.$transaction(async (tx) => {
    const { count } = await tx.challengeCompletion.createMany({ data: [{ userId, challengeId, pointsEarned: net }], skipDuplicates: true });
    if (count === 0) return false;
    if (net > 0) await tx.user.update({ where: { id: userId }, data: { totalPoints: { increment: net } } });
    return true;
  });

  return { base, penalty, net, firstSolve };
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
    let resultObj: Record<string, unknown> = {};

    if (sub.language === 'SQL') {
      const result = await gradeSqlSubmission(challenge, sub.code);
      status = result.status;
      allPassed = result.passed;
      output = result.output;
      errorMsg = result.errorMessage;
      runtimeMs = result.runtimeMs;
      resultObj = {
        columns: result.resultColumns, rows: result.resultRows, totalRows: result.totalRows,
        expectedRowCount: result.expectedRowCount, failureReason: result.failureReason, panels: result.panels,
      };
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

    const award = allPassed ? await recordCompletion(sub.userId, sub.challengeId, challenge.points) : null;
    const pointsAwarded = award && award.firstSolve ? award.net : 0;

    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        status: status as any,
        actualOutput: output,
        errorMessage: errorMsg || null,
        resultJson: JSON.stringify({ ...resultObj, award }),
        runtimeMs,
        pointsAwarded,
      },
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