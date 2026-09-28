import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { runInSandbox } from '../services/sandbox/dockerRunner';
import { runSqlGraded } from '../services/sqlGrader.service';
import { prisma } from '../config/db';
import { ExecutionJobData } from './executionQueue';

// Atomic "insert completion if absent + award points". createMany/skipDuplicates
// reports whether a row was really created, so points are awarded exactly once,
// even if two submissions for the same challenge finish at the same moment.
async function recordCompletion(userId: string, challengeId: string, points: number): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const { count } = await tx.challengeCompletion.createMany({
      data: [{ userId, challengeId, pointsEarned: points }],
      skipDuplicates: true,
    });
    if (count === 0) return 0;
    await tx.user.update({ where: { id: userId }, data: { totalPoints: { increment: points } } });
    return points;
  });
}

const worker = new Worker<ExecutionJobData>(
  'code-execution',
  async (job: Job<ExecutionJobData>) => {
    const { submissionId, challengeId, userId, language, code } = job.data;

    try {
      const challenge = await prisma.challenge.findUniqueOrThrow({
        where: { id: challengeId },
        include: { testCases: true },
      });

      await prisma.submission.update({ where: { id: submissionId }, data: { status: 'RUNNING' } });

      let status: string;
      let allPassed: boolean;
      let output = '';
      let errorMsg = '';
      let runtimeMs = 0;
      let resultJson: string | null = null;

      if (language === 'SQL' && challenge.referenceAnswer) {
        const result = await runSqlGraded(challenge.referenceAnswer, code);
        status = result.status;
        allPassed = result.passed;
        output = result.output;
        errorMsg = result.errorMessage;
        runtimeMs = result.runtimeMs;
        resultJson = JSON.stringify({
          columns: result.resultColumns,
          rows: result.resultRows,
          totalRows: result.totalRows,
          expectedRowCount: result.expectedRowCount,
          failureReason: result.failureReason,
        });
      } else {
        allPassed = true;
        status = 'ACCEPTED';
        for (const testCase of challenge.testCases) {
          const result = await runInSandbox(language, code, testCase.input, challenge.timeLimitMs, challenge.memoryLimitMb);
          runtimeMs += result.runtimeMs;
          output = result.stdout;
          errorMsg = result.stderr;
          if (result.timedOut) { status = 'TIME_LIMIT_EXCEEDED'; allPassed = false; break; }
          if (result.exitCode !== 0) { status = 'RUNTIME_ERROR'; allPassed = false; break; }
          if (result.stdout.trim() !== testCase.expectedOutput.trim()) { status = 'WRONG_ANSWER'; allPassed = false; break; }
        }
      }

      const pointsAwarded = allPassed ? await recordCompletion(userId, challengeId, challenge.points) : 0;

      await prisma.submission.update({
        where: { id: submissionId },
        data: {
          status: status as any,
          actualOutput: output,
          errorMessage: errorMsg || null,
          resultJson,
          runtimeMs,
          pointsAwarded,
        },
      });
    } catch (err: any) {
      // Whatever breaks above, the submission row must always be resolved,
      // otherwise the frontend would poll a row that never changes.
      console.error(`Execution job crashed for submission ${submissionId}:`, err);
      await prisma.submission
        .update({
          where: { id: submissionId },
          data: { status: 'RUNTIME_ERROR', errorMessage: err.message || 'Internal execution error.', pointsAwarded: 0 },
        })
        .catch((updateErr) => console.error('Even the failure-update failed:', updateErr));
    }
  },
  { connection: redisConnection, concurrency: 4 }
);

worker.on('failed', (job, err) => console.error(`Job ${job?.id} failed:`, err));
worker.on('error', (err) => console.error('Worker connection error. Check that Redis is running:', err));

export default worker;