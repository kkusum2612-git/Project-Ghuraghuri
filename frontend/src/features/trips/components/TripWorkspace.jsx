import {
  useEffect,
  useState,
} from 'react';

import {
  Link,
  Outlet,
  useLocation,
} from 'react-router-dom';

import useAuth from '../../auth/hooks/useAuth';

/*
 * Rafi Feature 3.
 *
 * The traveler workspace needs to know only ONE small piece of
 * Premium information:
 *
 *   Is this traveler Premium?
 *
 *
 * We use Rafi's existing Premium-status API rather than adding
 * Premium fields to the shared authentication User object.
 *
 * This keeps Premium membership owned by Rafi's feature.
 */
import {
  getMyPremiumStatus,
} from '../../premium/api/premiumApi';


function TripWorkspace() {
  const {
    user,
  } = useAuth();

  const location =
    useLocation();


  /*
   * ----------------------------------------------------------
   * RAFI FEATURE 3 - PREMIUM SIDEBAR STATE
   * ----------------------------------------------------------
   *
   * false means:
   *
   *   show "Upgrade Account"
   *
   * true means:
   *
   *   show "Premium User"
   *
   *
   * We deliberately default to false while loading.
   *
   * The sidebar itself should not be blocked just because the
   * Premium-status request takes a moment.
   */
  const [
    isPremium,
    setIsPremium,
  ] = useState(false);


  /*
   * ----------------------------------------------------------
   * RAFI FEATURE 4 - LOCKED PLANNER NOTIFICATION
   * ----------------------------------------------------------
   *
   * The AI Travel Planner must remain visible even before the
   * traveler upgrades to Premium.
   *
   * However, a normal traveler is not allowed to open it.
   *
   * When they click the grey planner item, this message appears
   * near the top of the website instead of navigating.
   */
  const [
    aiPlannerNotice,
    setAiPlannerNotice,
  ] = useState('');


  /*
   * ----------------------------------------------------------
   * LOAD PREMIUM STATUS FOR THE SIDEBAR
   * ----------------------------------------------------------
   *
   * TripWorkspace wraps all traveler pages.
   *
   * We therefore check membership when this shared workspace
   * first mounts.
   *
   *
   * This works especially well with the Premium payment flow:
   *
   * Traveler leaves Ghuraghuri
   *        ↓
   * SSLCOMMERZ checkout
   *        ↓
   * backend validates payment
   *        ↓
   * browser returns to /premium
   *        ↓
   * React application loads again
   *        ↓
   * TripWorkspace mounts
   *        ↓
   * Premium status is fetched
   *        ↓
   * sidebar says "Premium User"
   *
   *
   * If this small sidebar request fails, we intentionally do not
   * break the whole traveler workspace.
   *
   * The Premium page itself displays detailed API errors.
   */
  useEffect(() => {
    let ignoreResult =
      false;


    async function loadPremiumStatus() {
      try {
        const result =
          await getMyPremiumStatus();


        if (
          ignoreResult
        ) {
          return;
        }


        setIsPremium(
          Boolean(
            result?.data?.isPremium
          )
        );
      } catch {
        /*
         * Do not show a workspace-wide error just because the
         * optional Premium label could not be loaded.
         *
         * Existing traveler features must remain usable.
         */
        if (
          !ignoreResult
        ) {
          setIsPremium(false);
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
   * Automatically hide the Premium-required notification after
   * a few seconds.
   *
   * This follows the same temporary-feedback idea already used
   * by Ghuraghuri's toast messages.
   */
  useEffect(() => {
    if (
      !aiPlannerNotice
    ) {
      return undefined;
    }


    const timer =
      window.setTimeout(
        () => {
          setAiPlannerNotice('');
        },
        4000
      );


    /*
     * Clear the timer if the workspace unmounts before the four
     * seconds finish.
     */
    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [
    aiPlannerNotice,
  ]);


  /*
   * This is the ONE shared navigation menu used by the
   * traveler workspace.
   *
   * The menu currently combines:
   *
   * Farhan:
   * - My Trips
   *
   * Kusum:
   * - Hotels
   * - Bookings
   * - Payments
   *
   * Rafi:
   * - Event Rooms
   * - Premium Membership / Reward Points
   * - AI Travel Planner
   *
   * Payments has its own navigation item because it now acts
   * as a shared transaction-history area rather than being
   * limited to hotel bookings.
   */
  const menuItems = [
    {
      label:
        'My Trips',

      to:
        '/trips',
    },

    {
      label:
        'Hotels',

      to:
        '/hotels',
    },

    {
      label:
        'Bookings',

      to:
        '/bookings',
    },

    {
      label:
        'Payments',

      to:
        '/payments',
    },


    // Rafi - Module 1, Feature 1:
    // Public Event Room Creation & Discovery.
    {
      label:
        'Event Rooms',

      to:
        '/event-rooms',
    },


    /*
     * Rafi - Module 3, Feature 4:
     * AI Travel Plan Generator.
     *
     * The item is visible to every traveler.
     *
     * Normal traveler:
     *
     * - grey / locked-looking
     * - still clickable
     * - clicking shows the Premium notification
     * - does NOT navigate to /ai-planner
     *
     * Premium traveler:
     *
     * - normal traveler-menu styling
     * - clicking navigates to /ai-planner
     */
    {
      label:
        'AI Travel Planner',

      to:
        '/ai-planner',

      premiumOnly:
        true,
    },


    /*
     * Rafi - Module 3, Feature 3:
     * Premium Membership + Reward Points.
     *
     * The destination never changes.
     *
     * Only the visible label changes:
     *
     * normal traveler:
     *   Upgrade Account
     *
     * Premium traveler:
     *   Premium User
     */
    {
      label:
        isPremium
          ? 'Premium User'
          : 'Upgrade Account',

      to:
        '/premium',
    },
  ];


  /*
   * Decide which sidebar item receives the active style.
   *
   * Exact route:
   *
   * /payments
   *
   * activates Payments.
   *
   * The startsWith check also supports future nested routes,
   * for example:
   *
   * /payments/123
   */
  function isActive(
    item
  ) {
    return (
      location.pathname ===
        item.to ||
      location.pathname.startsWith(
        `${item.to}/`
      )
    );
  }


  /*
   * ----------------------------------------------------------
   * RAFI FEATURE 4 - HANDLE LOCKED AI PLANNER CLICK
   * ----------------------------------------------------------
   *
   * This function is used only for a NON-Premium traveler.
   *
   * We do not disable the button because a disabled button would
   * not be able to explain why the feature is unavailable.
   */
  function handleLockedAiPlannerClick() {
    setAiPlannerNotice(
      'AI Travel Planner is a Premium feature. Upgrade your account first.'
    );
  }


  return (
    <div className="min-h-[calc(100vh-72px)] bg-[#F7FAF8]">
      {/* ------------------------------------------------------
          RAFI FEATURE 4 - PREMIUM REQUIRED NOTICE
         ------------------------------------------------------

          The visual structure intentionally follows the existing
          Ghuraghuri toast style:

          - fixed near the top-right
          - white rounded card
          - subtle border and shadow
          - dismiss button

          This is an informational Premium notice rather than a
          success message, so it uses a lock icon and the heading
          "Premium feature".
      */}
      {
        aiPlannerNotice
          ? (
              <div
                className="fixed right-4 top-20 z-[90] w-[calc(100%-2rem)] max-w-sm"
                role="status"
                aria-live="polite"
              >
                <div className="flex items-start gap-3 rounded-xl border border-[#CDD7D2] bg-white p-4 shadow-xl">
                  {/* Lock icon showing that this feature requires
                      Premium membership. */}
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F1F3F2] text-[#66756D]">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className="h-5 w-5"
                      aria-hidden="true"
                    >
                      <rect
                        x="5"
                        y="10"
                        width="14"
                        height="10"
                        rx="2"
                        stroke="currentColor"
                        strokeWidth="2"
                      />

                      <path
                        d="M8 10V7.5C8 5.01 9.79 3 12 3C14.21 3 16 5.01 16 7.5V10"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[#17211D]">
                      Premium feature
                    </p>

                    <p className="mt-1 text-sm leading-5 text-[#66756D]">
                      {
                        aiPlannerNotice
                      }
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setAiPlannerNotice('')
                    }
                    className="shrink-0 rounded-md p-1 text-[#7B8982] transition hover:bg-[#F3F6F4] hover:text-[#17211D]"
                    aria-label="Close Premium feature notification"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className="h-5 w-5"
                      aria-hidden="true"
                    >
                      <path
                        d="M6 6L18 18"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />

                      <path
                        d="M18 6L6 18"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            )
          : null
      }


      <div className="flex w-full">
        {/* Shared traveler sidebar.

            It remains hidden on smaller screens just like the
            existing Farhan/Kusum/Rafi implementation. */}
        <aside className="hidden min-h-[calc(100vh-72px)] w-64 shrink-0 border-r border-[#E1E8E4] bg-white lg:block">
          <div className="border-b border-[#E1E8E4] px-5 py-5">
            <div className="flex items-center gap-3">
              {/* If the user has no profile picture here,
                  the current shared design uses their first
                  initial inside a green circle. */}
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#DCEFE4] text-sm font-bold text-[#0F6B4D]">
                {user?.name
                  ?.charAt(0)
                  ?.toUpperCase() ||
                  'T'}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-[#17211D]">
                  {user?.name ||
                    'Traveler'}
                </p>

                <p className="text-xs text-[#66756D]">
                  Traveler
                </p>
              </div>
            </div>
          </div>

          <nav className="space-y-3 px-4 py-6">
            {menuItems.map(
              (item) => {
                const active =
                  isActive(
                    item
                  );


                /*
                 * Feature 4 special case:
                 *
                 * The AI Planner must LOOK unavailable for a
                 * normal traveler, but it must still be clickable
                 * so we can explain the Premium requirement.
                 */
                const lockedAiPlanner =
                  item.premiumOnly &&
                  !isPremium;


                if (
                  lockedAiPlanner
                ) {
                  return (
                    <button
                      key={
                        item.to
                      }
                      type="button"
                      onClick={
                        handleLockedAiPlannerClick
                      }
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#E1E5E3] bg-[#F3F5F4] px-4 py-3 text-center text-sm font-medium text-[#8A9690] transition hover:bg-[#EAEEEC] hover:text-[#69766F]"
                      aria-label="AI Travel Planner requires Premium membership"
                    >
                      {/* Small lock icon keeps the unavailable
                          state understandable without hiding the
                          feature from the traveler. */}
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        className="h-4 w-4 shrink-0"
                        aria-hidden="true"
                      >
                        <rect
                          x="5"
                          y="10"
                          width="14"
                          height="10"
                          rx="2"
                          stroke="currentColor"
                          strokeWidth="2"
                        />

                        <path
                          d="M8 10V7.5C8 5.01 9.79 3 12 3C14.21 3 16 5.01 16 7.5V10"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>

                      <span>
                        {
                          item.label
                        }
                      </span>
                    </button>
                  );
                }


                /*
                 * All normal traveler-navigation items, including
                 * AI Travel Planner for a Premium traveler, remain
                 * regular React Router links.
                 */
                return (
                  <Link
                    /*
                     * "to" is a better React key than label here.
                     *
                     * The Premium item's label changes from
                     * "Upgrade Account" to "Premium User", but
                     * its destination remains /premium.
                     *
                     * A stable key avoids unnecessarily replacing
                     * that Link when only its text changes.
                     */
                    key={
                      item.to
                    }
                    to={
                      item.to
                    }
                    className={[
                      'block rounded-lg px-4 py-3 text-center text-sm transition',

                      active
                        ? 'bg-[#DCEFE4] font-semibold text-[#0F6B4D]'
                        : 'bg-[#EEF7F2] text-[#17211D] hover:bg-[#DFF0E6]',
                    ].join(
                      ' '
                    )}
                  >
                    {
                      item.label
                    }
                  </Link>
                );
              }
            )}
          </nav>
        </aside>

        {/* Outlet displays whichever traveler page matches
            the current route.

            This lets Premium reuse exactly the same workspace
            as Trips, Hotels, Bookings, Payments, Event Rooms
            and the AI Travel Planner. */}
        <main className="min-w-0 flex-1 px-5 py-7 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}


export default TripWorkspace;