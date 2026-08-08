import apiClient from '../../../api/axiosClient';

/**
 * Sends new account information to the registration endpoint.
 *
 * Expected input:
 * {
 *   name: string,
 *   email: string,
 *   phone: string,
 *   password: string,
 *   role: 'traveler' | 'hotel' | 'guide'
 * }
 *
 * The backend validates the information, hashes the password, creates the
 * MongoDB user, and stores a JWT inside an HTTP-only cookie.
 *
 * @param {object} registrationData
 * The information collected from the registration form.
 *
 * @returns {Promise<object>}
 * The JSON response body returned by the backend.
 */
async function registerUser(registrationData) {
  const response = await apiClient.post(
    '/auth/register',
    registrationData
  );

  return response.data;
}

/**
 * Sends an email address and password to the login endpoint.
 *
 * On successful login, the backend stores the JWT in an HTTP-only cookie.
 * The frontend does not receive or manually store the JWT.
 *
 * @param {{
 *   email: string,
 *   password: string
 * }} credentials
 * The information collected from the login form.
 *
 * @returns {Promise<object>}
 * The JSON response body returned by the backend.
 */
async function loginUser(credentials) {
  const response = await apiClient.post(
    '/auth/login',
    credentials
  );

  return response.data;
}

/**
 * Requests the latest information for the authenticated user.
 *
 * The browser automatically sends the authentication cookie because the
 * shared Axios client uses:
 *
 * withCredentials: true
 *
 * @returns {Promise<object>}
 * The current-user response returned by the backend.
 */
async function getCurrentUser() {
  const response = await apiClient.get('/auth/me');

  return response.data;
}

/**
 * Requests logout from the backend.
 *
 * The backend removes the HTTP-only authentication cookie. The frontend
 * cannot directly delete that cookie because browser JavaScript is prevented
 * from accessing HTTP-only cookies.
 *
 * @returns {Promise<object>}
 * The logout response returned by the backend.
 */
async function logoutUser() {
  const response = await apiClient.post('/auth/logout');

  return response.data;
}

export {
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
};