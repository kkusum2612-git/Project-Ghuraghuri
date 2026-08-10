import 'dotenv/config';

import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import {
  errorHandler,
  notFoundHandler,
} from './middleware/error.middleware.js';

import adminRouter from './routes/admin.routes.js';
import authRouter from './routes/auth.routes.js';
import bookingRouter from './routes/booking.routes.js';
import healthRouter from './routes/health.routes.js';
import hotelRouter from './routes/hotel.routes.js';
import tripRouter from './routes/trip.routes.js';

const app = express();

app.use(helmet());

app.use(
  cors({
    origin:
      process.env.CLIENT_URL ||
      'http://localhost:5173',
    credentials: true,
  })
);

// Read cookies sent by the browser and make them
// available through req.cookies.
app.use(cookieParser());

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

app.use(
  express.json({
    limit: '1mb',
  })
);

app.use(
  express.urlencoded({
    extended: true,
  })
);

app.use(
  '/api/v1/health',
  healthRouter
);

app.use(
  '/api/v1/hotels',
  hotelRouter
);

app.use(
  '/api/v1/bookings',
  bookingRouter
);

app.use(
  '/api/v1/trips',
  tripRouter
);

app.use(
  '/api/v1/auth',
  authRouter
);

app.use(
  '/api/v1/admin',
  adminRouter
);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;