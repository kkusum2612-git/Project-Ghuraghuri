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
    return '৳0';
  }

  return `৳${amount.toLocaleString()}`;
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
 * Frontend checks are only for a better user experience.
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
 *
 * After checkout:
 *
 * SSLCOMMERZ
 *      ↓
 * backend callback
 *      ↓
 * payment validation
 *      ↓
 * redirect back to /bookings
 *
 * The backend adds one of:
 *
 * ?payment=success
 * ?payment=failed
 * ?payment=cancelled
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

  /*
   * These values may be added by the payment callback redirect.
   */
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

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    pageError,
    setPageError,
  ] = useState('');

  /*
   * Stores the booking currently requesting an SSLCOMMERZ
   * checkout session.
   *
   * This prevents repeated payment-session requests caused by
   * accidental double-clicking.
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
   * LOAD HOTEL BOOKINGS
   * ------------------------------------------------------------
   *
   * When the traveler returns from SSLCOMMERZ, this page loads
   * fresh booking data from MongoDB.
   *
   * Therefore a successful payment immediately appears as:
   *
   * paymentStatus = paid
   */
  useEffect(() => {
    let ignoreResult = false;

    async function loadBookings() {
      setIsLoading(true);
      setPageError('');

      try {
        const result =
          await getTravelerBookings();

        if (ignoreResult) {
          return;
        }

        setBookings(
          result?.data?.bookings ??
            []
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
      /*
       * React sends only the booking ID.
       *
       * It does NOT send:
       *
       * - total amount
       * - traveler ID
       * - vendor ID
       *
       * The backend reads those values from authentication and
       * MongoDB so they cannot be manipulated in the browser.
       */
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

      /*
       * Move the browser to SSLCOMMERZ's hosted sandbox page.
       *
       * Ghuraghuri itself never asks for card numbers, CVV,
       * OTP or banking passwords.
       */
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

                      {/* Price and payment action. */}
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
                              'paid' && (
                              <p className="mt-3 text-xs leading-5 text-[#66756D]">
                                Payment is not available for this booking status.
                              </p>
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