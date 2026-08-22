import {
  useEffect,
  useState,
} from 'react';

import {
  useSearchParams,
} from 'react-router-dom';

import {
  getMyPremiumStatus,
  initiatePremiumUpgrade,
} from '../api/premiumApi';


/*
 * ============================================================
 * RAFI FEATURE 3 - PREMIUM PAGE
 * ============================================================
 *
 * Route:
 *
 *   /premium
 *
 *
 * This one page behaves differently depending on the current
 * traveler's membership status.
 *
 *
 * ------------------------------------------------------------
 * NORMAL TRAVELER
 * ------------------------------------------------------------
 *
 * The page acts as an Upgrade Account page.
 *
 * It shows:
 *
 *   - Premium price
 *   - Premium base discount
 *   - points earned per eligible successful payment
 *   - reward conversion rule
 *   - maximum discount
 *   - Upgrade button
 *
 *
 * ------------------------------------------------------------
 * PREMIUM TRAVELER
 * ------------------------------------------------------------
 *
 * The same route becomes a Premium dashboard.
 *
 * It shows:
 *
 *   - "You are already a Premium user"
 *   - current reward balance
 *   - permanent Premium discount
 *   - reward discount currently available
 *   - potential combined discount
 *   - progress toward the next reward step
 *
 *
 * Using one route keeps the experience simple:
 *
 * Sidebar before upgrade:
 *
 *   Upgrade Account
 *
 * Sidebar after upgrade:
 *
 *   Premium User
 *
 * Both point to:
 *
 *   /premium
 */


/*
 * ------------------------------------------------------------
 * MONEY FORMATTER
 * ------------------------------------------------------------
 *
 * Converts:
 *
 *   499
 *
 * into:
 *
 *   ৳499
 *
 *
 * toLocaleString() also helps larger amounts display clearly:
 *
 *   10000
 *
 * becomes:
 *
 *   ৳10,000
 */
function formatMoney(
  value
) {
  const amount =
    Number(value);

  if (
    !Number.isFinite(
      amount
    )
  ) {
    return '৳0';
  }

  return `৳${amount.toLocaleString()}`;
}


/*
 * ------------------------------------------------------------
 * DATE FORMATTER
 * ------------------------------------------------------------
 *
 * PremiumMembership stores activatedAt as a real MongoDB Date.
 *
 * This helper converts that value into something friendly for
 * the traveler.
 *
 *
 * Example:
 *
 *   23 Aug 2026
 */
function formatDate(
  value
) {
  if (!value) {
    return '—';
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '—';
  }

  return new Intl.DateTimeFormat(
    'en-GB',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }
  ).format(date);
}


/*
 * ------------------------------------------------------------
 * CALLBACK MESSAGE
 * ------------------------------------------------------------
 *
 * After SSLCOMMERZ finishes checkout, Rafi's backend redirects
 * the browser to URLs such as:
 *
 *   /premium?payment=success
 *   /premium?payment=failed
 *   /premium?payment=cancelled
 *
 *
 * This helper decides what message the page should show.
 *
 *
 * IMPORTANT:
 *
 * "success" in the URL was placed there by our backend only
 * AFTER gateway validation succeeded.
 *
 * The frontend itself never activates Premium.
 */
function getPaymentMessage(
  paymentResult,
  isPremium
) {
  switch (
    paymentResult
  ) {
    case 'success':
      /*
       * A successful callback should normally mean the user is
       * now Premium.
       *
       * We still check isPremium so the UI does not confidently
       * claim activation if something unexpected happened while
       * loading membership status.
       */
      if (isPremium) {
        return {
          type:
            'success',

          text:
            'Payment completed successfully. Your Premium membership is now active.',
        };
      }

      return {
        type:
          'warning',

        text:
          'The payment returned successfully, but Premium status could not be confirmed yet. Please refresh the page.',
      };


    case 'failed':
      return {
        type:
          'error',

        text:
          'The Premium payment was not completed. Your account was not upgraded.',
      };


    case 'cancelled':
      return {
        type:
          'warning',

        text:
          'You cancelled the Premium payment. No payment was completed and your account was not upgraded.',
      };


    default:
      return null;
  }
}


/*
 * ------------------------------------------------------------
 * CALLBACK MESSAGE STYLING
 * ------------------------------------------------------------
 *
 * We keep the colors consistent with the visual language already
 * used throughout Ghuraghuri.
 */
function getMessageStyle(
  type
) {
  switch (type) {
    case 'success':
      return 'border-[#BFD9CD] bg-[#EEF7F2] text-[#0F6B4D]';

    case 'error':
      return 'border-red-200 bg-red-50 text-red-700';

    case 'warning':
    default:
      return 'border-[#F0DFA8] bg-[#FFF8E8] text-[#806116]';
  }
}


function PremiumPage() {
  /*
   * ----------------------------------------------------------
   * URL QUERY PARAMETERS
   * ----------------------------------------------------------
   *
   * React Router lets us read:
   *
   *   ?payment=success
   *
   * without manually parsing window.location.search.
   */
  const [
    searchParams,
  ] =
    useSearchParams();


  /*
   * Possible values:
   *
   *   success
   *   failed
   *   cancelled
   *   null
   */
  const paymentResult =
    searchParams.get(
      'payment'
    );


  /*
   * premiumStatus stores the backend's:
   *
   * {
   *   isPremium,
   *   membership,
   *   rewards,
   *   settings
   * }
   */
  const [
    premiumStatus,
    setPremiumStatus,
  ] = useState(null);


  /*
   * Controls the initial page-loading state.
   */
  const [
    isLoading,
    setIsLoading,
  ] = useState(true);


  /*
   * Controls the Upgrade button while we are waiting for the
   * backend to create the SSLCOMMERZ checkout session.
   *
   * This also prevents repeated button clicks.
   */
  const [
    isStartingPayment,
    setIsStartingPayment,
  ] = useState(false);


  /*
   * Stores errors from:
   *
   *   loading Premium status
   *
   * or:
   *
   *   starting Premium checkout
   */
  const [
    pageError,
    setPageError,
  ] = useState('');


  /*
   * ----------------------------------------------------------
   * LOAD PREMIUM STATUS
   * ----------------------------------------------------------
   *
   * This runs when the page first appears.
   *
   *
   * For a normal traveler:
   *
   * The backend returns upgrade information.
   *
   *
   * For a Premium traveler:
   *
   * The backend also performs reward reconciliation before
   * returning the newest point balance.
   *
   *
   * This means the Premium page automatically reflects newly
   * successful eligible payments.
   */
  useEffect(() => {
    let ignoreResult =
      false;


    async function loadPremiumStatus() {
      setIsLoading(true);

      setPageError('');


      try {
        const result =
          await getMyPremiumStatus();


        /*
         * The component may theoretically disappear while the
         * request is still running.
         *
         * ignoreResult prevents an old request from updating a
         * component that has already unmounted.
         */
        if (
          ignoreResult
        ) {
          return;
        }


        setPremiumStatus(
          result?.data ||
            null
        );
      } catch (error) {
        if (
          !ignoreResult
        ) {
          setPageError(
            error.response?.data
              ?.message ||
              'Unable to load Premium membership information.'
          );
        }
      } finally {
        if (
          !ignoreResult
        ) {
          setIsLoading(false);
        }
      }
    }


    void loadPremiumStatus();


    return () => {
      ignoreResult =
        true;
    };
  }, []);


  /*
   * ----------------------------------------------------------
   * START UPGRADE PAYMENT
   * ----------------------------------------------------------
   *
   * This runs when a normal traveler presses:
   *
   *   Upgrade for ৳499
   *
   *
   * Flow:
   *
   * Button
   *   ↓
   * POST /premium/upgrade/initiate
   *   ↓
   * backend reads trusted price
   *   ↓
   * PremiumPayment created
   *   ↓
   * SSLCOMMERZ session created
   *   ↓
   * backend returns gatewayPageUrl
   *   ↓
   * browser navigates to SSLCOMMERZ
   */
  async function handleUpgrade() {
    /*
     * Prevent a second click while the first request is already
     * being processed.
     */
    if (
      isStartingPayment
    ) {
      return;
    }


    setIsStartingPayment(
      true
    );

    setPageError('');


    try {
      const result =
        await initiatePremiumUpgrade();


      const gatewayPageUrl =
        result?.data
          ?.gatewayPageUrl;


      /*
       * A successful backend response should always include the
       * SSLCOMMERZ hosted checkout URL.
       *
       * We still validate that it exists before redirecting.
       */
      if (
        !gatewayPageUrl
      ) {
        throw new Error(
          'The Premium payment gateway URL was not returned.'
        );
      }


      /*
       * Leave the React application temporarily and open
       * SSLCOMMERZ's hosted sandbox checkout page.
       *
       * After payment, the gateway calls Rafi's backend callback,
       * which redirects the browser back to /premium.
       */
      window.location.assign(
        gatewayPageUrl
      );
    } catch (error) {
      /*
       * Axios errors normally contain the backend message under:
       *
       *   error.response.data.message
       *
       * A locally-created Error instead uses:
       *
       *   error.message
       */
      setPageError(
        error.response?.data
          ?.message ||
          error.message ||
          'Unable to start the Premium payment.'
      );


      /*
       * Only reset the button locally when checkout did not
       * start.
       *
       * If redirect succeeds, the browser leaves this page
       * anyway.
       */
      setIsStartingPayment(
        false
      );
    }
  }


  /*
   * ----------------------------------------------------------
   * INITIAL LOADING SCREEN
   * ----------------------------------------------------------
   */
  if (
    isLoading
  ) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm font-medium text-[#66756D]">
          Loading Premium information...
        </p>
      </div>
    );
  }


  /*
   * Extract values from the backend response.
   *
   * Optional chaining keeps the component safe if a request
   * partially fails or returns an unexpected empty object.
   */
  const isPremium =
    Boolean(
      premiumStatus?.isPremium
    );

  const settings =
    premiumStatus?.settings ||
    {};

  const membership =
    premiumStatus?.membership ||
    null;

  const rewards =
    premiumStatus?.rewards ||
    null;


  /*
   * Decide whether we should display a message caused by the
   * gateway redirect.
   */
  const paymentMessage =
    getPaymentMessage(
      paymentResult,
      isPremium
    );


  /*
   * ==========================================================
   * PAGE
   * ==========================================================
   */
  return (
    <div className="mx-auto max-w-6xl">
      {/* -----------------------------------------------------
          PAGE HEADING
         ----------------------------------------------------- */}
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0F6B4D]">
          Ghuraghuri Premium
        </p>

        <h1 className="mt-2 text-2xl font-bold text-[#17211D] md:text-3xl">
          {isPremium
            ? 'Premium User'
            : 'Upgrade Your Account'}
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#66756D]">
          {isPremium
            ? 'View your Premium benefits, reward-point balance, and the discounts currently available to you.'
            : 'Upgrade once to unlock Premium benefits, loyalty rewards, and Premium-only features across Ghuraghuri.'}
        </p>
      </div>


      {/* -----------------------------------------------------
          PAYMENT CALLBACK MESSAGE
         -----------------------------------------------------

          This appears after the browser returns from
          SSLCOMMERZ.
      */}
      {paymentMessage && (
        <div
          className={[
            'mt-6 rounded-xl border px-5 py-4 text-sm font-medium leading-6',

            getMessageStyle(
              paymentMessage.type
            ),
          ].join(' ')}
        >
          {paymentMessage.text}
        </div>
      )}


      {/* -----------------------------------------------------
          GENERAL API ERROR
         ----------------------------------------------------- */}
      {pageError && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {pageError}
        </div>
      )}


      {/* =====================================================
          NORMAL TRAVELER
         ===================================================== */}
      {!isPremium && (
        <>
          {/* Main upgrade card. */}
          <section className="mt-7 overflow-hidden rounded-2xl border border-[#DCE5E0] bg-white shadow-sm">
            <div className="grid lg:grid-cols-[1.25fr_0.75fr]">
              {/* Left side: Premium explanation. */}
              <div className="p-6 md:p-8">
                <div className="inline-flex rounded-full bg-[#EEF7F2] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#0F6B4D]">
                  One-time upgrade
                </div>

                <h2 className="mt-5 text-2xl font-bold text-[#17211D]">
                  Become a Premium traveler
                </h2>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-[#66756D]">
                  Premium travelers receive a base booking discount,
                  can earn and redeem loyalty points, and gain access
                  to Premium-only Ghuraghuri features.
                </p>


                {/* Premium benefit list. */}
                <div className="mt-7 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-[#E1E8E4] bg-[#F8FBF9] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#8A9690]">
                      Premium discount
                    </p>

                    <p className="mt-2 text-xl font-bold text-[#0F6B4D]">
                      {Number(
                        settings.premiumBaseDiscountPercent ||
                          0
                      )}
                      %
                    </p>

                    <p className="mt-1 text-xs leading-5 text-[#66756D]">
                      Applied as the current global Premium base
                      discount.
                    </p>
                  </div>


                  <div className="rounded-xl border border-[#E1E8E4] bg-[#F8FBF9] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#8A9690]">
                      Reward earning
                    </p>

                    <p className="mt-2 text-xl font-bold text-[#17211D]">
                      +
                      {Number(
                        settings.pointsPerEligiblePayment ||
                          0
                      )}{' '}
                      points
                    </p>

                    <p className="mt-1 text-xs leading-5 text-[#66756D]">
                      For each eligible successful booking payment.
                    </p>
                  </div>


                  <div className="rounded-xl border border-[#E1E8E4] bg-[#F8FBF9] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#8A9690]">
                      Reward conversion
                    </p>

                    <p className="mt-2 text-xl font-bold text-[#17211D]">
                      {Number(
                        settings.pointsPerDiscountStep ||
                          0
                      ).toLocaleString()}
                      {' points = '}
                      {Number(
                        settings.discountPercentPerStep ||
                          0
                      )}
                      %
                    </p>

                    <p className="mt-1 text-xs leading-5 text-[#66756D]">
                      Reward points can later be optionally redeemed
                      during booking.
                    </p>
                  </div>


                  <div className="rounded-xl border border-[#E1E8E4] bg-[#F8FBF9] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#8A9690]">
                      Maximum discount
                    </p>

                    <p className="mt-2 text-xl font-bold text-[#17211D]">
                      {Number(
                        settings.maximumDiscountPercent ||
                          0
                      )}
                      %
                    </p>

                    <p className="mt-1 text-xs leading-5 text-[#66756D]">
                      Premium and redeemed reward discounts combined.
                    </p>
                  </div>
                </div>


                {/* Important rules so the UI does not mislead the
                    traveler about how points work. */}
                <div className="mt-6 rounded-xl border border-[#DCE5E0] bg-white p-4">
                  <p className="text-sm font-bold text-[#17211D]">
                    How rewards work
                  </p>

                  <ul className="mt-3 space-y-2 text-sm leading-6 text-[#66756D]">
                    <li>
                      • Your Premium-upgrade payment itself does not
                      earn reward points.
                    </li>

                    <li>
                      • Existing eligible successful booking payments
                      are counted when Premium becomes active.
                    </li>

                    <li>
                      • Reward points are not used automatically. You
                      will choose whether to redeem them when booking.
                    </li>
                  </ul>
                </div>
              </div>


              {/* Right side: price and checkout action. */}
              <div className="border-t border-[#E1E8E4] bg-[#F3F8F5] p-6 md:p-8 lg:border-l lg:border-t-0">
                <p className="text-sm font-semibold text-[#66756D]">
                  Premium upgrade
                </p>

                <div className="mt-3 flex items-end gap-2">
                  <p className="text-4xl font-bold text-[#17211D]">
                    {formatMoney(
                      settings.premiumUpgradePrice
                    )}
                  </p>

                  <p className="pb-1 text-sm text-[#66756D]">
                    one time
                  </p>
                </div>

                <p className="mt-4 text-sm leading-6 text-[#66756D]">
                  Checkout is processed securely through the
                  SSLCOMMERZ sandbox used by Ghuraghuri.
                </p>


                <button
                  type="button"
                  onClick={
                    handleUpgrade
                  }
                  disabled={
                    isStartingPayment
                  }
                  className={[
                    'mt-7 w-full rounded-lg px-5 py-3 text-sm font-semibold text-white transition',

                    isStartingPayment
                      ? 'cursor-not-allowed bg-[#7EA99A]'
                      : 'bg-[#0F6B4D] hover:bg-[#0A523B]',
                  ].join(' ')}
                >
                  {isStartingPayment
                    ? 'Opening secure checkout...'
                    : `Upgrade for ${formatMoney(
                        settings.premiumUpgradePrice
                      )}`}
                </button>

                <p className="mt-3 text-center text-xs leading-5 text-[#7B8982]">
                  Premium activates only after the backend verifies
                  a successful gateway payment.
                </p>
              </div>
            </div>
          </section>
        </>
      )}


      {/* =====================================================
          PREMIUM TRAVELER
         ===================================================== */}
      {isPremium && (
        <>
          {/* Membership confirmation. */}
          <section className="mt-7 rounded-2xl border border-[#BFD9CD] bg-white p-6 shadow-sm md:p-8">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
              <div>
                <div className="inline-flex rounded-full bg-[#DDF1E5] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#0F6B4D]">
                  Premium active
                </div>

                <h2 className="mt-4 text-2xl font-bold text-[#17211D]">
                  You are already a Premium user
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#66756D]">
                  Your membership is active and your current global
                  Premium benefits are applied automatically where
                  eligible.
                </p>
              </div>

              <div className="rounded-xl bg-[#F3F8F5] px-5 py-4 md:text-right">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#8A9690]">
                  Premium since
                </p>

                <p className="mt-1 font-bold text-[#17211D]">
                  {formatDate(
                    membership?.activatedAt
                  )}
                </p>
              </div>
            </div>
          </section>


          {/* Main Premium statistics. */}
          <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-[#DCE5E0] bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#8A9690]">
                Reward points
              </p>

              <p className="mt-2 text-3xl font-bold text-[#17211D]">
                {Number(
                  membership?.rewardPoints ||
                    0
                ).toLocaleString()}
              </p>

              <p className="mt-1 text-xs text-[#66756D]">
                Currently available
              </p>
            </div>


            <div className="rounded-xl border border-[#DCE5E0] bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#8A9690]">
                Premium base
              </p>

              <p className="mt-2 text-3xl font-bold text-[#0F6B4D]">
                {Number(
                  settings.premiumBaseDiscountPercent ||
                    0
                )}
                %
              </p>

              <p className="mt-1 text-xs text-[#66756D]">
                Current global base discount
              </p>
            </div>


            <div className="rounded-xl border border-[#DCE5E0] bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#8A9690]">
                Reward discount
              </p>

              <p className="mt-2 text-3xl font-bold text-[#17211D]">
                {Number(
                  rewards?.usableRewardDiscountPercent ||
                    0
                )}
                %
              </p>

              <p className="mt-1 text-xs text-[#66756D]">
                Available if points are redeemed
              </p>
            </div>


            <div className="rounded-xl border border-[#DCE5E0] bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#8A9690]">
                Potential total
              </p>

              <p className="mt-2 text-3xl font-bold text-[#0F6B4D]">
                {Number(
                  rewards
                    ?.totalDiscountIfAllAvailableRewardsUsed ||
                    settings.premiumBaseDiscountPercent ||
                    0
                )}
                %
              </p>

              <p className="mt-1 text-xs text-[#66756D]">
                If available reward discount is used
              </p>
            </div>
          </section>


          {/* Reward progress panel. */}
          <section className="mt-6 rounded-2xl border border-[#DCE5E0] bg-white p-6 shadow-sm md:p-8">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <h2 className="text-xl font-bold text-[#17211D]">
                  Reward progress
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#66756D]">
                  Every complete block of{' '}
                  {Number(
                    settings.pointsPerDiscountStep ||
                      0
                  ).toLocaleString()}{' '}
                  points currently unlocks another{' '}
                  {Number(
                    settings.discountPercentPerStep ||
                      0
                  )}
                  % reward discount, subject to the maximum discount
                  limit.
                </p>
              </div>

              <div className="rounded-lg bg-[#EEF7F2] px-4 py-3 text-sm font-semibold text-[#0F6B4D]">
                {
                  Number(
                    rewards?.pointsUntilNextStep ||
                      0
                  ).toLocaleString()
                }{' '}
                points until next step
              </div>
            </div>


            {/* Progress bar.

                We calculate the visual percentage from:

                current progress inside one points block
                ----------------------------------------
                points required for one complete block

                Example:

                700 / 1000 = 70%
            */}
            <div className="mt-6">
              <div className="mb-2 flex justify-between gap-4 text-xs font-semibold text-[#66756D]">
                <span>
                  {Number(
                    rewards?.pointsProgressTowardNextStep ||
                      0
                  ).toLocaleString()}{' '}
                  points
                </span>

                <span>
                  {Number(
                    settings.pointsPerDiscountStep ||
                      0
                  ).toLocaleString()}{' '}
                  points
                </span>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-[#E7EEE9]">
                <div
                  className="h-full rounded-full bg-[#0F6B4D] transition-all"
                  style={{
                    width:
                      `${
                        Number(
                          settings.pointsPerDiscountStep
                        ) > 0
                          ? Math.min(
                              100,

                              (
                                Number(
                                  rewards?.pointsProgressTowardNextStep ||
                                    0
                                ) /
                                Number(
                                  settings.pointsPerDiscountStep
                                )
                              ) *
                                100
                            )
                          : 0
                      }%`,
                  }}
                />
              </div>
            </div>


            {/* Additional accounting information. */}
            <div className="mt-7 grid gap-4 border-t border-[#E5ECE8] pt-6 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#8A9690]">
                  Lifetime earned
                </p>

                <p className="mt-1 text-lg font-bold text-[#17211D]">
                  {Number(
                    membership?.lifetimePointsEarned ||
                      0
                  ).toLocaleString()}{' '}
                  points
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#8A9690]">
                  Lifetime redeemed
                </p>

                <p className="mt-1 text-lg font-bold text-[#17211D]">
                  {Number(
                    membership?.lifetimePointsRedeemed ||
                      0
                  ).toLocaleString()}{' '}
                  points
                </p>
              </div>
            </div>


            <div className="mt-6 rounded-xl border border-[#DCE5E0] bg-[#F8FBF9] px-5 py-4">
              <p className="text-sm font-bold text-[#17211D]">
                Your points stay under your control
              </p>

              <p className="mt-1 text-sm leading-6 text-[#66756D]">
                Reward points are not automatically spent. When
                reward redemption is added to the booking flow, you
                will choose whether to use available points or save
                them for a later booking.
              </p>
            </div>
          </section>
        </>
      )}
    </div>
  );
}


export default PremiumPage;