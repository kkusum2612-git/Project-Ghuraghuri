import {
  useState,
} from 'react';

import {
  addStop,
} from '../api/tripApi';

import LocationPicker
  from './LocationPicker';

const INITIAL_FORM = {
  placeName: '',
  description: '',
  visitTime: '',
  estimatedDurationMinutes:
    '',
};

const INITIAL_LOCATION = {
  latitude: '',
  longitude: '',
  displayName: '',
  source: '',
};

function AddStopForm({
  tripId,
  dayId,
  onStopAdded,
  isMapPicking = false,
  onStartMapPicking,
  onStopMapPicking,
}) {
  const [
    formData,
    setFormData,
  ] = useState(
    INITIAL_FORM
  );

  const [
    location,
    setLocation,
  ] = useState(
    INITIAL_LOCATION
  );

  const [
    locationPickerResetKey,
    setLocationPickerResetKey,
  ] = useState(0);

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

  async function handleSubmit(
    event
  ) {
    event.preventDefault();

    if (!dayId) {
      return;
    }

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
        'Choose a location before adding this destination.'
      );

      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const result =
        await addStop(
          tripId,
          dayId,
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

      setFormData(
        INITIAL_FORM
      );

      setLocation(
        INITIAL_LOCATION
      );

      setLocationPickerResetKey(
        (current) =>
          current + 1
      );

      onStopAdded(
        result.data
      );
    } catch (error) {
      setErrorMessage(
        error.response?.data
          ?.message ||
          'Unable to add the stop.'
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
      className="mt-5 rounded-xl border border-[#DCE5E0] bg-[#F7FAF8] p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-[#17211D]">
          Add Destination
        </h3>

        <span className="text-xs font-medium text-[#66756D]">
          Selected day
        </span>
      </div>

      {errorMessage && (
        <div
          className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          role="alert"
        >
          {errorMessage}
        </div>
      )}

      <div className="mt-4 space-y-5">
        <div>
          <label
            htmlFor="placeName"
            className="text-sm font-semibold text-[#44524B]"
          >
            Stop name
          </label>

          <input
            id="placeName"
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

        <div className="min-w-0 rounded-xl border border-[#DCE5E0] bg-white p-4">
          <LocationPicker
            key={
              locationPickerResetKey
            }
            value={
              location
            }
            onChange={
              handleLocationChange
            }
            searchSuggestion={
              formData.placeName
            }
            idPrefix="add-stop"
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
            htmlFor="description"
            className="text-sm font-semibold text-[#44524B]"
          >
            Description
          </label>

          <textarea
            id="description"
            name="description"
            rows="3"
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
              htmlFor="visitTime"
              className="text-sm font-semibold text-[#44524B]"
            >
              Visit time
            </label>

            <div className="mt-1 flex min-w-0 rounded-lg border border-[#CBD8D1] bg-white px-3 py-2 focus-within:border-[#0F6B4D]">
              <input
                id="visitTime"
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
              htmlFor="estimatedDurationMinutes"
              className="text-sm font-semibold text-[#44524B]"
            >
              Duration (minutes)
            </label>

            <input
              id="estimatedDurationMinutes"
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

        <button
          type="submit"
          disabled={
            isSubmitting ||
            !dayId ||
            !validPlaceName ||
            !locationSelected
          }
          className="w-full rounded-lg bg-[#0F6B4D] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0A523B] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting
            ? 'Adding...'
            : '+ Add Destination'}
        </button>
      </div>
    </form>
  );
}

export default AddStopForm;