import {
  useEffect,
  useState,
} from 'react';

import {
  useNavigate,
} from 'react-router-dom';

import {
  getMyPublicRooms,
  getPublicRooms,
} from '../api/publicRoomApi';

// ============================================================
// SMALL DISPLAY HELPER FUNCTIONS
// ============================================================
//
// These functions only format information for the screen.
// They do NOT change anything in the database.

/**
 * Turns a MongoDB/JavaScript date into a friendly date.
 *
 * Example:
 *
 * 2026-08-20T00:00:00.000Z
 *
 * becomes something similar to:
 *
 * 20 Aug 2026
 */
function formatDate(value) {
  if (!value) {
    return 'Date unavailable';
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return 'Date unavailable';
  }

  return date.toLocaleDateString(
    'en-GB',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }
  );
}

/**
 * Formats the estimated budget using the Bangladeshi
 * Taka symbol.
 *
 * Example:
 *
 * 12000
 *
 * becomes:
 *
 * ৳12,000
 */
function formatMoney(value) {
  const amount = Number(value);

  if (
    !Number.isFinite(amount)
  ) {
    return 'Budget unavailable';
  }

  return `৳${amount.toLocaleString()}`;
}

/**
 * Returns how many people are currently members.
 *
 * Our backend returns members as an array because the
 * PublicRoom model stores User references there.
 */
function getMemberCount(room) {
  return Array.isArray(
    room?.members
  )
    ? room.members.length
    : 0;
}

// ============================================================
// PAGE COMPONENT
// ============================================================

function PublicRoomsPage() {
  // useNavigate lets us change pages from JavaScript.
  //
  // Example:
  //
  // navigate('/event-rooms/new')
  //
  // opens the Create Room page.
  const navigate =
    useNavigate();

  // ----------------------------------------------------------
  // DATA FROM THE BACKEND
  // ----------------------------------------------------------

  // Rooms that the logged-in traveler personally created.
  const [
    myRooms,
    setMyRooms,
  ] = useState([]);

  // Public rooms created by other travelers.
  const [
    publicRooms,
    setPublicRooms,
  ] = useState([]);

  // ----------------------------------------------------------
  // PAGE STATE
  // ----------------------------------------------------------

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isSearching,
    setIsSearching,
  ] = useState(false);

  const [
    pageError,
    setPageError,
  ] = useState('');

  // ----------------------------------------------------------
  // DISCOVERY FILTER STATE
  // ----------------------------------------------------------
  //
  // Each input has its own React state value.
  //
  // When the user presses Search, these values are converted
  // into query parameters for the backend.

  const [
    destination,
    setDestination,
  ] = useState('');

  const [
    startDate,
    setStartDate,
  ] = useState('');

  const [
    endDate,
    setEndDate,
  ] = useState('');

  const [
    minBudget,
    setMinBudget,
  ] = useState('');

  const [
    maxBudget,
    setMaxBudget,
  ] = useState('');

  const [
    interest,
    setInterest,
  ] = useState('');

  // ==========================================================
  // INITIAL PAGE LOAD
  // ==========================================================
  //
  // useEffect runs after the component first appears.
  //
  // We load two sets of information:
  //
  // 1. rooms created by this traveler
  // 2. rooms created by other travelers
  //
  // Promise.all lets those two independent API requests happen
  // at the same time instead of waiting for one before starting
  // the other.

  useEffect(() => {
    let ignoreResult = false;

    async function loadRooms() {
      setIsLoading(true);
      setPageError('');

      try {
        const [
          myRoomsResult,
          publicRoomsResult,
        ] = await Promise.all([
          getMyPublicRooms(),
          getPublicRooms(),
        ]);

        // React may remove this page before the requests finish.
        //
        // The ignoreResult flag prevents us from trying to
        // update a component that is no longer being displayed.
        if (ignoreResult) {
          return;
        }

        setMyRooms(
          Array.isArray(
            myRoomsResult?.data
          )
            ? myRoomsResult.data
            : []
        );

        setPublicRooms(
          Array.isArray(
            publicRoomsResult?.data
          )
            ? publicRoomsResult.data
            : []
        );
      } catch (error) {
        if (!ignoreResult) {
          setPageError(
            error.response?.data
              ?.message ||
              'Unable to load event rooms.'
          );
        }
      } finally {
        if (!ignoreResult) {
          setIsLoading(false);
        }
      }
    }

    void loadRooms();

    return () => {
      ignoreResult = true;
    };
  }, []);

  // ==========================================================
  // SUMMARY CARD CALCULATIONS
  // ==========================================================
  //
  // These values are CALCULATED from real room data.
  //
  // We do not hardcode numbers from the Figma screenshot.

  const roomsCreated =
    myRooms.length;

  // Each owned room response includes pendingJoinRequests.
  //
  // reduce() combines all those room-level counts into one
  // dashboard total.
  const pendingRequests =
    myRooms.reduce(
      (total, room) =>
        total +
        Number(
          room.pendingJoinRequests ||
            0
        ),
      0
    );

  // The creator is automatically member #1 of each room.
  const totalMembers =
    myRooms.reduce(
      (total, room) =>
        total +
        getMemberCount(room),
      0
    );

  const openRooms =
    myRooms.filter(
      (room) =>
        room.status === 'open'
    ).length;

  // ==========================================================
  // NAVIGATION
  // ==========================================================

  function handleCreateRoom() {
    navigate(
      '/event-rooms/new'
    );
  }

  function handleViewRoom(room) {
    navigate(
      `/event-rooms/${room._id}`
    );
  }

  /**
   * The Figma contains a "Browse Rooms" button.
   *
   * Since discovery is already on this same page, we do not
   * create an unnecessary second browse page.
   *
   * Instead, the button smoothly scrolls down to the real
   * Discover Public Rooms section.
   */
  function handleBrowseRooms() {
    const discoverySection =
      document.getElementById(
        'discover-public-rooms'
      );

    discoverySection?.scrollIntoView(
      {
        behavior: 'smooth',
        block: 'start',
      }
    );
  }

  // ==========================================================
  // SEARCH / FILTERING
  // ==========================================================

  async function handleSearch(
    event
  ) {
    event.preventDefault();

    setPageError('');

    // Frontend validation gives the user immediate feedback.
    //
    // The backend ALSO performs validation because frontend
    // validation alone is never enough for security.
    if (
      startDate &&
      endDate &&
      new Date(endDate) <
        new Date(startDate)
    ) {
      setPageError(
        'End date cannot be before the start date.'
      );

      return;
    }

    if (
      minBudget !== '' &&
      maxBudget !== '' &&
      Number(minBudget) >
        Number(maxBudget)
    ) {
      setPageError(
        'Minimum budget cannot be greater than maximum budget.'
      );

      return;
    }

    setIsSearching(true);

    try {
      // Start with an empty object.
      //
      // We only send filters that the traveler actually filled
      // in. This keeps the URL/API request clean.
      const filters = {};

      if (destination.trim()) {
        filters.destination =
          destination.trim();
      }

      if (startDate) {
        filters.startDate =
          startDate;
      }

      if (endDate) {
        filters.endDate =
          endDate;
      }

      if (minBudget !== '') {
        filters.minBudget =
          minBudget;
      }

      if (maxBudget !== '') {
        filters.maxBudget =
          maxBudget;
      }

      if (interest.trim()) {
        filters.interest =
          interest.trim();
      }

      const result =
        await getPublicRooms(
          filters
        );

      setPublicRooms(
        Array.isArray(
          result?.data
        )
          ? result.data
          : []
      );
    } catch (error) {
      setPageError(
        error.response?.data
          ?.message ||
          'Unable to search public rooms.'
      );
    } finally {
      setIsSearching(false);
    }
  }

  // Reset every discovery filter and reload all open rooms.
  async function handleResetFilters() {
    setDestination('');
    setStartDate('');
    setEndDate('');
    setMinBudget('');
    setMaxBudget('');
    setInterest('');
    setPageError('');
    setIsSearching(true);

    try {
      const result =
        await getPublicRooms();

      setPublicRooms(
        Array.isArray(
          result?.data
        )
          ? result.data
          : []
      );
    } catch (error) {
      setPageError(
        error.response?.data
          ?.message ||
          'Unable to reset room filters.'
      );
    } finally {
      setIsSearching(false);
    }
  }

  // ==========================================================
  // LOADING SCREEN
  // ==========================================================

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm font-medium text-[#66756D]">
          Loading event rooms...
        </p>
      </div>
    );
  }

  // ==========================================================
  // PAGE UI
  // ==========================================================

  return (
    <div>
      {/* =====================================================
          PAGE HEADER

          This follows your Figma:
          Event Rooms + two action buttons.
         ===================================================== */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#17211D] md:text-3xl">
            Event Rooms
          </h1>

          <p className="mt-1 text-sm text-[#66756D]">
            Create travel groups,
            discover public rooms,
            and connect with travelers
            who share your plans.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={
              handleCreateRoom
            }
            className="rounded-lg bg-[#0F6B4D] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0A523B]"
          >
            + Create New Room
          </button>

          <button
            type="button"
            onClick={
              handleBrowseRooms
            }
            className="rounded-lg border border-[#0F6B4D] bg-white px-5 py-3 text-sm font-semibold text-[#0F6B4D] transition hover:bg-[#EEF7F2]"
          >
            Browse Rooms
          </button>
        </div>
      </div>

      {/* General API/form error area. */}
      {pageError && (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {pageError}
        </div>
      )}

      {/* =====================================================
          SUMMARY CARDS

          The Figma uses summary cards at the top.

          We deliberately use REAL values calculated from the
          database instead of copying fake Figma numbers.
         ===================================================== */}
      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-[#DCE5E0] bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-[#66756D]">
            Rooms Created
          </p>

          <p className="mt-2 text-3xl font-bold text-[#17211D]">
            {roomsCreated}
          </p>
        </div>

        <div className="rounded-xl border border-[#DCE5E0] bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-[#66756D]">
            Join Requests Pending
          </p>

          <p className="mt-2 text-3xl font-bold text-[#17211D]">
            {pendingRequests}
          </p>
        </div>

        <div className="rounded-xl border border-[#DCE5E0] bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-[#66756D]">
            Total Members
          </p>

          <p className="mt-2 text-3xl font-bold text-[#17211D]">
            {totalMembers}
          </p>
        </div>

        {/* The Figma has Total Messages here.

            Chat belongs to later project functionality and is
            not implemented yet.

            We refuse to display a fake "messages" number.
            Instead, we show another REAL Feature-1 value. */}
        <div className="rounded-xl border border-[#DCE5E0] bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-[#66756D]">
            Open Rooms
          </p>

          <p className="mt-2 text-3xl font-bold text-[#17211D]">
            {openRooms}
          </p>
        </div>
      </section>

      {/* =====================================================
          YOUR CREATED ROOMS
         ===================================================== */}
      <section className="mt-10">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-[#17211D]">
            Your Created Rooms
          </h2>

          <p className="mt-1 text-sm text-[#66756D]">
            Rooms where you are the
            creator.
          </p>
        </div>

        {myRooms.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#C9D7D0] bg-white px-6 py-10 text-center">
            <h3 className="text-lg font-bold text-[#17211D]">
              You have not created
              an event room yet
            </h3>

            <p className="mx-auto mt-2 max-w-lg text-sm text-[#66756D]">
              Create a public room
              to find travelers with
              similar destinations,
              dates, budgets, and
              interests.
            </p>

            <button
              type="button"
              onClick={
                handleCreateRoom
              }
              className="mt-5 rounded-lg bg-[#0F6B4D] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0A523B]"
            >
              Create Your First Room
            </button>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {myRooms.map(
              (room) => (
                <article
                  key={room._id}
                  className="overflow-hidden rounded-xl border border-[#DCE5E0] bg-white shadow-sm"
                >
                  {/* Optional URL-based room cover image.

                      The wrapper has a neutral background so a
                      room still looks acceptable when it has
                      no image. */}
                  <div className="h-40 bg-[#E8F1EC]">
                    {room.coverPhoto && (
                      <img
                        src={
                          room.coverPhoto
                        }
                        alt={`${room.roomName} cover`}
                        className="h-full w-full object-cover"
                        onError={(
                          event
                        ) => {
                          // Hide a broken external image URL.
                          // The neutral wrapper remains visible.
                          event.currentTarget.style.display =
                            'none';
                        }}
                      />
                    )}
                  </div>

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-[#17211D]">
                          {
                            room.roomName
                          }
                        </h3>

                        <p className="mt-1 text-sm font-medium text-[#0F6B4D]">
                          {
                            room.destination
                          }
                        </p>
                      </div>

                      <span className="rounded-full bg-[#EEF7F2] px-3 py-1 text-xs font-semibold capitalize text-[#0F6B4D]">
                        {
                          room.status
                        }
                      </span>
                    </div>

                    <div className="mt-4 space-y-2 text-sm text-[#66756D]">
                      <p>
                        <span className="font-semibold text-[#44524B]">
                          Dates:
                        </span>{' '}
                        {formatDate(
                          room.startDate
                        )}{' '}
                        -{' '}
                        {formatDate(
                          room.endDate
                        )}
                      </p>

                      <p>
                        <span className="font-semibold text-[#44524B]">
                          Budget:
                        </span>{' '}
                        {formatMoney(
                          room.estimatedBudget
                        )}
                      </p>

                      <p>
                        <span className="font-semibold text-[#44524B]">
                          Members:
                        </span>{' '}
                        {getMemberCount(
                          room
                        )}
                        /
                        {
                          room.maxMembers
                        }
                      </p>

                      <p>
                        <span className="font-semibold text-[#44524B]">
                          Pending requests:
                        </span>{' '}
                        {Number(
                          room.pendingJoinRequests ||
                            0
                        )}
                      </p>
                    </div>

                    {/* Interest tags from the MongoDB room. */}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {room.interestTags?.map(
                        (tag) => (
                          <span
                            key={
                              tag
                            }
                            className="rounded-full bg-[#EEF7F2] px-3 py-1 text-xs font-medium text-[#0F6B4D]"
                          >
                            {tag}
                          </span>
                        )
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        handleViewRoom(
                          room
                        )
                      }
                      className="mt-5 w-full rounded-lg border border-[#0F6B4D] px-4 py-2.5 text-sm font-semibold text-[#0F6B4D] transition hover:bg-[#EEF7F2]"
                    >
                      View Room
                    </button>
                  </div>
                </article>
              )
            )}
          </div>
        )}
      </section>

      {/* =====================================================
          DISCOVER PUBLIC ROOMS
         ===================================================== */}
      <section
        id="discover-public-rooms"
        className="scroll-mt-24 pt-12"
      >
        <div>
          <h2 className="text-xl font-bold text-[#17211D]">
            Discover Public Rooms
          </h2>

          <p className="mt-1 text-sm text-[#66756D]">
            Search for travel groups
            that match your plans and
            interests.
          </p>
        </div>

        {/* Search/filter area inspired by the Figma design.

            All controls connect to the real backend query
            parameters created in Checkpoint 1. */}
        <form
          onSubmit={handleSearch}
          className="mt-5 rounded-xl border border-[#DCE5E0] bg-white p-4 shadow-sm"
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[#44524B]">
                Destination
              </span>

              <input
                type="text"
                value={
                  destination
                }
                onChange={(
                  event
                ) =>
                  setDestination(
                    event.target
                      .value
                  )
                }
                placeholder="e.g. Cox's Bazar"
                className="w-full rounded-lg border border-[#D6DEDA] bg-white px-3 py-2.5 text-sm text-[#17211D] outline-none transition focus:border-[#0F6B4D]"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[#44524B]">
                Start date
              </span>

              <input
                type="date"
                value={
                  startDate
                }
                onChange={(
                  event
                ) =>
                  setStartDate(
                    event.target
                      .value
                  )
                }
                className="w-full rounded-lg border border-[#D6DEDA] bg-white px-3 py-2.5 text-sm text-[#17211D] outline-none transition focus:border-[#0F6B4D]"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[#44524B]">
                End date
              </span>

              <input
                type="date"
                value={endDate}
                onChange={(
                  event
                ) =>
                  setEndDate(
                    event.target
                      .value
                  )
                }
                className="w-full rounded-lg border border-[#D6DEDA] bg-white px-3 py-2.5 text-sm text-[#17211D] outline-none transition focus:border-[#0F6B4D]"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[#44524B]">
                Minimum budget
              </span>

              <input
                type="number"
                min="0"
                value={minBudget}
                onChange={(
                  event
                ) =>
                  setMinBudget(
                    event.target
                      .value
                  )
                }
                placeholder="৳0"
                className="w-full rounded-lg border border-[#D6DEDA] bg-white px-3 py-2.5 text-sm text-[#17211D] outline-none transition focus:border-[#0F6B4D]"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[#44524B]">
                Maximum budget
              </span>

              <input
                type="number"
                min="0"
                value={maxBudget}
                onChange={(
                  event
                ) =>
                  setMaxBudget(
                    event.target
                      .value
                  )
                }
                placeholder="Any budget"
                className="w-full rounded-lg border border-[#D6DEDA] bg-white px-3 py-2.5 text-sm text-[#17211D] outline-none transition focus:border-[#0F6B4D]"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[#44524B]">
                Interest
              </span>

              <input
                type="text"
                value={interest}
                onChange={(
                  event
                ) =>
                  setInterest(
                    event.target
                      .value
                  )
                }
                placeholder="e.g. Adventure"
                className="w-full rounded-lg border border-[#D6DEDA] bg-white px-3 py-2.5 text-sm text-[#17211D] outline-none transition focus:border-[#0F6B4D]"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={
                isSearching
              }
              className="rounded-lg bg-[#0F6B4D] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0A523B] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSearching
                ? 'Searching...'
                : 'Search Rooms'}
            </button>

            <button
              type="button"
              onClick={
                handleResetFilters
              }
              disabled={
                isSearching
              }
              className="rounded-lg border border-[#D6DEDA] bg-white px-6 py-2.5 text-sm font-semibold text-[#44524B] transition hover:bg-[#F7FAF8] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Reset Filters
            </button>
          </div>
        </form>

        {/* Public-room results. */}
        <div className="mt-5">
          {isSearching ? (
            <div className="rounded-xl border border-[#DCE5E0] bg-white px-6 py-10 text-center">
              <p className="text-sm font-medium text-[#66756D]">
                Searching public
                rooms...
              </p>
            </div>
          ) : publicRooms.length ===
            0 ? (
            <div className="rounded-xl border border-dashed border-[#C9D7D0] bg-white px-6 py-10 text-center">
              <h3 className="text-lg font-bold text-[#17211D]">
                No public rooms found
              </h3>

              <p className="mt-2 text-sm text-[#66756D]">
                Try changing the
                destination, dates,
                budget, or interest
                filters.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {publicRooms.map(
                (room) => (
                  <article
                    key={
                      room._id
                    }
                    className="overflow-hidden rounded-xl border border-[#DCE5E0] bg-white shadow-sm"
                  >
                    <div className="h-44 bg-[#E8F1EC]">
                      {room.coverPhoto && (
                        <img
                          src={
                            room.coverPhoto
                          }
                          alt={`${room.roomName} cover`}
                          className="h-full w-full object-cover"
                          onError={(
                            event
                          ) => {
                            event.currentTarget.style.display =
                              'none';
                          }}
                        />
                      )}
                    </div>

                    <div className="p-5">
                      <h3 className="text-lg font-bold text-[#17211D]">
                        {
                          room.roomName
                        }
                      </h3>

                      <p className="mt-1 text-sm font-semibold text-[#0F6B4D]">
                        {
                          room.destination
                        }
                      </p>

                      <p className="mt-3 text-sm text-[#66756D]">
                        {formatDate(
                          room.startDate
                        )}{' '}
                        -{' '}
                        {formatDate(
                          room.endDate
                        )}
                      </p>

                      <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                        <span className="font-semibold text-[#17211D]">
                          {formatMoney(
                            room.estimatedBudget
                          )}
                        </span>

                        <span className="text-[#66756D]">
                          {getMemberCount(
                            room
                          )}
                          /
                          {
                            room.maxMembers
                          }{' '}
                          members
                        </span>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {room.interestTags?.map(
                          (tag) => (
                            <span
                              key={
                                tag
                              }
                              className="rounded-full bg-[#EEF7F2] px-3 py-1 text-xs font-medium text-[#0F6B4D]"
                            >
                              {
                                tag
                              }
                            </span>
                          )
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          handleViewRoom(
                            room
                          )
                        }
                        className="mt-5 w-full rounded-lg bg-[#0F6B4D] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0A523B]"
                      >
                        View Room
                      </button>
                    </div>
                  </article>
                )
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default PublicRoomsPage;