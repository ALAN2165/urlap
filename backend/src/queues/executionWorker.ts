import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { ExecutionJobData } from './executionQueue';
import { gradeSubmissionById } from '../services/submissionGrading.service';

// Only non-SQL submissions reach this queue now; SQL is graded inline in the request.
const worker = new Worker<ExecutionJobData>(
  'code-execution',
  async (job: Job<ExecutionJobData>) => {
    console.log(`[worker] Job received — job ${job.id}, submission ${job.data.submissionId}`);
    await gradeSubmissionById(job.data.submissionId);
  },
  { connection: redisConnection, concurrency: 4 }
);

worker.on('failed', (job, err) => console.error(`[worker] Job ${job?.id} failed:`, err));
worker.on('error', (err) => console.error('[worker] Connection error — check that Redis is running:', err));

export default worker;