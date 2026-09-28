// backend/src/queues/executionQueue.ts

import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';

export interface ExecutionJobData {
  submissionId: string;
  challengeId: string;
  userId: string;
  language: string;
  code: string;
}

export const executionQueue = new Queue<ExecutionJobData>('code-execution', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 1, // don't auto-retry untrusted code
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

export async function enqueueExecution(data: ExecutionJobData) {
  return executionQueue.add('run-submission', data, {
    // small buffer so one user can't flood the queue
    jobId: data.submissionId,
  });
}