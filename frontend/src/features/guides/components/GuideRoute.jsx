import { Navigate, Outlet } from 'react-router-dom';

import useAuth from '../../auth/hooks/useAuth';

function GuideRoute() {
  const { user, isInitializing } = useAuth();

  if (isInitializing) {
    return (
      <section className="flex min-h-[70vh] items-center justify-center px-6">
        <p className="text-sm font-medium text-slate-600" role="status">
          Checking guide access...
        </p>
      </section>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'guide') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export default GuideRoute;
