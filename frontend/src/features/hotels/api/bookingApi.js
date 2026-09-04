import apiClient from '../../../api/axiosClient';

/*
 * ------------------------------------------------------------
 * HOTEL BOOKING API
 * ------------------------------------------------------------
 *
 * This file contains frontend API functions related to hotel
 * reservations.
 *
 * Axios configuration, authentication cookies and the base URL
 * are handled by the shared apiClient.
 */

/*
 * Traveler creates a hotel booking.
 */
async function createBooking(
  bookingData
) {
  const response =
    await apiClient.post(
      '/bookings',
      bookingData
    );

  return response.data;
}

/*
 * Traveler retrieves all of their own hotel bookings.
 */
async function getTravelerBookings() {
  const response =
    await apiClient.get(
      '/bookings/traveler/me'
    );

  return response.data;
}

/*
 * Traveler or hotel vendor retrieves one booking.
 *
 * The backend verifies ownership before returning it.
 */
async function getBookingById(
  bookingId
) {
  const response =
    await apiClient.get(
      `/bookings/${bookingId}`
    );

  return response.data;
}

/*
 * Approved hotel vendor retrieves incoming bookings belonging
 * only to their own hotels.
 */
async function getVendorBookings() {
  const response =
    await apiClient.get(
      '/bookings/vendor/me'
    );

  return response.data;
}

/*
 * ------------------------------------------------------------
 * UPDATE HOTEL BOOKING STATUS
 * ------------------------------------------------------------
 *
 * Approved hotel vendors use this function to manage incoming
 * reservation requests.
 *
 * Backend route:
 *
 * PATCH /api/v1/bookings/vendor/me/:bookingId/status
 *
 * Supported transitions:
 *
 * pending
 *   -> confirmed
 *   -> declined
 *
 * confirmed
 *   -> completed
 *
 * The frontend sends only the requested next status.
 *
 * The backend still verifies:
 *
 * - authentication
 * - hotel role
 * - provider approval
 * - booking ownership
 * - valid status transition
 *
 * Therefore changing frontend JavaScript cannot bypass the
 * booking lifecycle rules.
 */
async function updateVendorBookingStatus(
  bookingId,
  bookingStatus
) {
  const response =
    await apiClient.patch(
      `/bookings/vendor/me/${bookingId}/status`,
      {
        bookingStatus,
      }
    );

  return response.data;
}

export {
  createBooking,
  getBookingById,
  getTravelerBookings,
  getVendorBookings,
  updateVendorBookingStatus,
};