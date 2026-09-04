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

      <section className="pt-8">
        {trips.length === 0 ? (
          <TripEmptyState
            onCreateTrip={
              handleCreateTrip
            }
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {trips.map(
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