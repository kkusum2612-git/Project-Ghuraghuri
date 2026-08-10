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

function formatMoney(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return '৳0';
  }

  return `৳${amount.toLocaleString()}`;
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

  const [
    successMessage,
    setSuccessMessage,
  ] = useState('');

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

        if (
          loadedHotel
            ?.roomTypes?.length > 0
        ) {
          setSelectedRoomTypeId(
            loadedHotel.roomTypes[0]
              ._id
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
            String(room._id) ===
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
        Number(numberOfRooms || 0) *
        numberOfNights
      : 0;

  async function refreshAvailability() {
    const result =
      await getHotelAvailability(
        hotelId,
        checkInDate,
        checkOutDate
      );

    const roomTypes =
      result?.data?.roomTypes ??
      [];

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
        roomTypes[0].roomTypeId
      );
    }

    return roomTypes;
  }

  async function handleAvailabilityCheck(
    event
  ) {
    event?.preventDefault();

    setPageError('');
    setSuccessMessage('');

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
      new Date(checkOutDate) <=
      new Date(checkInDate)
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
    setSuccessMessage('');

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
      Number(numberOfRooms);

    const guests =
      Number(numberOfGuests);

    if (
      !Number.isInteger(rooms) ||
      rooms < 1
    ) {
      setPageError(
        'Number of rooms must be at least 1.'
      );

      return;
    }

    if (
      !Number.isInteger(guests) ||
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
        selectedRoom.availableRooms
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
      guests > maximumGuests
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
          numberOfRooms: rooms,
          numberOfGuests:
            guests,
        });

      const booking =
        result?.data?.booking;

      await refreshAvailability();

      setSuccessMessage(
        `Booking request submitted successfully. Total: ${formatMoney(
          booking?.totalPrice
        )}`
      );
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
          Loading hotel details...
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
            navigate('/hotels')
          }
          className="mt-4 text-sm font-semibold text-[#0F6B4D]"
        >
          Back to hotels
        </button>
      </div>
    );
  }

  const mainPhoto =
    hotel.photos?.[0];

  const extraPhotos =
    hotel.photos?.slice(
      1,
      5
    ) ?? [];

  return (
    <div>
      <button
        type="button"
        onClick={() =>
          navigate('/hotels')
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

      {successMessage && (
        <div className="mb-4 rounded-lg border border-[#A9D9BB] bg-[#EEF7F2] px-4 py-3 text-sm font-semibold text-[#0F6B4D]">
          {successMessage}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0">
          <section className="overflow-hidden rounded-xl border border-[#DCE5E0] bg-white shadow-sm">
            <div className="h-[360px] bg-[#EEF2F0]">
              {mainPhoto ? (
                <img
                  src={mainPhoto}
                  alt={hotel.name}
                  className="h-full w-full object-cover"
                  onError={(event) => {
                    event.currentTarget.style.display =
                      'none';
                  }}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-[#8A9690]">
                  No hotel photo
                </div>
              )}
            </div>

            {extraPhotos.length >
              0 && (
              <div className="grid grid-cols-4 gap-2 p-3">
                {extraPhotos.map(
                  (photo) => (
                    <div
                      key={photo}
                      className="h-20 overflow-hidden rounded-lg bg-[#EEF2F0]"
                    >
                      <img
                        src={photo}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )
                )}
              </div>
            )}
          </section>

          <section className="mt-5 rounded-xl border border-[#DCE5E0] bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-bold text-[#17211D]">
              {hotel.name}
            </h1>

            <p className="mt-2 text-sm text-[#66756D]">
              {
                hotel.location
                  ?.address
              }

              {hotel.location
                ?.address &&
              hotel.location?.city
                ? ', '
                : ''}

              {hotel.location?.city}
            </p>

            <p className="mt-5 text-sm leading-7 text-[#44524B]">
              {hotel.description}
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
                        key={amenity}
                        className="rounded-full bg-[#EEF7F2] px-3 py-1.5 text-xs font-medium text-[#0F6B4D]"
                      >
                        {amenity}
                      </span>
                    )
                  )}
                </div>
              </div>
            )}
          </section>

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
                      key={room._id}
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
                        String(room._id)
                          ? 'border-[#0F6B4D] bg-[#EEF7F2]'
                          : 'border-[#DCE5E0] bg-white hover:border-[#A9D9BB]',
                      ].join(' ')}
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
                              available for
                              selected dates
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
                value={checkInDate}
                onChange={(event) => {
                  setCheckInDate(
                    event.target.value
                  );

                  setAvailability(
                    []
                  );

                  setSuccessMessage(
                    ''
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
                value={checkOutDate}
                onChange={(event) => {
                  setCheckOutDate(
                    event.target.value
                  );

                  setAvailability(
                    []
                  );

                  setSuccessMessage(
                    ''
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
                selectedRoom.availableRooms
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