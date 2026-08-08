import {
  Link,
  Outlet,
  useLocation,
} from 'react-router-dom';

import useAuth from '../../auth/hooks/useAuth';

function TripWorkspace() {
  const { user } = useAuth();
  const location = useLocation();

  const menuItems = [
    {
      label: 'My Trips',
      to: '/trips',
    },
  ];

  function isActive(item) {
    return location.pathname === item.to;
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#F6F8F7]">
      <div className="flex">
        <aside className="sticky top-16 hidden h-[calc(100vh-64px)] w-56 shrink-0 border-r border-[#DCE5E0] bg-white lg:block">
          <div className="border-b border-[#E5ECE8] px-5 py-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#DDF1E5] text-lg font-bold text-[#0F6B4D]">
                {user?.name
                  ?.charAt(0)
                  ?.toUpperCase() || 'T'}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-[#17211D]">
                  {user?.name || 'Traveler'}
                </p>

                <p className="text-xs text-[#66756D]">
                  Traveler
                </p>
              </div>
            </div>
          </div>

          <nav className="space-y-3 px-4 py-6">
            {menuItems.map((item) => {
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
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 px-5 py-7 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default TripWorkspace;