import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { sendAnnouncementEmail } from '../services/email.service';
import { AnnouncementEmailJobData } from './announcementEmailQueue';

const worker = new Worker<AnnouncementEmailJobData>(
  'announcement-email',
  async (job: Job<AnnouncementEmailJobData>) => {
    const { to, username, locale, title, content, type } = job.data;
    await sendAnnouncementEmail(to, username, locale, title, content, type);
  },
  { connection: redisConnection, concurrency: 3 } // gentle on Resend's rate limit
);

worker.on('failed', (job, err) => console.error(`Announcement email job ${job?.id} failed:`, err));

export default worker;