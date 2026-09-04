import {
  randomBytes,
} from 'node:crypto';

import mongoose from 'mongoose';

import Booking from '../models/booking.model.js';
import Hotel from '../models/hotel.model.js';
import Payment from '../models/payment.model.js';

import {
  settleSuccessfulBookingPaymentRewards,
} from '../services/reward.service.js';

import {
  createPaymentSession,
  validatePayment,
} from '../services/sslcommerz.service.js';


/*
 * ============================================================
 * PAYMENT CONTROLLER
 * ============================================================
 *
 * This controller contains Ghuraghuri's booking-payment business
 * logic.
 *
 *
 * Existing responsibilities:
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
 *
 * RAFI FEATURE 3 adds ONE responsibility after a payment has
 * already been securely verified:
 *
 * - settle Premium reward points
 *
 *
 * IMPORTANT:
 *
 * The reward system NEVER decides whether an SSLCOMMERZ payment
 * succeeded.
 *
 * This controller still performs the normal gateway validation
 * first.
 *
 * Only after:
 *
 *   Payment.status = paid
 *
 * do we call:
 *
 *   settleSuccessfulBookingPaymentRewards()
 *
 *
 * Therefore Fatema/Kusum's payment-security flow remains the
 * authoritative source of payment success.
 */


// ============================================================
// GENERAL HELPERS
// ============================================================

function createHttpError(
  message,
  statusCode
) {
  const error =
    new Error(message);

  error.statusCode =
    statusCode;

  return error;
}


/*
 * Validate IDs before querying MongoDB.
 *
 * This prevents invalid values from causing Mongoose CastErrors.
 */
function validateObjectId(
  id,
  fieldName
) {
  if (
    !mongoose.isValidObjectId(
      id
    )
  ) {
    throw createHttpError(
      `${fieldName} is invalid.`,
      400
    );
  }
}


/*
 * ============================================================
 * TRANSACTION ID
 * ============================================================
 *
 * SSLCOMMERZ allows a transaction ID with a maximum length of
 * 30 characters.
 *
 * We generate this value on the backend.
 *
 * The frontend never chooses a transaction ID.
 */
function generateTransactionId() {
  const timePart =
    Date.now().toString(36);


  const randomPart =
    randomBytes(5).toString(
      'hex'
    );


  return `GH${timePart}${randomPart}`;
}


/*
 * ============================================================
 * FRONTEND RETURN URL
 * ============================================================
 *
 * After SSLCOMMERZ posts its result to our backend, the backend
 * redirects the user's browser to the traveler Bookings page.
 *
 *
 * Example:
 *
 * /bookings?payment=success&transactionId=GH...
 *
 *
 * This lets the traveler immediately see the updated payment
 * status beside their booking.
 */
function getClientUrl() {
  const clientUrl =
    process.env.CLIENT_URL?.trim() ||
    'http://localhost:5173';


  return clientUrl.replace(
    /\/+$/,
    ''
  );
}


/*
 * Redirect the browser back to the Bookings page after a
 * gateway callback.
 *
 *
 * Possible status values:
 *
 * success
 * failed
 * cancelled
 */
function redirectToBookings(
  res,
  status,
  transactionId = ''
) {
  const bookingsUrl =
    new URL(
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
   * SSLCOMMERZ normally POSTs to our callback endpoint.
   *
   * HTTP 303 tells the browser:
   *
   *   "Follow the next URL using a normal GET request."
   */
  return res.redirect(
    303,
    bookingsUrl.toString()
  );
}


/*
 * ============================================================
 * MONEY COMPARISON
 * ============================================================
 *
 * Compare money using two decimal places.
 *
 *
 * This avoids problems caused by JavaScript floating-point
 * representation.
 *
 *
 * Example:
 *
 * 950.00
 *
 * should match:
 *
 * 950
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
    !Number.isFinite(
      first
    ) ||
    !Number.isFinite(
      second
    )
  ) {
    return false;
  }


  return (
    Math.round(
      first * 100
    ) ===
    Math.round(
      second * 100
    )
  );
}


/*
 * ============================================================
 * LOAD PAYMENT BY TRANSACTION ID
 * ============================================================
 *
 * SSLCOMMERZ callbacks do not depend on our user's login cookie.
 *
 * Therefore callback processing finds the correct Payment using
 * the transaction ID originally generated by Ghuraghuri.
 */
async function findPaymentByTransactionId(
  transactionId
) {
  if (
    typeof transactionId !==
      'string' ||
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
 * ============================================================
 * BOOKING PAYMENT STATUS HELPERS
 * ============================================================
 */


/*
 * A failed payment attempt changes the booking's payment status
 * to:
 *
 *   failed
 *
 *
 * But we NEVER overwrite:
 *
 *   paid
 *
 * because a later failed callback from another transaction must
 * not undo an already-successful payment.
 */
async function markBookingPaymentFailed(
  payment
) {
  await Booking.updateOne(
    {
      _id:
        payment.bookingId,

      paymentStatus: {
        $ne:
          'paid',
      },
    },

    {
      $set: {
        paymentStatus:
          'failed',
      },
    }
  );
}


/*
 * A cancelled SSLCOMMERZ attempt does not destroy the booking.
 *
 * The booking remains payable, so we return:
 *
 *   paymentStatus = unpaid
 *
 *
 * Again, an already-paid booking is never downgraded.
 */
async function markBookingPaymentUnpaid(
  payment
) {
  await Booking.updateOne(
    {
      _id:
        payment.bookingId,

      paymentStatus: {
        $ne:
          'paid',
      },
    },

    {
      $set: {
        paymentStatus:
          'unpaid',
      },
    }
  );
}


/*
 * ============================================================
 * SUCCESSFUL PAYMENT VERIFICATION
 * ============================================================
 *
 * This helper is used by:
 *
 * - the browser success callback
 * - the SSLCOMMERZ IPN callback
 *
 *
 * Existing payment validation remains authoritative.
 *
 *
 * RAFI FEATURE 3 CHANGE
 * ------------------------------------------------------------
 *
 * Previously, if:
 *
 *   payment.status === 'paid'
 *
 * this function immediately returned.
 *
 *
 * We no longer return immediately.
 *
 *
 * Why?
 *
 * Imagine:
 *
 * 1. SSLCOMMERZ payment validates successfully.
 *
 * 2. Payment becomes "paid".
 *
 * 3. Server/database problem happens before reward settlement
 *    completely finishes.
 *
 * 4. SSLCOMMERZ sends the callback again.
 *
 *
 * If we immediately returned at Step 4, the missing reward work
 * would never repair itself.
 *
 *
 * Instead:
 *
 * Already-paid payment:
 *
 *   skip gateway validation again
 *        ↓
 *   verify/load booking
 *        ↓
 *   make sure booking says paid
 *        ↓
 *   run idempotent reward settlement
 *
 *
 * RewardLedger unique source keys ensure the repeated callback
 * cannot award or redeem points twice.
 */
async function verifyAndCompletePayment({
  transactionId,
  validationId,
}) {
  /*
   * ----------------------------------------------------------
   * 1. LOAD GHURAGHURI PAYMENT
   * ----------------------------------------------------------
   */
  const payment =
    await findPaymentByTransactionId(
      transactionId
    );


  /*
   * ----------------------------------------------------------
   * 2. VERIFY THE LINKED BOOKING EXISTS
   * ----------------------------------------------------------
   *
   * We require all three relationships:
   *
   * booking ID
   * traveler ID
   * provider/vendor ID
   *
   *
   * This prevents a Payment document from being accepted if its
   * booking relationship does not match.
   */
  const booking =
    await Booking.findOne({
      _id:
        payment.bookingId,

      travelerId:
        payment.travelerId,

      vendorId:
        payment.providerId,
    });


  if (!booking) {
    throw createHttpError(
      'The booking linked to this payment could not be verified.',
      404
    );
  }


  /*
   * ==========================================================
   * 3. VALIDATE WITH SSLCOMMERZ IF NOT ALREADY PAID
   * ==========================================================
   *
   * If this Payment is already paid, it has already passed these
   * gateway checks during an earlier request.
   *
   * We therefore skip contacting SSLCOMMERZ again and continue
   * to the repair/idempotent settlement section below.
   */
  if (
    payment.status !==
    'paid'
  ) {
    /*
     * Successful SSLCOMMERZ verification requires val_id.
     */
    if (
      typeof validationId !==
        'string' ||
      !validationId.trim()
    ) {
      throw createHttpError(
        'Payment validation ID is required.',
        400
      );
    }


    /*
     * Ask SSLCOMMERZ's validation service for authoritative
     * transaction information.
     *
     * We do NOT trust the browser's callback body alone.
     */
    const validation =
      await validatePayment(
        validationId.trim()
      );


    /*
     * SSLCOMMERZ successful validation statuses.
     */
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
     * --------------------------------------------------------
     * SECURITY CHECK 1
     * --------------------------------------------------------
     *
     * Gateway transaction ID must match the transaction ID that
     * Ghuraghuri originally generated.
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
     * --------------------------------------------------------
     * SECURITY CHECK 2
     * --------------------------------------------------------
     *
     * SSLCOMMERZ amount must match the amount stored in our
     * Payment document.
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
     * --------------------------------------------------------
     * SECURITY CHECK 3
     * --------------------------------------------------------
     *
     * Ghuraghuri currently charges booking payments in BDT.
     */
    if (
      String(
        validation.currency
      ).toUpperCase() !==
      'BDT'
    ) {
      throw createHttpError(
        'Payment currency validation failed.',
        400
      );
    }


    /*
     * --------------------------------------------------------
     * SECURITY CHECK 4
     * --------------------------------------------------------
     *
     * Payment.amount must still match:
     *
     *   Booking.totalPrice
     *
     *
     * RAFI FEATURE 3 preserves this existing contract.
     *
     *
     * Normal traveler:
     *
     * booking.totalPrice
     *   = original hotel price
     *
     *
     * Premium traveler:
     *
     * booking.totalPrice
     *   = trusted backend-calculated discounted price
     *
     *
     * Therefore the existing payment system does not need to
     * calculate Premium discounts itself.
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
     * --------------------------------------------------------
     * 4. MARK PAYMENT SUCCESSFUL
     * --------------------------------------------------------
     *
     * Store useful gateway reconciliation information.
     *
     * Sensitive card/bank credentials are never stored.
     */
    payment.status =
      'paid';


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
  }


  /*
   * ==========================================================
   * 5. MARK BOOKING PAYMENT AS PAID
   * ==========================================================
   *
   * This is existing project behavior.
   *
   *
   * We intentionally run this even when Payment was already
   * marked paid.
   *
   * That lets a repeated callback repair an unusual partial
   * state such as:
   *
   * Payment.status        = paid
   * Booking.paymentStatus = unpaid
   */
  if (
    booking.paymentStatus !==
    'paid'
  ) {
    booking.paymentStatus =
      'paid';


    await booking.save();
  }


  /*
   * ==========================================================
   * 6. RAFI FEATURE 3 - SETTLE REWARDS
   * ==========================================================
   *
   * At this exact point we know:
   *
   * Payment.status = paid
   *
   * and the payment has either:
   *
   * - just passed SSLCOMMERZ validation
   *
   * or
   *
   * - passed validation during an earlier callback.
   *
   *
   * Therefore it is now safe for the reward system to perform:
   *
   *
   * A. REWARD REDEMPTION
   * ----------------------------------------------------------
   *
   * If the booking reserved points:
   *
   *   reserved
   *      ↓
   *   redeemed
   *
   *
   * RewardLedger receives:
   *
   *   -points
   *
   *
   * B. PAYMENT REWARD
   * ----------------------------------------------------------
   *
   * This successful eligible booking payment receives:
   *
   *   +pointsPerEligiblePayment
   *
   *
   * Example defaults:
   *
   * reserved points:
   *   -2000
   *
   * successful-payment reward:
   *   +100
   *
   *
   * Both ledger entries have UNIQUE source keys.
   *
   * So receiving this callback repeatedly cannot duplicate
   * either operation.
   */
  /*
 * ==========================================================
 * RAFI FEATURE 3 - REWARD SETTLEMENT
 * ==========================================================
 *
 * At this point the SSLCOMMERZ payment has already been
 * successfully verified and saved.
 *
 * Reward processing is an additional Ghuraghuri feature.
 * Therefore a temporary reward-system failure must NOT turn a
 * genuinely successful payment into a failed payment callback.
 *
 * If settlement fails:
 *
 * - Payment remains paid
 * - Booking remains paid
 * - the error is logged
 *
 * The reward ledger uses unique source keys, so settlement can
 * safely be retried later without creating duplicate rewards.
 */
try {
  await settleSuccessfulBookingPaymentRewards({
    payment,

    booking,
  });
} catch (rewardError) {
  console.error(
    'Reward settlement failed after successful booking payment:',
    rewardError
  );
}


return payment;


  return payment;
}


// ============================================================
// 1. INITIATE HOTEL PAYMENT
// ============================================================

async function initiateHotelPayment(
  req,
  res,
  next
) {
  try {
    const {
      bookingId,
    } = req.params;


    validateObjectId(
      bookingId,
      'Booking ID'
    );


    /*
     * --------------------------------------------------------
     * TRAVELER OWNERSHIP PROTECTION
     * --------------------------------------------------------
     *
     * A traveler may initiate payment only for their own
     * booking.
     */
    const booking =
      await Booking.findOne({
        _id:
          bookingId,

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
     * These booking states are no longer payable.
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
     * Load the hotel so SSLCOMMERZ receives useful travel
     * metadata.
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


    /*
     * Generate a transaction ID for this payment attempt.
     */
    const transactionId =
      generateTransactionId();


    /*
     * ========================================================
     * CREATE TRUSTED PAYMENT RECORD
     * ========================================================
     *
     * Amount comes directly from:
     *
     *   booking.totalPrice
     *
     *
     * Normal booking:
     *
     * full original price
     *
     *
     * Premium booking:
     *
     * backend-calculated discounted price
     *
     *
     * The frontend never supplies this amount.
     */
    const payment =
      await Payment.create({
        bookingType:
          'hotel',

        bookingId:
          booking._id,

        travelerId:
          req.user._id,

        providerId:
          booking.vendorId,

        amount:
          booking.totalPrice,

        currency:
          'BDT',

        gateway:
          'sslcommerz',

        transactionId,

        status:
          'initiated',
      });


    let gatewaySession;


    try {
      /*
       * Create the SSLCOMMERZ hosted checkout session.
       */
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
       * A local Payment document exists, but SSLCOMMERZ session
       * creation failed.
       *
       * Mark this attempt failed.
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


    /*
     * Store the SSLCOMMERZ session key for reconciliation.
     */
    payment.gatewaySessionKey =
      gatewaySession.sessionKey;


    await payment.save();


    /*
     * React receives gatewayPageUrl and redirects the user's
     * browser to the hosted checkout page.
     */
    return res.status(201).json({
      success:
        true,

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
    return next(error);
  }
}


// ============================================================
// 2. SSLCOMMERZ SUCCESS CALLBACK
// ============================================================

async function handleSslcommerzSuccess(
  req,
  res,
  next
) {
  try {
    /*
     * SSLCOMMERZ posts these values to our callback URL.
     */
    const transactionId =
      req.body?.tran_id;


    const validationId =
      req.body?.val_id;


    /*
     * This performs:
     *
     * - SSLCOMMERZ validation
     * - Payment.status = paid
     * - Booking.paymentStatus = paid
     * - Rafi reward settlement
     */
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
    return next(error);
  }
}


// ============================================================
// 3. SSLCOMMERZ FAILURE CALLBACK
// ============================================================

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
     * Never downgrade a transaction that has already been
     * validated successfully.
     */
    if (
      payment.status !==
      'paid'
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


    /*
     * RAFI FEATURE 3
     * --------------------------------------------------------
     *
     * DO NOT release reserved reward points here.
     *
     *
     * A failed gateway ATTEMPT does not mean the booking itself
     * is dead.
     *
     * The traveler may try paying for the same discounted booking
     * again.
     *
     * Therefore:
     *
     * rewardRedemptionStatus stays "reserved".
     */
    return redirectToBookings(
      res,
      'failed',
      payment.transactionId
    );
  } catch (error) {
    return next(error);
  }
}


// ============================================================
// 4. SSLCOMMERZ CANCELLATION CALLBACK
// ============================================================

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


    /*
     * Never downgrade an already-successful payment.
     */
    if (
      payment.status !==
      'paid'
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
       * Booking.paymentStatus currently has no "cancelled"
       * value.
       *
       * The booking itself remains payable.
       *
       * Therefore:
       *
       * paymentStatus = unpaid
       */
      await markBookingPaymentUnpaid(
        payment
      );
    }


    /*
     * RAFI FEATURE 3
     * --------------------------------------------------------
     *
     * Reserved reward points remain reserved.
     *
     * The traveler can retry payment for this same booking.
     *
     * They are released only if the booking itself becomes
     * unusable, such as when the vendor declines it.
     */
    return redirectToBookings(
      res,
      'cancelled',
      payment.transactionId
    );
  } catch (error) {
    return next(error);
  }
}


// ============================================================
// 5. SSLCOMMERZ IPN
// ============================================================

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
        req.body?.status ||
        ''
      ).toUpperCase();


    /*
     * --------------------------------------------------------
     * SUCCESSFUL IPN WITH VALIDATION ID
     * --------------------------------------------------------
     *
     * Even if callback text says "VALID", we still independently
     * validate the transaction using SSLCOMMERZ.
     */
    if (
      validationId &&
      (
        gatewayStatus ===
          'VALID' ||
        gatewayStatus ===
          'VALIDATED'
      )
    ) {
      const payment =
        await verifyAndCompletePayment({
          transactionId,

          validationId,
        });


      return res.status(200).json({
        success:
          true,

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
     * --------------------------------------------------------
     * OTHER IPN WITH VALIDATION ID
     * --------------------------------------------------------
     *
     * If val_id exists, use the SSLCOMMERZ validation service
     * rather than trusting the callback's status text alone.
     */
    if (validationId) {
      const payment =
        await verifyAndCompletePayment({
          transactionId,

          validationId,
        });


      return res.status(200).json({
        success:
          true,

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
     * --------------------------------------------------------
     * NO VALIDATION ID
     * --------------------------------------------------------
     *
     * Without val_id we do NOT have proof that payment succeeded.
     *
     * Therefore:
     *
     * - Payment is not marked paid here
     * - Booking is not marked paid
     * - rewards are not settled
     */
    return res.status(200).json({
      success:
        true,

      message:
        'Payment notification received. No successful validation was performed.',

      data: {
        transactionId:
          transactionId ||
          null,

        gatewayStatus:
          gatewayStatus ||
          null,
      },
    });
  } catch (error) {
    return next(error);
  }
}


// ============================================================
// 6. TRAVELER PAYMENT HISTORY
// ============================================================

async function getTravelerPaymentHistory(
  req,
  res,
  next
) {
  try {
    /*
     * travelerId always comes from authentication.
     *
     * A traveler therefore cannot request another traveler's
     * payment history simply by modifying a URL.
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
          createdAt:
            -1,
        });


    return res.status(200).json({
      success:
        true,

      message:
        'Traveler payment history retrieved successfully.',

      data: {
        count:
          payments.length,

        payments,
      },
    });
  } catch (error) {
    return next(error);
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