import {
  Link,
  Outlet,
  useLocation,
} from 'react-router-dom';

//gives us state for opening and closing the mobile sidebar

import {
  useEffect,
  useState,
} from 'react';

import useAuth from '../../auth/hooks/useAuth';

function HotelVendorWorkspace() {
  const { user } = useAuth();

  // Controls the navigation sidebar drawer on smaller screens.
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

     {/* Smaller screens use a button instead of the desktop sidebar. */}
      <div className="border-b border-[#E1E8E4] bg-white px-5 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-[#DCE5E0] px-4 py-2 text-sm font-semibold text-[#17211D] transition hover:bg-[#F3F7F5]"
        >
          <span aria-hidden="true">☰</span>
          Menu
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Clicking outside the drawer closes it. */}
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setIsMobileMenuOpen(false)}
            className="absolute inset-0 bg-black/30"
          />

          <aside className="relative z-10 h-full w-72 max-w-[85vw] overflow-y-auto bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E1E8E4] px-5 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#DDF1E5] font-bold text-[#0F6B4D]">
                  {user?.name
                    ?.charAt(0)
                    ?.toUpperCase() || 'H'}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[#17211D]">
                    {user?.name || 'Hotel Vendor'}
                  </p>

                  <p className="text-xs text-[#66756D]">
                    Hotel Vendor
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2 text-xl text-[#66756D] hover:bg-[#F3F7F5]"
                aria-label="Close menu"
              >
                ×
              </button>
            </div>

            <nav className="space-y-2 p-4">
              {menuItems.map((item) => {
                const active = isActive(item);

                return (
                  <Link
                    key={item.label}
                    to={item.to}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={[
                      'block rounded-lg px-4 py-3 text-sm transition',
                      active
                        ? 'bg-[#DCEFE4] font-semibold text-[#0F6B4D]'
                        : 'text-[#17211D] hover:bg-[#EEF7F2]',
                    ].join(' ')}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}
      

      <div className="flex">
        {/* Left sidebar */}
        <aside className="sticky top-16 hidden h-[calc(100vh-64px)] w-60 shrink-0 border-r border-[#DCE5E0] bg-white lg:block">
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