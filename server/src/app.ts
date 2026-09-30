import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { authRouter } from './routes/auth';
import { requestsRouter } from './routes/requests';

dotenv.config();

export const app = express();

app.use(cors());
app.use(express.json());

// Basic health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'client-request-desk-api',
  });
});

// Authentication routes
app.use('/api/auth', authRouter);

// Customer Requests routes
app.use('/api/requests', requestsRouter);

// Centralized error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal server error occurred.',
    },
  });
});
