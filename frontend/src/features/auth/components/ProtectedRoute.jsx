import {
  Navigate,
  Outlet,
  useLocation,
} from 'react-router-dom';

import useAuth from '../hooks/useAuth';

/**
 * Protects frontend routes that require an authenticated user.
 *
 * This component controls frontend navigation only.
 *
 * It does NOT replace backend authentication or authorization. Every protected
 * API must still verify the user's authentication, role, ownership, membership,
 * approval status, or other permissions on the backend.
 *
 * Route behavior:
 *
 * 1. Wait while AuthProvider checks the existing cookie session.
 * 2. If the user is authenticated, render the requested protected route.
 * 3. If the user is not authenticated, redirect them to /login.
 * 4. Remember the originally requested route so LoginPage can return the user
 *    there after a successful login.
 */
function ProtectedRoute() {
  const {
    isAuthenticated,
    isInitializing,
  } = useAuth();

  // useLocation gives us the route that the user originally attempted to open.
  //
  // We pass this location to /login through navigation state so LoginPage can
  // return the user to the same route after successful authentication.
  const location = useLocation();

  // AuthProvider calls GET /api/v1/auth/me when the application first loads.
  //
  // Do not redirect while that request is still running. Otherwise, a user
  // with a valid cookie could briefly be sent to /login before authentication
  // has been restored.
  if (isInitializing) {
    return (
      <section className="flex min-h-[70vh] items-center justify-center px-6">
        <p
          className="text-sm font-medium text-slate-600"
          role="status"
        >
          Checking your login session...
        </p>
      </section>
    );
  }

  // A logged-out user is sent to the login page.
  //
  // "replace" prevents the redirect itself from creating an unnecessary
  // browser-history entry.
  //
  // The original location is preserved in state.from. LoginPage already reads
  // this value and redirects back there after successful login.
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location,
        }}
      />
    );
  }

  // Outlet renders the nested protected route selected by React Router.
  //
  // Example:
  //
  // <Route element={<ProtectedRoute />}>
  //   <Route path="/rooms/create" element={<CreateRoomPage />} />
  // </Route>
  return <Outlet />;
}

export default ProtectedRoute;