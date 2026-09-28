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

// السماح بالدومينات المحددة أو أي رابط على Vercel أو Localhost
app.use(cors({
  origin: (origin, callback) => {
    // السماح للطلبات التي ليس لها origin مثل Postman أو Mobile Apps
    if (!origin) return callback(null, true);

    if (
      origin.endsWith('.vercel.app') ||
      origin === 'https://urlap.com' ||
      origin === 'https://www.urlap.com' ||
      origin.startsWith('http://localhost:')
    ) {
      return callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(morgan('dev'));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/submissions', submissionRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use(errorHandler);

export default app;