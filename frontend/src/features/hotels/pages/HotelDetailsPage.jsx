import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';

import {
  createBooking,
} from '../api/bookingApi';

import {
  getHotelAvailability,
  getHotelById,
} from '../api/hotelApi';

import {
  getHotelReviews,
} from '../api/hotelReviewApi';

function formatMoney(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return '৳0';
  }

  return `৳${amount.toLocaleString()}`;
}

function formatReviewDate(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '';
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

function calculateNights(
  checkInDate,
  checkOutDate
) {
  if (
    !checkInDate ||
    !checkOutDate
  ) {
    return 0;
  }

  const checkIn =
    new Date(checkInDate);

  const checkOut =
    new Date(checkOutDate);

  if (
    Number.isNaN(
      checkIn.getTime()
    ) ||
    Number.isNaN(
      checkOut.getTime()
    ) ||
    checkOut <= checkIn
  ) {
    return 0;
  }

  const millisecondsPerDay =
    1000 * 60 * 60 * 24;

  return Math.ceil(
    (checkOut - checkIn) /
      millisecondsPerDay
  );
}

/*
 * Displays a five-star visual.
 *
 * Individual stored reviews use whole-number ratings,
 * while the hotel average may contain a decimal.
 */
function RatingStars({
  rating,
  sizeClass = 'text-base',
}) {
  const numericRating =
    Number(rating) || 0;

  const roundedRating =
    Math.round(
      numericRating
    );

  return (
    <span
      className={[
        'inline-flex gap-0.5',
        sizeClass,
      ].join(' ')}
      aria-label={`${numericRating} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map(
        (star) => (
          <span
            key={star}
            className={
              star <=
              roundedRating
                ? 'text-[#E7A622]'
                : 'text-[#D5DDD9]'
            }
          >
            ★
          </span>
        )
      )}
    </span>
  );
}

function HotelDetailsPage() {
  const { hotelId } =
    useParams();

  const location =
    useLocation();

  const navigate =
    useNavigate();

  const [
    hotel,
    setHotel,
  ] = useState(null);

  const [
    availability,
    setAvailability,
  ] = useState([]);

  /*
   * ---------------------------------------------------------
   * HOTEL REVIEW STATE
   * ---------------------------------------------------------
   */
  const [
    reviews,
    setReviews,
  ] = useState([]);

  const [
    ratingSummary,
    setRatingSummary,
  ] = useState({
    averageRating: 0,
    reviewCount: 0,
  });

  const [
    isLoadingReviews,
    setIsLoadingReviews,
  ] = useState(true);

  const [
    reviewError,
    setReviewError,
  ] = useState('');

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isCheckingAvailability,
    setIsCheckingAvailability,
  ] = useState(false);

  const [
    isBooking,
    setIsBooking,
  ] = useState(false);

  const [
    pageError,
    setPageError,
  ] = useState('');

  /*
   * Stores the information shown inside the
   * booking-success modal.
   */
  const [
    bookingSuccess,
    setBookingSuccess,
  ] = useState(null);

  /*
   * ---------------------------------------------------------
   * HOTEL PHOTO GALLERY STATE
   * ---------------------------------------------------------
   */
  const [
    selectedPhotoIndex,
    setSelectedPhotoIndex,
  ] = useState(0);

  const [
    isPhotoViewerOpen,
    setIsPhotoViewerOpen,
  ] = useState(false);

  const [
    checkInDate,
    setCheckInDate,
  ] = useState(
    location.state?.checkInDate ||
      ''
  );

  const [
    checkOutDate,
    setCheckOutDate,
  ] = useState(
    location.state?.checkOutDate ||
      ''
  );

  const [
    numberOfGuests,
    setNumberOfGuests,
  ] = useState(
    location.state?.guests ||
      '2'
  );

  const [
    numberOfRooms,
    setNumberOfRooms,
  ] = useState('1');

  const [
    selectedRoomTypeId,
    setSelectedRoomTypeId,
  ] = useState('');

  /*
   * ---------------------------------------------------------
   * LOAD HOTEL
   * ---------------------------------------------------------
   */
  useEffect(() => {
    let ignoreResult = false;

    async function loadHotel() {
      setIsLoading(true);
      setPageError('');

      try {
        const result =
          await getHotelById(
            hotelId
          );

        if (ignoreResult) {
          return;
        }

        const loadedHotel =
          result?.data?.hotel;

        setHotel(
          loadedHotel || null
        );

        /*
         * The normal hotel API already contains its current
         * aggregate review summary.
         */
        setRatingSummary({
          averageRating:
            Number(
              loadedHotel
                ?.averageRating
            ) || 0,

          reviewCount:
            Number(
              loadedHotel
                ?.reviewCount
            ) || 0,
        });

        setSelectedPhotoIndex(0);

        setIsPhotoViewerOpen(
          false
        );

        if (
          loadedHotel
            ?.roomTypes?.length >
          0
        ) {
          setSelectedRoomTypeId(
            loadedHotel
              .roomTypes[0]._id
          );
        }
      } catch (error) {
        if (!ignoreResult) {
          setPageError(
            error.response?.data
              ?.message ||
              'Unable to load this hotel.'
          );
        }
      } finally {
        if (!ignoreResult) {
          setIsLoading(false);
        }
      }
    }

    void loadHotel();

    return () => {
      ignoreResult = true;
    };
  }, [hotelId]);

  /*
   * ---------------------------------------------------------
   * LOAD PUBLIC HOTEL REVIEWS
   * ---------------------------------------------------------
   *
   * Review loading is kept separate from the hotel request.
   *
   * Therefore a temporary review API problem does not prevent
   * the traveler from viewing or booking the hotel itself.
   */
  useEffect(() => {
    let ignoreResult = false;

    async function loadReviews() {
      setIsLoadingReviews(true);
      setReviewError('');

      try {
        const result =
          await getHotelReviews(
            hotelId
          );

        if (ignoreResult) {
          return;
        }

        setReviews(
          result?.data
            ?.reviews ?? []
        );

        setRatingSummary({
          averageRating:
            Number(
              result?.data
                ?.averageRating
            ) || 0,

          reviewCount:
            Number(
              result?.data
                ?.reviewCount
            ) || 0,
        });
      } catch (error) {
        if (!ignoreResult) {
          setReviewError(
            error.response?.data
              ?.message ||
              'Unable to load hotel reviews.'
          );
        }
      } finally {
        if (!ignoreResult) {
          setIsLoadingReviews(
            false
          );
        }
      }
    }

    void loadReviews();

    return () => {
      ignoreResult = true;
    };
  }, [hotelId]);

  const selectedRoom =
    useMemo(() => {
      if (
        availability.length > 0
      ) {
        return (
          availability.find(
            (room) =>
              String(
                room.roomTypeId
              ) ===
              String(
                selectedRoomTypeId
              )
          ) || null
        );
      }

      return (
        hotel?.roomTypes?.find(
          (room) =>
            String(
              room._id
            ) ===
            String(
              selectedRoomTypeId
            )
        ) || null
      );
    }, [
      availability,
      hotel,
      selectedRoomTypeId,
    ]);

  const hotelPhotos =
    hotel?.photos ?? [];

  const photoCount =
    hotelPhotos.length;

  const mainPhoto =
    hotelPhotos[
      selectedPhotoIndex
    ] ||
    hotelPhotos[0] ||
    '';

  /*
   * Keyboard controls for the full-screen gallery.
   */
  useEffect(() => {
    if (
      !isPhotoViewerOpen
    ) {
      return undefined;
    }

    function handleKeyDown(
      event
    ) {
      if (
        event.key ===
        'Escape'
      ) {
        setIsPhotoViewerOpen(
          false
        );

        return;
      }

      if (
        photoCount <= 1
      ) {
        return;
      }

      if (
        event.key ===
        'ArrowLeft'
      ) {
        setSelectedPhotoIndex(
          (current) =>
            (
              current -
              1 +
              photoCount
            ) %
            photoCount
        );
      }

      if (
        event.key ===
        'ArrowRight'
      ) {
        setSelectedPhotoIndex(
          (current) =>
            (current + 1) %
            photoCount
        );
      }
    }

    window.addEventListener(
      'keydown',
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        'keydown',
        handleKeyDown
      );
    };
  }, [
    isPhotoViewerOpen,
    photoCount,
  ]);

  const numberOfNights =
    calculateNights(
      checkInDate,
      checkOutDate
    );

  const estimatedTotal =
    selectedRoom &&
    numberOfNights > 0
      ? Number(
          selectedRoom.pricePerNight
        ) *
        Number(
          numberOfRooms || 0
        ) *
        numberOfNights
      : 0;

  function showPreviousPhoto() {
    if (
      photoCount <= 1
    ) {
      return;
    }

    setSelectedPhotoIndex(
      (current) =>
        (
          current -
          1 +
          photoCount
        ) %
        photoCount
    );
  }

  function showNextPhoto() {
    if (
      photoCount <= 1
    ) {
      return;
    }

    setSelectedPhotoIndex(
      (current) =>
        (current + 1) %
        photoCount
    );
  }

  async function refreshAvailability() {
    const result =
      await getHotelAvailability(
        hotelId,
        checkInDate,
        checkOutDate
      );

    const roomTypes =
      result?.data
        ?.roomTypes ?? [];

    setAvailability(
      roomTypes
    );

    const currentRoomStillExists =
      roomTypes.some(
        (room) =>
          String(
            room.roomTypeId
          ) ===
          String(
            selectedRoomTypeId
          )
      );

    if (
      !currentRoomStillExists &&
      roomTypes.length > 0
    ) {
      setSelectedRoomTypeId(
        roomTypes[0]
          .roomTypeId
      );
    }

    return roomTypes;
  }

  async function handleAvailabilityCheck(
    event
  ) {
    event?.preventDefault();

    setPageError('');
    setBookingSuccess(null);

    if (
      !checkInDate ||
      !checkOutDate
    ) {
      setPageError(
        'Please select check-in and check-out dates.'
      );

      return;
    }

    if (
      new Date(
        checkOutDate
      ) <=
      new Date(
        checkInDate
      )
    ) {
      setPageError(
        'Check-out date must be after the check-in date.'
      );

      return;
    }

    setIsCheckingAvailability(
      true
    );

    try {
      await refreshAvailability();
    } catch (error) {
      setAvailability([]);

      setPageError(
        error.response?.data
          ?.message ||
          'Unable to check room availability.'
      );
    } finally {
      setIsCheckingAvailability(
        false
      );
    }
  }

  async function handleBooking() {
    setPageError('');
    setBookingSuccess(null);

    if (
      !checkInDate ||
      !checkOutDate
    ) {
      setPageError(
        'Please select your stay dates first.'
      );

      return;
    }

    if (
      availability.length === 0
    ) {
      setPageError(
        'Please check room availability before booking.'
      );

      return;
    }

    if (!selectedRoom) {
      setPageError(
        'Please select a room type.'
      );

      return;
    }

    const rooms =
      Number(
        numberOfRooms
      );

    const guests =
      Number(
        numberOfGuests
      );

    if (
      !Number.isInteger(
        rooms
      ) ||
      rooms < 1
    ) {
      setPageError(
        'Number of rooms must be at least 1.'
      );

      return;
    }

    if (
      !Number.isInteger(
        guests
      ) ||
      guests < 1
    ) {
      setPageError(
        'Number of guests must be at least 1.'
      );

      return;
    }

    if (
      rooms >
      Number(
        selectedRoom
          .availableRooms
      )
    ) {
      setPageError(
        `Only ${selectedRoom.availableRooms} room(s) are available for these dates.`
      );

      return;
    }

    const maximumGuests =
      Number(
        selectedRoom.capacity
      ) * rooms;

    if (
      guests >
      maximumGuests
    ) {
      setPageError(
        `The selected room quantity can accommodate a maximum of ${maximumGuests} guests.`
      );

      return;
    }

    setIsBooking(true);

    try {
      const result =
        await createBooking({
          hotelId,

          roomTypeId:
            selectedRoomTypeId,

          checkInDate,

          checkOutDate,

          numberOfRooms:
            rooms,

          numberOfGuests:
            guests,
        });

      const booking =
        result?.data
          ?.booking;

      await refreshAvailability();

      setBookingSuccess({
        hotelName:
          booking
            ?.hotelName ||
          hotel.name,

        roomTypeName:
          booking
            ?.roomTypeName ||
          selectedRoom.name,

        totalPrice:
          booking
            ?.totalPrice ??
          estimatedTotal,
      });
    } catch (error) {
      setPageError(
        error.response?.data
          ?.message ||
          'Unable to create the booking.'
      );
    } finally {
      setIsBooking(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm font-medium text-[#66756D]">
          Loading hotel
          details...
        </p>
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="rounded-xl border border-[#DCE5E0] bg-white p-8">
        <p className="font-semibold text-[#17211D]">
          Hotel not found
        </p>

        <button
          type="button"
          onClick={() =>
            navigate(
              '/hotels'
            )
          }
          className="mt-4 text-sm font-semibold text-[#0F6B4D]"
        >
          Back to hotels
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* =====================================================
          FULL-SCREEN HOTEL PHOTO VIEWER
         ===================================================== */}
      {isPhotoViewerOpen &&
        mainPhoto && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
            role="presentation"
            onClick={() =>
              setIsPhotoViewerOpen(
                false
              )
            }
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={`${hotel.name} photo gallery`}
              className="relative flex h-full w-full max-w-6xl items-center justify-center"
              onClick={(
                event
              ) =>
                event.stopPropagation()
              }
            >
              <button
                type="button"
                onClick={() =>
                  setIsPhotoViewerOpen(
                    false
                  )
                }
                aria-label="Close photo viewer"
                className="absolute right-0 top-0 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-2xl font-bold text-white transition hover:bg-white/25"
              >
                ×
              </button>

              {photoCount >
                1 && (
                <button
                  type="button"
                  onClick={
                    showPreviousPhoto
                  }
                  aria-label="Previous hotel photo"
                  className="absolute left-0 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-4xl leading-none text-white transition hover:bg-white/25"
                >
                  ‹
                </button>
              )}

              <img
                src={mainPhoto}
                alt={`${hotel.name} photo ${
                  selectedPhotoIndex +
                  1
                } of ${photoCount}`}
                className="max-h-[85vh] max-w-[90%] rounded-xl object-contain shadow-2xl"
              />

              {photoCount >
                1 && (
                <button
                  type="button"
                  onClick={
                    showNextPhoto
                  }
                  aria-label="Next hotel photo"
                  className="absolute right-0 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-4xl leading-none text-white transition hover:bg-white/25"
                >
                  ›
                </button>
              )}

              {photoCount >
                1 && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-4 py-2 text-sm font-semibold text-white">
                  {selectedPhotoIndex +
                    1}{' '}
                  / {photoCount}
                </div>
              )}
            </div>
          </div>
        )}

      {/* =====================================================
          BOOKING SUCCESS MODAL
         ===================================================== */}
      {bookingSuccess && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-success-title"
            className="w-full max-w-md rounded-2xl border border-[#DCE5E0] bg-white p-6 text-center shadow-2xl sm:p-8"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#DCEFE4] text-3xl font-bold text-[#0F6B4D]">
              ✓
            </div>

            <h2
              id="booking-success-title"
              className="mt-5 text-2xl font-bold text-[#17211D]"
            >
              Booking Request
              Submitted!
            </h2>

            <p className="mt-3 text-sm leading-6 text-[#66756D]">
              Your booking request
              for{' '}
              <span className="font-semibold text-[#17211D]">
                {
                  bookingSuccess.hotelName
                }
              </span>{' '}
              has been sent
              successfully.
            </p>

            <div className="mt-5 rounded-xl bg-[#F7FAF8] p-4 text-left">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-[#66756D]">
                  Room
                </span>

                <span className="text-sm font-semibold text-[#17211D]">
                  {
                    bookingSuccess.roomTypeName
                  }
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between gap-4 border-t border-[#DCE5E0] pt-3">
                <span className="font-bold text-[#17211D]">
                  Total
                </span>

                <span className="text-lg font-bold text-[#0F6B4D]">
                  {formatMoney(
                    bookingSuccess.totalPrice
                  )}
                </span>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-[#F0DDA8] bg-[#FFF9E8] px-4 py-4">
              <span className="inline-flex rounded-full bg-[#FFF0C2] px-3 py-1 text-xs font-bold text-[#8A6512]">
                Pending
              </span>

              <p className="mt-2 text-sm leading-6 text-[#6E5A27]">
                The hotel will review
                your request. You can
                track its status from
                My Bookings.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate(
                  '/bookings'
                )
              }
              className="mt-6 w-full rounded-lg bg-[#0F6B4D] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0A523B]"
            >
              View My Bookings
            </button>

            <button
              type="button"
              onClick={() =>
                navigate(
                  '/hotels'
                )
              }
              className="mt-3 w-full rounded-lg border border-[#D6DEDA] bg-white px-5 py-3 text-sm font-semibold text-[#44524B] transition hover:bg-[#F7FAF8]"
            >
              Continue Browsing
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() =>
          navigate(
            '/hotels'
          )
        }
        className="mb-4 text-sm font-semibold text-[#0F6B4D] hover:underline"
      >
        ← Back to hotels
      </button>

      {pageError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {pageError}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0">
          {/* HOTEL PHOTO GALLERY */}
          <section className="overflow-hidden rounded-xl border border-[#DCE5E0] bg-white shadow-sm">
            {mainPhoto ? (
              <button
                type="button"
                onClick={() =>
                  setIsPhotoViewerOpen(
                    true
                  )
                }
                className="group relative block h-[360px] w-full overflow-hidden bg-[#EEF2F0] text-left"
                aria-label={`Open ${hotel.name} photo in full-screen viewer`}
              >
                <img
                  src={mainPhoto}
                  alt={`${hotel.name} main hotel view`}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.01]"
                  onError={(
                    event
                  ) => {
                    event.currentTarget.style.display =
                      'none';
                  }}
                />

                <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/65 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition group-hover:bg-black/75">
                  View full size
                </span>
              </button>
            ) : (
              <div className="flex h-[360px] items-center justify-center bg-[#EEF2F0] text-[#8A9690]">
                No hotel photo
              </div>
            )}

            {photoCount >
              1 && (
              <div className="border-t border-[#E5ECE8] p-3">
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                  {hotelPhotos.map(
                    (
                      photo,
                      index
                    ) => {
                      const isSelected =
                        index ===
                        selectedPhotoIndex;

                      return (
                        <button
                          key={`${photo}-${index}`}
                          type="button"
                          onClick={() =>
                            setSelectedPhotoIndex(
                              index
                            )
                          }
                          aria-label={`Show hotel photo ${
                            index +
                            1
                          }`}
                          aria-pressed={
                            isSelected
                          }
                          className={[
                            'relative h-20 overflow-hidden rounded-lg border-2 bg-[#EEF2F0] transition',

                            isSelected
                              ? 'border-[#0F6B4D] ring-2 ring-[#DCEFE4]'
                              : 'border-transparent hover:border-[#A9D9BB]',
                          ].join(
                            ' '
                          )}
                        >
                          <img
                            src={
                              photo
                            }
                            alt={`${hotel.name} thumbnail ${
                              index +
                              1
                            }`}
                            className="h-full w-full object-cover"
                            onError={(
                              event
                            ) => {
                              event.currentTarget.style.display =
                                'none';
                            }}
                          />

                          {isSelected && (
                            <span className="absolute bottom-1 right-1 rounded-full bg-[#0F6B4D] px-2 py-0.5 text-[10px] font-bold text-white">
                              Selected
                            </span>
                          )}
                        </button>
                      );
                    }
                  )}
                </div>

                <p className="mt-2 text-center text-xs text-[#66756D]">
                  Select a photo to
                  preview it, then
                  click the large
                  image to view full
                  size.
                </p>
              </div>
            )}
          </section>

          {/* HOTEL INFORMATION */}
          <section className="mt-5 rounded-xl border border-[#DCE5E0] bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-bold text-[#17211D]">
              {hotel.name}
            </h1>

            {/* HOTEL RATING SUMMARY */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {ratingSummary.reviewCount >
              0 ? (
                <>
                  <RatingStars
                    rating={
                      ratingSummary.averageRating
                    }
                  />

                  <span className="font-bold text-[#17211D]">
                    {Number(
                      ratingSummary.averageRating
                    ).toFixed(
                      1
                    )}
                  </span>

                  <span className="text-sm text-[#66756D]">
                    (
                    {
                      ratingSummary.reviewCount
                    }{' '}
                    {ratingSummary.reviewCount ===
                    1
                      ? 'review'
                      : 'reviews'}
                    )
                  </span>
                </>
              ) : (
                <span className="text-sm text-[#8A9690]">
                  No reviews yet
                </span>
              )}
            </div>

            <p className="mt-3 text-sm text-[#66756D]">
              {
                hotel.location
                  ?.address
              }

              {hotel.location
                ?.address &&
              hotel.location?.city
                ? ', '
                : ''}

              {
                hotel.location
                  ?.city
              }
            </p>

            <p className="mt-5 text-sm leading-7 text-[#44524B]">
              {
                hotel.description
              }
            </p>

            {hotel.amenities
              ?.length > 0 && (
              <div className="mt-6">
                <h2 className="text-base font-bold text-[#17211D]">
                  Amenities
                </h2>

                <div className="mt-3 flex flex-wrap gap-2">
                  {hotel.amenities.map(
                    (amenity) => (
                      <span
                        key={
                          amenity
                        }
                        className="rounded-full bg-[#EEF7F2] px-3 py-1.5 text-xs font-medium text-[#0F6B4D]"
                      >
                        {
                          amenity
                        }
                      </span>
                    )
                  )}
                </div>
              </div>
            )}
          </section>

          {/* GUEST REVIEWS */}
          <section className="mt-5 rounded-xl border border-[#DCE5E0] bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#17211D]">
                  Guest Reviews
                </h2>

                <p className="mt-1 text-sm text-[#66756D]">
                  Reviews from
                  travelers who
                  completed a stay
                  at this hotel.
                </p>
              </div>

              {ratingSummary.reviewCount >
                0 && (
                <div className="rounded-xl bg-[#FFF8E8] px-4 py-3 sm:text-right">
                  <div className="flex items-center gap-2 sm:justify-end">
                    <span className="text-2xl font-bold text-[#17211D]">
                      {Number(
                        ratingSummary.averageRating
                      ).toFixed(
                        1
                      )}
                    </span>

                    <span className="text-lg text-[#E7A622]">
                      ★
                    </span>
                  </div>

                  <p className="mt-0.5 text-xs text-[#8A7350]">
                    {
                      ratingSummary.reviewCount
                    }{' '}
                    {ratingSummary.reviewCount ===
                    1
                      ? 'review'
                      : 'reviews'}
                  </p>
                </div>
              )}
            </div>

            {isLoadingReviews ? (
              <div className="mt-6 rounded-xl bg-[#F7FAF8] px-4 py-8 text-center">
                <p className="text-sm font-medium text-[#66756D]">
                  Loading
                  reviews...
                </p>
              </div>
            ) : reviewError ? (
              <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {reviewError}
              </div>
            ) : reviews.length ===
              0 ? (
              <div className="mt-6 rounded-xl bg-[#F7FAF8] px-6 py-10 text-center">
                <div className="text-3xl text-[#D5DDD9]">
                  ★
                </div>

                <p className="mt-3 font-semibold text-[#17211D]">
                  No reviews yet
                </p>

                <p className="mt-1 text-sm text-[#66756D]">
                  Completed guests
                  will be able to
                  share their
                  experience here.
                </p>
              </div>
            ) : (
              <div className="mt-6 divide-y divide-[#E5ECE8]">
                {reviews.map(
                  (review) => {
                    const travelerName =
                      review
                        .travelerId
                        ?.name ||
                      'Traveler';

                    const travelerPhoto =
                      review
                        .travelerId
                        ?.profileImageUrl;

                    return (
                      <article
                        key={
                          review._id
                        }
                        className="py-5 first:pt-0 last:pb-0"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#DDF1E5] font-bold text-[#0F6B4D]">
                            {travelerPhoto ? (
                              <img
                                src={
                                  travelerPhoto
                                }
                                alt={
                                  travelerName
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
                              travelerName
                                .charAt(
                                  0
                                )
                                .toUpperCase()
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p className="font-semibold text-[#17211D]">
                                  {
                                    travelerName
                                  }
                                </p>

                                <div className="mt-1 flex flex-wrap items-center gap-2">
                                  <RatingStars
                                    rating={
                                      review.rating
                                    }
                                    sizeClass="text-sm"
                                  />

                                  <span className="text-xs font-semibold text-[#44524B]">
                                    {
                                      review.rating
                                    }
                                    /5
                                  </span>
                                </div>
                              </div>

                              <p className="text-xs text-[#8A9690]">
                                {formatReviewDate(
                                  review.createdAt
                                )}
                              </p>
                            </div>

                            <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-[#44524B]">
                              {
                                review.comment
                              }
                            </p>
                          </div>
                        </div>
                      </article>
                    );
                  }
                )}
              </div>
            )}
          </section>

          {/* ROOM TYPES */}
          <section className="mt-5 rounded-xl border border-[#DCE5E0] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-[#17211D]">
              Room Types
            </h2>

            <div className="mt-4 space-y-3">
              {hotel.roomTypes?.map(
                (room) => {
                  const availableRoom =
                    availability.find(
                      (item) =>
                        String(
                          item.roomTypeId
                        ) ===
                        String(
                          room._id
                        )
                    );

                  return (
                    <button
                      key={
                        room._id
                      }
                      type="button"
                      onClick={() =>
                        setSelectedRoomTypeId(
                          room._id
                        )
                      }
                      className={[
                        'w-full rounded-xl border p-4 text-left transition',

                        String(
                          selectedRoomTypeId
                        ) ===
                        String(
                          room._id
                        )
                          ? 'border-[#0F6B4D] bg-[#EEF7F2]'
                          : 'border-[#DCE5E0] bg-white hover:border-[#A9D9BB]',
                      ].join(
                        ' '
                      )}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-[#17211D]">
                            {
                              room.name
                            }
                          </p>

                          <p className="mt-1 text-sm text-[#66756D]">
                            Up to{' '}
                            {
                              room.capacity
                            }{' '}
                            guest(s) per
                            room
                          </p>

                          {availableRoom && (
                            <p className="mt-2 text-xs font-semibold text-[#0F6B4D]">
                              {
                                availableRoom.availableRooms
                              }{' '}
                              room(s)
                              available
                              for
                              selected
                              dates
                            </p>
                          )}
                        </div>

                        <div className="text-right">
                          <p className="font-bold text-[#17211D]">
                            {formatMoney(
                              room.pricePerNight
                            )}
                          </p>

                          <p className="text-xs text-[#66756D]">
                            / night
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                }
              )}
            </div>
          </section>
        </div>

        {/* BOOKING PANEL */}
        <aside className="h-fit rounded-xl border border-[#DCE5E0] bg-white p-5 shadow-sm xl:sticky xl:top-24">
          <h2 className="text-lg font-bold text-[#17211D]">
            Select Room & Dates
          </h2>

          {selectedRoom && (
            <div className="mt-4 rounded-lg bg-[#F7FAF8] p-4">
              <p className="font-semibold text-[#17211D]">
                {
                  selectedRoom.name
                }
              </p>

              <p className="mt-1 text-sm font-bold text-[#0F6B4D]">
                {formatMoney(
                  selectedRoom.pricePerNight
                )}{' '}
                / night
              </p>
            </div>
          )}

          <form
            onSubmit={
              handleAvailabilityCheck
            }
            className="mt-5 space-y-4"
          >
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[#44524B]">
                Check-in
              </span>

              <input
                type="date"
                value={
                  checkInDate
                }
                onChange={(
                  event
                ) => {
                  setCheckInDate(
                    event.target
                      .value
                  );

                  setAvailability(
                    []
                  );

                  setBookingSuccess(
                    null
                  );
                }}
                className="w-full rounded-lg border border-[#D6DEDA] px-3 py-2.5 text-sm outline-none focus:border-[#0F6B4D]"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[#44524B]">
                Check-out
              </span>

              <input
                type="date"
                value={
                  checkOutDate
                }
                onChange={(
                  event
                ) => {
                  setCheckOutDate(
                    event.target
                      .value
                  );

                  setAvailability(
                    []
                  );

                  setBookingSuccess(
                    null
                  );
                }}
                className="w-full rounded-lg border border-[#D6DEDA] px-3 py-2.5 text-sm outline-none focus:border-[#0F6B4D]"
              />
            </label>

            <button
              type="submit"
              disabled={
                isCheckingAvailability
              }
              className="w-full rounded-lg border border-[#0F6B4D] px-4 py-2.5 text-sm font-semibold text-[#0F6B4D] transition hover:bg-[#EEF7F2] disabled:opacity-50"
            >
              {isCheckingAvailability
                ? 'Checking...'
                : 'Check Availability'}
            </button>
          </form>

          {availability.length >
            0 && (
            <>
              <div className="my-5 border-t border-[#E5ECE8]" />

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-[#44524B]">
                    Rooms
                  </span>

                  <input
                    type="number"
                    min="1"
                    value={
                      numberOfRooms
                    }
                    onChange={(
                      event
                    ) =>
                      setNumberOfRooms(
                        event.target
                          .value
                      )
                    }
                    className="w-full rounded-lg border border-[#D6DEDA] px-3 py-2.5 text-sm outline-none focus:border-[#0F6B4D]"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-[#44524B]">
                    Guests
                  </span>

                  <input
                    type="number"
                    min="1"
                    value={
                      numberOfGuests
                    }
                    onChange={(
                      event
                    ) =>
                      setNumberOfGuests(
                        event.target
                          .value
                      )
                    }
                    className="w-full rounded-lg border border-[#D6DEDA] px-3 py-2.5 text-sm outline-none focus:border-[#0F6B4D]"
                  />
                </label>
              </div>

              <div className="mt-5 rounded-lg bg-[#F7FAF8] p-4">
                <div className="flex justify-between text-sm text-[#66756D]">
                  <span>
                    Nights
                  </span>

                  <span>
                    {
                      numberOfNights
                    }
                  </span>
                </div>

                <div className="mt-2 flex justify-between text-sm text-[#66756D]">
                  <span>
                    Rooms
                  </span>

                  <span>
                    {
                      numberOfRooms
                    }
                  </span>
                </div>

                <div className="mt-3 border-t border-[#DCE5E0] pt-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#17211D]">
                      Total
                    </span>

                    <span className="text-lg font-bold text-[#0F6B4D]">
                      {formatMoney(
                        estimatedTotal
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {selectedRoom &&
              Number(
                selectedRoom
                  .availableRooms
              ) === 0 ? (
                <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-center text-sm font-semibold text-red-600">
                  Sold out for
                  selected dates
                </div>
              ) : (
                <button
                  type="button"
                  disabled={
                    isBooking
                  }
                  onClick={
                    handleBooking
                  }
                  className="mt-4 w-full rounded-lg bg-[#0F6B4D] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0A523B] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isBooking
                    ? 'Booking...'
                    : 'Book Now'}
                </button>
              )}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

export default HotelDetailsPage;