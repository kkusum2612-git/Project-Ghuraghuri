import {
  useEffect,
  useState,
} from 'react';

import {
  useLocation,
  useNavigate,
} from 'react-router-dom';

import SuccessToast
  from '../../../components/common/SuccessToast';

import {
  deleteTrip,
  getTrips,
} from '../api/tripApi';

import TripCard
  from '../components/TripCard';

import TripDeleteModal
  from '../components/TripDeleteModal';

import TripEmptyState
  from '../components/TripEmptyState';

function TripDashboardPage() {
  const navigate =
    useNavigate();

  const location =
    useLocation();

  const [
    successMessage,
    setSuccessMessage,
  ] = useState(
    () =>
      location.state
        ?.successMessage ||
      ''
  );

  const [
    trips,
    setTrips,
  ] = useState([]);


  const [
    searchTerm,
    setSearchTerm,
  ] = useState('');

  const [
    accessFilter,
    setAccessFilter,
  ] = useState('all');

  const [
    statusFilter,
    setStatusFilter,
  ] = useState('all');

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    pageError,
    setPageError,
  ] = useState('');

  const [
    tripToDelete,
    setTripToDelete,
  ] = useState(null);

  const [
    deletingId,
    setDeletingId,
  ] = useState(null);

  useEffect(() => {
    if (
      !location.state
        ?.successMessage
    ) {
      return;
    }

    navigate(
      location.pathname,
      {
        replace: true,
        state: null,
      }
    );
  }, [
    location.pathname,
    location.state,
    navigate,
  ]);

  useEffect(() => {
    let ignoreResult = false;

    async function loadTrips() {
      setIsLoading(true);
      setPageError('');

      try {
        const result =
          await getTrips();

        if (ignoreResult) {
          return;
        }

        setTrips(
          Array.isArray(
            result?.data
          )
            ? result.data
            : []
        );
      } catch (error) {
        if (!ignoreResult) {
          setPageError(
            error.response?.data
              ?.message ||
              'Unable to load your trips.'
          );
        }
      } finally {
        if (!ignoreResult) {
          setIsLoading(false);
        }
      }
    }

    void loadTrips();

    return () => {
      ignoreResult = true;
    };
  }, []);

  function handleCreateTrip() {
    navigate(
      '/trips/new'
    );
  }

  function handleOpenTrip(
    trip
  ) {
    navigate(
      `/trips/${trip._id}/plan`
    );
  }

  /*
   * Shared trips can edit itinerary content, but only the
   * owner can change the trip's main details or delete it.
   */
  function handleEditTrip(
    trip
  ) {
    if (
      trip.accessType !==
      'owner'
    ) {
      return;
    }

    navigate(
      `/trips/${trip._id}/edit`
    );
  }

  function handleDeleteRequest(
    trip
  ) {
    if (
      trip.accessType !==
      'owner'
    ) {
      return;
    }

    setTripToDelete(
      trip
    );

    setPageError('');
  }

  function handleDeleteCancel() {
    if (!deletingId) {
      setTripToDelete(
        null
      );
    }
  }

  async function handleDeleteConfirm() {
    if (!tripToDelete) {
      return;
    }

    const deletedTripName =
      tripToDelete.tripName;

    const deletedTripId =
      tripToDelete._id;

    setDeletingId(
      deletedTripId
    );

    setPageError('');

    try {
      await deleteTrip(
        deletedTripId
      );

      setTrips(
        (currentTrips) =>
          currentTrips.filter(
            (trip) =>
              trip._id !==
              deletedTripId
          )
      );

      setTripToDelete(
        null
      );

      setSuccessMessage(
        `Trip "${deletedTripName}" deleted successfully.`
      );
    } catch (error) {
      setPageError(
        error.response?.data
          ?.message ||
          'Unable to delete this trip.'
      );
    } finally {
      setDeletingId(
        null
      );
    }
  }

const displayedTrips =
  trips.filter((trip) => {
    const normalizedSearch =
      searchTerm
        .trim()
        .toLowerCase();

    const matchesSearch =
      normalizedSearch === '' ||
      trip.tripName
        ?.toLowerCase()
        .includes(
          normalizedSearch
        ) ||
      trip.destination?.name
        ?.toLowerCase()
        .includes(
          normalizedSearch
        );

    const matchesAccess =
      accessFilter === 'all' ||
      (accessFilter ===
        'owner' &&
        trip.accessType ===
          'owner') ||
      (accessFilter ===
        'shared' &&
        trip.accessType ===
          'collaborator');

    const today =
      new Date();

    today.setUTCHours(
      0,
      0,
      0,
      0
    );

    const tripEndDate =
      new Date(
        trip.endDate
      );

    const isUpcoming =
      tripEndDate >= today;

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter ===
        'upcoming' &&
        isUpcoming) ||
      (statusFilter ===
        'completed' &&
        !isUpcoming);

    return (
      matchesSearch &&
      matchesAccess &&
      matchesStatus
    );
  });


  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm font-medium text-[#66756D]">
          Loading your trips...
        </p>
      </div>
    );
  }

  return (
    <div>
      <SuccessToast
        message={
          successMessage
        }
        onClose={() =>
          setSuccessMessage(
            ''
          )
        }
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#17211D] md:text-3xl">
            My Trips
          </h1>

          <p className="mt-1 text-sm text-[#66756D]">
            Create and manage your
            upcoming travel plans
          </p>
        </div>

        <button
          type="button"
          onClick={
            handleCreateTrip
          }
          className="rounded-lg bg-[#0F6B4D] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0A523B]"
        >
          + Create New Trip
        </button>
      </div>

      {pageError && (
        <div
          className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {pageError}
        </div>
      )}

      <div className="mt-6 grid gap-4 rounded-xl border border-[#DCE5E0] bg-white p-4 md:grid-cols-3">
        <div>
          <label
            htmlFor="trip-search"
            className="mb-2 block text-sm font-medium text-[#17211D]"
          >
            Search Trips
          </label>

          <input
            id="trip-search"
            type="text"
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(
                event.target.value
              )
            }
            placeholder="Search by trip or destination"
            className="w-full rounded-lg border border-[#DCE5E0] px-3 py-2.5 text-sm text-[#17211D] outline-none transition focus:border-[#0F6B4D]"
          />
        </div>

        <div>
          <label
            htmlFor="access-filter"
            className="mb-2 block text-sm font-medium text-[#17211D]"
          >
            Access
          </label>

          <select
            id="access-filter"
            value={accessFilter}
            onChange={(event) =>
              setAccessFilter(
                event.target.value
              )
            }
            className="w-full rounded-lg border border-[#DCE5E0] bg-white px-3 py-2.5 text-sm text-[#17211D] outline-none transition focus:border-[#0F6B4D]"
          >
            <option value="all">
              All Trips
            </option>

            <option value="owner">
              My Trips
            </option>

            <option value="shared">
              Shared With Me
            </option>
          </select>
        </div>

        <div>
          <label
            htmlFor="status-filter"
            className="mb-2 block text-sm font-medium text-[#17211D]"
          >
            Status
          </label>

          <select
            id="status-filter"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value
              )
            }
            className="w-full rounded-lg border border-[#DCE5E0] bg-white px-3 py-2.5 text-sm text-[#17211D] outline-none transition focus:border-[#0F6B4D]"
          >
            <option value="all">
              All
            </option>

            <option value="upcoming">
              Upcoming
            </option>

            <option value="completed">
              Completed
            </option>
          </select>
        </div>
      </div>

      {trips.length > 0 && (
        <p className="mt-4 text-sm text-[#66756D]">
          Showing{' '}
          <span className="font-semibold text-[#17211D]">
            {displayedTrips.length}
          </span>{' '}
          of{' '}
          <span className="font-semibold text-[#17211D]">
            {trips.length}
          </span>{' '}
          trips
        </p>
      )}

      <section className="pt-8">
        {trips.length === 0 ? (
          <TripEmptyState
            onCreateTrip={
              handleCreateTrip
            }
          />
        ) : displayedTrips.length === 0 ? (
          <div className="rounded-xl border border-[#DCE5E0] bg-white px-6 py-10 text-center">
            <h2 className="text-lg font-semibold text-[#17211D]">
              No trips found
            </h2>

            <p className="mt-2 text-sm text-[#66756D]">
              Try changing your search
              or filters.
            </p>

            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setAccessFilter('all');
                setStatusFilter('all');
              }}
              className="mt-4 rounded-lg border border-[#0F6B4D] px-4 py-2 text-sm font-semibold text-[#0F6B4D] transition hover:bg-[#EEF7F2]"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {displayedTrips.map(
              (trip) => (
                <TripCard
                  key={
                    trip._id
                  }
                  trip={
                    trip
                  }
                  onOpen={
                    handleOpenTrip
                  }
                  onEdit={
                    handleEditTrip
                  }
                  onDelete={
                    handleDeleteRequest
                  }
                  isDeleting={
                    deletingId ===
                    trip._id
                  }
                />
              )
            )}
          </div>
        )}
      </section>

      <TripDeleteModal
        trip={
          tripToDelete
        }
        isDeleting={Boolean(
          deletingId
        )}
        onCancel={
          handleDeleteCancel
        }
        onConfirm={
          handleDeleteConfirm
        }
      />
    </div>
  );
}

export default TripDashboardPage;