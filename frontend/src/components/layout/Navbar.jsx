import { useState } from 'react';

import {
  Link,
  useNavigate,
} from 'react-router-dom';

import Button from '../common/Button';
import useAuth from '../../features/auth/hooks/useAuth';

// These labels convert the role values stored in MongoDB into text that is
// easier to read in the navigation bar.
const ROLE_LABELS = {
  traveler: 'Traveler',
  hotel: 'Hotel vendor',
  guide: 'Tour guide',
  admin: 'Admin',
};

/**
 * Displays the shared navigation bar for the application.
 *
 * Authentication behavior:
 *
 * - While the existing session is being checked, the Navbar shows a small
 *   loading message instead of briefly displaying the wrong controls.
 * - Logged-out users see links to Login and Register.
 * - Logged-in users see their name, role, and a Logout button.
 * - Logout uses AuthProvider.logout(), which asks the backend to remove the
 *   HTTP-only cookie and then clears the user from React state.
 */
function Navbar() {
  const {
    user,
    isAuthenticated,
    isInitializing,
    logout,
  } = useAuth();

  // useNavigate allows the Navbar to send the user to /login after logout.
  const navigate = useNavigate();

  // Prevent repeated logout requests while one request is already running.
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Stores an unexpected logout error, such as the backend being unavailable.
  const [logoutError, setLogoutError] = useState('');

  /**
   * Logs the current user out through AuthProvider.
   */
  async function handleLogout() {
    setLogoutError('');
    setIsLoggingOut(true);

    try {
      // AuthProvider.logout() sends POST /api/v1/auth/logout.
      //
      // After the backend confirms that the HTTP-only cookie was removed,
      // AuthProvider also clears the user from React state.
      await logout();

      // Send the logged-out user to the login page.
      navigate('/login', {
        replace: true,
      });
    } catch (error) {
      // Do not pretend the user was logged out when the backend request failed.
      //
      // Keeping the current authentication state is safer than clearing the
      // frontend state while a valid backend cookie may still exist.
      const responseMessage = error.response?.data?.message;

      setLogoutError(
        responseMessage ||
          'Logout could not be completed. Please try again.'
      );
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-3">
        {/* The project name always returns the user to the public homepage. */}
        <Link
          to="/"
          className="text-xl font-bold text-emerald-700"
        >
          Ghuraghuri
        </Link>

        {/* Wait for the initial /auth/me request before choosing which
            authentication controls should be displayed. */}
        {isInitializing ? (
          <span
            className="text-sm font-medium text-slate-500"
            role="status"
          >
            Checking session...
          </span>
        ) : isAuthenticated ? (
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            {/* Display the latest user information stored by AuthProvider. */}
            <div className="text-right">
              <p className="max-w-40 truncate text-sm font-semibold text-slate-800 sm:max-w-56">
                {user.name}
              </p>

              <p className="text-xs text-slate-500">
                {ROLE_LABELS[user.role] || user.role}
              </p>
            </div>

            <Button
              type="button"
              variant="secondary"
              disabled={isLoggingOut}
              onClick={handleLogout}
            >
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </Button>
          </div>
        ) : (
          <nav
            className="flex items-center gap-2"
            aria-label="Authentication"
          >
            <Link
              to="/login"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Log in
            </Link>

            <Link
              to="/register"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Register
            </Link>
          </nav>
        )}
      </div>

      {/* Logout failures are shown separately so the user knows that their
          authenticated session may still be active. */}
      {logoutError && (
        <div
          className="mx-auto max-w-7xl px-6 pb-3 text-right text-sm text-red-600"
          role="alert"
        >
          {logoutError}
        </div>
      )}
    </header>
  );
}

export default Navbar;