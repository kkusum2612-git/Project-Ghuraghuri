import {
  getPremiumStatusForTraveler,
} from '../services/premium-membership.service.js';

import {
  initiatePremiumUpgradeForTraveler,
  markPremiumPaymentCancelled,
  markPremiumPaymentFailed,
  verifyAndCompletePremiumPayment,
} from '../services/premium-payment.service.js';


/*
 * ============================================================
 * RAFI FEATURE 3 - PREMIUM CONTROLLER
 * ============================================================
 *
 * This controller connects HTTP requests with Rafi's Premium
 * business services.
 *
 *
 * There are now TWO different types of requests in this file:
 *
 *
 * ------------------------------------------------------------
 * 1. TRAVELER REQUESTS
 * ------------------------------------------------------------
 *
 * These come from the Ghuraghuri frontend.
 *
 * Examples:
 *
 *   GET  /api/v1/premium/me
 *   POST /api/v1/premium/upgrade/initiate
 *
 *
 * They use the normal Ghuraghuri login cookie.
 *
 *
 * ------------------------------------------------------------
 * 2. SSLCOMMERZ CALLBACK REQUESTS
 * ------------------------------------------------------------
 *
 * These come from the payment gateway.
 *
 * Examples:
 *
 *   POST /api/v1/premium/sslcommerz/success
 *   POST /api/v1/premium/sslcommerz/fail
 *   POST /api/v1/premium/sslcommerz/cancel
 *   POST /api/v1/premium/sslcommerz/ipn
 *
 *
 * SSLCOMMERZ does NOT have the user's JWT cookie.
 *
 * Therefore those callbacks cannot use req.user.
 *
 * They identify a PremiumPayment by transaction ID and verify
 * successful transactions directly with SSLCOMMERZ.
 */


/*
 * ------------------------------------------------------------
 * CLIENT URL HELPER
 * ------------------------------------------------------------
 *
 * After the gateway POSTs its result to our backend, the backend
 * sends the user's browser back to the React application.
 *
 *
 * CLIENT_URL normally contains:
 *
 *   http://localhost:5173
 *
 *
 * Removing trailing "/" characters prevents URLs such as:
 *
 *   http://localhost:5173//premium
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
 * ------------------------------------------------------------
 * REDIRECT BACK TO PREMIUM PAGE
 * ------------------------------------------------------------
 *
 * Example:
 *
 *   /premium?payment=success&transactionId=PRM...
 *
 *
 * Later our React Premium page will read the "payment" query
 * parameter and display the correct success/failure message.
 *
 *
 * SSLCOMMERZ normally POSTs the checkout result to our backend.
 *
 * HTTP 303 tells the browser:
 *
 *   "Follow this redirect using a normal GET request."
 *
 * This is the same safe redirect pattern already used by the
 * existing booking-payment feature.
 */
function redirectToPremiumPage(
  res,
  status,
  transactionId = ''
) {
  const premiumUrl =
    new URL(
      '/premium',
      `${getClientUrl()}/`
    );


  premiumUrl.searchParams.set(
    'payment',
    status
  );


  if (
    transactionId
  ) {
    premiumUrl.searchParams.set(
      'transactionId',
      transactionId
    );
  }


  return res.redirect(
    303,
    premiumUrl.toString()
  );
}


/*
 * ------------------------------------------------------------
 * GET MY PREMIUM STATUS
 * ------------------------------------------------------------
 *
 * API:
 *
 *   GET /api/v1/premium/me
 *
 *
 * The traveler ID is NEVER supplied by the browser.
 *
 * It comes from:
 *
 *   req.user._id
 *
 * after authenticateUser validates the login cookie.
 */
async function getMyPremiumStatus(
  req,
  res,
  next
) {
  try {
    const premiumStatus =
      await getPremiumStatusForTraveler(
        req.user._id
      );


    return res.status(200).json({
      success: true,

      message:
        premiumStatus.isPremium
          ? 'Premium membership status loaded successfully.'
          : 'Premium upgrade information loaded successfully.',

      data:
        premiumStatus,
    });
  } catch (error) {
    return next(error);
  }
}


/*
 * ------------------------------------------------------------
 * INITIATE PREMIUM ACCOUNT UPGRADE
 * ------------------------------------------------------------
 *
 * API:
 *
 *   POST /api/v1/premium/upgrade/initiate
 *
 *
 * This endpoint STARTS checkout.
 *
 * It does NOT activate Premium.
 *
 *
 * Correct flow:
 *
 * Start checkout
 *      ↓
 * SSLCOMMERZ payment
 *      ↓
 * gateway callback
 *      ↓
 * backend validation
 *      ↓
 * PremiumMembership
 */
async function initiatePremiumUpgrade(
  req,
  res,
  next
) {
  try {
    /*
     * Pass the authenticated User document into Rafi's payment
     * service.
     *
     * We do not trust name/email/phone from req.body.
     */
    const result =
      await initiatePremiumUpgradeForTraveler(
        req.user
      );


    return res.status(201).json({
      success: true,

      message:
        'Premium upgrade payment session created successfully.',

      data: {
        payment: {
          id:
            result.payment._id,

          transactionId:
            result.payment.transactionId,

          amount:
            result.payment.amount,

          currency:
            result.payment.currency,

          status:
            result.payment.status,

          gateway:
            result.payment.gateway,
        },

        gatewayPageUrl:
          result.gatewayPageUrl,
      },
    });
  } catch (error) {
    return next(error);
  }
}


/*
 * ------------------------------------------------------------
 * SSLCOMMERZ SUCCESS CALLBACK
 * ------------------------------------------------------------
 *
 * API:
 *
 *   POST /api/v1/premium/sslcommerz/success
 *
 *
 * VERY IMPORTANT:
 *
 * We DO NOT trust the word "success" simply because this URL was
 * called.
 *
 *
 * Instead:
 *
 * req.body.tran_id
 *      ↓
 * locate PremiumPayment
 *
 * req.body.val_id
 *      ↓
 * validate again with SSLCOMMERZ
 *
 * only after validation
 *      ↓
 * PremiumPayment = paid
 *      ↓
 * PremiumMembership created
 */
async function handlePremiumSslcommerzSuccess(
  req,
  res,
  next
) {
  try {
    const transactionId =
      req.body?.tran_id;

    const validationId =
      req.body?.val_id;


    const result =
      await verifyAndCompletePremiumPayment({
        transactionId,
        validationId,
      });


    /*
     * The browser returns to our Premium page.
     *
     * At that point GET /api/v1/premium/me will report:
     *
     *   isPremium: true
     */
    return redirectToPremiumPage(
      res,
      'success',
      result.payment.transactionId
    );
  } catch (error) {
    return next(error);
  }
}


/*
 * ------------------------------------------------------------
 * SSLCOMMERZ FAILURE CALLBACK
 * ------------------------------------------------------------
 *
 * API:
 *
 *   POST /api/v1/premium/sslcommerz/fail
 *
 *
 * A failed payment:
 *
 *   PremiumPayment = failed
 *
 * but:
 *
 *   PremiumMembership is NOT created.
 */
async function handlePremiumSslcommerzFailure(
  req,
  res,
  next
) {
  try {
    const transactionId =
      req.body?.tran_id;


    const payment =
      await markPremiumPaymentFailed({
        transactionId,

        gatewayStatus:
          req.body?.status ||
          'FAILED',
      });


    return redirectToPremiumPage(
      res,
      'failed',
      payment.transactionId
    );
  } catch (error) {
    return next(error);
  }
}


/*
 * ------------------------------------------------------------
 * SSLCOMMERZ CANCELLATION CALLBACK
 * ------------------------------------------------------------
 *
 * API:
 *
 *   POST /api/v1/premium/sslcommerz/cancel
 *
 *
 * If the traveler presses Cancel at SSLCOMMERZ:
 *
 *   PremiumPayment = cancelled
 *
 * and:
 *
 *   no PremiumMembership is created.
 *
 *
 * The traveler may later begin another upgrade attempt.
 */
async function handlePremiumSslcommerzCancellation(
  req,
  res,
  next
) {
  try {
    const transactionId =
      req.body?.tran_id;


    const payment =
      await markPremiumPaymentCancelled({
        transactionId,

        gatewayStatus:
          req.body?.status ||
          'CANCELLED',
      });


    return redirectToPremiumPage(
      res,
      'cancelled',
      payment.transactionId
    );
  } catch (error) {
    return next(error);
  }
}


/*
 * ------------------------------------------------------------
 * SSLCOMMERZ IPN
 * ------------------------------------------------------------
 *
 * API:
 *
 *   POST /api/v1/premium/sslcommerz/ipn
 *
 *
 * IPN means:
 *
 *   Instant Payment Notification
 *
 *
 * Unlike the browser success redirect, this is intended as a
 * server-to-server notification.
 *
 *
 * During localhost development, SSLCOMMERZ normally cannot
 * directly reach:
 *
 *   localhost:5000
 *
 * from its own servers.
 *
 * But implementing IPN gives us the correct architecture for a
 * deployed backend.
 *
 *
 * If a validation ID exists, we validate the transaction using
 * the SAME secure function as the success callback.
 *
 * That function is idempotent, so receiving both:
 *
 *   browser success callback
 *
 * and:
 *
 *   IPN
 *
 * cannot create two Premium memberships.
 */
async function handlePremiumSslcommerzIpn(
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
     * A validation ID means we can ask SSLCOMMERZ itself for
     * authoritative payment information.
     */
    if (
      validationId
    ) {
      const result =
        await verifyAndCompletePremiumPayment({
          transactionId,
          validationId,
        });


      return res.status(200).json({
        success: true,

        message:
          'Premium payment notification validated successfully.',

        data: {
          transactionId:
            result.payment.transactionId,

          paymentStatus:
            result.payment.status,

          isPremium:
            Boolean(
              result.membership
            ),
        },
      });
    }


    /*
     * Without val_id we do NOT have sufficient proof to mark the
     * payment paid.
     *
     * We still acknowledge receipt of the notification.
     *
     * This is important:
     *
     * Gateway callback text alone is not trusted as payment
     * proof.
     */
    return res.status(200).json({
      success: true,

      message:
        'Premium payment notification received. No successful validation was performed.',

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


export {
  getMyPremiumStatus,
  handlePremiumSslcommerzCancellation,
  handlePremiumSslcommerzFailure,
  handlePremiumSslcommerzIpn,
  handlePremiumSslcommerzSuccess,
  initiatePremiumUpgrade,
};