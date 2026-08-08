import { useState } from 'react';

import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
} from 'react-router-dom';

import Button from '../components/common/Button';
import useAuth from '../features/auth/hooks/useAuth';

// These are the initial values used by the controlled login form.
//
// A controlled form means that React state stores the current value of each
// input instead of leaving the values only inside the browser's form elements.
const INITIAL_FORM_DATA = {
  email: '',
  password: '',
};

/**
 * Displays the login page and connects it to the shared authentication state.
 *
 * Successful login flow:
 *
 * 1. The user submits an email address and password.
 * 2. login() from AuthProvider sends POST /api/v1/auth/login.
 * 3. The backend verifies the credentials.
 * 4. The backend stores the JWT inside an HTTP-only cookie.
 * 5. AuthProvider stores the returned user in React state.
 * 6. The page redirects the user to the intended page or the home page.
 */
function LoginPage() {
  const {
    authError,
    isAuthenticated,
    isInitializing,
    login,
    user,
  } = useAuth();

  // useLocation provides information about the current route.
  //
  // A protected route will later be able to remember where the user originally
  // wanted to go before redirecting them to the login page.
  const location = useLocation();

  // useNavigate allows the page to redirect after successful login.
  const navigate = useNavigate();

  // Determine where the user should go after authentication.
//
// ProtectedRoute stores the originally requested location in state.from.
// For a normal visit to /login, no previous protected location exists,
// so the public homepage remains the default destination.
const requestedLocation = location.state?.from;

const requestedDestination = requestedLocation
  ? `${requestedLocation.pathname}${requestedLocation.search || ''}${requestedLocation.hash || ''}`
  : null;

const authenticationDestination =
  requestedDestination ||
  (user?.role === 'hotel'
    ? '/hotel/dashboard'
    : '/');

  const [formData, setFormData] = useState(
    INITIAL_FORM_DATA
  );

  // Stores messages that belong to individual form fields.
  //
  // Example:
  //
  // {
  //   email: 'Please enter a valid email address.',
  //   password: 'Password is required.'
  // }
  const [fieldErrors, setFieldErrors] = useState({});

  // Stores an error that applies to the complete login attempt.
  //
  // Examples:
  // - incorrect email and password combination;
  // - suspended or disabled account;
  // - unavailable backend server.
  const [submitError, setSubmitError] = useState('');

  // Prevents repeated submissions while the login request is still running.
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Updates one form value whenever its input changes.
   *
   * @param {React.ChangeEvent<HTMLInputElement>} event
   * The browser input-change event.
   */
  function handleInputChange(event) {
    const {
      name,
      value,
    } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));

    // Remove only the error associated with the input being corrected.
    //
    // Keeping errors for the other fields helps the user understand what
    // information still needs attention.
    setFieldErrors((currentErrors) => {
      if (!currentErrors[name]) {
        return currentErrors;
      }

      const updatedErrors = {
        ...currentErrors,
      };

      delete updatedErrors[name];

      return updatedErrors;
    });

    // Remove the previous general error after the user edits the form.
    setSubmitError('');
  }

  /**
   * Converts backend errors into messages that the form can display.
   *
   * The backend returns field errors using this structure:
   *
   * [
   *   {
   *     field: 'email',
   *     message: 'Please enter a valid email address.'
   *   }
   * ]
   *
   * @param {unknown} error
   * The Axios or JavaScript error produced during login.
   */
  function handleLoginError(error) {
    // Axios places the backend response body inside error.response.data.
    const responseData = error.response?.data;

    const backendErrors = Array.isArray(responseData?.errors)
      ? responseData.errors
      : [];

    const nextFieldErrors = {};
    let nextSubmitError = '';

    backendErrors.forEach((backendError) => {
      const field = backendError?.field;
      const message = backendError?.message;

      // Ignore malformed error objects instead of displaying invalid content.
      if (typeof message !== 'string' || !message) {
        return;
      }

      // Email and password errors belong directly below their inputs.
      if (field === 'email' || field === 'password') {
        nextFieldErrors[field] = message;
        return;
      }

      // These errors concern the complete login attempt rather than one field.
      if (
        field === 'credentials' ||
        field === 'account' ||
        field === 'authentication'
      ) {
        nextSubmitError = message;
      }
    });

    setFieldErrors(nextFieldErrors);

    // Prefer the most specific backend message.
    //
    // Fall back to the general backend message, the JavaScript error message,
    // or a final safe message when no other information exists.
    setSubmitError(
      nextSubmitError ||
        responseData?.message ||
        error.message ||
        'Login could not be completed.'
    );
  }

  /**
   * Sends the submitted form to the authentication provider.
   *
   * @param {React.FormEvent<HTMLFormElement>} event
   * The browser form-submission event.
   */
  async function handleSubmit(event) {
    // Prevent the browser from reloading the entire page.
    event.preventDefault();

    // Remove errors from the previous submission before starting a new one.
    setFieldErrors({});
    setSubmitError('');
    setIsSubmitting(true);

    try {
      const result = await login({
          email: formData.email.trim(),
          password: formData.password,
        });

        const authenticatedUser = result?.data?.user;

        const requestedLocation = location.state?.from;

        if (requestedLocation?.pathname) {
          const requestedPath =
            `${requestedLocation.pathname}` +
            `${requestedLocation.search || ''}` +
            `${requestedLocation.hash || ''}`;

          navigate(requestedPath, {
            replace: true,
          });

          return;
        }

        if (authenticatedUser?.role === 'hotel') {

          navigate('/hotel/dashboard', {
            replace: true,
          });

          return;
        }

        navigate('/', {
          replace: true,
        });

      // A protected route can later redirect a logged-out user to /login and
      // store the original route inside location.state.from.
      //
      // After successful login, return to that route when available.
      // Otherwise, return to the home page.
    //   const destination =
    //     location.state?.from?.pathname || '/';

    //   navigate(destination, {
    //     replace: true,
    //   });

    // Return the user to the protected route they originally requested.
// A normal login that was not caused by ProtectedRoute returns home.

    } catch (error) {
      handleLoginError(error);
    } finally {
      // Re-enable the form regardless of success or failure.
      setIsSubmitting(false);
    }
  }

  // AuthProvider checks /api/v1/auth/me when the application starts.
  //
  // Wait for that request to finish before deciding whether the login form
  // should appear. This prevents a logged-in user from briefly seeing it.
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

  // A user who is already authenticated does not need the login page.
  if (isAuthenticated) {
    return (
      <Navigate
        to={authenticationDestination}
        replace
      />
    );
  }

  return (
    <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-12 px-6 py-12 lg:grid-cols-2">
      {/* Supporting introduction shown beside the form on larger screens. */}
      <div className="hidden lg:block">
        <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
          Welcome back
        </p>

        <h1 className="mt-3 max-w-xl text-4xl font-bold tracking-tight text-slate-900">
          Continue planning your next journey with Ghuraghuri
        </h1>

        <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
          Sign in to manage trips, event rooms, bookings,
          collaborators, rewards, and travel plans.
        </p>
      </div>

      {/* The main login-form card. */}
      <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div>
          {/* This smaller label replaces the hidden desktop introduction. */}
          <p className="text-sm font-semibold text-emerald-700 lg:hidden">
            Welcome back
          </p>

          <h2 className="mt-1 text-2xl font-bold text-slate-900">
            Log in to your account
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Enter the email address and password associated with
            your account.
          </p>
        </div>

        {/* Display unexpected initial session-checking problems. */}
        {authError && (
          <div
            className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
            role="alert"
          >
            {authError}
          </div>
        )}

        {/* Display an error concerning the complete login attempt. */}
        {submitError && (
          <div
            className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            {submitError}
          </div>
        )}

        <form
          className="mt-6 space-y-5"
          onSubmit={handleSubmit}
          noValidate
        >
          <div>
            <label
              htmlFor="login-email"
              className="block text-sm font-semibold text-slate-700"
            >
              Email address
            </label>

            <input
              id="login-email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              autoComplete="email"
              required
              disabled={isSubmitting}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={
                fieldErrors.email
                  ? 'login-email-error'
                  : undefined
              }
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100"
              placeholder="you@example.com"
            />

            {fieldErrors.email && (
              <p
                id="login-email-error"
                className="mt-2 text-sm text-red-600"
              >
                {fieldErrors.email}
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between gap-4">
              <label
                htmlFor="login-password"
                className="block text-sm font-semibold text-slate-700"
              >
                Password
              </label>

              {/* Password recovery is outside the first authentication scope. */}
              <span className="text-xs text-slate-500">
                Password recovery coming later
              </span>
            </div>

            <input
              id="login-password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange}
              autoComplete="current-password"
              required
              disabled={isSubmitting}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={
                fieldErrors.password
                  ? 'login-password-error'
                  : undefined
              }
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100"
              placeholder="Enter your password"
            />

            {fieldErrors.password && (
              <p
                id="login-password-error"
                className="mt-2 text-sm text-red-600"
              >
                {fieldErrors.password}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full py-2.5"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Logging in...' : 'Log in'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Do not have an account?{' '}
          <Link
            to="/register"
            className="font-semibold text-emerald-700 hover:text-emerald-800"
          >
            Create an account
          </Link>
        </p>
      </div>
    </section>
  );
}

export default LoginPage;