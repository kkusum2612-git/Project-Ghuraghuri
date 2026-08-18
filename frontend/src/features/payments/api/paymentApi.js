import apiClient from '../../../api/axiosClient';

/*
 * ------------------------------------------------------------
 * SHARED PAYMENT API
 * ------------------------------------------------------------
 *
 * Payment is a cross-feature concern.
 *
 * Hotel bookings use it now.
 * Guide bookings can use the same payment system later.
 *
 * Therefore this file lives under:
 *
 * features/payments/
 *
 * instead of:
 *
 * features/hotels/
 */

/*
 * Start an SSLCOMMERZ payment for one hotel booking.
 *
 * The browser sends only the booking ID.
 *
 * Amount, traveler ID and provider ID are determined
 * securely by the backend.
 */
async function initiateHotelPayment(
  bookingId
) {
  const response =
    await apiClient.post(
      `/payments/hotel/${bookingId}/initiate`
    );

  return response.data;
}

/*
 * Return all payment attempts belonging to the currently
 * authenticated traveler.
 *
 * The Payment model already stores bookingType, so this
 * endpoint can contain:
 *
 * hotel payments now
 * guide payments later
 *
 * in the same history.
 */
async function getTravelerPaymentHistory() {
  const response =
    await apiClient.get(
      '/payments/traveler/me'
    );

  return response.data;
}

export {
  getTravelerPaymentHistory,
  initiateHotelPayment,
};
