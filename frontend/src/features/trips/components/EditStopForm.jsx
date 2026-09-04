import {
  useState,
} from 'react';

import {
  updateStop,
} from '../api/tripApi';

import LocationPicker
  from './LocationPicker';

function EditStopForm({
  tripId,
  dayId,
  stop,
  onStopUpdated,
  onCancel,
  isMapPicking = false,
  onStartMapPicking,
  onStopMapPicking,
}) {
  const [
    formData,
    setFormData,
  ] = useState({
    placeName:
      stop.placeName || '',

    description:
      stop.description || '',

    visitTime:
      stop.visitTime || '',

    estimatedDurationMinutes:
      stop.estimatedDurationMinutes ??
      '',
  });

  const [
    location,
    setLocation,
  ] = useState({
    latitude:
      stop.latitude ?? '',

    longitude:
      stop.longitude ?? '',

    displayName:
      stop.latitude !==
          undefined &&
      stop.latitude !== null &&
      stop.longitude !==
          undefined &&
      stop.longitude !== null
        ? `Saved location for ${
            stop.placeName ||
            'this destination'
          }`
        : '',

    source:
      stop.latitude !==
          undefined &&
      stop.latitude !== null &&
      stop.longitude !==
          undefined &&
      stop.longitude !== null
        ? 'saved'
        : '',
  });

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('');

  function handleChange(event) {
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
  }

  function handleLocationChange(
    nextLocation
  ) {
    setLocation(
      nextLocation
    );

    setErrorMessage('');
  }

  function handleStartMapPicking() {
    onStartMapPicking?.({
      currentLocation:
        location,

      onLocationPicked:
        handleLocationChange,
    });
  }

  function handleStopMapPicking() {
    onStopMapPicking?.();
  }

  function handleCancel() {
    handleStopMapPicking();
    onCancel();
  }

  async function handleSubmit(
    event
  ) {
    event.preventDefault();

    const normalizedPlaceName =
      formData.placeName.trim();

    if (
      normalizedPlaceName.length <
      2
    ) {
      setErrorMessage(
        'Enter a name for this destination.'
      );

      return;
    }

    if (
      location.latitude ===
        '' ||
      location.longitude ===
        ''
    ) {
      setErrorMessage(
        'Choose a location before saving this destination.'
      );

      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const result =
        await updateStop(
          tripId,
          dayId,
          stop._id,
          {
            placeName:
              normalizedPlaceName,

            description:
              formData.description.trim(),

            latitude:
              location.latitude,

            longitude:
              location.longitude,

            visitTime:
              formData.visitTime,

            estimatedDurationMinutes:
              formData
                .estimatedDurationMinutes ||
              0,
          }
        );

      handleStopMapPicking();

      onStopUpdated(
        result.data
      );
    } catch (error) {
      setErrorMessage(
        error.response?.data
          ?.message ||
          'Unable to update the stop.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const locationSelected =
    location.latitude !== '' &&
    location.longitude !== '';

  const validPlaceName =
    formData.placeName
      .trim().length >= 2;

  return (
    <form
      onSubmit={
        handleSubmit
      }
      className="mt-3 min-w-0 rounded-lg border border-[#CBD8D1] bg-[#F7FAF8] p-3"
    >
      {errorMessage && (
        <div
          className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          role="alert"
        >
          {errorMessage}
        </div>
      )}

      <div className="min-w-0 space-y-4">
        <div>
          <label
            htmlFor={`edit-place-${stop._id}`}
            className="text-xs font-semibold text-[#44524B]"
          >
            Stop name
          </label>

          <input
            id={`edit-place-${stop._id}`}
            name="placeName"
            type="text"
            required
            value={
              formData.placeName
            }
            onChange={
              handleChange
            }
            placeholder="e.g. Laboni Beach"
            className="mt-1 min-w-0 w-full rounded-lg border border-[#CBD8D1] bg-white px-3 py-2 text-sm outline-none focus:border-[#0F6B4D]"
          />

          <p className="mt-1.5 text-xs leading-5 text-[#7B8982]">
            This name appears in the
            itinerary and on its map
            pin.
          </p>
        </div>

        <div className="min-w-0 rounded-xl border border-[#DCE5E0] bg-white p-3">
          <LocationPicker
            value={
              location
            }
            onChange={
              handleLocationChange
            }
            searchSuggestion={
              formData.placeName
            }
            idPrefix={
              `edit-stop-${stop._id}`
            }
            isMapPicking={
              isMapPicking
            }
            onStartMapPicking={
              handleStartMapPicking
            }
            onStopMapPicking={
              handleStopMapPicking
            }
          />
        </div>

        <div>
          <label
            htmlFor={`edit-description-${stop._id}`}
            className="text-xs font-semibold text-[#44524B]"
          >
            Description
          </label>

          <textarea
            id={`edit-description-${stop._id}`}
            name="description"
            rows="2"
            value={
              formData.description
            }
            onChange={
              handleChange
            }
            placeholder="Optional notes about this stop"
            className="mt-1 w-full resize-none rounded-lg border border-[#CBD8D1] bg-white px-3 py-2 text-sm outline-none focus:border-[#0F6B4D]"
          />
        </div>

        <div className="grid gap-3">
          <div>
            <label
              htmlFor={`edit-time-${stop._id}`}
              className="text-xs font-semibold text-[#44524B]"
            >
              Visit time
            </label>

            <div className="mt-1 flex min-w-0 rounded-lg border border-[#CBD8D1] bg-white px-3 py-2 focus-within:border-[#0F6B4D]">
              <input
                id={`edit-time-${stop._id}`}
                name="visitTime"
                type="time"
                value={
                  formData.visitTime
                }
                onChange={
                  handleChange
                }
                className="block min-w-0 w-full border-0 bg-transparent p-0 text-sm outline-none"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor={`edit-duration-${stop._id}`}
              className="text-xs font-semibold text-[#44524B]"
            >
              Duration (minutes)
            </label>

            <input
              id={`edit-duration-${stop._id}`}
              name="estimatedDurationMinutes"
              type="number"
              min="0"
              value={
                formData
                  .estimatedDurationMinutes
              }
              onChange={
                handleChange
              }
              placeholder="60"
              className="mt-1 min-w-0 w-full rounded-lg border border-[#CBD8D1] bg-white px-3 py-2 text-sm outline-none focus:border-[#0F6B4D]"
            />
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={
              handleCancel
            }
            disabled={
              isSubmitting
            }
            className="rounded-lg border border-[#CBD8D1] bg-white px-3 py-2 text-sm font-semibold text-[#44524B] transition hover:bg-[#F3F6F4] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={
              isSubmitting ||
              !validPlaceName ||
              !locationSelected
            }
            className="rounded-lg bg-[#0F6B4D] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#0A523B] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? 'Saving...'
              : 'Save Changes'}
          </button>
        </div>
      </div>
    </form>
  );
}

export default EditStopForm;