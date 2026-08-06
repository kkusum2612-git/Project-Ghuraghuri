import 'dotenv/config';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import healthRouter from './routes/health.routes.js';
import authRouter from './routes/auth.routes.js';
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

// Read cookies sent by the browser and make them available through
// req.cookies inside controllers and middleware.
//
// We do not give cookie-parser a separate signing secret because our
// authentication cookie contains a JWT that is already cryptographically
// signed and verified by token.service.js.
app.use(cookieParser());

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/v1/health', healthRouter);
app.use('/api/v1/hotels', hotelRouter);
app.use('/api/v1/bookings', bookingRouter);

// Mount every authentication endpoint under /api/v1/auth.
//
// Because auth.routes.js defines "/register", the complete route becomes:
// POST /api/v1/auth/register
app.use('/api/v1/auth', authRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
