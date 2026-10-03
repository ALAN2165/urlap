import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';

export interface AnnouncementEmailJobData {
  to: string;
  username: string;
  locale: 'en' | 'ar';
  title: string;
  content: string;
  type: string;
}

export const announcementEmailQueue = new Queue<AnnouncementEmailJobData>('announcement-email', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 200,
    removeOnFail: 500,
  },
});

export async function enqueueAnnouncementEmail(data: AnnouncementEmailJobData) {
  return announcementEmailQueue.add('send-announcement-email', data);
}