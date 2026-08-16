import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  useParams,
} from 'react-router-dom';

import AddStopForm from '../components/AddStopForm';
import EditStopForm from '../components/EditStopForm';
import TripMap from '../components/TripMap';

import {
  deleteStop,
  getDayStops,
  getTripById,
  getTripDays,
  reorderStops,
} from '../api/tripApi';

import {
  getRouteForStops,
} from '../api/osrmApi';

const ADD_STOP_MAP_OWNER =
  'add-stop';

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

function formatDistance(
  distanceMeters
) {
  const kilometers =
    distanceMeters / 1000;

  return `${kilometers.toFixed(
    1
  )} km`;
}

function formatDuration(
  durationSeconds
) {
  const totalMinutes =
    Math.round(
      durationSeconds / 60
    );

  const hours =
    Math.floor(
      totalMinutes / 60
    );

  const minutes =
    totalMinutes % 60;

  if (hours === 0) {
    return `${minutes} min`;
  }

  if (minutes === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${minutes} min`;
}

function hasLocationCoordinates(
  location
) {
  if (!location) {
    return false;
  }

  const latitude =
    Number(
      location.latitude
    );

  const longitude =
    Number(
      location.longitude
    );

  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function TripTourPlanPage() {
  const { tripId } = useParams();

  const mapPickHandlerRef =
    useRef(null);

  const mapPickOwnerRef =
    useRef('');

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

  const [
    deletingStopId,
    setDeletingStopId,
  ] = useState('');

  const [
    editingStopId,
    setEditingStopId,
  ] = useState('');

  const [
    draggingStopId,
    setDraggingStopId,
  ] = useState('');

  const [
    isReordering,
    setIsReordering,
  ] = useState(false);

  const [
    routeData,
    setRouteData,
  ] = useState(null);

  const [
    isLoadingRoute,
    setIsLoadingRoute,
  ] = useState(false);

  const [
    routeError,
    setRouteError,
  ] = useState('');

  const [
    mapPickOwner,
    setMapPickOwner,
  ] = useState('');

  const [
    draftMapLocation,
    setDraftMapLocation,
  ] = useState(null);

  function stopMapPicking(
    owner = ''
  ) {
    if (
      owner &&
      mapPickOwnerRef.current !==
        owner
    ) {
      return;
    }

    mapPickOwnerRef.current =
      '';

    mapPickHandlerRef.current =
      null;

    setMapPickOwner('');
    setDraftMapLocation(null);
  }

  function startMapPicking(
    owner,
    payload
  ) {
    mapPickOwnerRef.current =
      owner;

    mapPickHandlerRef.current =
      payload?.onLocationPicked ||
      null;

    setMapPickOwner(owner);

    if (
      hasLocationCoordinates(
        payload?.currentLocation
      )
    ) {
      setDraftMapLocation({
        latitude:
          Number(
            payload.currentLocation
              .latitude
          ),

        longitude:
          Number(
            payload.currentLocation
              .longitude
          ),
      });
    } else {
      setDraftMapLocation(null);
    }
  }

  function handleMainMapLocationPicked(
    coordinates
  ) {
    const nextLocation = {
      latitude:
        coordinates.latitude,

      longitude:
        coordinates.longitude,

      displayName:
        'Point selected directly on the main trip map',

      source:
        'map',
    };

    setDraftMapLocation(
      nextLocation
    );

    mapPickHandlerRef.current?.(
      nextLocation
    );
  }

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

  useEffect(() => {
    const controller =
      new AbortController();

    let ignoreResult = false;

    async function loadRoute() {
      setIsLoadingRoute(true);
      setRouteError('');

      try {
        const result =
          await getRouteForStops(
            stops,
            {
              signal:
                controller.signal,
            }
          );

        if (ignoreResult) {
          return;
        }

        setRouteData(
          result
        );
      } catch (error) {
        if (
          controller.signal
            .aborted
        ) {
          return;
        }

        if (!ignoreResult) {
          setRouteData(null);

          setRouteError(
            error.message ||
              'Unable to calculate the road route.'
          );
        }
      } finally {
        if (!ignoreResult) {
          setIsLoadingRoute(
            false
          );
        }
      }
    }

    void loadRoute();

    return () => {
      ignoreResult = true;
      controller.abort();
    };
  }, [stops]);

  function handleStopAdded(
    newStop
  ) {
    stopMapPicking(
      ADD_STOP_MAP_OWNER
    );

    setStops(
      (currentStops) =>
        [
          ...currentStops,
          newStop,
        ].sort(
          (
            first,
            second
          ) =>
            first.order -
            second.order
        )
    );
  }

  function handleStopUpdated(
    updatedStop
  ) {
    stopMapPicking();

    setStops(
      (currentStops) =>
        currentStops.map(
          (stop) =>
            stop._id ===
            updatedStop._id
              ? updatedStop
              : stop
        )
    );

    setEditingStopId('');
  }

  function handleDragStart(
    event,
    stopId
  ) {
    if (isReordering) {
      event.preventDefault();
      return;
    }

    stopMapPicking();

    event.dataTransfer.effectAllowed =
      'move';

    event.dataTransfer.setData(
      'text/plain',
      stopId
    );

    setDraggingStopId(
      stopId
    );

    setEditingStopId('');
  }

  function handleDragEnd() {
    setDraggingStopId('');
  }

  async function handleDrop(
    event,
    targetStopId
  ) {
    event.preventDefault();

    if (
      !draggingStopId ||
      draggingStopId ===
        targetStopId ||
      isReordering
    ) {
      setDraggingStopId('');
      return;
    }

    const previousStops = [
      ...stops,
    ];

    const draggedIndex =
      stops.findIndex(
        (stop) =>
          stop._id ===
          draggingStopId
      );

    const targetIndex =
      stops.findIndex(
        (stop) =>
          stop._id ===
          targetStopId
      );

    if (
      draggedIndex === -1 ||
      targetIndex === -1
    ) {
      setDraggingStopId('');
      return;
    }

    const reorderedStops = [
      ...stops,
    ];

    const [
      draggedStop,
    ] = reorderedStops.splice(
      draggedIndex,
      1
    );

    reorderedStops.splice(
      targetIndex,
      0,
      draggedStop
    );

    const locallyRenumbered =
      reorderedStops.map(
        (stop, index) => ({
          ...stop,
          order: index + 1,
        })
      );

    setStops(
      locallyRenumbered
    );

    setDraggingStopId('');
    setIsReordering(true);
    setPageError('');

    try {
      const result =
        await reorderStops(
          tripId,
          selectedDayId,
          locallyRenumbered.map(
            (stop) => stop._id
          )
        );

      setStops(
        Array.isArray(
          result?.data
        )
          ? result.data
          : locallyRenumbered
      );
    } catch (error) {
      setStops(
        previousStops
      );

      setPageError(
        error.response?.data
          ?.message ||
          'Unable to reorder the itinerary.'
      );
    } finally {
      setIsReordering(false);
    }
  }

  async function handleDeleteStop(
    stop
  ) {
    const confirmed =
      window.confirm(
        `Delete "${stop.placeName}" from this day?`
      );

    if (!confirmed) {
      return;
    }

    stopMapPicking();

    setDeletingStopId(
      stop._id
    );

    setEditingStopId('');
    setPageError('');

    try {
      await deleteStop(
        tripId,
        selectedDayId,
        stop._id
      );

      const result =
        await getDayStops(
          tripId,
          selectedDayId
        );

      setStops(
        Array.isArray(
          result?.data?.stops
        )
          ? result.data.stops
          : []
      );
    } catch (error) {
      setPageError(
        error.response?.data
          ?.message ||
          'Unable to delete the stop.'
      );
    } finally {
      setDeletingStopId('');
    }
  }

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

  const isPickingLocation =
    Boolean(mapPickOwner);

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
                disabled={
                  isReordering
                }
                onClick={() => {
                  stopMapPicking();

                  setSelectedDayId(
                    day._id
                  );

                  setEditingStopId(
                    ''
                  );

                  setDraggingStopId(
                    ''
                  );
                }}
                className={[
                  'rounded-lg border px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60',
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

      <section className="mt-6 grid min-w-0 gap-5 xl:grid-cols-[440px_minmax(0,1fr)]">
        <div className="min-w-0 rounded-xl border border-[#DCE5E0] bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
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

              {isReordering && (
                <p className="mt-2 text-xs font-semibold text-[#0F6B4D]">
                  Saving new
                  order...
                </p>
              )}
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
                  (stop) => {
                    const editMapOwner =
                      `edit-stop-${stop._id}`;

                    return (
                      <article
                        key={
                          stop._id
                        }
                        draggable={
                          !isReordering &&
                          !editingStopId &&
                          deletingStopId !==
                            stop._id
                        }
                        onDragStart={(
                          event
                        ) =>
                          handleDragStart(
                            event,
                            stop._id
                          )
                        }
                        onDragEnd={
                          handleDragEnd
                        }
                        onDragOver={(
                          event
                        ) => {
                          event.preventDefault();

                          event.dataTransfer.dropEffect =
                            'move';
                        }}
                        onDrop={(
                          event
                        ) =>
                          void handleDrop(
                            event,
                            stop._id
                          )
                        }
                        className={[
                          'min-w-0 rounded-lg border p-4 transition',
                          draggingStopId ===
                          stop._id
                            ? 'border-[#0F6B4D] bg-[#EEF7F2] opacity-60'
                            : 'border-[#E1E8E4] bg-white',
                          isReordering
                            ? 'cursor-wait'
                            : editingStopId
                              ? 'cursor-default'
                              : 'cursor-move',
                        ].join(' ')}
                      >
                        <div className="flex min-w-0 gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0F6B4D] text-sm font-bold text-white">
                            {
                              stop.order
                            }
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="mb-2 text-xs font-medium text-[#8A9891]">
                              Drag to
                              reorder
                            </p>

                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <h3 className="min-w-0 flex-1 break-words font-semibold text-[#17211D]">
                                {
                                  stop.placeName
                                }
                              </h3>

                              <div className="flex shrink-0 gap-2">
                                <button
                                  type="button"
                                  disabled={
                                    isReordering
                                  }
                                  onClick={() => {
                                    stopMapPicking();

                                    setEditingStopId(
                                      (
                                        currentId
                                      ) =>
                                        currentId ===
                                        stop._id
                                          ? ''
                                          : stop._id
                                    );
                                  }}
                                  className="rounded-md border border-[#BCD6C9] px-2.5 py-1 text-xs font-semibold text-[#0F6B4D] transition hover:bg-[#EEF7F2] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {editingStopId ===
                                  stop._id
                                    ? 'Close'
                                    : 'Edit'}
                                </button>

                                <button
                                  type="button"
                                  disabled={
                                    isReordering ||
                                    deletingStopId ===
                                      stop._id
                                  }
                                  onClick={() =>
                                    handleDeleteStop(
                                      stop
                                    )
                                  }
                                  className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {deletingStopId ===
                                  stop._id
                                    ? 'Deleting...'
                                    : 'Delete'}
                                </button>
                              </div>
                            </div>

                            {stop.visitTime && (
                              <p className="mt-1 text-sm text-[#66756D]">
                                Visit time:{' '}
                                {
                                  stop.visitTime
                                }
                              </p>
                            )}

                            {stop.description && (
                              <p className="mt-2 break-words text-sm text-[#66756D]">
                                {
                                  stop.description
                                }
                              </p>
                            )}

                            {editingStopId ===
                              stop._id && (
                              <EditStopForm
                                tripId={
                                  tripId
                                }
                                dayId={
                                  selectedDayId
                                }
                                stop={
                                  stop
                                }
                                isMapPicking={
                                  mapPickOwner ===
                                  editMapOwner
                                }
                                onStartMapPicking={(
                                  payload
                                ) =>
                                  startMapPicking(
                                    editMapOwner,
                                    payload
                                  )
                                }
                                onStopMapPicking={() =>
                                  stopMapPicking(
                                    editMapOwner
                                  )
                                }
                                onStopUpdated={
                                  handleStopUpdated
                                }
                                onCancel={() => {
                                  stopMapPicking(
                                    editMapOwner
                                  );

                                  setEditingStopId(
                                    ''
                                  );
                                }}
                              />
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  }
                )}
              </div>
            )}
          </div>

          <AddStopForm
            tripId={tripId}
            dayId={
              selectedDayId
            }
            isMapPicking={
              mapPickOwner ===
              ADD_STOP_MAP_OWNER
            }
            onStartMapPicking={(
              payload
            ) =>
              startMapPicking(
                ADD_STOP_MAP_OWNER,
                payload
              )
            }
            onStopMapPicking={() =>
              stopMapPicking(
                ADD_STOP_MAP_OWNER
              )
            }
            onStopAdded={
              handleStopAdded
            }
          />
        </div>

        <div className="min-w-0 xl:sticky xl:top-24 xl:self-start">
          <div className="mb-4 rounded-xl border border-[#DCE5E0] bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#66756D]">
                  Road Route
                </p>

                {isLoadingRoute ? (
                  <p className="mt-1 text-sm font-semibold text-[#0F6B4D]">
                    Calculating route...
                  </p>
                ) : routeError ? (
                  <p className="mt-1 text-sm font-semibold text-amber-700">
                    Driving route
                    unavailable
                  </p>
                ) : routeData ? (
                  <p className="mt-1 text-sm text-[#44524B]">
                    Driving route
                    calculated
                    successfully.
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-[#66756D]">
                    Add at least two
                    destinations to
                    calculate a road
                    route.
                  </p>
                )}
              </div>

              {routeData &&
                !routeError && (
                  <div className="flex gap-2">
                    <div className="rounded-lg bg-[#EEF7F2] px-3 py-2 text-center">
                      <p className="text-xs text-[#66756D]">
                        Distance
                      </p>

                      <p className="mt-0.5 text-sm font-bold text-[#0F6B4D]">
                        {formatDistance(
                          routeData
                            .distanceMeters
                        )}
                      </p>
                    </div>

                    <div className="rounded-lg bg-[#EEF7F2] px-3 py-2 text-center">
                      <p className="text-xs text-[#66756D]">
                        Travel time
                      </p>

                      <p className="mt-0.5 text-sm font-bold text-[#0F6B4D]">
                        {formatDuration(
                          routeData
                            .durationSeconds
                        )}
                      </p>
                    </div>
                  </div>
                )}
            </div>

            {routeError && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-5 text-amber-700">
                {routeError}
              </div>
            )}
          </div>

          <TripMap
            stops={stops}
            routePoints={
              routeData
                ?.routePoints ||
              []
            }
            isPickingLocation={
              isPickingLocation
            }
            pickedLocation={
              draftMapLocation
            }
            onLocationPicked={
              handleMainMapLocationPicked
            }
          />
        </div>
      </section>
    </div>
  );
}

export default TripTourPlanPage;