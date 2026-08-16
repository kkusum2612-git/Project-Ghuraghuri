import {
  useEffect,
  useState,
} from 'react';

import {
  useNavigate,
  useParams,
} from 'react-router-dom';

import {
  getPublicRoomById,
  requestToJoinRoom,
} from '../api/publicRoomApi';

// Format a stored date for human-friendly display.
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
      month: 'long',
      year: 'numeric',
    }
  );
}

// Format the room's estimated budget as Bangladeshi Taka.
function formatMoney(value) {
  const amount = Number(value);

  if (
    !Number.isFinite(amount)
  ) {
    return 'Budget unavailable';
  }

  return `৳${amount.toLocaleString()}`;
}

function PublicRoomDetailsPage() {
  // roomId comes from the URL:
  //
  // /event-rooms/:roomId
  //
  // Example:
  //
  // /event-rooms/66c123...
  const {
    roomId,
  } = useParams();

  const navigate =
    useNavigate();

  const [
    room,
    setRoom,
  ] = useState(null);

  // viewerStatus is calculated by the BACKEND.
  //
  // Possible examples:
  //
  // creator
  // member
  // pending
  // rejected
  // none
  const [
    viewerStatus,
    setViewerStatus,
  ] = useState('none');

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    pageError,
    setPageError,
  ] = useState('');

  const [
    successMessage,
    setSuccessMessage,
  ] = useState('');

  const [
    isRequesting,
    setIsRequesting,
  ] = useState(false);

  // ==========================================================
  // LOAD ROOM DETAILS
  // ==========================================================

  useEffect(() => {
    let ignoreResult = false;

    async function loadRoom() {
      setIsLoading(true);
      setPageError('');

      try {
        const result =
          await getPublicRoomById(
            roomId
          );

        if (ignoreResult) {
          return;
        }

        setRoom(
          result?.data?.room ||
            null
        );

        setViewerStatus(
          result?.data
            ?.viewerStatus ||
            'none'
        );
      } catch (error) {
        if (!ignoreResult) {
          setPageError(
            error.response?.data
              ?.message ||
              'Unable to load this public room.'
          );
        }
      } finally {
        if (!ignoreResult) {
          setIsLoading(false);
        }
      }
    }

    void loadRoom();

    return () => {
      ignoreResult = true;
    };
  }, [roomId]);

  // ==========================================================
  // JOIN REQUEST
  // ==========================================================

  async function handleJoinRequest() {
    setPageError('');
    setSuccessMessage('');
    setIsRequesting(true);

    try {
      const result =
        await requestToJoinRoom(
          roomId
        );

      // Once the backend successfully creates the request,
      // update the UI immediately.
      //
      // We do not need another complete page refresh.
      setViewerStatus(
        'pending'
      );

      setSuccessMessage(
        result?.message ||
          'Join request sent successfully.'
      );
    } catch (error) {
      setPageError(
        error.response?.data
          ?.message ||
          'Unable to send the join request.'
      );
    } finally {
      setIsRequesting(false);
    }
  }

  // ==========================================================
  // LOADING / ERROR STATES
  // ==========================================================

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm font-medium text-[#66756D]">
          Loading room details...
        </p>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="mx-auto max-w-3xl">
        <button
          type="button"
          onClick={() =>
            navigate(
              '/event-rooms'
            )
          }
          className="mb-5 text-sm font-semibold text-[#0F6B4D] hover:underline"
        >
          ← Back to Event Rooms
        </button>

        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {pageError ||
            'Public room not found.'}
        </div>
      </div>
    );
  }

  const memberCount =
    Array.isArray(
      room.members
    )
      ? room.members.length
      : 0;

  const roomIsFull =
    memberCount >=
    room.maxMembers;

  // ==========================================================
  // PAGE UI
  // ==========================================================

  return (
    <div className="mx-auto max-w-6xl">
      <button
        type="button"
        onClick={() =>
          navigate(
            '/event-rooms'
          )
        }
        className="mb-5 text-sm font-semibold text-[#0F6B4D] hover:underline"
      >
        ← Back to Event Rooms
      </button>

      {/* =====================================================
          ROOM HERO / HEADER

          This is inspired by your second Figma screen.

          We show only real Feature-1 information instead of
          adding dead controls for future features.
         ===================================================== */}
      <section className="overflow-hidden rounded-xl border border-[#DCE5E0] bg-white shadow-sm">
        <div className="relative min-h-56 bg-[#DDEBE4] md:min-h-72">
          {room.coverPhoto && (
            <img
              src={room.coverPhoto}
              alt={`${room.roomName} cover`}
              className="absolute inset-0 h-full w-full object-cover"
              onError={(
                event
              ) => {
                event.currentTarget.style.display =
                  'none';
              }}
            />
          )}

          {/* Dark transparent layer helps white text remain
              readable on bright photographs. */}
          <div className="absolute inset-0 bg-black/35" />

          <div className="relative flex min-h-56 flex-col justify-end p-6 text-white md:min-h-72 md:p-8">
            <div className="max-w-3xl">
              <span className="inline-flex rounded-full bg-white/90 px-3 py-1 text-xs font-bold capitalize text-[#0F6B4D]">
                {room.status} room
              </span>

              <h1 className="mt-3 text-3xl font-bold md:text-4xl">
                {room.roomName}
              </h1>

              <p className="mt-2 text-base font-medium text-white/90">
                {room.destination}
              </p>
            </div>
          </div>
        </div>

        {/* Important information directly under the hero,
            similar to the information strip in the Figma. */}
        <div className="grid gap-px bg-[#E1E8E4] sm:grid-cols-2 xl:grid-cols-4">
          <div className="bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#7A8780]">
              Travel Dates
            </p>

            <p className="mt-2 text-sm font-bold text-[#17211D]">
              {formatDate(
                room.startDate
              )}
            </p>

            <p className="text-sm text-[#66756D]">
              to{' '}
              {formatDate(
                room.endDate
              )}
            </p>
          </div>

          <div className="bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#7A8780]">
              Estimated Budget
            </p>

            <p className="mt-2 text-lg font-bold text-[#17211D]">
              {formatMoney(
                room.estimatedBudget
              )}
            </p>
          </div>

          <div className="bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#7A8780]">
              Members
            </p>

            <p className="mt-2 text-lg font-bold text-[#17211D]">
              {memberCount}/
              {room.maxMembers}
            </p>
          </div>

          <div className="bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#7A8780]">
              Created By
            </p>

            <p className="mt-2 text-lg font-bold text-[#17211D]">
              {room.creator?.name ||
                'Traveler'}
            </p>
          </div>
        </div>
      </section>

      {pageError && (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {pageError}
        </div>
      )}

      {successMessage && (
        <div className="mt-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {successMessage}
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* ===================================================
            LEFT SIDE: OVERVIEW
           =================================================== */}
        <div className="space-y-6">
          <section className="rounded-xl border border-[#DCE5E0] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-[#17211D]">
              About This Room
            </h2>

            <p className="mt-4 whitespace-pre-line text-sm leading-7 text-[#55645C]">
              {room.description}
            </p>

            <div className="mt-5">
              <h3 className="text-sm font-bold text-[#17211D]">
                Interests
              </h3>

              <div className="mt-3 flex flex-wrap gap-2">
                {room.interestTags
                  ?.length > 0 ? (
                  room.interestTags.map(
                    (tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-[#EEF7F2] px-3 py-1.5 text-xs font-semibold text-[#0F6B4D]"
                      >
                        {tag}
                      </span>
                    )
                  )
                ) : (
                  <p className="text-sm text-[#66756D]">
                    No interest tags
                    added.
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* =================================================
              CURRENT MEMBERS

              Feature 1 requires the room detail page to show
              current members.

              Feature 2 will later add creator controls for
              accepting/rejecting applicants.
             ================================================= */}
          <section className="rounded-xl border border-[#DCE5E0] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-[#17211D]">
                  Current Members
                </h2>

                <p className="mt-1 text-sm text-[#66756D]">
                  {memberCount} of{' '}
                  {room.maxMembers}{' '}
                  member spots are
                  currently filled.
                </p>
              </div>

              <span className="rounded-full bg-[#EEF7F2] px-3 py-1.5 text-xs font-bold text-[#0F6B4D]">
                {memberCount}/
                {room.maxMembers}
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {room.members?.map(
                (member) => (
                  <div
                    key={
                      member._id
                    }
                    className="flex items-center gap-3 rounded-lg border border-[#E1E8E4] p-3"
                  >
                    {/* Use profile photo when available.

                        Otherwise show the first letter of the
                        member's name, which matches the style
                        already used in TripWorkspace. */}
                    {member.profileImageUrl ? (
                      <img
                        src={
                          member.profileImageUrl
                        }
                        alt={
                          member.name
                        }
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#DCEFE4] text-sm font-bold text-[#0F6B4D]">
                        {member.name
                          ?.charAt(0)
                          ?.toUpperCase() ||
                          'T'}
                      </div>
                    )}

                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[#17211D]">
                        {member.name ||
                          'Traveler'}
                      </p>

                      <p className="text-xs text-[#66756D]">
                        {member._id ===
                        room.creator?._id
                          ? 'Room Creator'
                          : 'Member'}
                      </p>
                    </div>
                  </div>
                )
              )}
            </div>
          </section>
        </div>

        {/* ===================================================
            RIGHT SIDE: JOIN / STATUS CARD

            This is where the selected traveler can request
            room membership.

            We change the controls based on viewerStatus.
           =================================================== */}
        <aside className="h-fit rounded-xl border border-[#DCE5E0] bg-white p-5 shadow-sm xl:sticky xl:top-24">
          <h2 className="text-lg font-bold text-[#17211D]">
            Room Membership
          </h2>

          <p className="mt-2 text-sm leading-6 text-[#66756D]">
            Join travelers who are
            planning a trip to{' '}
            {room.destination}.
          </p>

          <div className="mt-5 rounded-lg bg-[#F7FAF8] p-4">
            <div className="flex justify-between gap-3 text-sm">
              <span className="text-[#66756D]">
                Available spots
              </span>

              <span className="font-bold text-[#17211D]">
                {Math.max(
                  room.maxMembers -
                    memberCount,
                  0
                )}
              </span>
            </div>
          </div>

          {/* Creator already owns the room. */}
          {viewerStatus ===
            'creator' && (
            <div className="mt-5 rounded-lg border border-[#BFDCCA] bg-[#EEF7F2] px-4 py-3 text-sm font-semibold text-[#0F6B4D]">
              You created this room.
            </div>
          )}

          {/* Accepted traveler is already inside members. */}
          {viewerStatus ===
            'member' && (
            <div className="mt-5 rounded-lg border border-[#BFDCCA] bg-[#EEF7F2] px-4 py-3 text-sm font-semibold text-[#0F6B4D]">
              You are already a
              member of this room.
            </div>
          )}

          {/* Pending request exists in MongoDB. */}
          {viewerStatus ===
            'pending' && (
            <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              Your join request is
              pending.
            </div>
          )}

          {/* If a previous request was rejected, Feature 1 does
              not automatically create another one.

              We simply display the real backend state. */}
          {viewerStatus ===
            'rejected' && (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              Your previous join
              request was rejected.
            </div>
          )}

          {/* Only an unrelated traveler with no existing request
              can see the Request to Join action. */}
          {viewerStatus ===
            'none' &&
            !roomIsFull &&
            room.status ===
              'open' && (
              <button
                type="button"
                onClick={
                  handleJoinRequest
                }
                disabled={
                  isRequesting
                }
                className="mt-5 w-full rounded-lg bg-[#0F6B4D] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0A523B] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isRequesting
                  ? 'Sending Request...'
                  : 'Request to Join'}
              </button>
            )}

          {viewerStatus ===
            'none' &&
            roomIsFull && (
              <div className="mt-5 rounded-lg border border-[#DCE5E0] bg-[#F7FAF8] px-4 py-3 text-sm font-semibold text-[#66756D]">
                This room is full.
              </div>
            )}

          {viewerStatus ===
            'none' &&
            room.status !==
              'open' && (
              <div className="mt-5 rounded-lg border border-[#DCE5E0] bg-[#F7FAF8] px-4 py-3 text-sm font-semibold text-[#66756D]">
                This room is no
                longer accepting
                requests.
              </div>
            )}

          {/* We deliberately do NOT place Accept/Reject here.

              Those are creator-side Feature 2 controls and will
              be implemented when we start Module 2. */}
        </aside>
      </div>
    </div>
  );
}

export default PublicRoomDetailsPage;