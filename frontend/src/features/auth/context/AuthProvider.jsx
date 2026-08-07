import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  getCurrentUser,
  loginUser as sendLoginRequest,
  logoutUser as sendLogoutRequest,
  registerUser as sendRegistrationRequest,
} from '../api/authApi';

import AuthContext from './AuthContext';

/**
 * Makes authentication state and operations available throughout React.
 *
 * Components wrapped by this provider will be able to access:
 *
 * - user
 * - isAuthenticated
 * - isInitializing
 * - authError
 * - register
 * - login
 * - logout
 * - refreshCurrentUser
 *
 * @param {object} props
 * The normal React component properties.
 *
 * @param {React.ReactNode} props.children
 * The application content wrapped by this provider.
 */
function AuthProvider({ children }) {
  // null means that no authenticated user is currently known.
  const [user, setUser] = useState(null);

  // This is true while the application performs its first /auth/me request.
  //
  // Protected routes will later use this value to avoid redirecting the user
  // before the existing cookie session has been checked.
  const [isInitializing, setIsInitializing] = useState(true);

  // This is reserved for unexpected session-checking errors, such as the
  // backend being unavailable.
  //
  // Normal HTTP 401 and 403 responses are treated as logged-out states.
  const [authError, setAuthError] = useState(null);

  /**
   * Loads the latest authenticated user from the backend.
   *
   * The HTTP-only JWT cannot be read directly by React. Instead, the browser
   * sends the cookie automatically and the backend verifies it.
   *
   * @returns {Promise<object|null>}
   * The authenticated user or null when no usable session exists.
   */
  const refreshCurrentUser = useCallback(async () => {
    setIsInitializing(true);
    setAuthError(null);

    try {
      const result = await getCurrentUser();
      const currentUser = result?.data?.user ?? null;

      setUser(currentUser);

      return currentUser;
    } catch (error) {
      const statusCode = error.response?.status;

      // HTTP 401 means that the user is not logged in.
      //
      // HTTP 403 may mean that the account has been suspended or disabled.
      // The backend clears the cookie in that situation.
      if (statusCode === 401 || statusCode === 403) {
        setUser(null);
        return null;
      }

      // Unexpected failures should not leave an old user in memory.
      setUser(null);
      setAuthError(
        'The application could not verify your login session.'
      );

      return null;
    } finally {
      setIsInitializing(false);
    }
  }, []);

  /**
   * Creates an account and stores the returned user in React state.
   *
   * The backend also sets the HTTP-only authentication cookie.
   *
   * Errors are allowed to continue to the registration page so it can display
   * field-specific messages returned by the backend.
   *
   * @param {object} registrationData
   * The registration-form information.
   *
   * @returns {Promise<object>}
   * The complete backend response body.
   */
  const register = useCallback(async (registrationData) => {
    setAuthError(null);

    const result = await sendRegistrationRequest(
      registrationData
    );

    const registeredUser = result?.data?.user;

    if (!registeredUser) {
      throw new Error(
        'The registration response did not include user information.'
      );
    }

    setUser(registeredUser);

    return result;
  }, []);

  /**
   * Logs in and stores the authenticated user in React state.
   *
   * @param {{
   *   email: string,
   *   password: string
   * }} credentials
   * The login-form information.
   *
   * @returns {Promise<object>}
   * The complete backend response body.
   */
  const login = useCallback(async (credentials) => {
    setAuthError(null);

    const result = await sendLoginRequest(credentials);
    const authenticatedUser = result?.data?.user;

    if (!authenticatedUser) {
      throw new Error(
        'The login response did not include user information.'
      );
    }

    setUser(authenticatedUser);

    return result;
  }, []);

  /**
   * Asks the backend to remove the HTTP-only authentication cookie.
   *
   * React clears its user state only after the backend confirms logout.
   *
   * @returns {Promise<object>}
   * The complete backend response body.
   */
  const logout = useCallback(async () => {
    setAuthError(null);

    const result = await sendLogoutRequest();

    setUser(null);

    return result;
  }, []);

  // Check whether an existing authentication cookie is valid when the
     // application first loads.
     useEffect(() => {
     // React may clean up an Effect before an asynchronous request finishes.
     //
     // This flag prevents an old request from updating state after the provider
     // has been removed or the Effect has been restarted.
     let ignoreResult = false;

  /**
   * Performs the first authentication check.
   *
   * Unlike refreshCurrentUser(), this function does not synchronously set
   * state before beginning the request. All state updates happen only after
   * the asynchronous request has completed.
   */
  async function initializeAuthentication() {
      try {
      const result = await getCurrentUser();
 
      // Ignore the response when this Effect has already been cleaned up.
      if (ignoreResult) {
          return;
      }
 
      const currentUser = result?.data?.user ?? null;

      setUser(currentUser);
      } catch (error) {
      if (ignoreResult) {
          return;
      }
 
      const statusCode = error.response?.status;

      // A missing, expired, suspended, or disabled session means that the
         // application should begin in the logged-out state.
         setUser(null);
 
         // HTTP 401 and 403 are expected authentication outcomes.
        //
      // Other failures may mean that the backend is unavailable or an
        // unexpected network error occurred.
      if (statusCode !== 401 && statusCode !== 403) {
            setAuthError(
          'The application could not verify your login session.'
            );
      }
        } finally {
         if (!ignoreResult) {
          setIsInitializing(false);
        }
        }
  }
 
    void initializeAuthentication();
 
   // React calls this cleanup function before rerunning the Effect or removing
  // the provider from the page.
    return () => {
       ignoreResult = true;
   };
   }, []);
 
  // Memoizing the context object avoids creating a completely new value during
 // renders where none of these dependencies changed.
 const contextValue = useMemo(
    () => ({
    user,
    isAuthenticated: Boolean(user),
     isInitializing,
     authError,
     register,
     login,
     logout,
     refreshCurrentUser,
   }),
   [
     user,
     isInitializing,
     authError,
    register,
     login,
      logout,
     refreshCurrentUser,
   ]
 );
 
 return (
   <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
 }

export default AuthProvider;