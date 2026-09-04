import {
  useEffect,
  useState,
} from 'react';

import {
  useParams,
} from 'react-router-dom';

import ConfirmModal from '../../../components/common/ConfirmModal';
import SuccessToast from '../../../components/common/SuccessToast';

import TripSectionNav from '../components/TripSectionNav';

import {
  addTripCollaborator,
  getTripById,
  getTripCollaborators,
  removeTripCollaborator,
} from '../api/tripApi';

function getInitials(name) {
  if (!name) {
    return '?';
  }

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function getApiErrorMessage(
  error,
  fallbackMessage
) {
  return (
    error?.response?.data?.message ||
    fallbackMessage
  );
}

function MemberAvatar({
  member,
}) {
  if (member.profileImageUrl) {
    return (
      <img
        src={member.profileImageUrl}
        alt={member.name}
        className="h-11 w-11 rounded-full object-cover"
      />
    );
  }

  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#E8F3EE] text-sm font-bold text-[#0F6B4D]">
      {getInitials(member.name)}
    </div>
  );
}

function TripCollaboratorsPage() {
  const {
    tripId,
  } = useParams();

  const [
    trip,
    setTrip,
  ] = useState(null);

  const [
    owner,
    setOwner,
  ] = useState(null);

  const [
    collaborators,
    setCollaborators,
  ] = useState([]);

  const [
    accessType,
    setAccessType,
  ] = useState('');

  const [
    email,
    setEmail,
  ] = useState('');

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isAdding,
    setIsAdding,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('');

  const [
    successMessage,
    setSuccessMessage,
  ] = useState('');

  const [
    collaboratorToRemove,
    setCollaboratorToRemove,
  ] = useState(null);

  const [
    isRemoving,
    setIsRemoving,
  ] = useState(false);

  /*
   * Load both trip details and membership information when
   * the user opens the Collaborators page.
   */
  useEffect(() => {
    let isCancelled = false;

    async function loadPageData() {
      try {
        const [
          tripResponse,
          collaboratorResponse,
        ] = await Promise.all([
          getTripById(tripId),
          getTripCollaborators(
            tripId
          ),
        ]);

        if (isCancelled) {
          return;
        }

        setTrip(
          tripResponse.data
        );

        setOwner(
          collaboratorResponse
            .data.owner
        );

        setCollaborators(
          collaboratorResponse
            .data.collaborators || []
        );

        setAccessType(
          collaboratorResponse
            .data.accessType
        );
      } catch (error) {
        if (!isCancelled) {
          setErrorMessage(
            getApiErrorMessage(
              error,
              'Unable to load trip collaborators.'
            )
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    loadPageData();

    return () => {
      isCancelled = true;
    };
  }, [tripId]);

  async function handleAddCollaborator(
    event
  ) {
    event.preventDefault();

    const normalizedEmail =
      email.trim();

    if (!normalizedEmail) {
      setErrorMessage(
        'Enter a collaborator email address.'
      );

      return;
    }

    try {
      setIsAdding(true);
      setErrorMessage('');

      const response =
        await addTripCollaborator(
          tripId,
          normalizedEmail
        );

      setCollaborators(
        (
          currentCollaborators
        ) => [
          ...currentCollaborators,
          response.data,
        ]
      );

      setEmail('');

      setSuccessMessage(
        'Collaborator added successfully.'
      );
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(
          error,
          'Unable to add collaborator.'
        )
      );
    } finally {
      setIsAdding(false);
    }
  }

  async function handleConfirmRemove() {
    if (!collaboratorToRemove) {
      return;
    }

    try {
      setIsRemoving(true);
      setErrorMessage('');

      await removeTripCollaborator(
        tripId,
        collaboratorToRemove._id
      );

      setCollaborators(
        (
          currentCollaborators
        ) =>
          currentCollaborators.filter(
            (collaborator) =>
              collaborator._id !==
              collaboratorToRemove._id
          )
      );

      setSuccessMessage(
        'Collaborator removed successfully.'
      );

      setCollaboratorToRemove(
        null
      );
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(
          error,
          'Unable to remove collaborator.'
        )
      );
    } finally {
      setIsRemoving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-[#DCE5E0] bg-white p-8 text-center text-sm text-[#66756D] shadow-sm">
        Loading collaborators...
      </div>
    );
  }

  if (
    errorMessage &&
    !trip
  ) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {errorMessage}
      </div>
    );
  }

  /*
   * accessType comes from the backend, so only the real trip
   * owner receives collaborator management controls.
   */
  const isOwner =
    accessType === 'owner';

  return (
    <>
      <SuccessToast
        message={
          successMessage
        }
        onClose={() =>
          setSuccessMessage('')
        }
      />

      <ConfirmModal
        isOpen={
          Boolean(
            collaboratorToRemove
          )
        }
        title="Remove collaborator?"
        description={
          collaboratorToRemove
            ? `${collaboratorToRemove.name} will lose access to this trip and its itinerary.`
            : ''
        }
        confirmLabel="Remove"
        isConfirming={
          isRemoving
        }
        onCancel={() => {
          if (!isRemoving) {
            setCollaboratorToRemove(
              null
            );
          }
        }}
        onConfirm={
          handleConfirmRemove
        }
      />

      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-6">
          <p className="text-sm font-semibold text-[#0F6B4D]">
            Trip Workspace
          </p>

          <h1 className="mt-1 text-3xl font-bold text-[#17211D]">
            {trip?.tripName}
          </h1>

          <p className="mt-2 text-sm text-[#66756D]">
            Manage the travelers
            who can view and edit
            this trip&apos;s itinerary.
          </p>
        </div>

        <TripSectionNav
          tripId={tripId}
        />

        {errorMessage && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {isOwner ? (
          <section className="mb-6 rounded-2xl border border-[#DCE5E0] bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold text-[#17211D]">
              Add collaborator
            </h2>

            <p className="mt-1 text-sm text-[#66756D]">
              Enter the email of a
              registered Ghuraghuri
              traveler.
            </p>

            <form
              onSubmit={
                handleAddCollaborator
              }
              className="mt-4 flex flex-col gap-3 sm:flex-row"
            >
              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target.value
                  )
                }
                placeholder="traveler@example.com"
                autoComplete="email"
                disabled={
                  isAdding
                }
                className="min-w-0 flex-1 rounded-xl border border-[#CAD7D0] px-4 py-3 text-sm text-[#17211D] outline-none transition placeholder:text-[#98A49E] focus:border-[#0F6B4D] focus:ring-2 focus:ring-[#0F6B4D]/10 disabled:bg-slate-50"
              />

              <button
                type="submit"
                disabled={
                  isAdding
                }
                className="rounded-xl bg-[#0F6B4D] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0C5B41] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isAdding
                  ? 'Adding...'
                  : 'Add collaborator'}
              </button>
            </form>
          </section>
        ) : (
          <div className="mb-6 rounded-xl border border-[#CFE1D8] bg-[#F2F8F5] px-4 py-3 text-sm text-[#446456]">
            You are a collaborator
            on this trip. Only the
            trip owner can add or
            remove members.
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-[#DCE5E0] bg-white shadow-sm">
          <div className="border-b border-[#E5ECE8] px-5 py-4 sm:px-6">
            <h2 className="text-lg font-bold text-[#17211D]">
              Trip members
            </h2>

            <p className="mt-1 text-sm text-[#66756D]">
              {collaborators.length +
                1}{' '}
              {collaborators.length +
                1 ===
              1
                ? 'member'
                : 'members'}
            </p>
          </div>

          {owner && (
            <div className="flex items-center gap-4 border-b border-[#EAF0ED] px-5 py-4 sm:px-6">
              <MemberAvatar
                member={owner}
              />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-semibold text-[#17211D]">
                    {owner.name}
                  </p>

                  <span className="rounded-full bg-[#E8F3EE] px-2.5 py-1 text-xs font-bold text-[#0F6B4D]">
                    Owner
                  </span>
                </div>

                <p className="mt-1 truncate text-sm text-[#66756D]">
                  {owner.email}
                </p>
              </div>
            </div>
          )}

          {collaborators.length >
          0 ? (
            collaborators.map(
              (collaborator) => (
                <div
                  key={
                    collaborator._id
                  }
                  className="flex items-center gap-4 border-b border-[#EAF0ED] px-5 py-4 last:border-b-0 sm:px-6"
                >
                  <MemberAvatar
                    member={
                      collaborator
                    }
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold text-[#17211D]">
                        {
                          collaborator.name
                        }
                      </p>

                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                        Collaborator
                      </span>
                    </div>

                    <p className="mt-1 truncate text-sm text-[#66756D]">
                      {
                        collaborator.email
                      }
                    </p>
                  </div>

                  {isOwner && (
                    <button
                      type="button"
                      onClick={() =>
                        setCollaboratorToRemove(
                          collaborator
                        )
                      }
                      className="shrink-0 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                    >
                      Remove
                    </button>
                  )}
                </div>
              )
            )
          ) : (
            <div className="px-5 py-10 text-center sm:px-6">
              <p className="font-semibold text-[#44524B]">
                No collaborators yet
              </p>

              <p className="mt-1 text-sm text-[#7B8982]">
                Add another
                registered traveler
                to plan this trip
                together.
              </p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

export default TripCollaboratorsPage;