import {
  Navigate,
  Outlet,
} from 'react-router-dom';

import useAuth from '../../auth/hooks/useAuth';

function HotelVendorRoute() {
  const {
    user,
    isInitializing,
  } = useAuth();

  if (isInitializing) {
    return (
      <section className="flex min-h-[70vh] items-center justify-center px-6">
        <p className="text-sm font-medium text-slate-600">
          Checking hotel vendor access...
        </p>
      </section>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  if (user.role !== 'hotel') {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }

  if (user.approvalStatus === 'rejected') {
  return (
    <section className="flex min-h-[70vh] items-center justify-center px-6">
      <div className="w-full max-w-2xl rounded-xl border border-red-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-[#101820]">
          Application Rejected
        </h1>

        <p className="mt-3 text-[#667078]">
          Your hotel vendor application was rejected by an administrator.
          You cannot access hotel vendor features with this account.
        </p>
      </div>
    </section>
  );
}

  if (user.approvalStatus !== 'approved') {
    return (
      <section className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center px-6">
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">
            Approval Required
          </h1>

          <p className="mt-3 text-slate-600">
            Your hotel vendor account is waiting for administrator approval.
            You can access the hotel vendor dashboard after your account has
            been approved.
          </p>
        </div>
      </section>
    );
  }

  return <Outlet />;
}

export default HotelVendorRoute;