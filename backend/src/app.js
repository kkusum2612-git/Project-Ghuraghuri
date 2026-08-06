import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import healthRouter from './routes/health.routes.js';
import hotelRouter from './routes/hotel.routes.js';
import bookingRouter from './routes/booking.routes.js';

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/v1/health', healthRouter);
app.use('/api/v1/hotels', hotelRouter);
app.use('/api/v1/bookings', bookingRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
