import {
  useMemo,
  useState,
} from 'react';

import {
  useNavigate,
} from 'react-router-dom';

import {
  generateTravelPlan,
} from '../api/aiPlannerApi';


/*
 * ============================================================
 * RAFI FEATURE 4 - AI TRAVEL PLANNER PAGE
 * ============================================================
 *
 * This page has two main states:
 *
 * 1. Planner form
 * 2. Generated result
 *
 *
 * The traveler stays on the same /ai-planner page.
 *
 * Before generation:
 *
 * /ai-planner
 *      ↓
 * planner form
 *
 *
 * After generation:
 *
 * /ai-planner
 *      ↓
 * generated trip summary
 *      ↓
 * day-by-day itinerary
 *      ↓
 * real Ghuraghuri hotel recommendations
 *      ↓
 * trip budget summary
 *
 *
 * The route map and conversion buttons will be connected in
 * the next Feature 4 blocks after this base result is verified.
 */


/*
 * These are simple starting interests for the course demo.
 *
 * The backend accepts normal strings, so more interests can
 * easily be added later without changing the API structure.
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
 *
 * Example:
 *
 * 25000
 *
 * becomes:
 *
 * ৳25,000
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
 *
 * MongoDB sends dates such as:
 *
 * 2026-08-28T00:00:00.000Z
 *
 * The traveler sees:
 *
 * 28 Aug 2026
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
 * HotelDetailsPage expects dates in YYYY-MM-DD form when
 * receiving booking prefill information through navigation
 * state.
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
 * ------------------------------------------------------------
 * ERROR MESSAGE
 * ------------------------------------------------------------
 *
 * The centralized backend error response normally places the
 * useful message here:
 *
 * error.response.data.message
 *
 * If that does not exist, we show a safe fallback message.
 */
function getErrorMessage(
  error
) {
  return (
    error?.response?.data?.message ||
    'The AI Travel Planner could not generate a plan. Please try again.'
  );
}


/*
 * ------------------------------------------------------------
 * INITIAL FORM
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
   * PLANNER FORM STATE
   * ==========================================================
   */
  const [
    formData,
    setFormData,
  ] =
    useState(
      createInitialForm
    );


  /*
   * The generated plan returned by our Express backend.
   *
   * null means:
   *
   * the traveler has not generated a plan yet.
   */
  const [
    generatedPlan,
    setGeneratedPlan,
  ] =
    useState(null);


  /*
   * While Groq is generating the plan, the Generate button is
   * disabled.
   *
   * This prevents repeated clicks from creating several AI plans
   * accidentally.
   */
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
   * Today's date is used only as a frontend convenience so the
   * date picker does not encourage obviously old trip dates.
   *
   * Backend validation remains the real security boundary.
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
   * NORMAL FORM INPUTS
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


    /*
     * Remove an older API/form error as soon as the traveler
     * starts correcting the form.
     */
    if (
      errorMessage
    ) {
      setErrorMessage('');
    }
  }


  /*
   * ==========================================================
   * INTEREST CHECKBOXES
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
   * FRONTEND FORM VALIDATION
   * ==========================================================
   *
   * This gives the traveler fast feedback.
   *
   * The backend independently validates all of these values
   * again because frontend validation can be bypassed.
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
   * GENERATE THE REAL AI PLAN
   * ==========================================================
   *
   * React sends only planner input.
   *
   * The backend then:
   *
   * - identifies the logged-in traveler,
   * - checks PremiumMembership,
   * - calls Groq,
   * - searches real hotels,
   * - checks availability,
   * - saves the final AI draft in MongoDB.
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
       * Move the browser back near the top so the traveler sees
       * the generated summary immediately.
       */
      window.scrollTo({
        top:
          0,

        behavior:
          'smooth',
      });
    } catch (error) {
      setErrorMessage(
        getErrorMessage(
          error
        )
      );
    } finally {
      setIsGenerating(false);
    }
  }


  /*
   * ----------------------------------------------------------
   * VIEW & BOOK
   * ----------------------------------------------------------
   *
   * This does NOT create a Booking.
   *
   * We only open Kusum's existing HotelDetailsPage and provide
   * useful booking-form defaults.
   *
   * The traveler still chooses the real room and confirms the
   * booking through the existing booking/payment flow.
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
   * Clear only the generated result.
   *
   * We intentionally keep the existing form values so the user
   * can make a small change and generate another version.
   */
  function handlePlanAnotherTrip() {
    setGeneratedPlan(null);

    setErrorMessage('');


    window.scrollTo({
      top:
        0,

      behavior:
        'smooth',
    });
  }


  /*
   * ==========================================================
   * GENERATED RESULT STATE
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
        {/* ----------------------------------------------------
            RESULT HEADER
           ---------------------------------------------------- */}
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
              className="shrink-0 rounded-lg border border-[#BFD9CD] bg-white px-4 py-2.5 text-sm font-semibold text-[#0F6B4D] transition hover:bg-[#EEF7F2]"
            >
              Plan Another Trip
            </button>
          </div>
        </section>


        {/* ----------------------------------------------------
            SOURCE EXPLANATION
           ----------------------------------------------------

            This is useful both for the traveler and for viva.

            It clearly explains which values come from AI and
            which values come from Ghuraghuri itself.
        */}
        <section className="mt-5 rounded-xl border border-[#DCE5E0] bg-[#F7FAF8] px-5 py-4">
          <p className="text-sm leading-6 text-[#536159]">
            <span className="font-bold text-[#17211D]">
              How this plan works:
            </span>{' '}
            places and food/transport/activity costs are AI estimates.
            Hotel names, prices and availability come from real
            Ghuraghuri hotel data.
          </p>
        </section>


        {/* ----------------------------------------------------
            DAY-BY-DAY ITINERARY
           ---------------------------------------------------- */}
        <section className="mt-8">
          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0F6B4D]">
              Your Itinerary
            </p>

            <h2 className="mt-1 text-2xl font-bold text-[#17211D]">
              Day-by-day plan
            </h2>
          </div>

          <div className="space-y-5">
            {
              generatedPlan
                .days
                .map(
                  (
                    day
                  ) => (
                    <article
                      key={
                        day.day
                      }
                      className="overflow-hidden rounded-2xl border border-[#DCE5E0] bg-white shadow-sm"
                    >
                      {/* Day heading */}
                      <div className="border-b border-[#E5ECE8] bg-[#F7FAF8] px-6 py-5">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-bold text-[#0F6B4D]">
                              Day{' '}
                              {
                                day.day
                              }
                            </p>

                            <h3 className="mt-1 text-xl font-bold text-[#17211D]">
                              {
                                day.startArea
                              }
                              {' → '}
                              {
                                day.endArea
                              }
                            </h3>
                          </div>

                          <p className="text-sm font-semibold text-[#66756D]">
                            {
                              formatDate(
                                day.date
                              )
                            }
                          </p>
                        </div>
                      </div>


                      <div className="grid gap-6 p-6 lg:grid-cols-[1fr_0.9fr]">
                        {/* ---------------- PLACES ---------------- */}
                        <div>
                          <h4 className="text-sm font-bold uppercase tracking-wide text-[#536159]">
                            Places to visit
                          </h4>

                          <ol className="mt-4 space-y-3">
                            {
                              day.places.map(
                                (
                                  place,
                                  index
                                ) => (
                                  <li
                                    key={`${day.day}-${place}-${index}`}
                                    className="flex items-start gap-3"
                                  >
                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#DCEFE4] text-xs font-bold text-[#0F6B4D]">
                                      {
                                        index +
                                        1
                                      }
                                    </span>

                                    <span className="pt-0.5 text-sm leading-6 text-[#334139]">
                                      {
                                        place
                                      }
                                    </span>
                                  </li>
                                )
                              )
                            }
                          </ol>


                          {
                            day.requiresStay &&
                            day.stayArea
                              ? (
                                  <div className="mt-5 rounded-lg bg-[#F3F6F4] px-4 py-3">
                                    <p className="text-xs font-bold uppercase tracking-wide text-[#66756D]">
                                      Overnight area
                                    </p>

                                    <p className="mt-1 text-sm font-semibold text-[#17211D]">
                                      {
                                        day.stayArea
                                      }
                                    </p>
                                  </div>
                                )
                              : null
                          }
                        </div>


                        {/* ------------- ACCOMMODATION ------------ */}
                        <div>
                          <h4 className="text-sm font-bold uppercase tracking-wide text-[#536159]">
                            Accommodation
                          </h4>


                          {
                            day
                              .accommodationType ===
                              'hotel' &&
                            day.hotel
                              ? (
                                  <div className="mt-4 overflow-hidden rounded-xl border border-[#DCE5E0]">
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
                                                  .name
                                              }
                                              className="h-36 w-full object-cover"
                                            />
                                          )
                                        : (
                                            <div className="flex h-28 items-center justify-center bg-[#EEF7F2] px-4 text-center text-sm font-semibold text-[#66756D]">
                                              Ghuraghuri Hotel
                                            </div>
                                          )
                                    }

                                    <div className="p-4">
                                      <div className="inline-flex rounded-full bg-[#E7F4EC] px-2.5 py-1 text-xs font-bold text-[#0F6B4D]">
                                        Real Ghuraghuri Hotel
                                      </div>

                                      <h5 className="mt-3 text-lg font-bold text-[#17211D]">
                                        {
                                          day
                                            .hotel
                                            .name
                                        }
                                      </h5>

                                      <p className="mt-1 text-sm text-[#66756D]">
                                        {
                                          day
                                            .hotel
                                            .city
                                        }
                                      </p>

                                      {
                                        day
                                          .hotel
                                          .address
                                          ? (
                                              <p className="mt-1 text-xs leading-5 text-[#7A8881]">
                                                {
                                                  day
                                                    .hotel
                                                    .address
                                                }
                                              </p>
                                            )
                                          : null
                                      }

                                      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                                        <div>
                                          <p className="text-xs font-medium text-[#66756D]">
                                            From
                                          </p>

                                          <p className="text-lg font-bold text-[#0F6B4D]">
                                            {
                                              formatMoney(
                                                day
                                                  .hotel
                                                  .startingPrice
                                              )
                                            }
                                            <span className="text-xs font-medium text-[#66756D]">
                                              {' '}
                                              / room / night
                                            </span>
                                          </p>
                                        </div>

                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleViewHotel(
                                              day
                                            )
                                          }
                                          className="rounded-lg bg-[#0F6B4D] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0A523B]"
                                        >
                                          View & Book
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )
                              : null
                          }


                          {
                            day
                              .accommodationType ===
                              'self-arranged'
                              ? (
                                  <div className="mt-4 rounded-xl border border-dashed border-[#C9D5CF] bg-[#F7FAF8] p-5">
                                    <p className="font-bold text-[#17211D]">
                                      Camping / Self-arranged stay
                                    </p>

                                    <p className="mt-2 text-sm leading-6 text-[#66756D]">
                                      No suitable Ghuraghuri hotel was found
                                      for this overnight area.
                                    </p>

                                    <p className="mt-3 text-sm font-semibold text-[#536159]">
                                      Accommodation included in estimate:{' '}
                                      <span className="text-[#0F6B4D]">
                                        BDT 0
                                      </span>
                                    </p>
                                  </div>
                                )
                              : null
                          }


                          {
                            day
                              .accommodationType ===
                              'none'
                              ? (
                                  <div className="mt-4 rounded-xl bg-[#F7FAF8] p-5">
                                    <p className="font-semibold text-[#536159]">
                                      No overnight accommodation is required
                                      for this day.
                                    </p>
                                  </div>
                                )
                              : null
                          }
                        </div>
                      </div>


                      {/* ---------------- COSTS ---------------- */}
                      <div className="border-t border-[#E5ECE8] bg-[#FBFCFB] px-6 py-5">
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                          <div>
                            <p className="text-xs font-medium text-[#7A8881]">
                              Food estimate
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
                            <p className="text-xs font-medium text-[#7A8881]">
                              Transport estimate
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
                            <p className="text-xs font-medium text-[#7A8881]">
                              Activities estimate
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
                            <p className="text-xs font-medium text-[#7A8881]">
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

                          <div className="rounded-lg bg-[#EAF5EF] px-3 py-2">
                            <p className="text-xs font-medium text-[#567067]">
                              Day total
                            </p>

                            <p className="mt-1 font-bold text-[#0F6B4D]">
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
                    </article>
                  )
                )
            }
          </div>
        </section>


        {/* ----------------------------------------------------
            BUDGET SUMMARY
           ---------------------------------------------------- */}
        <section className="mt-8 rounded-2xl border border-[#DCE5E0] bg-white p-6 shadow-sm lg:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0F6B4D]">
                Budget Summary
              </p>

              <h2 className="mt-1 text-2xl font-bold text-[#17211D]">
                Estimated trip cost
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#66756D]">
                AI-generated food, transport and activity costs are
                estimates. Hotel accommodation uses real Ghuraghuri
                pricing from the matched available hotel.
              </p>
            </div>

            <div className="grid min-w-0 gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-[#F7FAF8] px-5 py-4">
                <p className="text-xs font-medium uppercase tracking-wide text-[#66756D]">
                  Your Budget
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
          </div>
        </section>
      </div>
    );
  }


  /*
   * ==========================================================
   * PLANNER FORM STATE
   * ==========================================================
   */
  return (
    <div className="mx-auto w-full max-w-5xl">
      {/* ------------------------------------------------------
          PAGE INTRODUCTION
         ------------------------------------------------------ */}
      <div className="mb-7">
        <div className="inline-flex rounded-full bg-[#DCEFE4] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#0F6B4D]">
          Premium AI Planner
        </div>

        <h1 className="mt-3 text-3xl font-bold text-[#17211D]">
          AI Travel Planner
        </h1>

        <p className="mt-2 max-w-2xl text-base leading-7 text-[#66756D]">
          Tell Ghuraghuri where you want to go, your budget and
          interests. Our AI will create a day-by-day draft and
          match overnight stays with real Ghuraghuri hotels.
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
              placeholder="e.g. Dhaka"
              maxLength={120}
              className="w-full rounded-lg border border-[#CCD8D2] bg-white px-4 py-3 text-sm text-[#17211D] outline-none transition placeholder:text-[#98A49E] focus:border-[#0F6B4D] focus:ring-2 focus:ring-[#DCEFE4]"
            />

            <p className="mt-1.5 text-xs text-[#7A8881]">
              Where will your trip begin?
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
              placeholder="e.g. Cox's Bazar"
              maxLength={120}
              className="w-full rounded-lg border border-[#CCD8D2] bg-white px-4 py-3 text-sm text-[#17211D] outline-none transition placeholder:text-[#98A49E] focus:border-[#0F6B4D] focus:ring-2 focus:ring-[#DCEFE4]"
            />

            <p className="mt-1.5 text-xs text-[#7A8881]">
              Main destination for the generated trip.
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
              Used to create real day dates and hotel stay dates.
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

            <div className="relative">
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
                className="w-full rounded-lg border border-[#CCD8D2] bg-white px-4 py-3 pr-16 text-sm text-[#17211D] outline-none transition focus:border-[#0F6B4D] focus:ring-2 focus:ring-[#DCEFE4]"
              />

              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#7A8881]">
                days
              </span>
            </div>
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
              Groq will try to keep the draft reasonably near this
              amount.
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
            also check real hotel information before displaying the
            result.
          </p>
        </div>
      </form>
    </div>
  );
}


export default AITravelPlannerPage;