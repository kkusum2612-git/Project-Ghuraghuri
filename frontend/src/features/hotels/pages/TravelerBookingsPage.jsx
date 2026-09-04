import {
  useEffect,
  useState,
} from 'react';

import {
  useNavigate,
  useSearchParams,
} from 'react-router-dom';

import {
  getTravelerBookings,
} from '../api/bookingApi';

import {
  createHotelReview,
  getTravelerHotelReviews,
} from '../api/hotelReviewApi';

import {
  initiateHotelPayment,
} from '../../payments/api/paymentApi';

/*
 * ------------------------------------------------------------
 * FORMATTING HELPERS
 * ------------------------------------------------------------
 */

function formatMoney(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return '\u09F30';
  }

  return `\u09F3${amount.toLocaleString()}`;
}

function formatDate(value) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '—';
  }

  return new Intl.DateTimeFormat(
    'en-GB',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }
  ).format(date);
}

/*
 * ------------------------------------------------------------
 * STATUS STYLES
 * ------------------------------------------------------------
 */

function getBookingStatusStyle(
  status
) {
  switch (status) {
    case 'confirmed':
      return 'bg-[#DDF1E5] text-[#0F6B4D]';

    case 'completed':
      return 'bg-[#E4EEF9] text-[#315E8A]';

    case 'declined':
    case 'cancelled':
      return 'bg-red-50 text-red-600';

    case 'pending':
    default:
      return 'bg-[#FFF4D6] text-[#8A6816]';
  }
}

function getPaymentStatusStyle(
  status
) {
  switch (status) {
    case 'paid':
      return 'bg-[#DDF1E5] text-[#0F6B4D]';

    case 'failed':
      return 'bg-red-50 text-red-600';

    case 'refunded':
      return 'bg-[#E4EEF9] text-[#315E8A]';

    case 'unpaid':
    default:
      return 'bg-[#EEF0EF] text-[#66756D]';
  }
}

/*
 * A booking may start payment only when:
 *
 * - it has not already been paid
 * - the reservation itself is still payable
 *
 * The backend repeats these checks for security.
 */
function canPayBooking(booking) {
  if (
    booking.paymentStatus ===
    'paid'
  ) {
    return false;
  }

  const nonPayableStatuses =
    new Set([
      'declined',
      'cancelled',
      'completed',
    ]);

  return !nonPayableStatuses.has(
    booking.bookingStatus
  );
}

/*
 * ------------------------------------------------------------
 * PAYMENT RESULT BANNER
 * ------------------------------------------------------------
 */

function getPaymentResultMessage(
  paymentResult
) {
  switch (paymentResult) {
    case 'success':
      return {
        style:
          'border-[#B9DFC8] bg-[#EDF8F1] text-[#0F6B4D]',

        title:
          'Payment completed successfully',

        message:
          'Your payment was verified and the booking payment status has been updated.',
      };

    case 'failed':
      return {
        style:
          'border-red-200 bg-red-50 text-red-700',

        title:
          'Payment was not completed',

        message:
          'The payment attempt failed. You can try paying for the booking again.',
      };

    case 'cancelled':
      return {
        style:
          'border-[#F0DFA6] bg-[#FFF8E8] text-[#8A6816]',

        title:
          'Payment was cancelled',

        message:
          'No successful payment was recorded. You can try again whenever you are ready.',
      };

    default:
      return null;
  }
}

function TravelerBookingsPage() {
  const navigate =
    useNavigate();

  const [
    searchParams,
  ] = useSearchParams();

  const paymentResult =
    searchParams.get(
      'payment'
    );

  const transactionIdFromUrl =
    searchParams.get(
      'transactionId'
    );

  const resultMessage =
    getPaymentResultMessage(
      paymentResult
    );

  const [
    bookings,
    setBookings,
  ] = useState([]);

  /*
   * Contains booking IDs that already have a submitted review.
   *
   * This lets the page show:
   *
   * Leave Review
   *
   * or:
   *
   * Reviewed
   */
  const [
    reviewedBookingIds,
    setReviewedBookingIds,
  ] = useState(
    new Set()
  );

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    pageError,
    setPageError,
  ] = useState('');

  /*
   * ------------------------------------------------------------
   * PAYMENT STATE
   * ------------------------------------------------------------
   */

  const [
    payingBookingId,
    setPayingBookingId,
  ] = useState('');

  const [
    paymentActionError,
    setPaymentActionError,
  ] = useState('');

  /*
   * ------------------------------------------------------------
   * REVIEW STATE
   * ------------------------------------------------------------
   */

  const [
    reviewingBooking,
    setReviewingBooking,
  ] = useState(null);

  const [
    reviewRating,
    setReviewRating,
  ] = useState(0);

  const [
    reviewComment,
    setReviewComment,
  ] = useState('');

  const [
    isSubmittingReview,
    setIsSubmittingReview,
  ] = useState(false);

  const [
    reviewActionError,
    setReviewActionError,
  ] = useState('');

  const [
    reviewActionMessage,
    setReviewActionMessage,
  ] = useState('');

  /*
   * ------------------------------------------------------------
   * LOAD BOOKINGS + EXISTING REVIEWS
   * ------------------------------------------------------------
   *
   * Both are loaded together so completed bookings can
   * immediately show whether they have already been reviewed.
   */
  useEffect(() => {
    let ignoreResult = false;

    async function loadBookings() {
      setIsLoading(true);
      setPageError('');

      try {
        const [
          bookingResult,
          reviewResult,
        ] = await Promise.all([
          getTravelerBookings(),
          getTravelerHotelReviews(),
        ]);

        if (ignoreResult) {
          return;
        }

        const loadedBookings =
          bookingResult?.data
            ?.bookings ??
          [];

        const loadedReviews =
          reviewResult?.data
            ?.reviews ??
          [];

        setBookings(
          loadedBookings
        );

        setReviewedBookingIds(
          new Set(
            loadedReviews.map(
              (review) =>
                String(
                  review.bookingId
                )
            )
          )
        );
      } catch (error) {
        if (!ignoreResult) {
          setPageError(
            error.response?.data
              ?.message ||
              'Unable to load your bookings.'
          );
        }
      } finally {
        if (!ignoreResult) {
          setIsLoading(false);
        }
      }
    }

    void loadBookings();

    return () => {
      ignoreResult = true;
    };
  }, []);

  /*
   * ------------------------------------------------------------
   * START HOTEL PAYMENT
   * ------------------------------------------------------------
   */

  async function handlePayNow(
    booking
  ) {
    if (
      !booking?._id ||
      payingBookingId
    ) {
      return;
    }

    setPaymentActionError('');

    setPayingBookingId(
      booking._id
    );

    try {
      const result =
        await initiateHotelPayment(
          booking._id
        );

      const gatewayPageUrl =
        result?.data
          ?.gatewayPageUrl;

      if (!gatewayPageUrl) {
        throw new Error(
          'Payment gateway URL was not returned.'
        );
      }

      window.location.assign(
        gatewayPageUrl
      );
    } catch (error) {
      setPaymentActionError(
        error.response?.data
          ?.message ||
          error.message ||
          'Unable to start payment.'
      );

      setPayingBookingId('');
    }
  }

  /*
   * ------------------------------------------------------------
   * OPEN REVIEW MODAL
   * ------------------------------------------------------------
   */

  function handleOpenReview(
    booking
  ) {
    if (
      !booking?._id ||
      booking.bookingStatus !==
        'completed'
    ) {
      return;
    }

    if (
      reviewedBookingIds.has(
        String(booking._id)
      )
    ) {
      return;
    }

    setReviewingBooking(
      booking
    );

    setReviewRating(0);
    setReviewComment('');
    setReviewActionError('');
    setReviewActionMessage('');
  }

  /*
   * ------------------------------------------------------------
   * CLOSE REVIEW MODAL
   * ------------------------------------------------------------
   */

  function handleCloseReview() {
    if (isSubmittingReview) {
      return;
    }

    setReviewingBooking(null);
    setReviewRating(0);
    setReviewComment('');
    setReviewActionError('');
  }

  /*
   * ------------------------------------------------------------
   * SUBMIT HOTEL REVIEW
   * ------------------------------------------------------------
   *
   * The frontend sends only:
   *
   * - bookingId
   * - rating
   * - comment
   *
   * hotelId, vendorId and travelerId are derived securely
   * by the backend.
   */
  async function handleSubmitReview(
    event
  ) {
    event.preventDefault();

    if (
      !reviewingBooking?._id
    ) {
      return;
    }

    setReviewActionError('');

    if (
      !Number.isInteger(
        reviewRating
      ) ||
      reviewRating < 1 ||
      reviewRating > 5
    ) {
      setReviewActionError(
        'Please select a star rating from 1 to 5.'
      );

      return;
    }

    const trimmedComment =
      reviewComment.trim();

    if (!trimmedComment) {
      setReviewActionError(
        'Please write a review before submitting.'
      );

      return;
    }

    if (
      trimmedComment.length >
      1000
    ) {
      setReviewActionError(
        'Review cannot exceed 1000 characters.'
      );

      return;
    }

    setIsSubmittingReview(
      true
    );

    try {
      await createHotelReview({
        bookingId:
          reviewingBooking._id,

        rating:
          reviewRating,

        comment:
          trimmedComment,
      });

      /*
       * Mark this booking as reviewed locally.
       *
       * No page refresh is required.
       */
      setReviewedBookingIds(
        (currentIds) => {
          const nextIds =
            new Set(
              currentIds
            );

          nextIds.add(
            String(
              reviewingBooking._id
            )
          );

          return nextIds;
        }
      );

      setReviewActionMessage(
        `Your review for ${reviewingBooking.hotelName} was submitted successfully.`
      );

      setReviewingBooking(
        null
      );

      setReviewRating(0);
      setReviewComment('');
    } catch (error) {
      setReviewActionError(
        error.response?.data
          ?.message ||
          'Unable to submit your hotel review.'
      );
    } finally {
      setIsSubmittingReview(
        false
      );
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm font-medium text-[#66756D]">
          Loading your bookings...
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* ======================================================
          REVIEW MODAL
         ====================================================== */}
      {reviewingBooking && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
          role="presentation"
          onClick={
            handleCloseReview
          }
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="hotel-review-title"
            className="w-full max-w-lg rounded-2xl border border-[#DCE5E0] bg-white p-6 shadow-2xl sm:p-7"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="hotel-review-title"
                  className="text-xl font-bold text-[#17211D]"
                >
                  Review Your Stay
                </h2>

                <p className="mt-1 text-sm text-[#66756D]">
                  {
                    reviewingBooking.hotelName
                  }
                </p>

                <p className="mt-0.5 text-xs text-[#8A9690]">
                  {
                    reviewingBooking.roomTypeName
                  }
                </p>
              </div>

              <button
                type="button"
                onClick={
                  handleCloseReview
                }
                disabled={
                  isSubmittingReview
                }
                aria-label="Close review form"
                className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-[#66756D] transition hover:bg-[#F0F2F1] disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={
                handleSubmitReview
              }
              className="mt-6"
            >
              <fieldset>
                <legend className="text-sm font-semibold text-[#17211D]">
                  How was your stay?
                </legend>

                <div className="mt-3 flex gap-2">
                  {[
                    1,
                    2,
                    3,
                    4,
                    5,
                  ].map(
                    (star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() =>
                          setReviewRating(
                            star
                          )
                        }
                        aria-label={`${star} star rating`}
                        aria-pressed={
                          reviewRating ===
                          star
                        }
                        className={[
                          'text-4xl leading-none transition',
                          star <=
                          reviewRating
                            ? 'text-[#E7A622]'
                            : 'text-[#D5DDD9] hover:text-[#E7A622]',
                        ].join(
                          ' '
                        )}
                      >
                        ★
                      </button>
                    )
                  )}
                </div>

                <p className="mt-2 text-xs text-[#66756D]">
                  {reviewRating > 0
                    ? `${reviewRating} out of 5 stars`
                    : 'Select a rating'}
                </p>
              </fieldset>

              <label className="mt-6 block">
                <span className="text-sm font-semibold text-[#17211D]">
                  Written Review
                </span>

                <textarea
                  value={
                    reviewComment
                  }
                  onChange={(event) =>
                    setReviewComment(
                      event.target
                        .value
                    )
                  }
                  maxLength="1000"
                  rows="5"
                  placeholder="Tell other travelers about your stay..."
                  className="mt-2 w-full resize-none rounded-xl border border-[#D6DEDA] bg-white px-4 py-3 text-sm leading-6 text-[#17211D] outline-none transition focus:border-[#0F6B4D]"
                />

                <div className="mt-1 flex justify-end">
                  <span className="text-xs text-[#8A9690]">
                    {
                      reviewComment.length
                    }
                    /1000
                  </span>
                </div>
              </label>

              {reviewActionError && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {
                    reviewActionError
                  }
                </div>
              )}

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={
                    handleCloseReview
                  }
                  disabled={
                    isSubmittingReview
                  }
                  className="rounded-lg border border-[#D6DEDA] bg-white px-5 py-2.5 text-sm font-semibold text-[#44524B] transition hover:bg-[#F7FAF8] disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    isSubmittingReview
                  }
                  className="rounded-lg bg-[#0F6B4D] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0A523B] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmittingReview
                    ? 'Submitting...'
                    : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------
          PAGE HEADER
         ------------------------------------------------------ */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#17211D] md:text-3xl">
            My Bookings
          </h1>

          <p className="mt-1 text-sm text-[#66756D]">
            View your hotel reservations,
            payments and booking status
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            navigate('/hotels')
          }
          className="rounded-lg bg-[#0F6B4D] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0A523B]"
        >
          Browse Hotels
        </button>
      </div>

      {/* ------------------------------------------------------
          PAYMENT CALLBACK RESULT
         ------------------------------------------------------ */}
      {resultMessage && (
        <div
          className={[
            'mt-5 rounded-xl border px-5 py-4',
            resultMessage.style,
          ].join(' ')}
        >
          <p className="font-bold">
            {resultMessage.title}
          </p>

          <p className="mt-1 text-sm leading-6">
            {resultMessage.message}
          </p>

          {transactionIdFromUrl && (
            <p className="mt-2 break-all text-xs opacity-80">
              Transaction ID:{' '}
              {
                transactionIdFromUrl
              }
            </p>
          )}

          <button
            type="button"
            onClick={() =>
              navigate('/payments')
            }
            className="mt-3 text-sm font-semibold underline underline-offset-2"
          >
            View Payment History
          </button>
        </div>
      )}

      {/* Review submission success. */}
      {reviewActionMessage && (
        <div className="mt-5 rounded-lg border border-[#B9DFC8] bg-[#EDF8F1] px-4 py-3 text-sm font-medium text-[#0F6B4D]">
          {reviewActionMessage}
        </div>
      )}

      {/* Booking API error. */}
      {pageError && (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {pageError}
        </div>
      )}

      {/* Payment initiation error. */}
      {paymentActionError && (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {paymentActionError}
        </div>
      )}

      {/* ------------------------------------------------------
          HOTEL BOOKINGS
         ------------------------------------------------------ */}
      <section className="pt-8">
        {bookings.length === 0 ? (
          <div className="rounded-xl border border-[#DCE5E0] bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EEF7F2] text-xl font-bold text-[#0F6B4D]">
              H
            </div>

            <h2 className="mt-4 text-lg font-bold text-[#17211D]">
              No hotel bookings yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#66756D]">
              Browse available hotels,
              select your stay dates and
              make your first reservation.
            </p>

            <button
              type="button"
              onClick={() =>
                navigate('/hotels')
              }
              className="mt-5 rounded-lg bg-[#0F6B4D] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0A523B]"
            >
              Find Hotels
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map(
              (booking) => {
                const paymentAllowed =
                  canPayBooking(
                    booking
                  );

                const isThisBookingPaying =
                  payingBookingId ===
                  booking._id;

                const isCompleted =
                  booking.bookingStatus ===
                  'completed';

                const isReviewed =
                  reviewedBookingIds.has(
                    String(
                      booking._id
                    )
                  );

                return (
                  <article
                    key={booking._id}
                    className="overflow-hidden rounded-xl border border-[#DCE5E0] bg-white shadow-sm"
                  >
                    <div className="grid gap-0 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_200px]">
                      {/* Hotel and reservation dates. */}
                      <div className="p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h2 className="text-lg font-bold text-[#17211D]">
                              {
                                booking.hotelName
                              }
                            </h2>

                            <p className="mt-1 text-sm font-semibold text-[#0F6B4D]">
                              {
                                booking.roomTypeName
                              }
                            </p>
                          </div>

                          <span
                            className={[
                              'rounded-full px-3 py-1 text-xs font-semibold capitalize',

                              getBookingStatusStyle(
                                booking.bookingStatus
                              ),
                            ].join(' ')}
                          >
                            {
                              booking.bookingStatus
                            }
                          </span>
                        </div>

                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-[#8A9690]">
                              Check-in
                            </p>

                            <p className="mt-1 text-sm font-semibold text-[#17211D]">
                              {formatDate(
                                booking.checkInDate
                              )}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-[#8A9690]">
                              Check-out
                            </p>

                            <p className="mt-1 text-sm font-semibold text-[#17211D]">
                              {formatDate(
                                booking.checkOutDate
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Room details. */}
                      <div className="border-t border-[#E5ECE8] p-5 lg:border-l lg:border-t-0">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-[#66756D]">
                              Rooms
                            </p>

                            <p className="mt-1 font-bold text-[#17211D]">
                              {
                                booking.numberOfRooms
                              }
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-[#66756D]">
                              Guests
                            </p>

                            <p className="mt-1 font-bold text-[#17211D]">
                              {
                                booking.numberOfGuests
                              }
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-[#66756D]">
                              Nights
                            </p>

                            <p className="mt-1 font-bold text-[#17211D]">
                              {
                                booking.numberOfNights
                              }
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-[#66756D]">
                              Per night
                            </p>

                            <p className="mt-1 font-bold text-[#17211D]">
                              {formatMoney(
                                booking.pricePerNight
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Price, payment and review actions. */}
                      <div className="flex flex-col justify-between border-t border-[#E5ECE8] p-5 lg:border-l lg:border-t-0">
                        <div>
                          <p className="text-xs font-semibold text-[#66756D]">
                            Total
                          </p>

                          <p className="mt-1 text-xl font-bold text-[#17211D]">
                            {formatMoney(
                              booking.totalPrice
                            )}
                          </p>
                        </div>

                        <div className="mt-5">
                          <p className="mb-2 text-xs text-[#66756D]">
                            Payment
                          </p>

                          <span
                            className={[
                              'inline-block rounded-full px-3 py-1 text-xs font-semibold capitalize',

                              getPaymentStatusStyle(
                                booking.paymentStatus
                              ),
                            ].join(' ')}
                          >
                            {
                              booking.paymentStatus
                            }
                          </span>

                          {paymentAllowed && (
                            <button
                              type="button"
                              disabled={
                                Boolean(
                                  payingBookingId
                                )
                              }
                              onClick={() =>
                                handlePayNow(
                                  booking
                                )
                              }
                              className="mt-4 w-full rounded-lg bg-[#0F6B4D] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0A523B] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isThisBookingPaying
                                ? 'Starting Payment...'
                                : booking.paymentStatus ===
                                    'failed'
                                  ? 'Retry Payment'
                                  : 'Pay Now'}
                            </button>
                          )}

                          {booking.paymentStatus ===
                            'paid' && (
                            <p className="mt-3 text-xs font-medium leading-5 text-[#0F6B4D]">
                              Payment verified
                            </p>
                          )}

                          {!paymentAllowed &&
                            booking.paymentStatus !==
                              'paid' &&
                            !isCompleted && (
                              <p className="mt-3 text-xs leading-5 text-[#66756D]">
                                Payment is not available for this booking status.
                              </p>
                            )}

                          {/* REVIEW ACTION */}
                          {isCompleted && (
                            <div className="mt-4 border-t border-[#E5ECE8] pt-4">
                              {isReviewed ? (
                                <div className="rounded-lg bg-[#FFF8E8] px-3 py-2.5 text-center">
                                  <p className="text-sm font-semibold text-[#8A6816]">
                                    ★ Reviewed
                                  </p>

                                  <p className="mt-1 text-xs text-[#8A7350]">
                                    Thank you for sharing your experience.
                                  </p>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleOpenReview(
                                      booking
                                    )
                                  }
                                  className="w-full rounded-lg border border-[#0F6B4D] bg-white px-4 py-2.5 text-sm font-semibold text-[#0F6B4D] transition hover:bg-[#EEF7F2]"
                                >
                                  Leave Review
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default TravelerBookingsPage;