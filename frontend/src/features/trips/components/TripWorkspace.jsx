import {
  Link,
  Outlet,
  useLocation,
} from 'react-router-dom';

import useAuth from '../../auth/hooks/useAuth';

function TripWorkspace() {
  const { user } = useAuth();
  const location = useLocation();

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
   *
   * Payments has its own navigation item because it now acts
   * as a shared transaction-history area rather than being
   * limited to hotel bookings.
   */
  const menuItems = [
    {
      label: 'My Trips',
      to: '/trips',
    },
    {
      label: 'Hotels',
      to: '/hotels',
    },
    {
      label: 'Bookings',
      to: '/bookings',
    },
    {
      label: 'Payments',
      to: '/payments',
    },

    // Rafi - Module 1, Feature 1:
    // Public Event Room Creation & Discovery.
    {
      label: 'Event Rooms',
      to: '/event-rooms',
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
  function isActive(item) {
    return (
      location.pathname === item.to ||
      location.pathname.startsWith(
        `${item.to}/`
      )
    );
  }

  return (
    <div className="min-h-[calc(100vh-72px)] bg-[#F7FAF8]">
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
                  ?.toUpperCase() || 'T'}
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
                  isActive(item);

                return (
                  <Link
                    key={item.label}
                    to={item.to}
                    className={[
                      'block rounded-lg px-4 py-3 text-center text-sm transition',

                      active
                        ? 'bg-[#DCEFE4] font-semibold text-[#0F6B4D]'
                        : 'bg-[#EEF7F2] text-[#17211D] hover:bg-[#DFF0E6]',
                    ].join(' ')}
                  >
                    {item.label}
                  </Link>
                );
              }
            )}
          </nav>
        </aside>

        {/* Outlet displays whichever traveler page matches
            the current route.

            This lets Payments reuse exactly the same workspace
            as Trips, Hotels, Bookings and Event Rooms. */}
        <main className="min-w-0 flex-1 px-5 py-7 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default TripWorkspace;