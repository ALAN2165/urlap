import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import authRoutes from './routes/auth.routes';
import challengeRoutes from './routes/challenge.routes';
import submissionRoutes from './routes/submission.routes';
import leaderboardRoutes from './routes/leaderboard.routes';
import announcementRoutes from './routes/announcement.routes';
import adminRoutes from './routes/admin.routes';
import playgroundRoutes from './routes/playground.routes';
import reportRoutes from './routes/report.routes';
import conversationRoutes from './routes/conversation.routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .replace(/['"]/g, '') // إزالة علامات التنصيص لو اتكتبت بالغلط
  .split(',')
  .map((s) => s.trim().replace(/\/$/, '')) // إزالة الشرطة المايلة من آخر الرابط
  .filter(Boolean);

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // تنظيف الـ origin اللي جاي من البراوزر للمقارنة
    const cleanOrigin = origin ? origin.replace(/\/$/, '') : '';
    
    if (!origin || allowedOrigins.includes(cleanOrigin)) {
      callback(null, true);
    } else {
      // السطر ده هيطبعلك في اللوجز الرابط اللي مرفوض والرابط المسموح بيه عشان تعرف الفرق بعينك
      console.error(`[CORS Blocked] Origin received: '${origin}' | Allowed list:`, allowedOrigins);
      callback(new Error('Not allowed by CORS'));
    }
  },
};


app.use(helmet());
app.use(cors(corsOptions));
app.use(morgan('dev'));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/playground', playgroundRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/conversations', conversationRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use(errorHandler);

export default app;