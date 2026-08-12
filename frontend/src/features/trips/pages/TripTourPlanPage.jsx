import {
  useEffect,
  useState,
} from 'react';

import {
  useParams,
} from 'react-router-dom';

import TripMap from '../components/TripMap';

import {
  getDayStops,
  getTripById,
  getTripDays,
} from '../api/tripApi';

function formatDate(value) {
  if (!value) {
    return '';
  }

  return new Intl.DateTimeFormat(
    'en-GB',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }
  ).format(new Date(value));
}

function TripTourPlanPage() {
  const { tripId } =
    useParams();

  const [
    trip,
    setTrip,
  ] = useState(null);

  const [
    days,
    setDays,
  ] = useState([]);

  const [
    selectedDayId,
    setSelectedDayId,
  ] = useState('');

  const [
    stops,
    setStops,
  ] = useState([]);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isLoadingStops,
    setIsLoadingStops,
  ] = useState(false);

  const [
    pageError,
    setPageError,
  ] = useState('');

  useEffect(() => {
    let ignoreResult = false;

    async function loadTripPlan() {
      setIsLoading(true);
      setPageError('');

      try {
        const [
          tripResult,
          daysResult,
        ] = await Promise.all([
          getTripById(tripId),
          getTripDays(tripId),
        ]);

        if (ignoreResult) {
          return;
        }

        setTrip(
          tripResult?.data || null
        );

        const tripDays =
          Array.isArray(
            daysResult?.data
          )
            ? daysResult.data
            : [];

        setDays(tripDays);

        if (
          tripDays.length > 0
        ) {
          setSelectedDayId(
            tripDays[0]._id
          );
        }
      } catch (error) {
        if (!ignoreResult) {
          setPageError(
            error.response?.data
              ?.message ||
              'Unable to load the trip plan.'
          );
        }
      } finally {
        if (!ignoreResult) {
          setIsLoading(false);
        }
      }
    }

    void loadTripPlan();

    return () => {
      ignoreResult = true;
    };
  }, [tripId]);

  useEffect(() => {
    if (!selectedDayId) {
      return;
    }

    let ignoreResult = false;

    async function loadStops() {
      setIsLoadingStops(true);
      setPageError('');

      try {
        const result =
          await getDayStops(
            tripId,
            selectedDayId
          );

        if (ignoreResult) {
          return;
        }

        setStops(
          Array.isArray(
            result?.data?.stops
          )
            ? result.data.stops
            : []
        );
      } catch (error) {
        if (!ignoreResult) {
          setPageError(
            error.response?.data
              ?.message ||
              'Unable to load the stops for this day.'
          );
        }
      } finally {
        if (!ignoreResult) {
          setIsLoadingStops(false);
        }
      }
    }

    void loadStops();

    return () => {
      ignoreResult = true;
    };
  }, [
    tripId,
    selectedDayId,
  ]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm font-medium text-[#66756D]">
          Loading tour plan...
        </p>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
        {pageError ||
          'Trip not found.'}
      </div>
    );
  }

  const selectedDay =
    days.find(
      (day) =>
        day._id ===
        selectedDayId
    );

  return (
    <div>
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-[#0F6B4D]">
          Tour Plan
        </p>

        <h1 className="mt-1 text-2xl font-bold text-[#17211D] md:text-3xl">
          {trip.tripName}
        </h1>

        <p className="mt-2 text-sm text-[#66756D]">
          {trip.destination?.name ||
            'Destination not specified'}
          {' • '}
          {formatDate(
            trip.startDate
          )}
          {' – '}
          {formatDate(
            trip.endDate
          )}
        </p>
      </div>

      {pageError && (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {pageError}
        </div>
      )}

      <section className="mt-7">
        <h2 className="text-sm font-bold text-[#17211D]">
          Select Day
        </h2>

        <div className="mt-3 flex flex-wrap gap-2">
          {days.map((day) => {
            const isSelected =
              day._id ===
              selectedDayId;

            return (
              <button
                key={day._id}
                type="button"
                onClick={() =>
                  setSelectedDayId(
                    day._id
                  )
                }
                className={[
                  'rounded-lg border px-4 py-2.5 text-sm font-semibold transition',
                  isSelected
                    ? 'border-[#0F6B4D] bg-[#0F6B4D] text-white'
                    : 'border-[#DCE5E0] bg-white text-[#44524B] hover:bg-[#EEF7F2]',
                ].join(' ')}
              >
                Day {day.dayNumber}
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-6 grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="rounded-xl border border-[#DCE5E0] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-bold text-[#17211D]">
                Day{' '}
                {selectedDay?.dayNumber ||
                  '—'}
              </h2>

              <p className="mt-1 text-sm text-[#66756D]">
                {selectedDay
                  ? formatDate(
                      selectedDay.date
                    )
                  : ''}
              </p>
            </div>

            <span className="rounded-full bg-[#EEF7F2] px-3 py-1 text-xs font-semibold text-[#0F6B4D]">
              {stops.length}{' '}
              {stops.length === 1
                ? 'stop'
                : 'stops'}
            </span>
          </div>

          <div className="mt-5">
            {isLoadingStops ? (
              <p className="text-sm text-[#66756D]">
                Loading stops...
              </p>
            ) : stops.length ===
              0 ? (
              <div className="rounded-lg border border-dashed border-[#CBD8D1] bg-[#F7FAF8] px-4 py-8 text-center">
                <p className="text-sm font-semibold text-[#44524B]">
                  No stops added yet
                </p>

                <p className="mt-1 text-sm text-[#66756D]">
                  Stops added to this
                  day will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {stops.map(
                  (stop) => (
                    <article
                      key={
                        stop._id
                      }
                      className="rounded-lg border border-[#E1E8E4] p-4"
                    >
                      <div className="flex gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0F6B4D] text-sm font-bold text-white">
                          {
                            stop.order
                          }
                        </div>

                        <div className="min-w-0">
                          <h3 className="font-semibold text-[#17211D]">
                            {
                              stop.placeName
                            }
                          </h3>

                          {stop.visitTime && (
                            <p className="mt-1 text-sm text-[#66756D]">
                              Visit time:{' '}
                              {
                                stop.visitTime
                              }
                            </p>
                          )}

                          {stop.description && (
                            <p className="mt-2 text-sm text-[#66756D]">
                              {
                                stop.description
                              }
                            </p>
                          )}
                        </div>
                      </div>
                    </article>
                  )
                )}
              </div>
            )}
          </div>
        </div>

        <TripMap
        stops={stops}
        />
      </section>
    </div>
  );
}

export default TripTourPlanPage;