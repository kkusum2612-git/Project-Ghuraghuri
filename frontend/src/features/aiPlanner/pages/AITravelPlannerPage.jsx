import {
  useMemo,
  useState,
} from 'react';

import {
  useNavigate,
} from 'react-router-dom';

import {
  createPublicRoomFromAiPlan,
  generateTravelPlan,
  saveAiPlanAsTrip,
} from '../api/aiPlannerApi';


/*
 * ============================================================
 * RAFI FEATURE 4 - AI TRAVEL PLANNER PAGE
 * ============================================================
 *
 * The generated AI result starts as a neutral draft.
 *
 * The Premium traveler can then explicitly choose:
 *
 * 1. Save as My Trip
 * 2. Create Public Room
 *
 *
 * SAVE AS MY TRIP
 * ------------------------------------------------------------
 *
 * AiTravelPlan
 *      ↓
 * Trip
 *      ↓
 * Day
 *      ↓
 * Stop
 *
 *
 * CREATE PUBLIC ROOM
 * ------------------------------------------------------------
 *
 * AiTravelPlan
 *      ↓
 * reuse/create normal Trip
 *      ↓
 * PublicRoom
 *
 *
 * Groq is NOT called again for either conversion.
 *
 * The AI map is intentionally not included right now.
 */


const INTEREST_OPTIONS = [
  'Nature',
  'Food',
  'Beach',
  'History',
  'Shopping',
  'Adventure',
];


/*
 * ------------------------------------------------------------
 * MONEY DISPLAY
 * ------------------------------------------------------------
 */
function formatMoney(
  value
) {
  const amount =
    Number(value);


  if (
    !Number.isFinite(
      amount
    )
  ) {
    return '৳0';
  }


  return `৳${amount.toLocaleString()}`;
}


/*
 * ------------------------------------------------------------
 * DATE DISPLAY
 * ------------------------------------------------------------
 */
function formatDate(
  value
) {
  if (!value) {
    return '';
  }


  const date =
    new Date(value);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '';
  }


  return new Intl.DateTimeFormat(
    'en-GB',
    {
      day:
        '2-digit',

      month:
        'short',

      year:
        'numeric',

      timeZone:
        'UTC',
    }
  ).format(date);
}


/*
 * HotelDetailsPage accepts date prefills using YYYY-MM-DD.
 */
function toDateInputValue(
  value
) {
  if (!value) {
    return '';
  }


  return String(value).slice(
    0,
    10
  );
}


/*
 * Read the useful message returned by Express.
 */
function getApiErrorMessage(
  error,
  fallbackMessage
) {
  return (
    error?.response?.data?.message ||
    fallbackMessage
  );
}


/*
 * ------------------------------------------------------------
 * INITIAL PLANNER FORM
 * ------------------------------------------------------------
 */
function createInitialForm() {
  return {
    origin:
      '',

    destination:
      '',

    startDate:
      '',

    duration:
      '3',

    travelers:
      '2',

    budget:
      '',

    interests:
      [],
  };
}


function AITravelPlannerPage() {
  const navigate =
    useNavigate();


  /*
   * ==========================================================
   * PLANNER STATE
   * ==========================================================
   */
  const [
    formData,
    setFormData,
  ] =
    useState(
      createInitialForm
    );


  const [
    generatedPlan,
    setGeneratedPlan,
  ] =
    useState(null);


  const [
    isGenerating,
    setIsGenerating,
  ] =
    useState(false);


  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState('');


  /*
   * ==========================================================
   * SAVE AS MY TRIP STATE
   * ==========================================================
   */
  const [
    isSavingTrip,
    setIsSavingTrip,
  ] =
    useState(false);


  const [
    savedTrip,
    setSavedTrip,
  ] =
    useState(null);


  const [
    saveTripMessage,
    setSaveTripMessage,
  ] =
    useState('');


  const [
    saveTripError,
    setSaveTripError,
  ] =
    useState('');


  const [
    skippedPlaces,
    setSkippedPlaces,
  ] =
    useState([]);


  /*
   * ==========================================================
   * CREATE PUBLIC ROOM STATE
   * ==========================================================
   */
  const [
    isCreatingRoom,
    setIsCreatingRoom,
  ] =
    useState(false);


  const [
    createdRoom,
    setCreatedRoom,
  ] =
    useState(null);


  const [
    createRoomMessage,
    setCreateRoomMessage,
  ] =
    useState('');


  const [
    createRoomError,
    setCreateRoomError,
  ] =
    useState('');


  const [
    roomSkippedPlaces,
    setRoomSkippedPlaces,
  ] =
    useState([]);


  /*
   * Do not allow the two conversion operations to run
   * simultaneously from the page.
   */
  const conversionIsBusy =
    isSavingTrip ||
    isCreatingRoom;


  /*
   * Prevent the date picker from encouraging past dates.
   *
   * Backend validation remains authoritative.
   */
  const minimumStartDate =
    useMemo(
      () => {
        const today =
          new Date();


        const year =
          today.getFullYear();


        const month =
          String(
            today.getMonth() +
              1
          ).padStart(
            2,
            '0'
          );


        const day =
          String(
            today.getDate()
          ).padStart(
            2,
            '0'
          );


        return `${year}-${month}-${day}`;
      },
      []
    );


  /*
   * ==========================================================
   * FORM INPUTS
   * ==========================================================
   */
  function handleInputChange(
    event
  ) {
    const {
      name,
      value,
    } =
      event.target;


    setFormData(
      (
        currentForm
      ) => ({
        ...currentForm,

        [name]:
          value,
      })
    );


    if (
      errorMessage
    ) {
      setErrorMessage('');
    }
  }


  /*
   * ==========================================================
   * INTEREST SELECTION
   * ==========================================================
   */
  function handleInterestChange(
    interest
  ) {
    setFormData(
      (
        currentForm
      ) => {
        const alreadySelected =
          currentForm
            .interests
            .includes(
              interest
            );


        return {
          ...currentForm,

          interests:
            alreadySelected
              ? currentForm
                  .interests
                  .filter(
                    (
                      selectedInterest
                    ) =>
                      selectedInterest !==
                      interest
                  )
              : [
                  ...currentForm
                    .interests,

                  interest,
                ],
        };
      }
    );


    if (
      errorMessage
    ) {
      setErrorMessage('');
    }
  }


  /*
   * ==========================================================
   * FRONTEND VALIDATION
   * ==========================================================
   */
  function validateForm() {
    if (
      !formData.origin.trim()
    ) {
      return 'Enter your current location.';
    }


    if (
      !formData.destination.trim()
    ) {
      return 'Enter your destination.';
    }


    if (
      !formData.startDate
    ) {
      return 'Choose a trip start date.';
    }


    const duration =
      Number(
        formData.duration
      );


    if (
      !Number.isInteger(
        duration
      ) ||
      duration < 1 ||
      duration > 14
    ) {
      return 'Duration must be between 1 and 14 days.';
    }


    const travelers =
      Number(
        formData.travelers
      );


    if (
      !Number.isInteger(
        travelers
      ) ||
      travelers < 1 ||
      travelers > 50
    ) {
      return 'Traveler count must be between 1 and 50.';
    }


    const budget =
      Number(
        formData.budget
      );


    if (
      !Number.isFinite(
        budget
      ) ||
      budget <= 0
    ) {
      return 'Enter a positive trip budget.';
    }


    if (
      formData
        .interests
        .length ===
      0
    ) {
      return 'Select at least one travel interest.';
    }


    return '';
  }


  /*
   * ==========================================================
   * GENERATE AI PLAN
   * ==========================================================
   */
  async function handleGeneratePlan(
    event
  ) {
    event.preventDefault();


    const validationMessage =
      validateForm();


    if (
      validationMessage
    ) {
      setErrorMessage(
        validationMessage
      );

      return;
    }


    setIsGenerating(true);

    setErrorMessage('');


    try {
      const result =
        await generateTravelPlan({
          origin:
            formData
              .origin
              .trim(),

          destination:
            formData
              .destination
              .trim(),

          startDate:
            formData.startDate,

          duration:
            Number(
              formData.duration
            ),

          travelers:
            Number(
              formData.travelers
            ),

          budget:
            Number(
              formData.budget
            ),

          interests:
            formData.interests,
        });


      const plan =
        result?.data?.plan;


      if (!plan) {
        throw new Error(
          'Generated plan is missing.'
        );
      }


      setGeneratedPlan(
        plan
      );


      /*
       * Reset conversion state because this is a new AI plan.
       */
      setSavedTrip(null);

      setSaveTripMessage('');

      setSaveTripError('');

      setSkippedPlaces([]);


      setCreatedRoom(null);

      setCreateRoomMessage('');

      setCreateRoomError('');

      setRoomSkippedPlaces([]);


      window.scrollTo({
        top:
          0,

        behavior:
          'smooth',
      });
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(
          error,
          'The AI Travel Planner could not generate a plan. Please try again.'
        )
      );
    } finally {
      setIsGenerating(false);
    }
  }


  /*
   * ==========================================================
   * VIEW & BOOK HOTEL
   * ==========================================================
   *
   * This does NOT automatically create a hotel booking.
   */
  function handleViewHotel(
    day
  ) {
    const hotel =
      day.hotel;


    if (
      !hotel?.hotelId
    ) {
      return;
    }


    navigate(
      `/hotels/${hotel.hotelId}`,
      {
        state: {
          checkInDate:
            toDateInputValue(
              hotel.checkInDate
            ),

          checkOutDate:
            toDateInputValue(
              hotel.checkOutDate
            ),

          guests:
            String(
              generatedPlan
                ?.travelers ||
                1
            ),
        },
      }
    );
  }


  /*
   * ==========================================================
   * SAVE AS MY TRIP
   * ==========================================================
   *
   * No second Groq request occurs.
   */
  async function handleSaveAsTrip() {
    if (
      !generatedPlan?._id ||
      conversionIsBusy
    ) {
      return;
    }


    /*
     * If this browser already knows the converted Trip,
     * clicking again opens it instead.
     */
    if (
      savedTrip?._id
    ) {
      navigate(
        `/trips/${savedTrip._id}/plan`
      );

      return;
    }


    setIsSavingTrip(true);

    setSaveTripError('');

    setSaveTripMessage('');

    setSkippedPlaces([]);


    try {
      const result =
        await saveAiPlanAsTrip(
          generatedPlan._id
        );


      const trip =
        result?.data?.trip;


      if (
        !trip?._id
      ) {
        throw new Error(
          'Saved trip is missing from the response.'
        );
      }


      setSavedTrip(
        trip
      );


      const alreadyConverted =
        Boolean(
          result
            ?.data
            ?.wasAlreadyConverted
        );


      setSaveTripMessage(
        alreadyConverted
          ? 'This AI plan had already been saved. Your existing My Trip is ready to open.'
          : 'AI travel plan saved successfully as a normal My Trip.'
      );


      setSkippedPlaces(
        Array.isArray(
          result
            ?.data
            ?.skippedPlaces
        )
          ? result
              .data
              .skippedPlaces
          : []
      );
    } catch (error) {
      setSaveTripError(
        getApiErrorMessage(
          error,
          'The AI travel plan could not be saved as My Trip. Please try again.'
        )
      );
    } finally {
      setIsSavingTrip(false);
    }
  }


  /*
   * Open Farhan's normal editable Trip workspace.
   */
  function handleOpenSavedTrip() {
    if (
      !savedTrip?._id
    ) {
      return;
    }


    navigate(
      `/trips/${savedTrip._id}/plan`
    );
  }


  /*
   * ==========================================================
   * CREATE PUBLIC ROOM
   * ==========================================================
   *
   * The SAME AI plan is used.
   *
   * Backend:
   *
   * AI Plan
   *    ↓
   * reuse/create normal Trip
   *    ↓
   * PublicRoom
   *
   * Existing join requests, membership and chat continue using
   * the normal Public Room system.
   */
  async function handleCreatePublicRoom() {
    if (
      !generatedPlan?._id ||
      conversionIsBusy
    ) {
      return;
    }


    /*
     * If already created during this browser session, clicking
     * again simply opens the room.
     */
    if (
      createdRoom?._id
    ) {
      navigate(
        `/event-rooms/${createdRoom._id}`
      );

      return;
    }


    setIsCreatingRoom(true);

    setCreateRoomError('');

    setCreateRoomMessage('');

    setRoomSkippedPlaces([]);


    try {
      /*
       * Empty roomData means the backend builds sensible room
       * defaults from the already-reviewed AI plan:
       *
       * room name  <- trip title
       * destination
       * dates
       * budget
       * interests
       * member limit
       * description <- AI summary
       */
      const result =
        await createPublicRoomFromAiPlan(
          generatedPlan._id
        );


      const room =
        result?.data?.room;


      if (
        !room?._id
      ) {
        throw new Error(
          'Created Public Room is missing from the response.'
        );
      }


      setCreatedRoom(
        room
      );


      /*
       * Creating a Public Room may also have created the
       * underlying normal Trip.
       *
       * Keep that Trip available to the user without requiring
       * another request.
       */
      const underlyingTrip =
        result?.data?.trip;


      if (
        underlyingTrip?._id
      ) {
        setSavedTrip(
          underlyingTrip
        );
      }


      const alreadyConverted =
        Boolean(
          result
            ?.data
            ?.wasAlreadyConverted
        );


      setCreateRoomMessage(
        alreadyConverted
          ? 'This AI plan already has a Public Room. The existing room is ready to open.'
          : 'Public Room created successfully from this AI travel plan.'
      );


      setRoomSkippedPlaces(
        Array.isArray(
          result
            ?.data
            ?.skippedPlaces
        )
          ? result
              .data
              .skippedPlaces
          : []
      );
    } catch (error) {
      setCreateRoomError(
        getApiErrorMessage(
          error,
          'The Public Room could not be created from this AI plan. Please try again.'
        )
      );
    } finally {
      setIsCreatingRoom(false);
    }
  }


  /*
   * Open the existing Public Room details/member-management page.
   */
  function handleOpenPublicRoom() {
    if (
      !createdRoom?._id
    ) {
      return;
    }


    navigate(
      `/event-rooms/${createdRoom._id}`
    );
  }


  /*
   * ==========================================================
   * PLAN ANOTHER TRIP
   * ==========================================================
   */
  function handlePlanAnotherTrip() {
    if (
      conversionIsBusy
    ) {
      return;
    }


    setGeneratedPlan(null);

    setErrorMessage('');


    setSavedTrip(null);

    setSaveTripMessage('');

    setSaveTripError('');

    setSkippedPlaces([]);


    setCreatedRoom(null);

    setCreateRoomMessage('');

    setCreateRoomError('');

    setRoomSkippedPlaces([]);


    window.scrollTo({
      top:
        0,

      behavior:
        'smooth',
    });
  }


  /*
   * ==========================================================
   * GENERATED RESULT
   * ==========================================================
   */
  if (
    generatedPlan
  ) {
    const budget =
      Number(
        generatedPlan.budget
      ) || 0;


    const estimatedTotal =
      Number(
        generatedPlan
          .estimatedTotal
      ) || 0;


    const budgetDifference =
      budget -
      estimatedTotal;


    const isOverBudget =
      budgetDifference <
      0;


    return (
      <div className="mx-auto w-full max-w-6xl">
        {/* ====================================================
            RESULT HEADER
           ==================================================== */}
        <section className="rounded-2xl border border-[#DCE5E0] bg-white p-6 shadow-sm lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex rounded-full bg-[#EEF7F2] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#0F6B4D]">
                AI Generated Trip
              </div>

              <h1 className="text-3xl font-bold text-[#17211D]">
                {
                  generatedPlan
                    .tripTitle
                }
              </h1>

              <p className="mt-3 text-base leading-7 text-[#66756D]">
                {
                  generatedPlan
                    .summary
                }
              </p>


              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full bg-[#F3F6F4] px-3 py-1.5 text-sm font-medium text-[#425149]">
                  {
                    generatedPlan.origin
                  }
                  {' → '}
                  {
                    generatedPlan.destination
                  }
                </span>

                <span className="rounded-full bg-[#F3F6F4] px-3 py-1.5 text-sm font-medium text-[#425149]">
                  {
                    formatDate(
                      generatedPlan
                        .startDate
                    )
                  }
                </span>

                <span className="rounded-full bg-[#F3F6F4] px-3 py-1.5 text-sm font-medium text-[#425149]">
                  {
                    generatedPlan.duration
                  }{' '}
                  day
                  {
                    generatedPlan
                      .duration ===
                    1
                      ? ''
                      : 's'
                  }
                </span>

                <span className="rounded-full bg-[#F3F6F4] px-3 py-1.5 text-sm font-medium text-[#425149]">
                  {
                    generatedPlan.travelers
                  }{' '}
                  traveler
                  {
                    generatedPlan
                      .travelers ===
                    1
                      ? ''
                      : 's'
                  }
                </span>
              </div>
            </div>


            <button
              type="button"
              onClick={
                handlePlanAnotherTrip
              }
              disabled={
                conversionIsBusy
              }
              className="shrink-0 rounded-lg border border-[#BFD9CD] bg-white px-4 py-2.5 text-sm font-semibold text-[#0F6B4D] transition hover:bg-[#EEF7F2] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Plan Another Trip
            </button>
          </div>


          {/* ==================================================
              CONVERSION ACTIONS
             ================================================== */}
          <div className="mt-7 border-t border-[#E5ECE8] pt-6">
            <h2 className="text-base font-bold text-[#17211D]">
              What would you like to do with this plan?
            </h2>

            <p className="mt-1 text-sm leading-6 text-[#66756D]">
              Keep it as your own editable trip or turn the same
              itinerary into a Public Event Room.
            </p>


            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {/* ---------------- SAVE / OPEN TRIP ---------------- */}
              {
                savedTrip
                  ? (
                      <button
                        type="button"
                        onClick={
                          handleOpenSavedTrip
                        }
                        disabled={
                          conversionIsBusy
                        }
                        className="inline-flex items-center justify-center rounded-lg bg-[#0F6B4D] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#0A523B] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Open My Trip
                      </button>
                    )
                  : (
                      <button
                        type="button"
                        onClick={
                          handleSaveAsTrip
                        }
                        disabled={
                          conversionIsBusy
                        }
                        className="inline-flex items-center justify-center rounded-lg bg-[#0F6B4D] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#0A523B] disabled:cursor-not-allowed disabled:bg-[#8AA79A]"
                      >
                        {
                          isSavingTrip
                            ? 'Saving as My Trip...'
                            : 'Save as My Trip'
                        }
                      </button>
                    )
              }


              {/* ---------------- CREATE / OPEN ROOM ---------------- */}
              {
                createdRoom
                  ? (
                      <button
                        type="button"
                        onClick={
                          handleOpenPublicRoom
                        }
                        disabled={
                          conversionIsBusy
                        }
                        className="inline-flex items-center justify-center rounded-lg border border-[#0F6B4D] bg-white px-5 py-3 text-sm font-bold text-[#0F6B4D] transition hover:bg-[#EEF7F2] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Open Public Room
                      </button>
                    )
                  : (
                      <button
                        type="button"
                        onClick={
                          handleCreatePublicRoom
                        }
                        disabled={
                          conversionIsBusy
                        }
                        className="inline-flex items-center justify-center rounded-lg border border-[#0F6B4D] bg-white px-5 py-3 text-sm font-bold text-[#0F6B4D] transition hover:bg-[#EEF7F2] disabled:cursor-not-allowed disabled:border-[#9AB6A8] disabled:text-[#82958B]"
                      >
                        {
                          isCreatingRoom
                            ? 'Creating Public Room...'
                            : 'Create Public Room'
                        }
                      </button>
                    )
              }
            </div>


            {/* ---------------- TRIP SUCCESS ---------------- */}
            {
              saveTripMessage
                ? (
                    <div
                      className="mt-4 rounded-lg border border-[#BFDCCB] bg-[#EEF8F2] px-4 py-3 text-sm font-medium text-[#176244]"
                      role="status"
                    >
                      {
                        saveTripMessage
                      }
                    </div>
                  )
                : null
            }


            {/* ---------------- TRIP ERROR ---------------- */}
            {
              saveTripError
                ? (
                    <div
                      className="mt-4 rounded-lg border border-[#E8C4BE] bg-[#FFF4F2] px-4 py-3 text-sm font-medium text-[#9B4036]"
                      role="alert"
                    >
                      {
                        saveTripError
                      }
                    </div>
                  )
                : null
            }


            {/* ---------------- ROOM SUCCESS ---------------- */}
            {
              createRoomMessage
                ? (
                    <div
                      className="mt-4 rounded-lg border border-[#BFDCCB] bg-[#EEF8F2] px-4 py-3 text-sm font-medium text-[#176244]"
                      role="status"
                    >
                      {
                        createRoomMessage
                      }
                    </div>
                  )
                : null
            }


            {/* ---------------- ROOM ERROR ---------------- */}
            {
              createRoomError
                ? (
                    <div
                      className="mt-4 rounded-lg border border-[#E8C4BE] bg-[#FFF4F2] px-4 py-3 text-sm font-medium text-[#9B4036]"
                      role="alert"
                    >
                      {
                        createRoomError
                      }
                    </div>
                  )
                : null
            }


            {/* ---------------- SKIPPED TRIP PLACES ---------------- */}
            {
              skippedPlaces.length >
              0
                ? (
                    <div className="mt-4 rounded-lg border border-[#E9D9AD] bg-[#FFF9E9] px-4 py-3">
                      <p className="text-sm font-bold text-[#735C22]">
                        Some places could not be matched automatically
                      </p>

                      <p className="mt-1 text-xs leading-5 text-[#806D3A]">
                        Your Trip was still saved. These places were
                        not added as Stops because Ghuraghuri could
                        not find trusted coordinates for them.
                      </p>

                      <ul className="mt-2 space-y-1 text-xs text-[#735C22]">
                        {
                          skippedPlaces.map(
                            (
                              item,
                              index
                            ) => (
                              <li
                                key={`${item.day}-${item.placeName}-${index}`}
                              >
                                Day {
                                  item.day
                                }:{' '}
                                {
                                  item.placeName
                                }
                              </li>
                            )
                          )
                        }
                      </ul>
                    </div>
                  )
                : null
            }


            {/* ---------------- SKIPPED ROOM PLACES ---------------- */}
            {
              roomSkippedPlaces.length >
              0
                ? (
                    <div className="mt-4 rounded-lg border border-[#E9D9AD] bg-[#FFF9E9] px-4 py-3">
                      <p className="text-sm font-bold text-[#735C22]">
                        Public Room created with a partial itinerary
                      </p>

                      <p className="mt-1 text-xs leading-5 text-[#806D3A]">
                        The room was created, but these AI places
                        could not be converted into normal Stops
                        because trusted coordinates were unavailable.
                      </p>

                      <ul className="mt-2 space-y-1 text-xs text-[#735C22]">
                        {
                          roomSkippedPlaces.map(
                            (
                              item,
                              index
                            ) => (
                              <li
                                key={`room-${item.day}-${item.placeName}-${index}`}
                              >
                                Day {
                                  item.day
                                }:{' '}
                                {
                                  item.placeName
                                }
                              </li>
                            )
                          )
                        }
                      </ul>
                    </div>
                  )
                : null
            }
          </div>
        </section>


        {/* ====================================================
            TRUST BOUNDARY
           ==================================================== */}
        <section className="mt-5 rounded-xl border border-[#DCE5E0] bg-[#F7FAF8] px-5 py-4">
          <p className="text-sm leading-6 text-[#536159]">
            <span className="font-bold text-[#17211D]">
              How this plan works:
            </span>{' '}
            places and food/transport/activity costs are AI
            estimates. Hotel names, prices and availability come
            from real Ghuraghuri hotel data.
          </p>
        </section>


        {/* ====================================================
            DAY-BY-DAY ITINERARY
           ==================================================== */}
        <div className="mt-6 space-y-6">
          {
            generatedPlan
              .days
              .map(
                (
                  day
                ) => {
                  const hasHotel =
                    day
                      .accommodationType ===
                      'hotel' &&
                    day.hotel;


                  return (
                    <section
                      key={
                        day.day
                      }
                      className="overflow-hidden rounded-2xl border border-[#DCE5E0] bg-white shadow-sm"
                    >
                      {/* DAY HEADER */}
                      <div className="border-b border-[#E5ECE8] bg-[#F8FBF9] px-6 py-5">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wide text-[#0F6B4D]">
                              Day {
                                day.day
                              }
                            </p>

                            <h2 className="mt-1 text-xl font-bold text-[#17211D]">
                              {
                                formatDate(
                                  day.date
                                )
                              }
                            </h2>
                          </div>

                          <p className="text-sm font-semibold text-[#536159]">
                            {
                              day.startArea
                            }
                            {' → '}
                            {
                              day.endArea
                            }
                          </p>
                        </div>
                      </div>


                      <div className="grid gap-6 p-6 lg:grid-cols-[1.3fr_0.9fr]">
                        {/* --------------------------------------
                            PLACES
                           -------------------------------------- */}
                        <div>
                          <h3 className="text-sm font-bold uppercase tracking-wide text-[#526158]">
                            Places to visit
                          </h3>

                          {
                            Array.isArray(
                              day.places
                            ) &&
                            day.places.length >
                              0
                              ? (
                                  <ol className="mt-4 space-y-3">
                                    {
                                      day
                                        .places
                                        .map(
                                          (
                                            place,
                                            index
                                          ) => (
                                            <li
                                              key={`${day.day}-${place}-${index}`}
                                              className="flex items-start gap-3"
                                            >
                                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#E7F3EC] text-xs font-bold text-[#0F6B4D]">
                                                {
                                                  index +
                                                  1
                                                }
                                              </span>

                                              <span className="pt-1 text-sm font-medium text-[#334139]">
                                                {
                                                  place
                                                }
                                              </span>
                                            </li>
                                          )
                                        )
                                    }
                                  </ol>
                                )
                              : (
                                  <p className="mt-3 text-sm text-[#7A8881]">
                                    No places were suggested for this day.
                                  </p>
                                )
                          }
                        </div>


                        {/* --------------------------------------
                            ACCOMMODATION
                           -------------------------------------- */}
                        <div>
                          <h3 className="text-sm font-bold uppercase tracking-wide text-[#526158]">
                            Accommodation
                          </h3>


                          {
                            !day.requiresStay
                              ? (
                                  <div className="mt-4 rounded-xl border border-[#DCE5E0] bg-[#F7FAF8] p-4">
                                    <p className="font-bold text-[#334139]">
                                      No overnight stay required
                                    </p>

                                    <p className="mt-1 text-sm leading-6 text-[#66756D]">
                                      This day does not require an
                                      accommodation recommendation.
                                    </p>
                                  </div>
                                )
                              : hasHotel
                                ? (
                                    <div className="mt-4 overflow-hidden rounded-xl border border-[#CFE0D7] bg-[#F8FCFA]">
                                      {
                                        day
                                          .hotel
                                          .photo
                                          ? (
                                              <img
                                                src={
                                                  day
                                                    .hotel
                                                    .photo
                                                }
                                                alt={
                                                  day
                                                    .hotel
                                                    .hotelName
                                                }
                                                className="h-40 w-full object-cover"
                                              />
                                            )
                                          : null
                                      }

                                      <div className="p-4">
                                        <p className="text-xs font-bold uppercase tracking-wide text-[#0F6B4D]">
                                          Ghuraghuri Hotel
                                        </p>

                                        <h4 className="mt-1 text-lg font-bold text-[#17211D]">
                                          {
                                            day
                                              .hotel
                                              .hotelName
                                          }
                                        </h4>

                                        {
                                          day
                                            .hotel
                                            .location
                                            ? (
                                                <p className="mt-1 text-sm text-[#66756D]">
                                                  {
                                                    day
                                                      .hotel
                                                      .location
                                                  }
                                                </p>
                                              )
                                            : null
                                        }

                                        <p className="mt-3 text-sm font-bold text-[#0F6B4D]">
                                          {
                                            formatMoney(
                                              day
                                                .accommodationEstimate
                                            )
                                          }{' '}
                                          accommodation estimate
                                        </p>

                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleViewHotel(
                                              day
                                            )
                                          }
                                          className="mt-4 rounded-lg border border-[#0F6B4D] bg-white px-4 py-2 text-sm font-bold text-[#0F6B4D] transition hover:bg-[#EEF7F2]"
                                        >
                                          View & Book
                                        </button>
                                      </div>
                                    </div>
                                  )
                                : (
                                    <div className="mt-4 rounded-xl border border-[#E4DDC8] bg-[#FFFDF5] p-4">
                                      <p className="font-bold text-[#554A2F]">
                                        Camping / Self-arranged stay
                                      </p>

                                      <p className="mt-1 text-sm leading-6 text-[#74694E]">
                                        No suitable registered
                                        Ghuraghuri hotel was found for
                                        this overnight area.
                                      </p>

                                      <p className="mt-3 text-sm font-semibold text-[#554A2F]">
                                        Accommodation included in
                                        estimate:{' '}
                                        {
                                          formatMoney(
                                            day
                                              .accommodationEstimate
                                          )
                                        }
                                      </p>
                                    </div>
                                  )
                          }
                        </div>
                      </div>


                      {/* ----------------------------------------
                          DAILY COSTS
                         ---------------------------------------- */}
                      <div className="border-t border-[#E5ECE8] bg-[#FCFDFC] px-6 py-5">
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                          <div>
                            <p className="text-xs text-[#7A8881]">
                              Food
                            </p>

                            <p className="mt-1 font-bold text-[#334139]">
                              {
                                formatMoney(
                                  day.foodEstimate
                                )
                              }
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-[#7A8881]">
                              Transport
                            </p>

                            <p className="mt-1 font-bold text-[#334139]">
                              {
                                formatMoney(
                                  day
                                    .transportEstimate
                                )
                              }
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-[#7A8881]">
                              Activities
                            </p>

                            <p className="mt-1 font-bold text-[#334139]">
                              {
                                formatMoney(
                                  day
                                    .activityEstimate
                                )
                              }
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-[#7A8881]">
                              Accommodation
                            </p>

                            <p className="mt-1 font-bold text-[#334139]">
                              {
                                formatMoney(
                                  day
                                    .accommodationEstimate
                                )
                              }
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-semibold text-[#0F6B4D]">
                              Day Total
                            </p>

                            <p className="mt-1 text-lg font-bold text-[#0F6B4D]">
                              {
                                formatMoney(
                                  day
                                    .estimatedDayTotal
                                )
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                    </section>
                  );
                }
              )
          }
        </div>


        {/* ====================================================
            BUDGET SUMMARY
           ==================================================== */}
        <section className="mt-6 rounded-2xl border border-[#DCE5E0] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-[#17211D]">
            Budget Summary
          </h2>

          <p className="mt-2 text-sm leading-6 text-[#66756D]">
            Hotel accommodation uses Ghuraghuri data. Food,
            transport and activity values are AI estimates.
          </p>


          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl bg-[#F7FAF8] px-5 py-4">
              <p className="text-xs font-medium uppercase tracking-wide text-[#66756D]">
                Trip Budget
              </p>

              <p className="mt-1 text-xl font-bold text-[#17211D]">
                {
                  formatMoney(
                    budget
                  )
                }
              </p>
            </div>


            <div className="rounded-xl bg-[#F7FAF8] px-5 py-4">
              <p className="text-xs font-medium uppercase tracking-wide text-[#66756D]">
                Estimated Cost
              </p>

              <p className="mt-1 text-xl font-bold text-[#17211D]">
                {
                  formatMoney(
                    estimatedTotal
                  )
                }
              </p>
            </div>


            <div
              className={[
                'rounded-xl px-5 py-4',

                isOverBudget
                  ? 'bg-[#FFF2F0]'
                  : 'bg-[#EAF5EF]',
              ].join(
                ' '
              )}
            >
              <p
                className={[
                  'text-xs font-medium uppercase tracking-wide',

                  isOverBudget
                    ? 'text-[#A94A3F]'
                    : 'text-[#4B725F]',
                ].join(
                  ' '
                )}
              >
                {
                  isOverBudget
                    ? 'Over Budget By'
                    : 'Estimated Remaining'
                }
              </p>

              <p
                className={[
                  'mt-1 text-xl font-bold',

                  isOverBudget
                    ? 'text-[#B14337]'
                    : 'text-[#0F6B4D]',
                ].join(
                  ' '
                )}
              >
                {
                  formatMoney(
                    Math.abs(
                      budgetDifference
                    )
                  )
                }
              </p>
            </div>
          </div>
        </section>
      </div>
    );
  }


  /*
   * ==========================================================
   * PLANNER FORM
   * ==========================================================
   */
  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-7">
        <div className="mb-3 inline-flex rounded-full bg-[#EEF7F2] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#0F6B4D]">
          Premium AI Planner
        </div>

        <h1 className="text-3xl font-bold text-[#17211D]">
          Plan your trip with AI
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#66756D]">
          Tell Ghuraghuri where you want to travel, your budget
          and preferences. Groq will create the itinerary, while
          Ghuraghuri adds trusted hotel information from the
          application.
        </p>
      </div>


      <form
        onSubmit={
          handleGeneratePlan
        }
        className="rounded-2xl border border-[#DCE5E0] bg-white p-6 shadow-sm lg:p-8"
      >
        <div className="grid gap-6 md:grid-cols-2">
          {/* ---------------- CURRENT LOCATION ---------------- */}
          <div>
            <label
              htmlFor="origin"
              className="mb-2 block text-sm font-bold text-[#334139]"
            >
              Current location
            </label>

            <input
              id="origin"
              name="origin"
              type="text"
              value={
                formData.origin
              }
              onChange={
                handleInputChange
              }
              placeholder="Dhaka"
              maxLength="120"
              className="w-full rounded-lg border border-[#CCD8D2] bg-white px-4 py-3 text-sm text-[#17211D] outline-none transition placeholder:text-[#98A49E] focus:border-[#0F6B4D] focus:ring-2 focus:ring-[#DCEFE4]"
            />

            <p className="mt-1.5 text-xs text-[#7A8881]">
              Where the trip will begin.
            </p>
          </div>


          {/* ---------------- DESTINATION ---------------- */}
          <div>
            <label
              htmlFor="destination"
              className="mb-2 block text-sm font-bold text-[#334139]"
            >
              Destination
            </label>

            <input
              id="destination"
              name="destination"
              type="text"
              value={
                formData.destination
              }
              onChange={
                handleInputChange
              }
              placeholder="Cox's Bazar"
              maxLength="120"
              className="w-full rounded-lg border border-[#CCD8D2] bg-white px-4 py-3 text-sm text-[#17211D] outline-none transition placeholder:text-[#98A49E] focus:border-[#0F6B4D] focus:ring-2 focus:ring-[#DCEFE4]"
            />

            <p className="mt-1.5 text-xs text-[#7A8881]">
              Main destination for the generated itinerary.
            </p>
          </div>


          {/* ---------------- START DATE ---------------- */}
          <div>
            <label
              htmlFor="startDate"
              className="mb-2 block text-sm font-bold text-[#334139]"
            >
              Start date
            </label>

            <input
              id="startDate"
              name="startDate"
              type="date"
              min={
                minimumStartDate
              }
              value={
                formData.startDate
              }
              onChange={
                handleInputChange
              }
              className="w-full rounded-lg border border-[#CCD8D2] bg-white px-4 py-3 text-sm text-[#17211D] outline-none transition focus:border-[#0F6B4D] focus:ring-2 focus:ring-[#DCEFE4]"
            />

            <p className="mt-1.5 text-xs text-[#7A8881]">
              Used for itinerary dates and hotel availability.
            </p>
          </div>


          {/* ---------------- DURATION ---------------- */}
          <div>
            <label
              htmlFor="duration"
              className="mb-2 block text-sm font-bold text-[#334139]"
            >
              Duration
            </label>

            <input
              id="duration"
              name="duration"
              type="number"
              min="1"
              max="14"
              step="1"
              value={
                formData.duration
              }
              onChange={
                handleInputChange
              }
              className="w-full rounded-lg border border-[#CCD8D2] bg-white px-4 py-3 text-sm text-[#17211D] outline-none transition focus:border-[#0F6B4D] focus:ring-2 focus:ring-[#DCEFE4]"
            />

            <p className="mt-1.5 text-xs text-[#7A8881]">
              Between 1 and 14 days.
            </p>
          </div>


          {/* ---------------- TRAVELERS ---------------- */}
          <div>
            <label
              htmlFor="travelers"
              className="mb-2 block text-sm font-bold text-[#334139]"
            >
              Number of travelers
            </label>

            <input
              id="travelers"
              name="travelers"
              type="number"
              min="1"
              max="50"
              step="1"
              value={
                formData.travelers
              }
              onChange={
                handleInputChange
              }
              className="w-full rounded-lg border border-[#CCD8D2] bg-white px-4 py-3 text-sm text-[#17211D] outline-none transition focus:border-[#0F6B4D] focus:ring-2 focus:ring-[#DCEFE4]"
            />

            <p className="mt-1.5 text-xs text-[#7A8881]">
              Used when estimating costs and hotel capacity.
            </p>
          </div>


          {/* ---------------- BUDGET ---------------- */}
          <div>
            <label
              htmlFor="budget"
              className="mb-2 block text-sm font-bold text-[#334139]"
            >
              Total budget
            </label>

            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[#66756D]">
                ৳
              </span>

              <input
                id="budget"
                name="budget"
                type="number"
                min="1"
                step="1"
                value={
                  formData.budget
                }
                onChange={
                  handleInputChange
                }
                placeholder="20000"
                className="w-full rounded-lg border border-[#CCD8D2] bg-white py-3 pl-8 pr-4 text-sm text-[#17211D] outline-none transition placeholder:text-[#98A49E] focus:border-[#0F6B4D] focus:ring-2 focus:ring-[#DCEFE4]"
              />
            </div>

            <p className="mt-1.5 text-xs text-[#7A8881]">
              Groq will try to keep the draft reasonably near
              this amount.
            </p>
          </div>
        </div>


        {/* ---------------- INTERESTS ---------------- */}
        <div className="mt-7">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold text-[#334139]">
                Interests & preferences
              </p>

              <p className="mt-1 text-xs text-[#7A8881]">
                Select at least one.
              </p>
            </div>

            <p className="text-xs font-medium text-[#66756D]">
              {
                formData
                  .interests
                  .length
              }{' '}
              selected
            </p>
          </div>


          <div className="mt-4 flex flex-wrap gap-3">
            {
              INTEREST_OPTIONS.map(
                (
                  interest
                ) => {
                  const selected =
                    formData
                      .interests
                      .includes(
                        interest
                      );


                  return (
                    <button
                      key={
                        interest
                      }
                      type="button"
                      onClick={() =>
                        handleInterestChange(
                          interest
                        )
                      }
                      className={[
                        'rounded-full border px-4 py-2 text-sm font-semibold transition',

                        selected
                          ? 'border-[#0F6B4D] bg-[#DCEFE4] text-[#0F6B4D]'
                          : 'border-[#D5DFDA] bg-white text-[#536159] hover:border-[#9CB9AA] hover:bg-[#F7FAF8]',
                      ].join(
                        ' '
                      )}
                      aria-pressed={
                        selected
                      }
                    >
                      {
                        selected
                          ? '✓ '
                          : ''
                      }
                      {
                        interest
                      }
                    </button>
                  );
                }
              )
            }
          </div>
        </div>


        {/* ---------------- ERROR ---------------- */}
        {
          errorMessage
            ? (
                <div
                  className="mt-6 rounded-lg border border-[#E8C4BE] bg-[#FFF4F2] px-4 py-3 text-sm font-medium text-[#9B4036]"
                  role="alert"
                >
                  {
                    errorMessage
                  }
                </div>
              )
            : null
        }


        {/* ---------------- GENERATE ---------------- */}
        <div className="mt-8 border-t border-[#E5ECE8] pt-6">
          <button
            type="submit"
            disabled={
              isGenerating
            }
            className="inline-flex w-full items-center justify-center rounded-lg bg-[#0F6B4D] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#0A523B] disabled:cursor-not-allowed disabled:bg-[#8AA79A] sm:w-auto"
          >
            {
              isGenerating
                ? 'Generating your trip...'
                : 'Generate Trip Plan'
            }
          </button>

          <p className="mt-3 text-xs leading-5 text-[#7A8881]">
            AI generation can take a few seconds. Ghuraghuri will
            also check real hotel information before displaying
            the result.
          </p>
        </div>
      </form>
    </div>
  );
}


export default AITravelPlannerPage;