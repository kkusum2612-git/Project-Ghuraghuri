import {
  useEffect,
  useState,
} from 'react';

import {
  useNavigate,
  useParams,
} from 'react-router-dom';

import {
  acceptRoomJoinRequest,
  getPublicRoomById,
  getRoomJoinRequests,
  rejectRoomJoinRequest,
  requestToJoinRoom,
} from '../api/publicRoomApi';

// ============================================================
// SMALL DISPLAY HELPER FUNCTIONS
// ============================================================
//
// These functions only change how stored information LOOKS
// on the screen.
//
// They do not modify anything in MongoDB.

/**
 * Converts a stored date into something easier to read.
 *
 * Example:
 *
 * 2026-09-10T00:00:00.000Z
 *
 * becomes:
 *
 * 10 September 2026
 */
function formatDate(value) {
  if (!value) {
    return 'Date unavailable';
  }

  const date = new Date(value);

  // An invalid date object still exists in JavaScript,
  // but its timestamp becomes NaN.
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

/**
 * Displays the budget using Bangladeshi Taka.
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
 * Formats the date/time when somebody sent a join request.
 *
 * This is useful to the room creator because they can see
 * when each applicant requested membership.
 */
function formatRequestTime(value) {
  if (!value) {
    return 'Request time unavailable';
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return 'Request time unavailable';
  }

  return date.toLocaleString(
    'en-GB',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }
  );
}

// ============================================================
// PAGE COMPONENT
// ============================================================

function PublicRoomDetailsPage() {
  // roomId comes from the dynamic URL:
  //
  // /event-rooms/:roomId
  //
  // Example:
  //
  // /event-rooms/66c123abc...
  const {
    roomId,
  } = useParams();

  // useNavigate lets us move to another React route
  // from JavaScript.
  const navigate =
    useNavigate();

  // ==========================================================
  // ROOM DATA
  // ==========================================================

  const [
    room,
    setRoom,
  ] = useState(null);

  // viewerStatus is calculated by the BACKEND.
  //
  // Possible values include:
  //
  // creator
  // member
  // pending
  // accepted
  // rejected
  // none
  //
  // This is safer than asking React to guess permissions
  // only from what it currently knows.
  const [
    viewerStatus,
    setViewerStatus,
  ] = useState('none');

  // ==========================================================
  // FEATURE 2 - JOIN REQUEST DATA
  // ==========================================================
  //
  // Only a room creator should ever receive pending requests.
  //
  // The backend enforces that security rule.
  //
  // React merely stores the successful response here so the
  // creator can see the management panel.

  const [
    joinRequests,
    setJoinRequests,
  ] = useState([]);

  // When accepting/rejecting one request, we remember its ID.
  //
  // This allows us to disable only the request currently being
  // processed rather than disabling the whole page.
  const [
    processingRequestId,
    setProcessingRequestId,
  ] = useState('');

  // ==========================================================
  // PAGE STATE
  // ==========================================================

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
  //
  // This runs when the page first opens.
  //
  // It always loads the selected room.
  //
  // If the backend tells us that the current user is the room
  // creator, we ALSO load that room's pending join requests.

  useEffect(() => {
    let ignoreResult = false;

    async function loadRoom() {
      setIsLoading(true);
      setPageError('');
      setSuccessMessage('');

      try {
        // ----------------------------------------------------
        // STEP 1:
        // Load the room and determine the current user's
        // relationship with it.
        // ----------------------------------------------------

        const result =
          await getPublicRoomById(
            roomId
          );

        if (ignoreResult) {
          return;
        }

        const loadedRoom =
          result?.data?.room ||
          null;

        const loadedViewerStatus =
          result?.data
            ?.viewerStatus ||
          'none';

        setRoom(
          loadedRoom
        );

        setViewerStatus(
          loadedViewerStatus
        );

        // ----------------------------------------------------
        // STEP 2:
        // Only the CREATOR needs the request-management data.
        // ----------------------------------------------------
        //
        // We deliberately do not call this API for:
        //
        // members
        // pending users
        // outsiders
        //
        // Even if somebody manually called it themselves,
        // the backend would still return 403 unless they own
        // this room.

        if (
          loadedViewerStatus ===
          'creator'
        ) {
          const requestsResult =
            await getRoomJoinRequests(
              roomId
            );

          if (ignoreResult) {
            return;
          }

          setJoinRequests(
            Array.isArray(
              requestsResult
                ?.data
            )
              ? requestsResult.data
              : []
          );
        } else {
          // If the current person is not the creator,
          // there is no request-management list to show.
          setJoinRequests([]);
        }
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

    // React calls this cleanup function if the user leaves
    // the page before our API requests finish.
    return () => {
      ignoreResult = true;
    };
  }, [roomId]);

  // ==========================================================
  // FEATURE 1 - SEND JOIN REQUEST
  // ==========================================================
  //
  // This remains the behavior for another traveler who has
  // discovered the room but is not yet a member.

  async function handleJoinRequest() {
    setPageError('');
    setSuccessMessage('');
    setIsRequesting(true);

    try {
      const result =
        await requestToJoinRoom(
          roomId
        );

      // The backend successfully created a JoinRequest with:
      //
      // status: "pending"
      //
      // We update React immediately so the button disappears
      // without requiring a page refresh.
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
  // FEATURE 2 - ACCEPT JOIN REQUEST
  // ==========================================================
  //
  // This function is only connected to buttons shown to
  // the creator.
  //
  // But remember:
  //
  // Hiding buttons is NOT our real security.
  //
  // The backend independently verifies room ownership before
  // accepting anything.

  async function handleAcceptRequest(
    requestId
  ) {
    setPageError('');
    setSuccessMessage('');

    // Remember which specific request is being processed.
    setProcessingRequestId(
      requestId
    );

    try {
      const result =
        await acceptRoomJoinRequest(
          roomId,
          requestId
        );

      // The accept API returns the UPDATED PublicRoom.
      //
      // That room already contains the newly accepted traveler
      // inside its members array.
      //
      // Updating this state makes the new member appear under
      // "Current Members" immediately.
      const updatedRoom =
        result?.data?.room;

      if (updatedRoom) {
        setRoom(
          updatedRoom
        );
      }

      // The request is no longer pending.
      //
      // Therefore remove it from the creator's pending list.
      setJoinRequests(
        (currentRequests) =>
          currentRequests.filter(
            (request) =>
              request._id !==
              requestId
          )
      );

      setSuccessMessage(
        result?.message ||
          'Join request accepted successfully.'
      );
    } catch (error) {
      setPageError(
        error.response?.data
          ?.message ||
          'Unable to accept the join request.'
      );
    } finally {
      setProcessingRequestId(
        ''
      );
    }
  }

  // ==========================================================
  // FEATURE 2 - REJECT JOIN REQUEST
  // ==========================================================
  //
  // Rejecting changes the JoinRequest from:
  //
  // pending
  //
  // to:
  //
  // rejected
  //
  // The applicant is NOT added to room.members.

  async function handleRejectRequest(
    requestId
  ) {
    setPageError('');
    setSuccessMessage('');

    setProcessingRequestId(
      requestId
    );

    try {
      const result =
        await rejectRoomJoinRequest(
          roomId,
          requestId
        );

      // A rejected request is no longer pending, so remove it
      // from the management list.
      //
      // Notice that we do NOT modify room.members here.
      setJoinRequests(
        (currentRequests) =>
          currentRequests.filter(
            (request) =>
              request._id !==
              requestId
          )
      );

      setSuccessMessage(
        result?.message ||
          'Join request rejected successfully.'
      );
    } catch (error) {
      setPageError(
        error.response?.data
          ?.message ||
          'Unable to reject the join request.'
      );
    } finally {
      setProcessingRequestId(
        ''
      );
    }
  }

  // ==========================================================
  // LOADING STATE
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

  // ==========================================================
  // ROOM-NOT-FOUND / LOAD-ERROR STATE
  // ==========================================================

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

  // ==========================================================
  // DERIVED VALUES
  // ==========================================================
  //
  // These values can be calculated from the room instead of
  // being stored separately in React state.

  const memberCount =
    Array.isArray(
      room.members
    )
      ? room.members.length
      : 0;

  const roomIsFull =
    memberCount >=
    room.maxMembers;

  const isCreator =
    viewerStatus ===
    'creator';

  // ==========================================================
  // PAGE UI
  // ==========================================================

  return (
    <div className="mx-auto max-w-6xl">
      {/* =====================================================
          BACK BUTTON
         ===================================================== */}

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

          This keeps the Figma-inspired room workspace look.
         ===================================================== */}

      <section className="overflow-hidden rounded-xl border border-[#DCE5E0] bg-white shadow-sm">
        <div className="relative min-h-56 bg-[#DDEBE4] md:min-h-72">
          {room.coverPhoto && (
            <img
              src={
                room.coverPhoto
              }
              alt={`${room.roomName} cover`}
              className="absolute inset-0 h-full w-full object-cover"
              onError={(
                event
              ) => {
                // If an external image URL becomes invalid,
                // hide the broken image.
                //
                // The neutral green background underneath will
                // remain visible instead.
                event.currentTarget.style.display =
                  'none';
              }}
            />
          )}

          {/* A transparent dark layer improves white-text
              readability over bright photographs. */}
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
                {
                  room.destination
                }
              </p>
            </div>
          </div>
        </div>

        {/* ===================================================
            QUICK ROOM INFORMATION
           =================================================== */}

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

      {/* =====================================================
          PAGE MESSAGES
         ===================================================== */}

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

      {/* =====================================================
          MAIN WORKSPACE CONTENT
         ===================================================== */}

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* ===================================================
            LEFT COLUMN
           =================================================== */}

        <div className="space-y-6">
          {/* =================================================
              OVERVIEW
             ================================================= */}

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
              FEATURE 2 - JOIN REQUEST MANAGEMENT

              IMPORTANT:

              Only the creator sees this entire section.

              Accepted members will NOT see Accept/Reject
              controls.

              The backend independently enforces the same rule.
             ================================================= */}

          {isCreator && (
            <section className="rounded-xl border border-[#DCE5E0] bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-[#17211D]">
                    Join Requests
                  </h2>

                  <p className="mt-1 text-sm text-[#66756D]">
                    Review travelers
                    who want to join
                    your room.
                  </p>
                </div>

                {/* This count is based on the real current
                    pending-request array. */}
                <span className="w-fit rounded-full bg-[#EEF7F2] px-3 py-1.5 text-xs font-bold text-[#0F6B4D]">
                  {
                    joinRequests.length
                  }{' '}
                  Pending
                </span>
              </div>

              {joinRequests.length ===
              0 ? (
                // ------------------------------------------------
                // EMPTY STATE
                // ------------------------------------------------
                //
                // No pending requests is a normal situation,
                // not an error.

                <div className="mt-5 rounded-lg border border-dashed border-[#C9D7D0] bg-[#F7FAF8] px-5 py-8 text-center">
                  <p className="text-sm font-semibold text-[#44524B]">
                    No pending join
                    requests
                  </p>

                  <p className="mt-1 text-xs text-[#7A8780]">
                    New requests from
                    travelers will
                    appear here.
                  </p>
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {joinRequests.map(
                    (request) => {
                      // "requester" was populated by the
                      // backend JoinRequest query.
                      const applicant =
                        request.requester;

                      const isProcessing =
                        processingRequestId ===
                        request._id;

                      return (
                        <article
                          key={
                            request._id
                          }
                          className="rounded-lg border border-[#E1E8E4] p-4"
                        >
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            {/* ===============================
                                APPLICANT BASIC PROFILE
                               =============================== */}

                            <div className="flex min-w-0 items-center gap-3">
                              {applicant?.profileImageUrl ? (
                                <img
                                  src={
                                    applicant.profileImageUrl
                                  }
                                  alt={
                                    applicant.name ||
                                    'Traveler'
                                  }
                                  className="h-12 w-12 shrink-0 rounded-full object-cover"
                                />
                              ) : (
                                // If no profile photo exists,
                                // display the first letter of
                                // the traveler's name.
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#DCEFE4] text-base font-bold text-[#0F6B4D]">
                                  {applicant?.name
                                    ?.charAt(
                                      0
                                    )
                                    ?.toUpperCase() ||
                                    'T'}
                                </div>
                              )}

                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-[#17211D]">
                                  {applicant?.name ||
                                    'Traveler'}
                                </p>

                                {/* Email counts as useful basic
                                    profile information for the
                                    creator.

                                    The backend intentionally
                                    selects only safe profile
                                    fields instead of exposing
                                    the whole User document. */}
                                <p className="truncate text-xs text-[#66756D]">
                                  {applicant?.email ||
                                    'Email unavailable'}
                                </p>

                                <p className="mt-1 text-xs text-[#8A9690]">
                                  Requested{' '}
                                  {formatRequestTime(
                                    request.createdAt
                                  )}
                                </p>
                              </div>
                            </div>

                            {/* ===============================
                                ACCEPT / REJECT ACTIONS
                               =============================== */}

                            <div className="flex shrink-0 gap-2">
                              <button
                                type="button"
                                disabled={
                                  isProcessing
                                }
                                onClick={() =>
                                  handleRejectRequest(
                                    request._id
                                  )
                                }
                                className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {isProcessing
                                  ? 'Processing...'
                                  : 'Reject'}
                              </button>

                              <button
                                type="button"
                                disabled={
                                  isProcessing ||
                                  roomIsFull
                                }
                                onClick={() =>
                                  handleAcceptRequest(
                                    request._id
                                  )
                                }
                                className="rounded-lg bg-[#0F6B4D] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0A523B] disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {isProcessing
                                  ? 'Processing...'
                                  : roomIsFull
                                    ? 'Room Full'
                                    : 'Accept'}
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    }
                  )}
                </div>
              )}
            </section>
          )}

          {/* =================================================
              CURRENT MEMBERS

              Everyone who can currently see this page sees
              the room's existing members.

              Later, once we create the private member
              workspace permissions, accepted members will use
              this membership to gain read-only access to:
              - itinerary
              - map
              - expenses
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
                (member) => {
                  const memberIsCreator =
                    member._id ===
                    room.creator?._id;

                  return (
                    <div
                      key={
                        member._id
                      }
                      className="flex items-center gap-3 rounded-lg border border-[#E1E8E4] p-3"
                    >
                      {member.profileImageUrl ? (
                        <img
                          src={
                            member.profileImageUrl
                          }
                          alt={
                            member.name ||
                            'Traveler'
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
                          {memberIsCreator
                            ? 'Room Creator'
                            : 'Member'}
                        </p>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </section>
        </div>

        {/* ===================================================
            RIGHT COLUMN - MEMBERSHIP STATUS
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

          {/* The creator already belongs to their own room. */}
          {viewerStatus ===
            'creator' && (
            <div className="mt-5 rounded-lg border border-[#BFDCCA] bg-[#EEF7F2] px-4 py-3 text-sm font-semibold text-[#0F6B4D]">
              You created this room.
            </div>
          )}

          {/* Accepted members are already inside the room's
              members array. */}
          {viewerStatus ===
            'member' && (
            <div className="mt-5 rounded-lg border border-[#BFDCCA] bg-[#EEF7F2] px-4 py-3 text-sm font-semibold text-[#0F6B4D]">
              You are a member of
              this room.
            </div>
          )}

          {/* Request exists but has not yet been accepted or
              rejected by the creator. */}
          {viewerStatus ===
            'pending' && (
            <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              Your join request is
              pending.
            </div>
          )}

          {/* Feature 1 currently keeps rejected requests in the
              database instead of silently deleting them. */}
          {viewerStatus ===
            'rejected' && (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              Your previous join
              request was rejected.
            </div>
          )}

          {/* Only a traveler who:
              - is not creator
              - is not member
              - has no pending/rejected request
              - room is open
              - room is not full

              can send a new request. */}
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
        </aside>
      </div>
    </div>
  );
}

export default PublicRoomDetailsPage;