import { randomBytes } from 'node:crypto';

import mongoose from 'mongoose';

import Booking from '../models/booking.model.js';
import Hotel from '../models/hotel.model.js';
import Payment from '../models/payment.model.js';

import {
  createPaymentSession,
  validatePayment,
} from '../services/sslcommerz.service.js';

/*
 * ------------------------------------------------------------
 * PAYMENT CONTROLLER
 * ------------------------------------------------------------
 *
 * This controller contains Ghuraghuri's payment business logic.
 *
 * Responsibilities:
 *
 * - check booking ownership
 * - create Payment documents
 * - generate transaction IDs
 * - call the SSLCOMMERZ service
 * - process gateway callbacks
 * - validate successful payments
 * - update Payment.status
 * - update Booking.paymentStatus
 * - return traveler payment history
 *
 * Gateway-specific HTTP communication remains inside:
 *
 * sslcommerz.service.js
 */

// ------------------------------------------------------------
// GENERAL HELPERS
// ------------------------------------------------------------

function createHttpError(message, statusCode) {
  const error = new Error(message);

  error.statusCode = statusCode;

  return error;
}

/*
 * Validate IDs before querying MongoDB.
 *
 * This prevents invalid values from causing Mongoose CastErrors.
 */
function validateObjectId(id, fieldName) {
  if (!mongoose.isValidObjectId(id)) {
    throw createHttpError(
      `${fieldName} is invalid.`,
      400
    );
  }
}

/*
 * ------------------------------------------------------------
 * TRANSACTION ID
 * ------------------------------------------------------------
 *
 * SSLCOMMERZ allows a transaction ID with a maximum length
 * of 30 characters.
 *
 * We generate this value on the backend.
 *
 * The frontend never chooses a transaction ID.
 */
function generateTransactionId() {
  const timePart =
    Date.now().toString(36);

  const randomPart =
    randomBytes(5).toString('hex');

  return `GH${timePart}${randomPart}`;
}

/*
 * ------------------------------------------------------------
 * FRONTEND RETURN URL
 * ------------------------------------------------------------
 *
 * After SSLCOMMERZ posts its payment result to our backend,
 * the backend sends the browser back to the existing
 * traveler Bookings page.
 *
 * Example:
 *
 * /bookings?payment=success&transactionId=GH...
 *
 * This is cleaner than creating a disconnected payment-result
 * page because the traveler can immediately see the updated
 * payment status beside the booking.
 */
function getClientUrl() {
  const clientUrl =
    process.env.CLIENT_URL?.trim() ||
    'http://localhost:5173';

  return clientUrl.replace(/\/+$/, '');
}

function redirectToBookings(
  res,
  status,
  transactionId = ''
) {
  const bookingsUrl = new URL(
    '/bookings',
    `${getClientUrl()}/`
  );

  bookingsUrl.searchParams.set(
    'payment',
    status
  );

  if (transactionId) {
    bookingsUrl.searchParams.set(
      'transactionId',
      transactionId
    );
  }

  /*
   * SSLCOMMERZ normally POSTs to our callback.
   *
   * 303 tells the browser to follow the redirect using
   * a normal GET request.
   */
  return res.redirect(
    303,
    bookingsUrl.toString()
  );
}

/*
 * Compare money values safely using two decimal places.
 */
function amountsMatch(
  firstAmount,
  secondAmount
) {
  const first =
    Number(firstAmount);

  const second =
    Number(secondAmount);

  if (
    !Number.isFinite(first) ||
    !Number.isFinite(second)
  ) {
    return false;
  }

  return (
    Math.round(first * 100) ===
    Math.round(second * 100)
  );
}

/*
 * ------------------------------------------------------------
 * LOAD PAYMENT
 * ------------------------------------------------------------
 *
 * SSLCOMMERZ callback requests do not contain our user's
 * authentication cookie.
 *
 * Therefore callback processing identifies the payment by the
 * transaction ID created by Ghuraghuri.
 */
async function findPaymentByTransactionId(
  transactionId
) {
  if (
    typeof transactionId !== 'string' ||
    !transactionId.trim()
  ) {
    throw createHttpError(
      'Payment transaction ID is required.',
      400
    );
  }

  const payment =
    await Payment.findOne({
      transactionId:
        transactionId.trim(),
    });

  if (!payment) {
    throw createHttpError(
      'Payment transaction was not found.',
      404
    );
  }

  return payment;
}

/*
 * ------------------------------------------------------------
 * BOOKING PAYMENT STATUS
 * ------------------------------------------------------------
 *
 * Never downgrade an already-paid booking because a later
 * failed/cancelled callback from another attempt arrives.
 */
async function markBookingPaymentFailed(
  payment
) {
  await Booking.updateOne(
    {
      _id: payment.bookingId,

      paymentStatus: {
        $ne: 'paid',
      },
    },
    {
      $set: {
        paymentStatus: 'failed',
      },
    }
  );
}

async function markBookingPaymentUnpaid(
  payment
) {
  await Booking.updateOne(
    {
      _id: payment.bookingId,

      paymentStatus: {
        $ne: 'paid',
      },
    },
    {
      $set: {
        paymentStatus: 'unpaid',
      },
    }
  );
}

/*
 * ------------------------------------------------------------
 * SUCCESSFUL PAYMENT VERIFICATION
 * ------------------------------------------------------------
 *
 * This helper is used by both the browser success callback
 * and the server-to-server IPN callback.
 *
 * The logic is idempotent:
 *
 * if the transaction has already been marked paid, receiving
 * the same successful information again does not create
 * another payment or change it incorrectly.
 */
async function verifyAndCompletePayment({
  transactionId,
  validationId,
}) {
  const payment =
    await findPaymentByTransactionId(
      transactionId
    );

  if (payment.status === 'paid') {
    return payment;
  }

  if (
    typeof validationId !== 'string' ||
    !validationId.trim()
  ) {
    throw createHttpError(
      'Payment validation ID is required.',
      400
    );
  }

  /*
   * Ask SSLCOMMERZ for authoritative transaction data.
   */
  const validation =
    await validatePayment(
      validationId.trim()
    );

  const successfulStatuses =
    new Set([
      'VALID',
      'VALIDATED',
    ]);

  if (
    !successfulStatuses.has(
      validation.status
    )
  ) {
    throw createHttpError(
      'SSLCOMMERZ did not validate this transaction as successful.',
      400
    );
  }

  /*
   * Security check 1:
   * gateway transaction ID must match our transaction.
   */
  if (
    validation.tran_id !==
    payment.transactionId
  ) {
    throw createHttpError(
      'Payment transaction ID validation failed.',
      400
    );
  }

  /*
   * Security check 2:
   * gateway amount must match our stored payment amount.
   */
  if (
    !amountsMatch(
      validation.amount,
      payment.amount
    )
  ) {
    throw createHttpError(
      'Payment amount validation failed.',
      400
    );
  }

  /*
   * Security check 3:
   * this Ghuraghuri payment flow currently uses BDT.
   */
  if (
    String(validation.currency)
      .toUpperCase() !== 'BDT'
  ) {
    throw createHttpError(
      'Payment currency validation failed.',
      400
    );
  }

  /*
   * Security check 4:
   * verify the underlying booking still exists and belongs
   * to the expected traveler and provider.
   */
  const booking =
    await Booking.findOne({
      _id: payment.bookingId,
      travelerId: payment.travelerId,
      vendorId: payment.providerId,
    });

  if (!booking) {
    throw createHttpError(
      'The booking linked to this payment could not be verified.',
      404
    );
  }

  /*
   * Security check 5:
   * Payment.amount must still match Booking.totalPrice.
   */
  if (
    !amountsMatch(
      booking.totalPrice,
      payment.amount
    )
  ) {
    throw createHttpError(
      'Booking total no longer matches the payment amount.',
      400
    );
  }

  /*
   * Save useful gateway reconciliation information.
   *
   * Sensitive card/banking credentials are never stored.
   */
  payment.status = 'paid';

  payment.gatewayValidationId =
    validation.val_id ||
    validationId;

  payment.gatewayBankTransactionId =
    validation.bank_tran_id ||
    null;

  payment.gatewayStatus =
    validation.status;

  payment.paidAt =
    payment.paidAt ||
    new Date();

  await payment.save();

  /*
   * Reservation state and payment state remain independent.
   *
   * Example:
   *
   * bookingStatus = pending
   * paymentStatus = paid
   */
  booking.paymentStatus = 'paid';

  await booking.save();

  return payment;
}

// ------------------------------------------------------------
// 1. INITIATE HOTEL PAYMENT
// ------------------------------------------------------------

async function initiateHotelPayment(
  req,
  res,
  next
) {
  try {
    const { bookingId } =
      req.params;

    validateObjectId(
      bookingId,
      'Booking ID'
    );

    /*
     * Traveler ownership protection.
     */
    const booking =
      await Booking.findOne({
        _id: bookingId,
        travelerId:
          req.user._id,
      });

    if (!booking) {
      throw createHttpError(
        'Hotel booking not found.',
        404
      );
    }

    /*
     * Prevent duplicate payment of an already-paid booking.
     */
    if (
      booking.paymentStatus ===
      'paid'
    ) {
      throw createHttpError(
        'This booking has already been paid.',
        409
      );
    }

    /*
     * These reservation states should not begin checkout.
     */
    const nonPayableBookingStatuses =
      new Set([
        'declined',
        'cancelled',
        'completed',
      ]);

    if (
      nonPayableBookingStatuses.has(
        booking.bookingStatus
      )
    ) {
      throw createHttpError(
        `A ${booking.bookingStatus} booking cannot be paid.`,
        409
      );
    }

    /*
     * Load the hotel for SSLCOMMERZ travel metadata.
     */
    const hotel =
      await Hotel.findById(
        booking.hotelId
      ).select(
        'name location.city'
      );

    if (!hotel) {
      throw createHttpError(
        'The hotel linked to this booking could not be found.',
        404
      );
    }

    const transactionId =
      generateTransactionId();

    /*
     * Create our trusted Payment record before contacting
     * SSLCOMMERZ.
     */
    const payment =
      await Payment.create({
        bookingType: 'hotel',

        bookingId:
          booking._id,

        travelerId:
          req.user._id,

        providerId:
          booking.vendorId,

        /*
         * Amount comes from MongoDB.
         *
         * The frontend cannot choose the payment amount.
         */
        amount:
          booking.totalPrice,

        currency: 'BDT',

        gateway:
          'sslcommerz',

        transactionId,

        status:
          'initiated',
      });

    let gatewaySession;

    try {
      gatewaySession =
        await createPaymentSession({
          transactionId:
            payment.transactionId,

          amount:
            payment.amount,

          customer: {
            name:
              req.user.name,

            email:
              req.user.email,

            phone:
              req.user.phone,
          },

          booking: {
            id:
              booking._id.toString(),

            hotelName:
              booking.hotelName ||
              hotel.name,

            hotelCity:
              hotel.location.city,

            numberOfNights:
              booking.numberOfNights,
          },
        });
    } catch (error) {
      /*
       * The local attempt exists, but no usable gateway session
       * could be created.
       */
      payment.status =
        'failed';

      payment.gatewayStatus =
        'SESSION_INIT_FAILED';

      payment.failedAt =
        new Date();

      await payment.save();

      throw error;
    }

    payment.gatewaySessionKey =
      gatewaySession.sessionKey;

    await payment.save();

    /*
     * React will redirect the browser to gatewayPageUrl.
     */
    res.status(201).json({
      success: true,

      message:
        'Payment session created successfully.',

      data: {
        payment: {
          id:
            payment._id,

          bookingType:
            payment.bookingType,

          bookingId:
            payment.bookingId,

          transactionId:
            payment.transactionId,

          amount:
            payment.amount,

          currency:
            payment.currency,

          status:
            payment.status,

          gateway:
            payment.gateway,
        },

        gatewayPageUrl:
          gatewaySession.gatewayPageUrl,
      },
    });
  } catch (error) {
    next(error);
  }
}

// ------------------------------------------------------------
// 2. SSLCOMMERZ SUCCESS CALLBACK
// ------------------------------------------------------------

async function handleSslcommerzSuccess(
  req,
  res,
  next
) {
  try {
    const transactionId =
      req.body?.tran_id;

    const validationId =
      req.body?.val_id;

    const payment =
      await verifyAndCompletePayment({
        transactionId,
        validationId,
      });

    return redirectToBookings(
      res,
      'success',
      payment.transactionId
    );
  } catch (error) {
    next(error);
  }
}

// ------------------------------------------------------------
// 3. SSLCOMMERZ FAILURE CALLBACK
// ------------------------------------------------------------

async function handleSslcommerzFailure(
  req,
  res,
  next
) {
  try {
    const transactionId =
      req.body?.tran_id;

    const payment =
      await findPaymentByTransactionId(
        transactionId
      );

    /*
     * Never downgrade a validated successful transaction.
     */
    if (
      payment.status !== 'paid'
    ) {
      payment.status =
        'failed';

      payment.gatewayStatus =
        req.body?.status ||
        'FAILED';

      payment.failedAt =
        payment.failedAt ||
        new Date();

      await payment.save();

      await markBookingPaymentFailed(
        payment
      );
    }

    return redirectToBookings(
      res,
      'failed',
      payment.transactionId
    );
  } catch (error) {
    next(error);
  }
}

// ------------------------------------------------------------
// 4. SSLCOMMERZ CANCELLATION CALLBACK
// ------------------------------------------------------------

async function handleSslcommerzCancellation(
  req,
  res,
  next
) {
  try {
    const transactionId =
      req.body?.tran_id;

    const payment =
      await findPaymentByTransactionId(
        transactionId
      );

    if (
      payment.status !== 'paid'
    ) {
      payment.status =
        'cancelled';

      payment.gatewayStatus =
        req.body?.status ||
        'CANCELLED';

      payment.cancelledAt =
        payment.cancelledAt ||
        new Date();

      await payment.save();

      /*
       * Booking.paymentStatus has no cancelled value.
       *
       * The booking remains payable, so its payment status
       * becomes unpaid again.
       */
      await markBookingPaymentUnpaid(
        payment
      );
    }

    return redirectToBookings(
      res,
      'cancelled',
      payment.transactionId
    );
  } catch (error) {
    next(error);
  }
}

// ------------------------------------------------------------
// 5. SSLCOMMERZ IPN
// ------------------------------------------------------------

async function handleSslcommerzIpn(
  req,
  res,
  next
) {
  try {
    const transactionId =
      req.body?.tran_id;

    const validationId =
      req.body?.val_id;

    const gatewayStatus =
      String(
        req.body?.status || ''
      ).toUpperCase();

    /*
     * A successful notification still requires validation.
     */
    if (
      validationId &&
      (
        gatewayStatus === 'VALID' ||
        gatewayStatus === 'VALIDATED'
      )
    ) {
      const payment =
        await verifyAndCompletePayment({
          transactionId,
          validationId,
        });

      return res.status(200).json({
        success: true,

        message:
          'Successful payment notification processed.',

        data: {
          transactionId:
            payment.transactionId,

          status:
            payment.status,
        },
      });
    }

    /*
     * If val_id exists, use SSLCOMMERZ's validation service
     * instead of trusting the callback's status text alone.
     */
    if (validationId) {
      const payment =
        await verifyAndCompletePayment({
          transactionId,
          validationId,
        });

      return res.status(200).json({
        success: true,

        message:
          'Payment notification validated successfully.',

        data: {
          transactionId:
            payment.transactionId,

          status:
            payment.status,
        },
      });
    }

    /*
     * No validation ID means we do not have proof of successful
     * payment.
     */
    return res.status(200).json({
      success: true,

      message:
        'Payment notification received. No successful validation was performed.',

      data: {
        transactionId:
          transactionId || null,

        gatewayStatus:
          gatewayStatus || null,
      },
    });
  } catch (error) {
    next(error);
  }
}

// ------------------------------------------------------------
// 6. TRAVELER PAYMENT HISTORY
// ------------------------------------------------------------

async function getTravelerPaymentHistory(
  req,
  res,
  next
) {
  try {
    /*
     * travelerId always comes from authentication.
     */
    const payments =
      await Payment.find({
        travelerId:
          req.user._id,
      })
        /*
         * The frontend does not need the gateway session key.
         */
        .select(
          '-gatewaySessionKey'
        )
        .sort({
          createdAt: -1,
        });

    res.status(200).json({
      success: true,

      message:
        'Traveler payment history retrieved successfully.',

      data: {
        count:
          payments.length,

        payments,
      },
    });
  } catch (error) {
    next(error);
  }
}

export {
  getTravelerPaymentHistory,
  handleSslcommerzCancellation,
  handleSslcommerzFailure,
  handleSslcommerzIpn,
  handleSslcommerzSuccess,
  initiateHotelPayment,
};