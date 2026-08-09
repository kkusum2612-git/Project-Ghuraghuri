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

/*
 * Rafi Feature 4 - AI Travel Planner.
 *
 * This router contains the Premium-only AI travel-plan APIs.
 *
 * The route itself checks:
 *
 * - whether the user is logged in,
 * - whether the user is a traveler.
 *
 * The controller performs another important check:
 *
 * - whether the traveler has an active PremiumMembership.
 *
 * Only after those checks can the backend call Groq.
 */
import aiTravelPlanRouter from './routes/aiTravelPlan.routes.js';

import authRouter from './routes/auth.routes.js';
import bookingRouter from './routes/booking.routes.js';
import healthRouter from './routes/health.routes.js';
import hotelRouter from './routes/hotel.routes.js';
import hotelReviewRouter from './routes/hotelReview.routes.js';

/*
 * Kusum Feature 3 - Payment Gateway.
 *
 * This router contains:
 *
 * - authenticated traveler payment APIs
 * - SSLCOMMERZ sandbox callback APIs
 * - traveler payment-history API
 */
import paymentRouter from './routes/payment.routes.js';

/*
 * Rafi Feature 3 - Premium Membership and Reward Points.
 *
 * This router owns traveler Premium/reward APIs.
 *
 * It is intentionally separate from Kusum's/Fatema's existing
 * booking-payment router because a Premium membership purchase
 * is not a hotel or guide booking.
 */
import premiumRouter from './routes/premium.routes.js';

// Rafi's Public Event Room router.
//
// We import it here because app.js is the central place
// where the project's API route groups are connected
// to the Express application.
import publicRoomRouter from './routes/publicRoom.routes.js';

import publicRoomChatRouter from './routes/publicRoomChat.routes.js';

import tripRouter from './routes/trip.routes.js';
import guideRouter from './routes/guide.routes.js';

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
//
// This is especially important for Kusum's SSLCOMMERZ
// callbacks because the payment gateway sends callback
// information as application/x-www-form-urlencoded data.
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

/*
 * Kusum Hotel Reviews & Ratings APIs.
 *
 * Examples:
 *
 * POST /api/v1/reviews
 * GET  /api/v1/reviews/hotel/:hotelId
 * GET  /api/v1/reviews/traveler/me
 * GET  /api/v1/reviews/vendor/me
 */
app.use(
  '/api/v1/reviews',
  hotelReviewRouter
);

/*
 * Kusum Feature 3 - payment APIs.
 *
 * Examples:
 *
 * POST /api/v1/payments/hotel/:bookingId/initiate
 * GET  /api/v1/payments/traveler/me
 *
 * SSLCOMMERZ callbacks:
 *
 * POST /api/v1/payments/sslcommerz/success
 * POST /api/v1/payments/sslcommerz/fail
 * POST /api/v1/payments/sslcommerz/cancel
 * POST /api/v1/payments/sslcommerz/ipn
 */
app.use(
  '/api/v1/payments',
  paymentRouter
);

/*
 * Rafi Feature 3 - Premium Membership and Reward Points APIs.
 *
 * Example:
 *
 * GET /api/v1/premium/me
 *
 * Premium account-upgrade and reward endpoints added later will
 * also live under this same route group.
 *
 * This route is separate from /api/v1/payments, so adding Rafi's
 * feature does not alter the behavior of existing booking
 * payments.
 */
app.use(
  '/api/v1/premium',
  premiumRouter
);

/*
 * Rafi Feature 4 - AI Travel Planner APIs.
 *
 * Examples:
 *
 * POST /api/v1/ai/travel-plan
 *
 * Generates a new AI travel plan for an authenticated Premium
 * traveler.
 *
 * GET /api/v1/ai/travel-plan/:planId
 *
 * Reloads one of that traveler's previously generated plans.
 *
 * Important:
 *
 * This route group does NOT expose the Groq API key.
 * React only talks to our Express backend.
 *
 * The Express backend then talks to Groq using the private
 * GROQ_API_KEY stored inside backend/.env.
 */
app.use(
  '/api/v1/ai/travel-plan',
  aiTravelPlanRouter
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

// Farhan - Public Event Room group chat APIs.
app.use(
  '/api/v1/public-room-chat',
  publicRoomChatRouter
);

// Shared authentication APIs.
app.use(
  '/api/v1/auth',
  authRouter
);
// Tafsir Feature 1 - guide profile, tour package,
// and public guide listing APIs.
app.use(
  '/api/v1/guides',
  guideRouter
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