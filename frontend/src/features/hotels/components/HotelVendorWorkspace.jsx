import {
  Link,
  Outlet,
  useLocation,
} from 'react-router-dom';

import { useEffect } from 'react';

import useAuth from '../../auth/hooks/useAuth';

function HotelVendorWorkspace() {
  const { user } = useAuth();

  const location =
    useLocation();

  useEffect(() => {
    if (!location.hash) {
      return;
    }

    const element =
      document.querySelector(
        location.hash
      );

    if (element) {
      window.setTimeout(
        () => {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        },
        50
      );
    }
  }, [location]);

  const menuItems = [
    {
      label: 'Dashboard',
      to: '/hotel/dashboard',
    },
    {
      label: 'My Listings',
      to: '/hotel/dashboard#listings',
    },
    {
      label: 'Add New Hotel',
      to: '/hotel/listings/new',
    },
    {
      label: 'Bookings',
      to: '/hotel/dashboard#bookings',
    },
    {
      label: 'Reviews',
      to: '/hotel/reviews',
    },
  ];

  function isActive(item) {
    if (
      item.to ===
      '/hotel/listings/new'
    ) {
      return (
        location.pathname ===
        '/hotel/listings/new'
      );
    }

    if (
      item.to ===
      '/hotel/reviews'
    ) {
      return (
        location.pathname ===
        '/hotel/reviews'
      );
    }

    if (
      item.to.includes(
        '#listings'
      )
    ) {
      return (
        location.pathname ===
          '/hotel/dashboard' &&
        location.hash ===
          '#listings'
      );
    }

    if (
      item.to.includes(
        '#bookings'
      )
    ) {
      return (
        location.pathname ===
          '/hotel/dashboard' &&
        location.hash ===
          '#bookings'
      );
    }

    return (
      location.pathname ===
        '/hotel/dashboard' &&
      !location.hash
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#F6F8F7]">
      <div className="flex">
        {/* Left sidebar */}
        <aside className="sticky top-16 hidden h-[calc(100vh-64px)] w-56 shrink-0 border-r border-[#DCE5E0] bg-white lg:block">
          {/* Vendor information */}
          <div className="border-b border-[#E5ECE8] px-5 py-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#DDF1E5] text-lg font-bold text-[#0F6B4D]">
                {user?.name
                  ?.charAt(0)
                  ?.toUpperCase() ||
                  'H'}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-[#17211D]">
                  {user?.name ||
                    'Hotel Vendor'}
                </p>

                <p className="text-xs text-[#66756D]">
                  Hotel Vendor
                </p>

                <span className="mt-1 inline-block rounded bg-[#DDF1E5] px-2 py-0.5 text-[10px] font-semibold text-[#0F6B4D]">
                  Verified
                </span>
              </div>
            </div>
          </div>

          {/* Sidebar navigation */}
          <nav className="space-y-3 px-4 py-6">
            {menuItems.map(
              (item) => {
                const active =
                  isActive(item);

                return (
                  <Link
                    key={
                      item.label
                    }
                    to={item.to}
                    className={[
                      'block rounded-lg px-4 py-3 text-center text-sm transition',

                      active
                        ? 'bg-[#DCEFE4] font-semibold text-[#0F6B4D]'
                        : 'bg-[#EEF7F2] text-[#17211D] hover:bg-[#DFF0E6]',
                    ].join(' ')}
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

        {/* Page content */}
        <main className="min-w-0 flex-1 px-5 py-7 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default HotelVendorWorkspace;