import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  useNavigate,
} from 'react-router-dom';

import {
  deleteHotel,
  getVendorHotels,
} from '../api/hotelApi';

import {
  getVendorBookings,
  updateVendorBookingStatus,
} from '../api/bookingApi';

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

function getPriceRange(
  roomTypes = []
) {
  const prices =
    roomTypes
      .map(
        (room) =>
          Number(
            room.pricePerNight
          )
      )
      .filter(
        Number.isFinite
      );

  if (!prices.length) {
    return 'No pricing';
  }

  const minimum =
    Math.min(...prices);

  const maximum =
    Math.max(...prices);

  if (
    minimum === maximum
  ) {
    return `${formatMoney(
      minimum
    )} / night`;
  }

  return `${formatMoney(
    minimum
  )} - ${formatMoney(
    maximum
  )}`;
}

/*
 * ------------------------------------------------------------
 * BOOKING STATUS VISUALS
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

/*
 * Payment status is independent from booking status.
 *
 * Examples:
 *
 * bookingStatus = pending
 * paymentStatus = paid
 *
 * or:
 *
 * bookingStatus = confirmed
 * paymentStatus = unpaid
 */
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

function HotelDashboardPage() {
  const navigate =
    useNavigate();

  const [
    hotels,
    setHotels,
  ] = useState([]);

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

  const [
    bookingActionError,
    setBookingActionError,
  ] = useState('');

  const [
    bookingActionMessage,
    setBookingActionMessage,
  ] = useState('');

  const [
    deletingId,
    setDeletingId,
  ] = useState(null);

  /*
   * Stores the booking currently being updated.
   *
   * This prevents the vendor from sending the same booking
   * status action repeatedly while the request is still
   * running.
   */
  const [
    updatingBookingId,
    setUpdatingBookingId,
  ] = useState('');

  /*
   * ------------------------------------------------------------
   * LOAD DASHBOARD
   * ------------------------------------------------------------
   */
  useEffect(() => {
    let ignoreResult = false;

    async function loadDashboard() {
      setIsLoading(true);
      setPageError('');

      try {
        const [
          hotelResult,
          bookingResult,
        ] = await Promise.all([
          getVendorHotels(),
          getVendorBookings(),
        ]);

        if (ignoreResult) {
          return;
        }

        setHotels(
          hotelResult?.data
            ?.hotels ??
            []
        );

        setBookings(
          bookingResult?.data
            ?.bookings ??
            []
        );
      } catch (error) {
        if (!ignoreResult) {
          setPageError(
            error.response?.data
              ?.message ||
              'Unable to load the hotel dashboard.'
          );
        }
      } finally {
        if (!ignoreResult) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      ignoreResult = true;
    };
  }, []);

  /*
   * Makes it easy to find the hotel related to each booking.
   *
   * We mainly use this to show the hotel's first photo in the
   * incoming-bookings table.
   */
  const hotelMap =
    useMemo(() => {
      return new Map(
        hotels.map(
          (hotel) => [
            String(hotel._id),
            hotel,
          ]
        )
      );
    }, [hotels]);

  /*
   * ------------------------------------------------------------
   * HOTEL LISTING DELETE
   * ------------------------------------------------------------
   */
  async function handleDelete(
    hotel
  ) {
    const confirmed =
      window.confirm(
        `Delete "${hotel.name}"? This action cannot be undone.`
      );

    if (!confirmed) {
      return;
    }

    setDeletingId(
      hotel._id
    );

    setPageError('');

    try {
      await deleteHotel(
        hotel._id
      );

      setHotels(
        (
          currentHotels
        ) =>
          currentHotels.filter(
            (item) =>
              item._id !==
              hotel._id
          )
      );
    } catch (error) {
      setPageError(
        error.response?.data
          ?.message ||
          'Unable to delete this hotel.'
      );
    } finally {
      setDeletingId(
        null
      );
    }
  }

  /*
   * ------------------------------------------------------------
   * HOTEL BOOKING STATUS UPDATE
   * ------------------------------------------------------------
   *
   * This calls:
   *
   * PATCH
   * /api/v1/bookings/vendor/me/:bookingId/status
   *
   * The backend still verifies:
   *
   * - logged-in hotel vendor
   * - provider approval
   * - booking ownership
   * - allowed lifecycle transition
   *
   * The frontend buttons are therefore convenience controls,
   * not the security boundary.
   */
  async function handleBookingStatusUpdate(
    booking,
    nextStatus
  ) {
    if (
      !booking?._id ||
      updatingBookingId
    ) {
      return;
    }

    /*
     * Declining and completing are irreversible with our
     * current booking lifecycle.
     *
     * Ask for confirmation before performing those actions.
     */
    if (
      nextStatus ===
        'declined' ||
      nextStatus ===
        'completed'
    ) {
      const actionLabel =
        nextStatus ===
        'declined'
          ? 'decline'
          : 'complete';

      const confirmed =
        window.confirm(
          `Are you sure you want to ${actionLabel} this booking?`
        );

      if (!confirmed) {
        return;
      }
    }

    setUpdatingBookingId(
      booking._id
    );

    setBookingActionError(
      ''
    );

    setBookingActionMessage(
      ''
    );

    try {
      const result =
        await updateVendorBookingStatus(
          booking._id,
          nextStatus
        );

      const updatedBooking =
        result?.data
          ?.booking;

      if (!updatedBooking) {
        throw new Error(
          'Updated booking was not returned.'
        );
      }

      /*
       * Update only the changed row locally.
       *
       * No full-page refresh is required.
       */
      setBookings(
        (
          currentBookings
        ) =>
          currentBookings.map(
            (
              currentBooking
            ) =>
              currentBooking._id ===
              updatedBooking._id
                ? updatedBooking
                : currentBooking
          )
      );

      setBookingActionMessage(
        `Booking ${nextStatus} successfully.`
      );
    } catch (error) {
      setBookingActionError(
        error.response?.data
          ?.message ||
          error.message ||
          'Unable to update booking status.'
      );
    } finally {
      setUpdatingBookingId(
        ''
      );
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm font-medium text-[#66756D]">
          Loading hotel dashboard...
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* ------------------------------------------------------
          DASHBOARD HEADER
         ------------------------------------------------------ */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#17211D] md:text-3xl">
            Hotel Management Dashboard
          </h1>

          <p className="mt-1 text-sm text-[#66756D]">
            Manage your hotel listings
            and incoming reservations
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            navigate(
              '/hotel/listings/new'
            )
          }
          className="rounded-lg bg-[#0F6B4D] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0A523B]"
        >
          + Add New Hotel
        </button>
      </div>

      {/* General dashboard error. */}
      {pageError && (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {pageError}
        </div>
      )}

      {/* Booking-management error. */}
      {bookingActionError && (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {bookingActionError}
        </div>
      )}

      {/* Booking-management success feedback. */}
      {bookingActionMessage && (
        <div className="mt-5 rounded-lg border border-[#B9DFC8] bg-[#EDF8F1] px-4 py-3 text-sm font-medium text-[#0F6B4D]">
          {bookingActionMessage}
        </div>
      )}

      {/* ------------------------------------------------------
          INCOMING BOOKINGS
         ------------------------------------------------------ */}
      <section
        id="bookings"
        className="scroll-mt-24 pt-8"
      >
        <div className="mb-4">
          <h2 className="text-xl font-bold text-[#17211D]">
            Incoming Bookings
          </h2>

          <p className="mt-1 text-sm text-[#66756D]">
            Review reservations,
            payment status and booking
            actions.
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-[#DCE5E0] bg-white shadow-sm">
          {bookings.length ===
          0 ? (
            <div className="px-6 py-10 text-center">
              <p className="font-semibold text-[#17211D]">
                No incoming bookings
              </p>

              <p className="mt-1 text-sm text-[#66756D]">
                Traveler bookings for
                your hotels will appear
                here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/*
               * More columns now exist, so the minimum width is
               * intentionally larger than before.
               *
               * Smaller screens can horizontally scroll.
               */}
              <table className="w-full min-w-[1280px]">
                <thead className="bg-[#F0F2F1]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#44524B]">
                      Guest
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#44524B]">
                      Hotel / Room
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#44524B]">
                      Check-in
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#44524B]">
                      Check-out
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#44524B]">
                      Occupants
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#44524B]">
                      Total
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#44524B]">
                      Payment
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#44524B]">
                      Booking
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#44524B]">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#E5ECE8]">
                  {bookings.map(
                    (booking) => {
                      const relatedHotel =
                        hotelMap.get(
                          String(
                            booking.hotelId
                          )
                        );

                      const photo =
                        relatedHotel
                          ?.photos?.[0];

                      const isUpdating =
                        updatingBookingId ===
                        booking._id;

                      return (
                        <tr
                          key={
                            booking._id
                          }
                          className="hover:bg-[#FBFCFB]"
                        >
                          {/* Guest */}
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#DDF1E5] font-bold text-[#0F6B4D]">
                                {booking
                                  .travelerId
                                  ?.name
                                  ?.charAt(
                                    0
                                  )
                                  ?.toUpperCase() ||
                                  'T'}
                              </div>

                              <div>
                                <p className="text-sm font-semibold text-[#17211D]">
                                  {booking
                                    .travelerId
                                    ?.name ||
                                    'Traveler'}
                                </p>

                                <p className="text-xs text-[#66756D]">
                                  {booking
                                    .travelerId
                                    ?.email ||
                                    '—'}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Hotel */}
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-12 w-16 shrink-0 overflow-hidden rounded-md bg-[#EEF2F0]">
                                {photo ? (
                                  <img
                                    src={
                                      photo
                                    }
                                    alt=""
                                    className="h-full w-full object-cover"
                                    onError={(
                                      event
                                    ) => {
                                      event.currentTarget.style.display =
                                        'none';
                                    }}
                                  />
                                ) : (
                                  <div className="flex h-full items-center justify-center text-[10px] text-[#8A9690]">
                                    No photo
                                  </div>
                                )}
                              </div>

                              <div>
                                <p className="text-sm font-semibold text-[#17211D]">
                                  {
                                    booking.hotelName
                                  }
                                </p>

                                <p className="text-xs text-[#66756D]">
                                  {
                                    booking.roomTypeName
                                  }
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Dates */}
                          <td className="whitespace-nowrap px-4 py-4 text-sm text-[#44524B]">
                            {formatDate(
                              booking.checkInDate
                            )}
                          </td>

                          <td className="whitespace-nowrap px-4 py-4 text-sm text-[#44524B]">
                            {formatDate(
                              booking.checkOutDate
                            )}
                          </td>

                          {/* Guests */}
                          <td className="px-4 py-4 text-sm text-[#44524B]">
                            {
                              booking.numberOfGuests
                            }{' '}
                            {booking.numberOfGuests ===
                            1
                              ? 'Guest'
                              : 'Guests'}
                          </td>

                          {/* Price */}
                          <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-[#17211D]">
                            {formatMoney(
                              booking.totalPrice
                            )}
                          </td>

                          {/* PAYMENT STATUS */}
                          <td className="px-4 py-4">
                            <span
                              className={[
                                'inline-block rounded-full px-3 py-1 text-xs font-semibold capitalize',

                                getPaymentStatusStyle(
                                  booking.paymentStatus
                                ),
                              ].join(
                                ' '
                              )}
                            >
                              {
                                booking.paymentStatus
                              }
                            </span>
                          </td>

                          {/* BOOKING STATUS */}
                          <td className="px-4 py-4">
                            <span
                              className={[
                                'inline-block rounded-full px-3 py-1 text-xs font-semibold capitalize',

                                getBookingStatusStyle(
                                  booking.bookingStatus
                                ),
                              ].join(
                                ' '
                              )}
                            >
                              {
                                booking.bookingStatus
                              }
                            </span>
                          </td>

                          {/* ACTIONS */}
                          <td className="px-4 py-4">
                            {booking.bookingStatus ===
                            'pending' ? (
                              <div className="flex min-w-[150px] flex-col gap-2">
                                <button
                                  type="button"
                                  disabled={
                                    isUpdating
                                  }
                                  onClick={() =>
                                    handleBookingStatusUpdate(
                                      booking,
                                      'confirmed'
                                    )
                                  }
                                  className="rounded-md bg-[#0F6B4D] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#0A523B] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {isUpdating
                                    ? 'Updating...'
                                    : 'Confirm'}
                                </button>

                                <button
                                  type="button"
                                  disabled={
                                    isUpdating
                                  }
                                  onClick={() =>
                                    handleBookingStatusUpdate(
                                      booking,
                                      'declined'
                                    )
                                  }
                                  className="rounded-md border border-red-300 px-4 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Decline
                                </button>
                              </div>
                            ) : booking.bookingStatus ===
                              'confirmed' ? (
                              <button
                                type="button"
                                disabled={
                                  isUpdating
                                }
                                onClick={() =>
                                  handleBookingStatusUpdate(
                                    booking,
                                    'completed'
                                  )
                                }
                                className="min-w-[130px] rounded-md border border-[#A9D9BB] px-4 py-2 text-xs font-semibold text-[#0F6B4D] transition hover:bg-[#EEF7F2] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {isUpdating
                                  ? 'Updating...'
                                  : 'Mark Complete'}
                              </button>
                            ) : (
                              <span className="text-xs font-medium text-[#8A9690]">
                                No action
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* ------------------------------------------------------
          HOTEL LISTINGS
         ------------------------------------------------------ */}
      <section
        id="listings"
        className="scroll-mt-24 pt-10"
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#17211D]">
              My Hotel Listings
            </h2>

            <p className="mt-1 text-sm text-[#66756D]">
              {hotels.length}{' '}
              {hotels.length === 1
                ? 'hotel'
                : 'hotels'}
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-[#DCE5E0] bg-white shadow-sm">
          {hotels.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="font-semibold text-[#17211D]">
                No hotel listings yet
              </p>

              <p className="mt-1 text-sm text-[#66756D]">
                Create your first hotel
                listing to get started.
              </p>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    '/hotel/listings/new'
                  )
                }
                className="mt-5 rounded-lg bg-[#0F6B4D] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0A523B]"
              >
                Add New Hotel
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="bg-[#F0F2F1]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#44524B]">
                      Hotel
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#44524B]">
                      Location
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#44524B]">
                      Rooms
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#44524B]">
                      Price Range
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#44524B]">
                      Status
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#44524B]">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#E5ECE8]">
                  {hotels.map(
                    (hotel) => {
                      const availableRooms =
                        hotel.roomTypes?.reduce(
                          (
                            total,
                            room
                          ) =>
                            total +
                            Number(
                              room.availableRooms ||
                                0
                            ),
                          0
                        ) ??
                        0;

                      return (
                        <tr
                          key={
                            hotel._id
                          }
                          className="hover:bg-[#FBFCFB]"
                        >
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-[#EEF2F0]">
                                {hotel
                                  .photos?.[0] ? (
                                  <img
                                    src={
                                      hotel
                                        .photos[0]
                                    }
                                    alt={
                                      hotel.name
                                    }
                                    className="h-full w-full object-cover"
                                    onError={(
                                      event
                                    ) => {
                                      event.currentTarget.style.display =
                                        'none';
                                    }}
                                  />
                                ) : (
                                  <div className="flex h-full items-center justify-center text-xs text-[#8A9690]">
                                    No photo
                                  </div>
                                )}
                              </div>

                              <div>
                                <p className="font-semibold text-[#17211D]">
                                  {
                                    hotel.name
                                  }
                                </p>

                                <p className="mt-1 line-clamp-2 max-w-[220px] text-xs text-[#66756D]">
                                  {
                                    hotel.description
                                  }
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4 text-sm text-[#44524B]">
                            <p className="font-medium">
                              {
                                hotel.location
                                  ?.city
                              }
                            </p>

                            <p className="mt-1 max-w-[180px] text-xs text-[#66756D]">
                              {
                                hotel.location
                                  ?.address
                              }
                            </p>
                          </td>

                          <td className="px-4 py-4">
                            <p className="text-lg font-bold text-[#17211D]">
                              {
                                availableRooms
                              }
                            </p>

                            <p className="text-xs text-[#66756D]">
                              {hotel
                                .roomTypes
                                ?.length ??
                                0}{' '}
                              room types
                            </p>
                          </td>

                          <td className="px-4 py-4 text-sm font-semibold text-[#17211D]">
                            {getPriceRange(
                              hotel.roomTypes
                            )}
                          </td>

                          <td className="px-4 py-4">
                            <span
                              className={[
                                'rounded-full px-3 py-1 text-xs font-semibold capitalize',

                                hotel.status ===
                                'active'
                                  ? 'bg-[#DDF1E5] text-[#0F6B4D]'
                                  : 'bg-[#EEF0EF] text-[#66756D]',
                              ].join(
                                ' '
                              )}
                            >
                              {
                                hotel.status
                              }
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex flex-col gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  navigate(
                                    `/hotel/listings/${hotel._id}/edit`
                                  )
                                }
                                className="rounded-md border border-[#A9D9BB] px-4 py-1.5 text-xs font-semibold text-[#0F6B4D] hover:bg-[#EEF7F2]"
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                disabled={
                                  deletingId ===
                                  hotel._id
                                }
                                onClick={() =>
                                  handleDelete(
                                    hotel
                                  )
                                }
                                className="rounded-md border border-red-300 px-4 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                              >
                                {deletingId ===
                                hotel._id
                                  ? 'Deleting...'
                                  : 'Delete'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default HotelDashboardPage;