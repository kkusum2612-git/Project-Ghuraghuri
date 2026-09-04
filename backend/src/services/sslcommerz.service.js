/*
 * SSLCOMMERZ Sandbox Service
 * ------------------------------------------------------------
 * This file contains ONLY communication with SSLCOMMERZ.
 *
 * It does NOT:
 *
 * - authenticate users
 * - load bookings from MongoDB
 * - create Payment documents
 * - change Booking.paymentStatus
 *
 * Those responsibilities will belong to payment.controller.js.
 *
 * Keeping gateway communication in a separate service makes
 * the payment feature cleaner and easier to explain in viva.
 */

// ------------------------------------------------------------
// SSLCOMMERZ SANDBOX ENDPOINTS
// ------------------------------------------------------------
//
// Kusum Feature 3 intentionally uses the sandbox only.
//
// We do not include the live SSLCOMMERZ endpoint here because
// this university project only needs simulated payments.

const SSLCOMMERZ_SESSION_URL =
  'https://sandbox.sslcommerz.com/gwprocess/v4/api.php';

const SSLCOMMERZ_VALIDATION_URL =
  'https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php';

// According to SSLCOMMERZ's documented transaction limits,
// the transaction amount should stay within this range.
//
// We check it before making an unnecessary gateway request.

const MINIMUM_PAYMENT_AMOUNT = 10;
const MAXIMUM_PAYMENT_AMOUNT = 500000;

/*
 * Creates a normal Error object with some extra context.
 *
 * The payment controller will catch this error and pass it to
 * the project's centralized error middleware.
 */
function createGatewayError(message) {
  const error = new Error(message);

  error.statusCode = 502;

  return error;
}

/*
 * Read one required environment variable.
 *
 * This helps us fail with a clear message if somebody tries to
 * use payment without configuring their sandbox credentials.
 *
 * We never hardcode Store ID or Store Password in source code.
 */
function getRequiredEnvironmentVariable(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw createGatewayError(
      `${name} is not configured for SSLCOMMERZ sandbox payments.`
    );
  }

  return value;
}

/*
 * BACKEND_PUBLIC_URL is used to build the URLs that
 * SSLCOMMERZ will call after checkout.
 *
 * Example locally:
 *
 * http://localhost:5000
 *
 * We remove a final "/" if one exists so that we do not
 * accidentally create URLs containing "//api/...".
 */
function getBackendPublicUrl() {
  const backendPublicUrl =
    process.env.BACKEND_PUBLIC_URL?.trim() ||
    'http://localhost:5000';

  return backendPublicUrl.replace(/\/+$/, '');
}

/*
 * SSLCOMMERZ sends the payment result to these endpoints.
 *
 * These routes do NOT exist yet.
 *
 * We will create them later in:
 *
 * backend/src/routes/payment.routes.js
 */
function getPaymentCallbackUrls() {
  const backendPublicUrl = getBackendPublicUrl();

  return {
    successUrl:
      `${backendPublicUrl}/api/v1/payments/sslcommerz/success`,

    failUrl:
      `${backendPublicUrl}/api/v1/payments/sslcommerz/fail`,

    cancelUrl:
      `${backendPublicUrl}/api/v1/payments/sslcommerz/cancel`,

    ipnUrl:
      `${backendPublicUrl}/api/v1/payments/sslcommerz/ipn`,
  };
}

/*
 * ------------------------------------------------------------
 * RAFI FEATURE 3 - PREMIUM PAYMENT CALLBACK URLS
 * ------------------------------------------------------------
 *
 * Fatema/Kusum's existing booking payments use:
 *
 *   /api/v1/payments/sslcommerz/...
 *
 * We do NOT send Premium payments to those callbacks because
 * those callbacks expect a normal booking Payment document and
 * a Booking document.
 *
 *
 * Premium upgrades therefore receive their own callback URLs:
 *
 *   /api/v1/premium/sslcommerz/...
 *
 *
 * The callback routes themselves will be implemented in the
 * next Premium-payment slice.
 *
 * IMPORTANT:
 *
 * Adding this helper does not alter getPaymentCallbackUrls().
 *
 * Existing hotel payments therefore continue using exactly the
 * same callback URLs they used before Rafi Feature 3.
 */
function getPremiumPaymentCallbackUrls() {
  const backendPublicUrl =
    getBackendPublicUrl();

  return {
    successUrl:
      `${backendPublicUrl}/api/v1/premium/sslcommerz/success`,

    failUrl:
      `${backendPublicUrl}/api/v1/premium/sslcommerz/fail`,

    cancelUrl:
      `${backendPublicUrl}/api/v1/premium/sslcommerz/cancel`,

    ipnUrl:
      `${backendPublicUrl}/api/v1/premium/sslcommerz/ipn`,
  };
}

/*
 * Convert a gateway HTTP response into JSON.
 *
 * If the gateway responds with something that is not valid JSON,
 * we provide our own understandable error instead of allowing a
 * confusing JSON parsing error to reach the user.
 */
async function readJsonResponse(response) {
  const responseText = await response.text();

  try {
    return JSON.parse(responseText);
  } catch {
    throw createGatewayError(
      'SSLCOMMERZ returned an unreadable response.'
    );
  }
}

/*
 * createPaymentSession()
 * ------------------------------------------------------------
 *
 * Creates a checkout session at SSLCOMMERZ.
 *
 * Expected data:
 *
 * transactionId:
 *   Unique transaction ID generated by Ghuraghuri.
 *
 * amount:
 *   Authoritative booking.totalPrice from MongoDB.
 *
 * customer:
 *   Authenticated traveler's name/email/phone.
 *
 * booking:
 *   Hotel booking information needed for SSLCOMMERZ's
 *   travel-related product information.
 *
 * IMPORTANT:
 *
 * The frontend will NOT send the amount directly to this
 * function.
 *
 * payment.controller.js will first load the booking from
 * MongoDB and use the saved totalPrice.
 */
async function createPaymentSession({
  transactionId,
  amount,
  customer,
  booking,
}) {
  const storeId =
    getRequiredEnvironmentVariable(
      'SSLCOMMERZ_STORE_ID'
    );

  const storePassword =
    getRequiredEnvironmentVariable(
      'SSLCOMMERZ_STORE_PASSWORD'
    );

  /*
   * Validate our own input before contacting the gateway.
   */

  if (
    typeof transactionId !== 'string' ||
    !transactionId.trim()
  ) {
    throw createGatewayError(
      'A payment transaction ID is required.'
    );
  }

  /*
   * SSLCOMMERZ documents a maximum transaction ID length
   * of 30 characters for transaction initiation.
   *
   * Later, our controller will deliberately generate short,
   * unique transaction IDs that fit this restriction.
   */
  if (transactionId.length > 30) {
    throw createGatewayError(
      'Payment transaction ID cannot exceed 30 characters.'
    );
  }

  const numericAmount = Number(amount);

  if (
    !Number.isFinite(numericAmount) ||
    numericAmount < MINIMUM_PAYMENT_AMOUNT ||
    numericAmount > MAXIMUM_PAYMENT_AMOUNT
  ) {
    throw createGatewayError(
      `Payment amount must be between ${MINIMUM_PAYMENT_AMOUNT} and ${MAXIMUM_PAYMENT_AMOUNT} BDT.`
    );
  }

  if (
    !customer?.name ||
    !customer?.email ||
    !customer?.phone
  ) {
    throw createGatewayError(
      'Traveler name, email, and phone are required for payment.'
    );
  }

  if (
    !booking?.id ||
    !booking?.hotelName ||
    !booking?.hotelCity ||
    !booking?.numberOfNights
  ) {
    throw createGatewayError(
      'Complete hotel booking information is required for payment.'
    );
  }

  const {
    successUrl,
    failUrl,
    cancelUrl,
    ipnUrl,
  } = getPaymentCallbackUrls();

  /*
   * SSLCOMMERZ expects application/x-www-form-urlencoded
   * data for its transaction-initiation request.
   *
   * URLSearchParams creates that format for us.
   */
  const requestBody = new URLSearchParams({
    /*
     * Merchant credentials.
     *
     * These come only from backend/.env.
     */
    store_id: storeId,
    store_passwd: storePassword,

    /*
     * Transaction information.
     */
    total_amount: numericAmount.toFixed(2),
    currency: 'BDT',
    tran_id: transactionId,

    /*
     * Where SSLCOMMERZ sends the user/result afterward.
     */
    success_url: successUrl,
    fail_url: failUrl,
    cancel_url: cancelUrl,
    ipn_url: ipnUrl,

    /*
     * Customer information.
     *
     * Our current User model contains:
     *
     * name
     * email
     * phone
     *
     * but no billing-address fields.
     *
     * Therefore we use the actual authenticated user's
     * name/email/phone and neutral Bangladesh values for the
     * gateway-only address fields.
     *
     * We do NOT modify the shared User model just to satisfy
     * sandbox checkout fields.
     */
    cus_name: String(customer.name),
    cus_email: String(customer.email),
    cus_phone: String(customer.phone),
    cus_add1: 'Bangladesh',
    cus_city: 'Dhaka',
    cus_state: 'Dhaka',
    cus_postcode: '1200',
    cus_country: 'Bangladesh',

    /*
     * A hotel reservation is a service rather than something
     * physically shipped to the traveler.
     */
    shipping_method: 'NO',

    /*
     * Product information.
     *
     * SSLCOMMERZ provides "travel-vertical" as a supported
     * product profile and requests hotel-specific information
     * when this profile is used.
     */
    product_name:
      `Hotel booking - ${booking.hotelName}`,

    product_category: 'Hotel Booking',

    product_profile: 'travel-vertical',

    hotel_name: String(
      booking.hotelName
    ),

    length_of_stay:
      `${booking.numberOfNights} night(s)`,

    /*
     * Our current booking does not store a hotel check-in
     * clock time.
     *
     * This is only descriptive gateway metadata, so we use a
     * conventional placeholder instead of changing the booking
     * schema for a field our application does not otherwise need.
     */
    check_in_time: '14:00',

    hotel_city: String(
      booking.hotelCity
    ),

    /*
     * SSLCOMMERZ allows custom values that are returned with
     * the payment result.
     *
     * These are useful for reconciliation, but they are NOT
     * trusted as the final proof that payment succeeded.
     *
     * We will still validate the transaction with SSLCOMMERZ
     * and compare it against MongoDB.
     */
    value_a: String(booking.id),
    value_b: 'hotel',
  });

  let response;

  try {
    response = await fetch(
      SSLCOMMERZ_SESSION_URL,
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/x-www-form-urlencoded',
        },

        body: requestBody,
      }
    );
  } catch {
    throw createGatewayError(
      'Could not connect to the SSLCOMMERZ sandbox.'
    );
  }

  const responseData =
    await readJsonResponse(response);

  if (!response.ok) {
    throw createGatewayError(
      'SSLCOMMERZ rejected the payment-session request.'
    );
  }

  /*
   * A properly created session should contain:
   *
   * status = SUCCESS
   * GatewayPageURL
   * sessionkey
   */
  if (
    responseData.status !== 'SUCCESS' ||
    !responseData.GatewayPageURL ||
    !responseData.sessionkey
  ) {
    throw createGatewayError(
      responseData.failedreason ||
        'SSLCOMMERZ could not create the payment session.'
    );
  }

  /*
   * Return only the values the rest of our application needs.
   *
   * The Payment document will save sessionKey.
   * The frontend will use gatewayPageUrl to redirect the user
   * to the hosted SSLCOMMERZ sandbox checkout.
   */
  return {
    gatewayPageUrl:
      responseData.GatewayPageURL,

    sessionKey:
      responseData.sessionkey,
  };
}

/*
 * ============================================================
 * RAFI FEATURE 3 - CREATE PREMIUM PAYMENT SESSION
 * ============================================================
 *
 * This function creates an SSLCOMMERZ checkout session for a
 * Premium-account upgrade.
 *
 *
 * It deliberately exists BESIDE the existing:
 *
 *   createPaymentSession()
 *
 * rather than replacing it.
 *
 *
 * Existing function:
 *
 *   createPaymentSession()
 *       -> hotel booking payment
 *
 *
 * New function:
 *
 *   createPremiumPaymentSession()
 *       -> Premium account upgrade
 *
 *
 * Both functions reuse this file's existing:
 *
 *   SSLCOMMERZ endpoint constants
 *   environment-variable reader
 *   backend public URL helper
 *   JSON response helper
 *
 *
 * Therefore we reuse the gateway infrastructure without forcing
 * a Premium purchase into Fatema's booking-payment logic.
 */
async function createPremiumPaymentSession({
  transactionId,
  amount,
  customer,
}) {
  /*
   * Merchant credentials are read only from backend/.env.
   *
   * They never come from:
   *
   *   the frontend
   *   MongoDB
   *   hardcoded source code
   */
  const storeId =
    getRequiredEnvironmentVariable(
      'SSLCOMMERZ_STORE_ID'
    );

  const storePassword =
    getRequiredEnvironmentVariable(
      'SSLCOMMERZ_STORE_PASSWORD'
    );


  /*
   * ----------------------------------------------------------
   * VALIDATE TRANSACTION ID
   * ----------------------------------------------------------
   */
  if (
    typeof transactionId !== 'string' ||
    !transactionId.trim()
  ) {
    throw createGatewayError(
      'A Premium payment transaction ID is required.'
    );
  }


  /*
   * SSLCOMMERZ's transaction ID limit also applies to Premium
   * payments.
   */
  if (
    transactionId.length > 30
  ) {
    throw createGatewayError(
      'Premium payment transaction ID cannot exceed 30 characters.'
    );
  }


  /*
   * ----------------------------------------------------------
   * VALIDATE AMOUNT
   * ----------------------------------------------------------
   *
   * amount came from RewardSettings in our Premium service.
   *
   * We still validate it here because this file is the final
   * boundary before making an external gateway request.
   */
  const numericAmount =
    Number(amount);


  if (
    !Number.isFinite(
      numericAmount
    ) ||
    numericAmount <
      MINIMUM_PAYMENT_AMOUNT ||
    numericAmount >
      MAXIMUM_PAYMENT_AMOUNT
  ) {
    throw createGatewayError(
      `Premium payment amount must be between ${MINIMUM_PAYMENT_AMOUNT} and ${MAXIMUM_PAYMENT_AMOUNT} BDT.`
    );
  }


  /*
   * ----------------------------------------------------------
   * VALIDATE CUSTOMER INFORMATION
   * ----------------------------------------------------------
   *
   * The current User model requires name, email and phone.
   *
   * These values come from req.user through our authenticated
   * Premium controller/service.
   */
  if (
    !customer?.name ||
    !customer?.email ||
    !customer?.phone
  ) {
    throw createGatewayError(
      'Traveler name, email, and phone are required for Premium payment.'
    );
  }


  /*
   * Premium checkout uses its own Rafi-owned callback routes.
   *
   * The existing hotel-payment callback URLs remain untouched.
   */
  const {
    successUrl,
    failUrl,
    cancelUrl,
    ipnUrl,
  } =
    getPremiumPaymentCallbackUrls();


  /*
   * SSLCOMMERZ expects form-urlencoded request data.
   */
  const requestBody =
    new URLSearchParams({
      /*
       * Merchant sandbox credentials.
       */
      store_id:
        storeId,

      store_passwd:
        storePassword,


      /*
       * Transaction information.
       */
      total_amount:
        numericAmount.toFixed(2),

      currency:
        'BDT',

      tran_id:
        transactionId,


      /*
       * Premium-specific callback URLs.
       */
      success_url:
        successUrl,

      fail_url:
        failUrl,

      cancel_url:
        cancelUrl,

      ipn_url:
        ipnUrl,


      /*
       * Traveler information.
       *
       * Like the existing hotel-payment implementation, the
       * project's User model does not contain a full billing
       * address.
       *
       * Therefore actual traveler name/email/phone are combined
       * with neutral Bangladesh address values required for
       * sandbox checkout.
       */
      cus_name:
        String(
          customer.name
        ),

      cus_email:
        String(
          customer.email
        ),

      cus_phone:
        String(
          customer.phone
        ),

      cus_add1:
        'Bangladesh',

      cus_city:
        'Dhaka',

      cus_state:
        'Dhaka',

      cus_postcode:
        '1200',

      cus_country:
        'Bangladesh',


      /*
       * Premium membership is a digital/service purchase.
       *
       * Nothing needs to be physically shipped.
       */
      shipping_method:
        'NO',


      /*
       * Product information shown/used by the gateway.
       *
       * Notice that this contains no hotel-specific fields such
       * as:
       *
       *   hotel_name
       *   length_of_stay
       *   hotel_city
       *
       * because Premium membership is not a hotel reservation.
       */
      product_name:
        'Ghuraghuri Premium Membership',

      product_category:
        'Premium Membership',

      product_profile:
        'general',


      /*
       * SSLCOMMERZ returns custom values with callback data.
       *
       * These values are useful for debugging/reconciliation,
       * but our future Premium callback will NOT trust them as
       * proof of successful payment.
       *
       * The transaction will still be validated through the
       * SSLCOMMERZ Validation API.
       */
      value_a:
        'premium_upgrade',

      value_b:
        'rafi_feature_3',
    });


  let response;


  try {
    /*
     * Send the checkout-session request to the exact same
     * SSLCOMMERZ sandbox endpoint already used by the existing
     * booking-payment feature.
     */
    response =
      await fetch(
        SSLCOMMERZ_SESSION_URL,
        {
          method:
            'POST',

          headers: {
            'Content-Type':
              'application/x-www-form-urlencoded',
          },

          body:
            requestBody,
        }
      );
  } catch {
    throw createGatewayError(
      'Could not connect to the SSLCOMMERZ sandbox for Premium payment.'
    );
  }


  /*
   * Reuse the existing response parser from this shared service.
   */
  const responseData =
    await readJsonResponse(
      response
    );


  if (
    !response.ok
  ) {
    throw createGatewayError(
      'SSLCOMMERZ rejected the Premium payment-session request.'
    );
  }


  /*
   * A successfully created hosted checkout should contain:
   *
   *   status = SUCCESS
   *   GatewayPageURL
   *   sessionkey
   */
  if (
    responseData.status !==
      'SUCCESS' ||
    !responseData.GatewayPageURL ||
    !responseData.sessionkey
  ) {
    throw createGatewayError(
      responseData.failedreason ||
        'SSLCOMMERZ could not create the Premium payment session.'
    );
  }


  /*
   * Return only what Rafi's Premium payment service needs.
   */
  return {
    gatewayPageUrl:
      responseData.GatewayPageURL,

    sessionKey:
      responseData.sessionkey,
  };
}

/*
 * validatePayment()
 * ------------------------------------------------------------
 *
 * A browser redirect saying "success" is NOT enough proof that
 * money was successfully processed.
 *
 * SSLCOMMERZ provides a Validation ID (val_id) after a
 * transaction.
 *
 * We send that Validation ID back to SSLCOMMERZ's Validation
 * API and receive the authoritative transaction information.
 *
 * The payment controller will then compare:
 *
 * - status
 * - tran_id
 * - amount
 * - currency/currency_type
 *
 * against our Payment and Booking records.
 */
async function validatePayment(validationId) {
  if (
    typeof validationId !== 'string' ||
    !validationId.trim()
  ) {
    throw createGatewayError(
      'SSLCOMMERZ validation ID is required.'
    );
  }

  const storeId =
    getRequiredEnvironmentVariable(
      'SSLCOMMERZ_STORE_ID'
    );

  const storePassword =
    getRequiredEnvironmentVariable(
      'SSLCOMMERZ_STORE_PASSWORD'
    );

  /*
   * Build the documented validation URL safely instead of
   * manually concatenating query strings.
   */
  const validationUrl =
    new URL(
      SSLCOMMERZ_VALIDATION_URL
    );

  validationUrl.searchParams.set(
    'val_id',
    validationId
  );

  validationUrl.searchParams.set(
    'store_id',
    storeId
  );

  validationUrl.searchParams.set(
    'store_passwd',
    storePassword
  );

  validationUrl.searchParams.set(
    'format',
    'json'
  );

  validationUrl.searchParams.set(
    'v',
    '1'
  );

  let response;

  try {
    response = await fetch(
      validationUrl
    );
  } catch {
    throw createGatewayError(
      'Could not connect to SSLCOMMERZ for payment validation.'
    );
  }

  const responseData =
    await readJsonResponse(response);

  if (!response.ok) {
    throw createGatewayError(
      'SSLCOMMERZ rejected the payment-validation request.'
    );
  }

  /*
   * We intentionally do not mark anything paid here.
   *
   * This service only returns the gateway's validated data.
   *
   * payment.controller.js will compare this response with our
   * trusted MongoDB Payment record before changing statuses.
   */
  return responseData;
}

export {
  createPaymentSession,
  createPremiumPaymentSession,
  validatePayment,
};