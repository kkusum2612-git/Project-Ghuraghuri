import apiClient from '../../../api/axiosClient';

/*
 * ------------------------------------------------------------
 * HOTEL REVIEWS & RATINGS API
 * ------------------------------------------------------------
 *
 * This file keeps all hotel-review HTTP requests in one place.
 *
 * Page components should call these functions instead of
 * working with Axios directly.
 */

/*
 * Traveler submits a review for one completed booking.
 *
 * Expected reviewData:
 *
 * {
 *   bookingId,
 *   rating,
 *   comment
 * }
 *
 * The backend derives hotelId, vendorId and travelerId from
 * the booking and authenticated user.
 */
async function createHotelReview(
  reviewData
) {
  const response =
    await apiClient.post(
      '/reviews',
      reviewData
    );

  return response.data;
}

/*
 * Public reviews for one active hotel.
 *
 * The response contains:
 *
 * - averageRating
 * - reviewCount
 * - reviews
 */
async function getHotelReviews(
  hotelId
) {
  const response =
    await apiClient.get(
      `/reviews/hotel/${hotelId}`
    );

  return response.data;
}

/*
 * Logged-in traveler retrieves all hotel reviews they have
 * submitted.
 *
 * We use this on My Bookings to determine whether a completed
 * booking should show:
 *
 * Leave Review
 *
 * or:
 *
 * Reviewed
 */
async function getTravelerHotelReviews() {
  const response =
    await apiClient.get(
      '/reviews/traveler/me'
    );

  return response.data;
}

/*
 * Approved hotel vendor retrieves reviews belonging only to
 * their own hotel listings.
 */
async function getVendorHotelReviews() {
  const response =
    await apiClient.get(
      '/reviews/vendor/me'
    );

  return response.data;
}

export {
  createHotelReview,
  getHotelReviews,
  getTravelerHotelReviews,
  getVendorHotelReviews,
};