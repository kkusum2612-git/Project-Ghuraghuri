import {
  useEffect,
  useState,
} from 'react';

import {
  useNavigate,
  useParams,
} from 'react-router-dom';

import ConfirmModal
  from '../../../components/common/ConfirmModal';

import {
  createTrip,
  getTripById,
  updateTrip,
} from '../api/tripApi';

function createInitialForm() {
  return {
    tripName: '',
    destinationName: '',
    startDate: '',
    endDate: '',
    coverPhoto: '',
  };
}

function formatDateForInput(
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

  return date
    .toISOString()
    .slice(0, 10);
}

function TripFormPage() {
  const { tripId } =
    useParams();

  const navigate =
    useNavigate();

  const isEditMode =
    Boolean(tripId);

  const [
    formData,
    setFormData,
  ] = useState(
    createInitialForm
  );

  const [
    isLoading,
    setIsLoading,
  ] = useState(
    isEditMode
  );

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    formError,
    setFormError,
  ] = useState('');

  /*
   * This state stores information about
   * a potentially destructive trip-date
   * update.
   *
   * It replaces window.confirm().
   *
   * Example:
   *
   * A 5-day trip is shortened to 3 days.
   * Day 4 and Day 5 contain stops.
   *
   * Backend returns HTTP 409 and tells
   * the frontend which data would be
   * removed.
   *
   * We show that information inside our
   * custom ConfirmModal.
   */
  const [
    dayRemovalConfirmation,
    setDayRemovalConfirmation,
  ] = useState(null);

  useEffect(() => {
    if (!isEditMode) {
      return undefined;
    }

    let ignoreResult = false;

    async function loadTrip() {
      setIsLoading(true);
      setFormError('');

      try {
        const result =
          await getTripById(
            tripId
          );

        if (ignoreResult) {
          return;
        }

        const trip =
          result?.data;

        if (!trip) {
          throw new Error(
            'Trip information was not returned.'
          );
        }

        // Only the trip owner can open the basic-details edit form.
        if (
          trip.accessType !==
          'owner'
        ) {
          navigate(
            `/trips/${tripId}/plan`,
            {
              replace: true,
            }
          );

          return;
        }

        setFormData({
          tripName:
            trip.tripName ?? '',

          destinationName:
            trip.destination
              ?.name ?? '',

          startDate:
            formatDateForInput(
              trip.startDate
            ),

          endDate:
            formatDateForInput(
              trip.endDate
            ),

          coverPhoto:
            trip.coverPhoto ?? '',
        });
      } catch (error) {
        if (!ignoreResult) {
          setFormError(
            error.response?.data
              ?.message ||
              error.message ||
              'Unable to load this trip.'
          );
        }
      } finally {
        if (!ignoreResult) {
          setIsLoading(false);
        }
      }
    }

    void loadTrip();

    return () => {
      ignoreResult = true;
    };
  }, [
    isEditMode,
    navigate,
    tripId,
  ]);

  function updateField(
    event
  ) {
    const {
      name,
      value,
    } = event.target;

    setFormData(
      (current) => ({
        ...current,
        [name]: value,
      })
    );

    /*
     * Clear an old form error when the
     * traveler starts correcting input.
     */
    if (formError) {
      setFormError('');
    }
  }

  function validateForm() {
    if (
      formData.tripName
        .trim().length < 2
    ) {
      return 'Trip name must contain at least 2 characters.';
    }

    if (
      !formData.destinationName
        .trim()
    ) {
      return 'Destination is required.';
    }

    if (
      !formData.startDate
    ) {
      return 'Start date is required.';
    }

    if (
      !formData.endDate
    ) {
      return 'End date is required.';
    }

    if (
      new Date(
        formData.endDate
      ) <
      new Date(
        formData.startDate
      )
    ) {
      return 'End date cannot be before the start date.';
    }

    return '';
  }

  /*
   * Build one clean object for the API.
   *
   * Both normal updates and confirmed
   * destructive updates reuse this same
   * payload.
   */
  function createPayload() {
    return {
      tripName:
        formData.tripName.trim(),

      destination: {
        name:
          formData.destinationName
            .trim(),
      },

      startDate:
        formData.startDate,

      endDate:
        formData.endDate,

      coverPhoto:
        formData.coverPhoto.trim(),
    };
  }

  /*
   * Navigate back to My Trips and pass
   * the success message through React
   * Router state.
   *
   * TripDashboardPage reads this message
   * and displays SuccessToast.
   */
  function returnToDashboardWithSuccess(
    message
  ) {
    navigate(
      '/trips',
      {
        state: {
          successMessage:
            message,
        },
      }
    );
  }

  /*
   * Convert the backend's HTTP 409 data
   * into a structure that is convenient
   * for our confirmation modal.
   */
  function prepareDayRemovalConfirmation(
    confirmationData,
    payload
  ) {
    const removedDays =
      Array.isArray(
        confirmationData
          ?.removedDays
      )
        ? confirmationData
            .removedDays
        : [];

    const removedStopCount =
      Number(
        confirmationData
          ?.removedStopCount
      ) || 0;

    const removedDayCount =
      Number(
        confirmationData
          ?.removedDayCount
      ) ||
      removedDays.length;

    setDayRemovalConfirmation({
      payload,
      removedDays,
      removedStopCount,
      removedDayCount,
    });
  }

  async function handleSubmit(
    event
  ) {
    event.preventDefault();

    const validationError =
      validateForm();

    if (validationError) {
      setFormError(
        validationError
      );

      return;
    }

    const payload =
      createPayload();

    setIsSubmitting(true);
    setFormError('');

    try {
      if (isEditMode) {
        try {
          await updateTrip(
            tripId,
            payload
          );
        } catch (error) {
          const responseData =
            error.response?.data;

          const confirmationData =
            responseData?.data;

          const requiresConfirmation =
            error.response?.status ===
              409 &&
            confirmationData
              ?.requiresConfirmation ===
              true;

          /*
           * A normal API failure should
           * continue to the outer catch.
           *
           * Only the special 409 response
           * opens the destructive-change
           * confirmation modal.
           */
          if (
            !requiresConfirmation
          ) {
            throw error;
          }

          prepareDayRemovalConfirmation(
            confirmationData,
            payload
          );

          return;
        }

        returnToDashboardWithSuccess(
          `Trip "${payload.tripName}" updated successfully.`
        );

        return;
      }

      await createTrip(
        payload
      );

      returnToDashboardWithSuccess(
        `Trip "${payload.tripName}" created successfully.`
      );
    } catch (error) {
      setFormError(
        error.response?.data
          ?.message ||
          `Unable to ${
            isEditMode
              ? 'update'
              : 'create'
          } this trip.`
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  /*
   * This runs only after the traveler
   * confirms the destructive date
   * shortening from our custom modal.
   */
  async function handleConfirmDayRemoval() {
    if (
      !dayRemovalConfirmation
    ) {
      return;
    }

    const {
      payload,
    } =
      dayRemovalConfirmation;

    setIsSubmitting(true);
    setFormError('');

    try {
      await updateTrip(
        tripId,
        {
          ...payload,

          /*
           * This tells the backend that
           * the traveler explicitly
           * accepted the data removal.
           */
          confirmDayRemoval:
            true,
        }
      );

      setDayRemovalConfirmation(
        null
      );

      returnToDashboardWithSuccess(
        `Trip "${payload.tripName}" updated successfully.`
      );
    } catch (error) {
      setDayRemovalConfirmation(
        null
      );

      setFormError(
        error.response?.data
          ?.message ||
          'Unable to update this trip.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCancelDayRemoval() {
    if (isSubmitting) {
      return;
    }

    setDayRemovalConfirmation(
      null
    );
  }

  function handleCancel() {
    if (isSubmitting) {
      return;
    }

    setDayRemovalConfirmation(
      null
    );

    navigate(
      '/trips'
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm font-medium text-[#66756D]">
          Loading trip...
        </p>
      </div>
    );
  }

  const removedDays =
    dayRemovalConfirmation
      ?.removedDays || [];

  const removedDayCount =
    dayRemovalConfirmation
      ?.removedDayCount || 0;

  const removedStopCount =
    dayRemovalConfirmation
      ?.removedStopCount || 0;

  return (
    <>
      <div className="mx-auto max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold text-[#17211D] md:text-3xl">
            {isEditMode
              ? 'Edit Trip'
              : 'Create New Trip'}
          </h1>

          <p className="mt-1 text-sm text-[#66756D]">
            {isEditMode
              ? 'Update your trip information'
              : 'Add the basic details for your new journey'}
          </p>
        </div>

        <form
          onSubmit={
            handleSubmit
          }
          className="mt-7 rounded-xl border border-[#DCE5E0] bg-white p-6 shadow-sm md:p-8"
        >
          {formError && (
            <div
              className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              role="alert"
            >
              {formError}
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label
                htmlFor="tripName"
                className="mb-2 block text-sm font-semibold text-[#17211D]"
              >
                Trip Name
              </label>

              <input
                id="tripName"
                name="tripName"
                type="text"
                value={
                  formData.tripName
                }
                onChange={
                  updateField
                }
                placeholder="e.g. Cox's Bazar Escape"
                className="w-full rounded-lg border border-[#CAD7D0] bg-white px-4 py-3 text-sm text-[#17211D] outline-none transition placeholder:text-[#97A39D] focus:border-[#0F6B4D] focus:ring-2 focus:ring-[#DDF1E5]"
                required
              />
            </div>

            <div>
              <label
                htmlFor="destinationName"
                className="mb-2 block text-sm font-semibold text-[#17211D]"
              >
                Destination
              </label>

              <input
                id="destinationName"
                name="destinationName"
                type="text"
                value={
                  formData
                    .destinationName
                }
                onChange={
                  updateField
                }
                placeholder="e.g. Cox's Bazar, Bangladesh"
                className="w-full rounded-lg border border-[#CAD7D0] bg-white px-4 py-3 text-sm text-[#17211D] outline-none transition placeholder:text-[#97A39D] focus:border-[#0F6B4D] focus:ring-2 focus:ring-[#DDF1E5]"
                required
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="startDate"
                  className="mb-2 block text-sm font-semibold text-[#17211D]"
                >
                  Start Date
                </label>

                <input
                  id="startDate"
                  name="startDate"
                  type="date"
                  value={
                    formData.startDate
                  }
                  onChange={
                    updateField
                  }
                  className="w-full rounded-lg border border-[#CAD7D0] bg-white px-4 py-3 text-sm text-[#17211D] outline-none transition focus:border-[#0F6B4D] focus:ring-2 focus:ring-[#DDF1E5]"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="endDate"
                  className="mb-2 block text-sm font-semibold text-[#17211D]"
                >
                  End Date
                </label>

                <input
                  id="endDate"
                  name="endDate"
                  type="date"
                  min={
                    formData
                      .startDate ||
                    undefined
                  }
                  value={
                    formData.endDate
                  }
                  onChange={
                    updateField
                  }
                  className="w-full rounded-lg border border-[#CAD7D0] bg-white px-4 py-3 text-sm text-[#17211D] outline-none transition focus:border-[#0F6B4D] focus:ring-2 focus:ring-[#DDF1E5]"
                  required
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="coverPhoto"
                className="mb-2 block text-sm font-semibold text-[#17211D]"
              >
                Cover Photo URL

                <span className="ml-1 font-normal text-[#7B8982]">
                  (Optional)
                </span>
              </label>

              <input
                id="coverPhoto"
                name="coverPhoto"
                type="url"
                value={
                  formData.coverPhoto
                }
                onChange={
                  updateField
                }
                placeholder="https://example.com/trip-photo.jpg"
                className="w-full rounded-lg border border-[#CAD7D0] bg-white px-4 py-3 text-sm text-[#17211D] outline-none transition placeholder:text-[#97A39D] focus:border-[#0F6B4D] focus:ring-2 focus:ring-[#DDF1E5]"
              />

              <p className="mt-2 text-xs text-[#7B8982]">
                You can leave this
                empty and add a cover
                photo later.
              </p>
            </div>

            {formData.coverPhoto && (
              <div>
                <p className="mb-2 text-sm font-semibold text-[#17211D]">
                  Cover Preview
                </p>

                <div className="h-52 overflow-hidden rounded-xl border border-[#DCE5E0] bg-[#EEF2F0]">
                  <img
                    src={
                      formData
                        .coverPhoto
                    }
                    alt="Trip cover preview"
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-[#E5ECE8] pt-6 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={
                handleCancel
              }
              disabled={
                isSubmitting
              }
              className="rounded-lg border border-[#CAD7D0] bg-white px-5 py-3 text-sm font-semibold text-[#44524B] transition hover:bg-[#F3F6F4] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                isSubmitting
              }
              className="rounded-lg bg-[#0F6B4D] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0A523B] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting
                ? isEditMode
                  ? 'Saving...'
                  : 'Creating...'
                : isEditMode
                  ? 'Save Changes'
                  : 'Create Trip'}
            </button>
          </div>
        </form>
      </div>

      <ConfirmModal
        isOpen={Boolean(
          dayRemovalConfirmation
        )}
        title="Shorten trip dates?"
        description={
          <p>
            Your new end date
            removes{' '}
            <span className="font-semibold text-[#17211D]">
              {removedDayCount}{' '}
              {removedDayCount === 1
                ? 'day'
                : 'days'}
            </span>{' '}
            from this trip.
          </p>
        }
        warning={
          <div>
            <p className="font-semibold">
              Itinerary data will be
              permanently removed.
            </p>

            {removedDays.length >
              0 && (
              <ul className="mt-2 space-y-1">
                {removedDays.map(
                  (day) => {
                    const stopCount =
                      Number(
                        day.stopCount
                      ) || 0;

                    return (
                      <li
                        key={
                          day.dayNumber
                        }
                      >
                        Day{' '}
                        {day.dayNumber}
                        :{' '}
                        {stopCount}{' '}
                        {stopCount ===
                        1
                          ? 'stop'
                          : 'stops'}
                      </li>
                    );
                  }
                )}
              </ul>
            )}

            <p className="mt-3">
              Total stops being
              removed:{' '}
              <span className="font-bold">
                {
                  removedStopCount
                }
              </span>
            </p>
          </div>
        }
        confirmLabel="Shorten Trip"
        cancelLabel="Keep Current Dates"
        isConfirming={
          isSubmitting
        }
        onCancel={
          handleCancelDayRemoval
        }
        onConfirm={
          handleConfirmDayRemoval
        }
      />
    </>
  );
}

export default TripFormPage;