import { useContext } from 'react';

import AuthContext from '../context/AuthContext';

/**
 * Provides convenient access to the authentication context.
 *
 * Example:
 *
 * const {
 *   user,
 *   isAuthenticated,
 *   login,
 *   logout,
 * } = useAuth();
 *
 * @returns {object}
 * The authentication context value.
 */
function useAuth() {
  const authContext = useContext(AuthContext);

  // This produces a clear development error when someone accidentally uses
  // the hook outside AuthProvider.
  if (!authContext) {
    throw new Error(
      'useAuth must be used inside an AuthProvider.'
    );
  }

  return authContext;
}

export default useAuth;