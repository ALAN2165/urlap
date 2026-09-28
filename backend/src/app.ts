// backend/src/app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import authRoutes from './routes/auth.routes';
import challengeRoutes from './routes/challenge.routes';
import submissionRoutes from './routes/submission.routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(helmet());

// الدومينات المسموح لها بالتواصل مع الباك إند
const allowedOrigins = [
  'https://urlap.com',
  'https://www.urlap.com',
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:3001'
].filter(Boolean); // لتصفية أي قيم undefined

// backend/src/app.ts
app.use(
  cors({
    origin: (origin, callback) => {
      // السماح بالطلبات اللي ملهاش origin زي Postman أو الـ Mobile Apps
      if (!origin) return callback(null, true);
      
      // السماح لأي رابط Vercel أو Localhost أو الدومين الأساسي بتاعك
      if (
        origin.endsWith('.vercel.app') ||
        origin === 'https://urlap.com' ||
        origin === 'https://www.urlap.com' ||
        origin.startsWith('http://localhost:')
      ) {
        return callback(null, true);
      }
      
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

app.use(morgan('dev'));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/submissions', submissionRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use(errorHandler);

export default app;