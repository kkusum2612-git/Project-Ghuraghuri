import { Link, Outlet, useLocation } from 'react-router-dom';

import useAuth from '../../auth/hooks/useAuth';

function GuideWorkspace() {
  const { user } = useAuth();
  const location = useLocation();

  const menuItems = [
    {
      label: 'Dashboard',
      to: '/guide/dashboard',
    },
    {
      label: 'My Profile',
      to: '/guide/profile',
    },
    {
      label: 'My Tours',
      to: '/guide/tours',
    },
  ];

  function isActive(path) {
    return location.pathname === path;
  }

  const approvalLabel =
    user?.approvalStatus === 'approved'
      ? 'Verified'
      : user?.approvalStatus === 'rejected'
        ? 'Rejected'
        : 'Pending Approval';

  const approvalClass =
    user?.approvalStatus === 'approved'
      ? 'bg-[#DDF1E5] text-[#0F6B4D]'
      : user?.approvalStatus === 'rejected'
        ? 'bg-red-100 text-red-700'
        : 'bg-amber-100 text-amber-700';

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#F6F8F7]">
      <div className="flex">
        <aside className="sticky top-16 hidden h-[calc(100vh-64px)] w-60 shrink-0 border-r border-[#DCE5E0] bg-white lg:block">
          <div className="border-b border-[#E5ECE8] px-5 py-6">
            <div className="flex items-center gap-3">
              {user?.profileImageUrl ? (
                <img
                  src={user.profileImageUrl}
                  alt={user.name || 'Guide'}
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#DDF1E5] text-lg font-bold text-[#0F6B4D]">
                  {user?.name?.charAt(0)?.toUpperCase() || 'G'}
                </div>
              )}

              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-[#17211D]">
                  {user?.name || 'Tour Guide'}
                </p>

                <p className="text-xs text-[#66756D]">Tour Guide</p>

                <span
                  className={[
                    'mt-1 inline-block rounded px-2 py-0.5 text-[10px] font-semibold',
                    approvalClass,
                  ].join(' ')}
                >
                  {approvalLabel}
                </span>
              </div>
            </div>
          </div>

          <nav className="space-y-2 px-4 py-6">
            {menuItems.map((item) => {
              const active = isActive(item.to);

              return (
                <Link
                  key={item.label}
                  to={item.to}
                  className={[
                    'block rounded-lg px-4 py-3 text-sm transition',
                    active
                      ? 'bg-[#E9F6F0] font-semibold text-[#08734F]'
                      : 'text-[#33413A] hover:bg-[#F1F7F4]',
                  ].join(' ')}
                >
                  {item.label}
                </Link>
              );
            })}

            <div className="my-5 border-t border-[#E5ECE8]" />

            <p className="px-4 pb-2 text-[11px] font-semibold uppercase tracking-wide text-[#8A9790]">
              Coming Later
            </p>

            {['Bookings', 'Earnings', 'Reviews', 'Analytics', 'Messages'].map((label) => (
              <div
                key={label}
                className="cursor-not-allowed rounded-lg px-4 py-3 text-sm text-[#A0AAA5]"
                title="This feature belongs to a later module."
              >
                {label}
              </div>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 px-5 py-7 lg:px-8">
          {user?.approvalStatus === 'pending' && (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Your guide account is waiting for administrator approval. You can complete your
              profile and tour packages now, but your listing will not appear publicly until
              approval.
            </div>
          )}

          {user?.approvalStatus === 'rejected' && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Your guide application was rejected. You can update your profile details before
              contacting the administrator for another review.
            </div>
          )}

          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default GuideWorkspace;
