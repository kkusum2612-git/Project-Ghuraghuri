import {
  Navigate,
  Outlet,
} from 'react-router-dom';

import useAuth from '../../auth/hooks/useAuth';

/**
 * Restricts frontend routes to administrator accounts.
 *
 * ProtectedRoute already verifies that the user is authenticated.
 * This component adds the administrator role check.
 *
 * Backend admin APIs are also protected separately with
 * authenticateUser and authorizeRoles('admin').
 */
function AdminRoute() {
  const { user } = useAuth();

  if (user?.role !== 'admin') {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }

  return <Outlet />;
}

export default AdminRoute;