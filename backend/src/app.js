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

// Rafi's Public Event Room router.
//
// We import it here because app.js is the central place
// where the project's API route groups are connected
// to the Express application.
import publicRoomRouter from './routes/publicRoom.routes.js';

import tripRouter from './routes/trip.routes.js';

// Shared image-upload API.
//
// Supabase stores the actual image files.
// MongoDB will continue storing only the resulting URLs.
import uploadRouter from './routes/upload.routes.js';

const app = express();

// Helmet adds several useful HTTP security headers.
app.use(
  helmet()
);

// CORS controls which frontend origin may communicate
// with this backend from the browser.
//
// credentials: true is important because authentication
// uses an HTTP-only cookie.
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
app.use(
  cookieParser()
);

// Morgan prints useful request information while developing.
//
// We skip it during automated tests.
if (
  process.env.NODE_ENV !==
  'test'
) {
  app.use(
    morgan('dev')
  );
}

// Parse JSON request bodies.
//
// Normal Ghuraghuri feature requests continue using JSON.
//
// File uploads are multipart/form-data and are processed
// separately by Multer on the upload route.
app.use(
  express.json({
    limit: '1mb',
  })
);

// Parse URL-encoded form data when necessary.
app.use(
  express.urlencoded({
    extended: true,
  })
);

// ------------------------------------------------------------
// API ROUTES
// ------------------------------------------------------------

// Backend health check.
app.use(
  '/api/v1/health',
  healthRouter
);

// Kusum's hotel APIs.
app.use(
  '/api/v1/hotels',
  hotelRouter
);

// Kusum's hotel booking APIs.
app.use(
  '/api/v1/bookings',
  bookingRouter
);

// Farhan's trip and itinerary APIs.
app.use(
  '/api/v1/trips',
  tripRouter
);

// Rafi's Public Event Room APIs.
//
// All routes inside publicRoomRouter are now available under:
//
// /api/v1/public-rooms
app.use(
  '/api/v1/public-rooms',
  publicRoomRouter
);

// Shared authentication APIs.
app.use(
  '/api/v1/auth',
  authRouter
);

// Shared administrator APIs.
app.use(
  '/api/v1/admin',
  adminRouter
);

// Shared image/file upload APIs.
//
// First implemented use:
//
// POST
// /api/v1/uploads/hotel-images
//
// Other project members can later reuse the shared
// Supabase storage service for their own feature-specific
// upload routes.
app.use(
  '/api/v1/uploads',
  uploadRouter
);

// If no route above matched the request,
// the existing 404 middleware handles it.
app.use(
  notFoundHandler
);

// This must remain last.
//
// Any controller calling:
//
// next(error)
//
// eventually reaches this centralized error handler.
app.use(
  errorHandler
);

export default app;