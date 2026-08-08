import { useState } from 'react';

import {
  Link,
  Navigate,
  useNavigate,
} from 'react-router-dom';

import Button from '../components/common/Button';
import useAuth from '../features/auth/hooks/useAuth';

// These are the initial values used by the controlled registration form.
//
// The public registration API allows traveler, hotel, and guide accounts.
// Administrator accounts cannot be created through public registration.
const INITIAL_FORM_DATA = {
  name: '',
  email: '',
  phone: '',
  role: 'traveler',
  password: '',
  confirmPassword: '',
};

// These options match the roles accepted by the backend registration validator.
const ROLE_OPTIONS = [
  {
    value: 'traveler',
    label: 'Traveler',
  },
  {
    value: 'hotel',
    label: 'Hotel vendor',
  },
  {
    value: 'guide',
    label: 'Tour guide',
  },
];

// This information explains the approval behavior associated with each role.
const ROLE_DESCRIPTIONS = {
  traveler:
    'Traveler accounts can begin using traveler features immediately.',
  hotel:
    'Hotel vendor accounts require administrator approval before protected vendor operations become available.',
  guide:
    'Tour guide accounts require administrator approval before protected guide operations become available.',
};

/**
 * Performs basic browser-side checks before sending the form to the backend.
 *
 * These checks improve the user experience, but they do not replace backend
 * validation. The backend remains responsible for enforcing all registration
 * requirements and protecting the database.
 *
 * @param {object} formData
 * The current registration-form values.
 *
 * @returns {object}
 * An object containing messages indexed by field name.
 */
function validateRegistrationForm(formData) {
  const errors = {};

  if (!formData.name.trim()) {
    errors.name = 'Name is required.';
  }

  if (!formData.email.trim()) {
    errors.email = 'Email address is required.';
  }

  if (!formData.phone.trim()) {
    errors.phone = 'Phone number is required.';
  }

  if (!formData.role) {
    errors.role = 'Please select an account type.';
  }

  if (!formData.password) {
    errors.password = 'Password is required.';
  }

  if (!formData.confirmPassword) {
    errors.confirmPassword = 'Please confirm your password.';
  } else if (formData.password !== formData.confirmPassword) {
    errors.confirmPassword = 'The passwords do not match.';
  }

  return errors;
}

/**
 * Displays the account-registration page and connects it to AuthProvider.
 *
 * Successful registration flow:
 *
 * 1. The user enters their account information.
 * 2. The page performs basic browser-side validation.
 * 3. register() sends POST /api/v1/auth/register.
 * 4. The backend validates the data and hashes the password.
 * 5. The backend creates the MongoDB user and HTTP-only JWT cookie.
 * 6. AuthProvider stores the returned user in React state.
 * 7. The page redirects the authenticated user to the home page.
 */
function RegisterPage() {
  const {
    authError,
    isAuthenticated,
    isInitializing,
    register,
  } = useAuth();

  // useNavigate allows the page to redirect after successful registration.
  const navigate = useNavigate();

  const [formData, setFormData] = useState(
    INITIAL_FORM_DATA
  );

  // Stores messages that belong to individual registration fields.
  //
  // Example:
  //
  // {
  //   email: 'This email address is already registered.',
  //   password: 'Password must contain at least one uppercase letter.'
  // }
  const [fieldErrors, setFieldErrors] = useState({});

  // Stores an error that applies to the complete registration attempt.
  //
  // Examples:
  // - an unexpected backend response;
  // - unavailable backend server;
  // - a general account-creation failure.
  const [submitError, setSubmitError] = useState('');

  // Prevents repeated submissions while registration is running.
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Updates one form value whenever its input or select element changes.
   *
   * @param {React.ChangeEvent<HTMLInputElement | HTMLSelectElement>} event
   * The browser field-change event.
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

    // Remove only the error belonging to the field being corrected.
    //
    // When the password changes, also remove an old confirmation mismatch
    // because the relationship between the two password fields has changed.
    setFieldErrors((currentErrors) => {
      const fieldsToClear =
        name === 'password'
          ? ['password', 'confirmPassword']
          : [name];

      const hasErrorToClear = fieldsToClear.some(
        (field) => currentErrors[field]
      );

      if (!hasErrorToClear) {
        return currentErrors;
      }

      const updatedErrors = {
        ...currentErrors,
      };

      fieldsToClear.forEach((field) => {
        delete updatedErrors[field];
      });

      return updatedErrors;
    });

    // Remove the previous general error after the user edits the form.
    setSubmitError('');
  }

  /**
   * Converts backend registration errors into messages the form can display.
   *
   * The backend returns errors using this structure:
   *
   * [
   *   {
   *     field: 'email',
   *     message: 'This email address is already registered.'
   *   }
   * ]
   *
   * @param {unknown} error
   * The Axios or JavaScript error produced during registration.
   */
  function handleRegistrationError(error) {
    // Axios places the backend response body inside error.response.data.
    const responseData = error.response?.data;

    const backendErrors = Array.isArray(responseData?.errors)
      ? responseData.errors
      : [];

    const supportedFieldNames = new Set([
      'name',
      'email',
      'phone',
      'role',
      'password',
    ]);

    const nextFieldErrors = {};
    let nextSubmitError = '';

    backendErrors.forEach((backendError) => {
      const field = backendError?.field;
      const message = backendError?.message;

      // Ignore malformed error objects instead of displaying invalid content.
      if (typeof message !== 'string' || !message) {
        return;
      }

      // These messages belong directly below their associated inputs.
      if (supportedFieldNames.has(field)) {
        nextFieldErrors[field] = message;
        return;
      }

      // Account or authentication errors concern the complete request.
      if (
        field === 'account' ||
        field === 'authentication'
      ) {
        nextSubmitError = message;
      }
    });

    setFieldErrors(nextFieldErrors);

    // Prefer the most specific available error message.
    setSubmitError(
      nextSubmitError ||
        responseData?.message ||
        error.message ||
        'Account registration could not be completed.'
    );
  }

  /**
   * Validates and submits the registration form.
   *
   * @param {React.FormEvent<HTMLFormElement>} event
   * The browser form-submission event.
   */
  async function handleSubmit(event) {
    // Prevent the browser from reloading the complete page.
    event.preventDefault();

    setSubmitError('');

    // Perform the basic browser-side checks before contacting the backend.
    const clientErrors = validateRegistrationForm(
      formData
    );

    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      // confirmPassword is deliberately excluded because it is a frontend-only
      // field. The backend needs only the actual password.
      await register({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        role: formData.role,
        password: formData.password,
      });

      // Registration also creates an authenticated cookie session, so the
      // newly registered user can proceed directly to the application.
      navigate('/', {
        replace: true,
      });
    } catch (error) {
      handleRegistrationError(error);
    } finally {
      // Re-enable the form regardless of success or failure.
      setIsSubmitting(false);
    }
  }

  // AuthProvider checks /api/v1/auth/me when the application starts.
  //
  // Wait for that request before deciding whether the registration page should
  // appear. This prevents a logged-in user from briefly seeing the form.
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

  // An authenticated user does not need to create another account.
  if (isAuthenticated) {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }

  const selectedRoleDescription =
    ROLE_DESCRIPTIONS[formData.role];

  return (
    <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-start gap-12 px-6 py-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
      {/* Supporting introduction shown beside the form on larger screens. */}
      <div className="hidden lg:block">
        <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
          Join Ghuraghuri
        </p>

        <h1 className="mt-3 max-w-xl text-4xl font-bold tracking-tight text-slate-900">
          Create an account for your travel journey
        </h1>

        <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
          Discover destinations, collaborate with other
          travelers, manage bookings, join public event rooms,
          and build better travel plans.
        </p>

        <div className="mt-8 rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
          <h2 className="font-semibold text-emerald-900">
            Account approval
          </h2>

          <p className="mt-2 text-sm leading-6 text-emerald-800">
            Traveler accounts are available immediately. Hotel
            vendor and tour guide accounts remain pending until
            an administrator approves them.
          </p>
        </div>
      </div>

      {/* The main registration-form card. */}
      <div className="mx-auto w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div>
          {/* This smaller label replaces the hidden desktop introduction. */}
          <p className="text-sm font-semibold text-emerald-700 lg:hidden">
            Join Ghuraghuri
          </p>

          <h2 className="mt-1 text-2xl font-bold text-slate-900">
            Create your account
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Enter your information and select the account type
            that matches how you will use Ghuraghuri.
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

        {/* Display an error concerning the complete registration attempt. */}
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
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="register-name"
                className="block text-sm font-semibold text-slate-700"
              >
                Full name
              </label>

              <input
                id="register-name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleInputChange}
                autoComplete="name"
                required
                disabled={isSubmitting}
                aria-invalid={Boolean(fieldErrors.name)}
                aria-describedby={
                  fieldErrors.name
                    ? 'register-name-error'
                    : undefined
                }
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                placeholder="Your full name"
              />

              {fieldErrors.name && (
                <p
                  id="register-name-error"
                  className="mt-2 text-sm text-red-600"
                >
                  {fieldErrors.name}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="register-email"
                className="block text-sm font-semibold text-slate-700"
              >
                Email address
              </label>

              <input
                id="register-email"
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
                    ? 'register-email-error'
                    : undefined
                }
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                placeholder="you@example.com"
              />

              {fieldErrors.email && (
                <p
                  id="register-email-error"
                  className="mt-2 text-sm text-red-600"
                >
                  {fieldErrors.email}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="register-phone"
                className="block text-sm font-semibold text-slate-700"
              >
                Phone number
              </label>

              <input
                id="register-phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleInputChange}
                autoComplete="tel"
                required
                disabled={isSubmitting}
                aria-invalid={Boolean(fieldErrors.phone)}
                aria-describedby={
                  fieldErrors.phone
                    ? 'register-phone-error'
                    : undefined
                }
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                placeholder="01700000000"
              />

              {fieldErrors.phone && (
                <p
                  id="register-phone-error"
                  className="mt-2 text-sm text-red-600"
                >
                  {fieldErrors.phone}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="register-role"
                className="block text-sm font-semibold text-slate-700"
              >
                Account type
              </label>

              <select
                id="register-role"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                required
                disabled={isSubmitting}
                aria-invalid={Boolean(fieldErrors.role)}
                aria-describedby="register-role-help"
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                {ROLE_OPTIONS.map((roleOption) => (
                  <option
                    key={roleOption.value}
                    value={roleOption.value}
                  >
                    {roleOption.label}
                  </option>
                ))}
              </select>

              <p
                id="register-role-help"
                className="mt-2 text-xs leading-5 text-slate-500"
              >
                {selectedRoleDescription}
              </p>

              {fieldErrors.role && (
                <p className="mt-2 text-sm text-red-600">
                  {fieldErrors.role}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="register-password"
                className="block text-sm font-semibold text-slate-700"
              >
                Password
              </label>

              <input
                id="register-password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                autoComplete="new-password"
                required
                disabled={isSubmitting}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={
                  fieldErrors.password
                    ? 'register-password-help register-password-error'
                    : 'register-password-help'
                }
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                placeholder="Create a password"
              />

              <p
                id="register-password-help"
                className="mt-2 text-xs leading-5 text-slate-500"
              >
                Use at least 8 characters with uppercase,
                lowercase, and numeric characters.
              </p>

              {fieldErrors.password && (
                <p
                  id="register-password-error"
                  className="mt-2 text-sm text-red-600"
                >
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="register-confirm-password"
                className="block text-sm font-semibold text-slate-700"
              >
                Confirm password
              </label>

              <input
                id="register-confirm-password"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                autoComplete="new-password"
                required
                disabled={isSubmitting}
                aria-invalid={Boolean(
                  fieldErrors.confirmPassword
                )}
                aria-describedby={
                  fieldErrors.confirmPassword
                    ? 'register-confirm-password-error'
                    : undefined
                }
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                placeholder="Enter the password again"
              />

              {fieldErrors.confirmPassword && (
                <p
                  id="register-confirm-password-error"
                  className="mt-2 text-sm text-red-600"
                >
                  {fieldErrors.confirmPassword}
                </p>
              )}
            </div>
          </div>

          <Button
            type="submit"
            className="w-full py-2.5"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? 'Creating account...'
              : 'Create account'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-semibold text-emerald-700 hover:text-emerald-800"
          >
            Log in
          </Link>
        </p>
      </div>
    </section>
  );
}

export default RegisterPage;