// backend/src/app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import authRoutes from './routes/auth.routes';
import challengeRoutes from './routes/challenge.routes';
import submissionRoutes from './routes/submission.routes';
import leaderboardRoutes from './routes/leaderboard.routes';
import announcementRoutes from './routes/announcement.routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// Comma-separated list in the env var, e.g.:
// FRONTEND_URL=https://frontend-8jdqsb88r-athae.vercel.app,http://localhost:3000
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // No origin header = same-origin/non-browser request (curl, health checks) — allow it.
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
};

app.use(helmet());
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // explicit preflight handler — this is what fixes the 404 on OPTIONS
app.use(morgan('dev'));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/announcements', announcementRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use(errorHandler);

export default app;