import {
  useState,
} from 'react';

import {
  updateStop,
} from '../api/tripApi';

function EditStopForm({
  tripId,
  dayId,
  stop,
  onStopUpdated,
  onCancel,
}) {
  const [
    formData,
    setFormData,
  ] = useState({
    placeName:
      stop.placeName || '',

    description:
      stop.description || '',

    latitude:
      stop.latitude ?? '',

    longitude:
      stop.longitude ?? '',

    visitTime:
      stop.visitTime || '',

    estimatedDurationMinutes:
      stop.estimatedDurationMinutes ??
      '',
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

  async function handleSubmit(
    event
  ) {
    event.preventDefault();

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

  return (
    <form
      onSubmit={
        handleSubmit
      }
      className="mt-3 rounded-lg border border-[#CBD8D1] bg-[#F7FAF8] p-3"
    >
      {errorMessage && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label
            htmlFor={`edit-place-${stop._id}`}
            className="text-xs font-semibold text-[#44524B]"
          >
            Place name
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
            className="mt-1 w-full rounded-lg border border-[#CBD8D1] bg-white px-3 py-2 text-sm outline-none focus:border-[#0F6B4D]"
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
            className="mt-1 w-full resize-none rounded-lg border border-[#CBD8D1] bg-white px-3 py-2 text-sm outline-none focus:border-[#0F6B4D]"
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <label
              htmlFor={`edit-latitude-${stop._id}`}
              className="text-xs font-semibold text-[#44524B]"
            >
              Latitude
            </label>

            <input
              id={`edit-latitude-${stop._id}`}
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
              className="mt-1 w-full rounded-lg border border-[#CBD8D1] bg-white px-3 py-2 text-sm outline-none focus:border-[#0F6B4D]"
            />
          </div>

          <div>
            <label
              htmlFor={`edit-longitude-${stop._id}`}
              className="text-xs font-semibold text-[#44524B]"
            >
              Longitude
            </label>

            <input
              id={`edit-longitude-${stop._id}`}
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
              className="mt-1 w-full rounded-lg border border-[#CBD8D1] bg-white px-3 py-2 text-sm outline-none focus:border-[#0F6B4D]"
            />
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <label
              htmlFor={`edit-time-${stop._id}`}
              className="text-xs font-semibold text-[#44524B]"
            >
              Visit time
            </label>

            <div className="mt-1 flex w-full min-w-0 rounded-lg border border-[#CBD8D1] bg-white px-3 py-2 focus-within:border-[#0F6B4D]">
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
                className="block w-full min-w-0 border-0 bg-transparent p-0 text-sm outline-none"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor={`edit-duration-${stop._id}`}
              className="text-xs font-semibold text-[#44524B]"
            >
              Duration
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
              className="mt-1 w-full rounded-lg border border-[#CBD8D1] bg-white px-3 py-2 text-sm outline-none focus:border-[#0F6B4D]"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={
              onCancel
            }
            disabled={
              isSubmitting
            }
            className="rounded-lg border border-[#CBD8D1] bg-white px-3 py-2 text-sm font-semibold text-[#44524B] hover:bg-[#F7FAF8]"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={
              isSubmitting
            }
            className="rounded-lg bg-[#0F6B4D] px-3 py-2 text-sm font-semibold text-white hover:bg-[#0A523B] disabled:cursor-not-allowed disabled:opacity-60"
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