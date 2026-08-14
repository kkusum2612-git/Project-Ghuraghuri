import {
  useState,
} from 'react';

import {
  addStop,
} from '../api/tripApi';

const INITIAL_FORM = {
  placeName: '',
  description: '',
  latitude: '',
  longitude: '',
  visitTime: '',
  estimatedDurationMinutes:
    '',
};

function AddStopForm({
  tripId,
  dayId,
  onStopAdded,
}) {
  const [
    formData,
    setFormData,
  ] = useState(
    INITIAL_FORM
  );

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

  async function handleSubmit(
    event
  ) {
    event.preventDefault();

    if (!dayId) {
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
              formData.placeName,

            description:
              formData.description,

            latitude:
              formData.latitude,

            longitude:
              formData.longitude,

            visitTime:
              formData.visitTime,

            estimatedDurationMinutes:
              formData
                .estimatedDurationMinutes ||
              0,
          }
        );

      setFormData(
        INITIAL_FORM
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
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="mt-4 space-y-4">
        <div>
          <label
            htmlFor="placeName"
            className="text-sm font-semibold text-[#44524B]"
          >
            Place name
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
            placeholder="e.g. Ratargul Swamp Forest"
            className="mt-1 w-full rounded-lg border border-[#CBD8D1] bg-white px-3 py-2 text-sm outline-none focus:border-[#0F6B4D]"
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

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="latitude"
              className="text-sm font-semibold text-[#44524B]"
            >
              Latitude
            </label>

            <input
              id="latitude"
              name="latitude"
              type="number"
              step="any"
              required
              value={
                formData.latitude
              }
              onChange={
                handleChange
              }
              placeholder="24.89"
              className="mt-1 w-full rounded-lg border border-[#CBD8D1] bg-white px-3 py-2 text-sm outline-none focus:border-[#0F6B4D]"
            />
          </div>

          <div>
            <label
              htmlFor="longitude"
              className="text-sm font-semibold text-[#44524B]"
            >
              Longitude
            </label>

            <input
              id="longitude"
              name="longitude"
              type="number"
              step="any"
              required
              value={
                formData.longitude
              }
              onChange={
                handleChange
              }
              placeholder="91.87"
              className="mt-1 w-full rounded-lg border border-[#CBD8D1] bg-white px-3 py-2 text-sm outline-none focus:border-[#0F6B4D]"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="visitTime"
              className="text-sm font-semibold text-[#44524B]"
            >
              Visit time
            </label>

            <div className="mt-1 flex w-full min-w-0 rounded-lg border border-[#CBD8D1] bg-white px-3 py-2 focus-within:border-[#0F6B4D]">
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
                className="block w-full min-w-0 border-0 bg-transparent p-0 text-sm outline-none"
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
              className="mt-1 w-full rounded-lg border border-[#CBD8D1] bg-white px-3 py-2 text-sm outline-none focus:border-[#0F6B4D]"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={
            isSubmitting ||
            !dayId
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