import {
  useEffect,
  useState,
} from 'react';

import {
  useNavigate,
} from 'react-router-dom';

import {
  getHotels,
} from '../api/hotelApi';

function formatMoney(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return 'Price unavailable';
  }

  return `\u09F3${amount.toLocaleString()}`;
}

function getStartingPrice(
  roomTypes = []
) {
  const prices = roomTypes
    .map((roomType) =>
      Number(roomType.pricePerNight)
    )
    .filter(Number.isFinite);

  if (prices.length === 0) {
    return null;
  }

  return Math.min(...prices);
}

function HotelSearchPage() {
  const navigate = useNavigate();

  const [
    hotels,
    setHotels,
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
    location,
    setLocation,
  ] = useState('');

  const [
    checkInDate,
    setCheckInDate,
  ] = useState('');

  const [
    checkOutDate,
    setCheckOutDate,
  ] = useState('');

  const [
    guests,
    setGuests,
  ] = useState('2');

  const [
    roomType,
    setRoomType,
  ] = useState('');

  const [
    minPrice,
    setMinPrice,
  ] = useState('');

  const [
    maxPrice,
    setMaxPrice,
  ] = useState('');

  useEffect(() => {
    let ignoreResult = false;

    async function loadHotels() {
      setIsLoading(true);
      setPageError('');

      try {
        const result =
          await getHotels();

        if (ignoreResult) {
          return;
        }

        setHotels(
          result?.data?.hotels ?? []
        );
      } catch (error) {
        if (!ignoreResult) {
          setPageError(
            error.response?.data
              ?.message ||
              'Unable to load hotels.'
          );
        }
      } finally {
        if (!ignoreResult) {
          setIsLoading(false);
        }
      }
    }

    void loadHotels();

    return () => {
      ignoreResult = true;
    };
  }, []);

  async function handleSearch(
    event
  ) {
    event?.preventDefault();

    setPageError('');

    if (
      checkInDate &&
      checkOutDate &&
      new Date(checkOutDate) <=
        new Date(checkInDate)
    ) {
      setPageError(
        'Check-out date must be after the check-in date.'
      );

      return;
    }

    if (
      minPrice !== '' &&
      maxPrice !== '' &&
      Number(minPrice) >
        Number(maxPrice)
    ) {
      setPageError(
        'Minimum price cannot be greater than maximum price.'
      );

      return;
    }

    setIsLoading(true);

    try {
      const filters = {};

      if (location.trim()) {
        filters.location =
          location.trim();
      }

      if (roomType.trim()) {
        filters.roomType =
          roomType.trim();
      }

      if (minPrice !== '') {
        filters.minPrice =
          minPrice;
      }

      if (maxPrice !== '') {
        filters.maxPrice =
          maxPrice;
      }

      const result =
        await getHotels(filters);

      setHotels(
        result?.data?.hotels ?? []
      );
    } catch (error) {
      setPageError(
        error.response?.data
          ?.message ||
          'Unable to search hotels.'
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResetFilters() {
    setRoomType('');
    setMinPrice('');
    setMaxPrice('');
    setPageError('');
    setIsLoading(true);

    try {
      const filters = {};

      if (location.trim()) {
        filters.location =
          location.trim();
      }

      const result =
        await getHotels(filters);

      setHotels(
        result?.data?.hotels ?? []
      );
    } catch (error) {
      setPageError(
        error.response?.data
          ?.message ||
          'Unable to reset filters.'
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleViewDetails(
    hotel
  ) {
    navigate(
      `/hotels/${hotel._id}`,
      {
        state: {
          checkInDate,
          checkOutDate,
          guests,
        },
      }
    );
  }

  return (
    <div>
      <form
        onSubmit={handleSearch}
        className="rounded-xl border border-[#DCE5E0] bg-white p-4 shadow-sm"
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_0.7fr_auto]">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-[#44524B]">
              Destination
            </span>

            <input
              type="text"
              value={location}
              onChange={(event) =>
                setLocation(
                  event.target.value
                )
              }
              placeholder="Cox's Bazar"
              className="w-full rounded-lg border border-[#D6DEDA] bg-white px-3 py-2.5 text-sm text-[#17211D] outline-none transition focus:border-[#0F6B4D]"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-[#44524B]">
              Check-in
            </span>

            <input
              type="date"
              value={checkInDate}
              onChange={(event) =>
                setCheckInDate(
                  event.target.value
                )
              }
              className="w-full rounded-lg border border-[#D6DEDA] bg-white px-3 py-2.5 text-sm text-[#17211D] outline-none transition focus:border-[#0F6B4D]"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-[#44524B]">
              Check-out
            </span>

            <input
              type="date"
              value={checkOutDate}
              onChange={(event) =>
                setCheckOutDate(
                  event.target.value
                )
              }
              className="w-full rounded-lg border border-[#D6DEDA] bg-white px-3 py-2.5 text-sm text-[#17211D] outline-none transition focus:border-[#0F6B4D]"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-[#44524B]">
              Guests
            </span>

            <input
              type="number"
              min="1"
              value={guests}
              onChange={(event) =>
                setGuests(
                  event.target.value
                )
              }
              className="w-full rounded-lg border border-[#D6DEDA] bg-white px-3 py-2.5 text-sm text-[#17211D] outline-none transition focus:border-[#0F6B4D]"
            />
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="self-end rounded-lg bg-[#0F6B4D] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0A523B] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Search
          </button>
        </div>
      </form>

      {pageError && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {pageError}
        </div>
      )}

      <div className="mt-4 grid gap-4 xl:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="h-fit rounded-xl border border-[#DCE5E0] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-[#17211D]">
              Filter by
            </h2>

            <button
              type="button"
              onClick={
                handleResetFilters
              }
              className="text-xs font-semibold text-[#0F6B4D] hover:underline"
            >
              Reset
            </button>
          </div>

          <div className="mt-5">
            <p className="text-xs font-semibold text-[#44524B]">
              Price per night
            </p>

            <div className="mt-3 space-y-2">
              <input
                type="number"
                min="0"
                value={minPrice}
                onChange={(event) =>
                  setMinPrice(
                    event.target.value
                  )
                }
                placeholder="Minimum price"
                className="w-full rounded-lg border border-[#D6DEDA] px-3 py-2 text-sm text-[#17211D] outline-none focus:border-[#0F6B4D]"
              />

              <input
                type="number"
                min="0"
                value={maxPrice}
                onChange={(event) =>
                  setMaxPrice(
                    event.target.value
                  )
                }
                placeholder="Maximum price"
                className="w-full rounded-lg border border-[#D6DEDA] px-3 py-2 text-sm text-[#17211D] outline-none focus:border-[#0F6B4D]"
              />
            </div>
          </div>

          <div className="mt-5 border-t border-[#E5ECE8] pt-5">
            <label className="block">
              <span className="text-xs font-semibold text-[#44524B]">
                Room type
              </span>

              <input
                type="text"
                value={roomType}
                onChange={(event) =>
                  setRoomType(
                    event.target.value
                  )
                }
                placeholder="e.g. Deluxe"
                className="mt-2 w-full rounded-lg border border-[#D6DEDA] bg-white px-3 py-2.5 text-sm text-[#17211D] outline-none focus:border-[#0F6B4D]"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={() =>
              void handleSearch()
            }
            disabled={isLoading}
            className="mt-5 w-full rounded-lg border border-[#0F6B4D] px-4 py-2.5 text-sm font-semibold text-[#0F6B4D] transition hover:bg-[#EEF7F2] disabled:opacity-50"
          >
            Apply Filters
          </button>
        </aside>

        <section>
          <div className="mb-3">
            <h1 className="text-xl font-bold text-[#17211D]">
              Hotels
            </h1>

            <p className="mt-0.5 text-sm text-[#66756D]">
              {hotels.length}{' '}
              {hotels.length === 1
                ? 'hotel found'
                : 'hotels found'}
            </p>
          </div>

          {isLoading ? (
            <div className="flex min-h-[350px] items-center justify-center rounded-xl border border-[#DCE5E0] bg-white shadow-sm">
              <p className="text-sm font-medium text-[#66756D]">
                Loading hotels...
              </p>
            </div>
          ) : hotels.length === 0 ? (
            <div className="rounded-xl border border-[#DCE5E0] bg-white px-6 py-16 text-center shadow-sm">
              <p className="font-bold text-[#17211D]">
                No hotels found
              </p>

              <p className="mt-2 text-sm text-[#66756D]">
                Try changing your destination or filters.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {hotels.map((hotel) => {
                const photo =
                  hotel.photos?.[0];

                const startingPrice =
                  getStartingPrice(
                    hotel.roomTypes
                  );

                const primaryRoom =
                  hotel.roomTypes?.[0];

                return (
                  <article
                    key={hotel._id}
                    className="overflow-hidden rounded-xl border border-[#DCE5E0] bg-white shadow-sm transition hover:border-[#B8D6C6] hover:shadow-md"
                  >
                    <div className="grid md:grid-cols-[190px_minmax(0,1fr)_145px]">
                      <div className="h-48 bg-[#EEF2F0] md:h-full md:min-h-[190px]">
                        {photo ? (
                          <img
                            src={photo}
                            alt={hotel.name}
                            className="h-full w-full object-cover"
                            onError={(event) => {
                              event.currentTarget.style.display =
                                'none';
                            }}
                          />
                        ) : (
                          <div className="flex h-full min-h-40 items-center justify-center text-sm text-[#8A9690]">
                            No hotel photo
                          </div>
                        )}
                      </div>

                      <div className="p-4">
                        <h2 className="text-base font-bold text-[#17211D]">
                          {hotel.name}
                        </h2>

                        <p className="mt-1 text-xs font-medium text-[#66756D]">
                          {hotel.location
                            ?.address}

                          {hotel.location
                            ?.address &&
                          hotel.location
                            ?.city
                            ? ', '
                            : ''}

                          {hotel.location
                            ?.city}
                        </p>

                        {hotel.amenities
                          ?.length > 0 && (
                          <p className="mt-2 text-xs text-[#44524B]">
                            {hotel.amenities
                              .slice(0, 4)
                              .join(
                                '  |  '
                              )}
                          </p>
                        )}

                        <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#66756D]">
                          {
                            hotel.description
                          }
                        </p>

                        {primaryRoom && (
                          <div className="mt-3">
                            <p className="text-xs font-semibold text-[#0F6B4D]">
                              {
                                primaryRoom.name
                              }
                            </p>

                            <p className="mt-0.5 text-xs text-[#66756D]">
                              Up to{' '}
                              {
                                primaryRoom.capacity
                              }{' '}
                              guests
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col justify-between border-t border-[#E5ECE8] p-4 md:border-l md:border-t-0">
                        <div className="md:text-right">
                          <p className="text-lg font-bold text-[#17211D]">
                            {startingPrice ===
                            null
                              ? '—'
                              : formatMoney(
                                  startingPrice
                                )}
                          </p>

                          <p className="text-xs text-[#66756D]">
                            / night
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            handleViewDetails(
                              hotel
                            )
                          }
                          className="mt-4 rounded-lg bg-[#0F6B4D] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0A523B]"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default HotelSearchPage;