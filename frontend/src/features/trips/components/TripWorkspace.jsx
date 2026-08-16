import {
  Link,
  Outlet,
  useLocation,
} from 'react-router-dom';

import useAuth from '../../auth/hooks/useAuth';

function TripWorkspace() {
  const { user } = useAuth();
  const location = useLocation();

  // This is the ONE shared navigation menu used by the
  // traveler workspace.
  //
  // Farhan originally added My Trips.
  // Kusum's work added Hotels and Bookings.
  //
  // Rafi's Feature 1 now adds Event Rooms to this SAME menu.
  //
  // We deliberately do not create a separate Rafi sidebar,
  // because Public Event Rooms are part of the same integrated
  // traveler website.
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

    // Rafi - Module 1, Feature 1:
    // Public Event Room Creation & Discovery.
    {
      label: 'Event Rooms',
      to: '/event-rooms',
    },
  ];

  // Decide which sidebar item should receive the active style.
  //
  // Example:
  //
  // /event-rooms
  //
  // activates Event Rooms.
  //
  // But this also makes:
  //
  // /event-rooms/new
  // /event-rooms/123
  //
  // keep Event Rooms highlighted because both paths begin with:
  //
  // /event-rooms/
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
            existing Farhan/Kusum implementation. */}
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

        {/* Outlet is where React Router displays whichever
            traveler page matches the current URL.

            This is why Event Rooms can reuse the same sidebar
            without creating a new layout. */}
        <main className="min-w-0 flex-1 px-5 py-7 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default TripWorkspace;