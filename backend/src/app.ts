import express from 'express';
import cors from 'cors';
import { marketsRouter } from './routes/markets';
import { analysisRouter } from './routes/analysis';
import { tradesRouter } from './routes/trades';
import { snapshotsRouter } from './routes/snapshots';
import { healthRouter } from './routes/health';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.get('/', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Routes
app.use('/api/v1/markets', marketsRouter);
app.use('/api/v1/analysis', analysisRouter);
app.use('/api/v1/trades', tradesRouter);
app.use('/api/v1/snapshots', snapshotsRouter);
app.use('/api/v1/health', healthRouter);

// Error handling
app.use(errorHandler);

export { app };
