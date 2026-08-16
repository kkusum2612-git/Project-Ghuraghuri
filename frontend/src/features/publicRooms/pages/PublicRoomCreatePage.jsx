import {
  useState,
} from 'react';

import {
  useNavigate,
} from 'react-router-dom';

import {
  createPublicRoom,
} from '../api/publicRoomApi';

function PublicRoomCreatePage() {
  const navigate =
    useNavigate();

  // ==========================================================
  // FORM STATE
  // ==========================================================
  //
  // Every input is controlled by React.
  //
  // That means the input's visible value comes from this state,
  // and onChange updates the state whenever the user types.

  const [
    formData,
    setFormData,
  ] = useState({
    roomName: '',
    destination: '',
    startDate: '',
    endDate: '',
    estimatedBudget: '',
    maxMembers: '6',
    description: '',
    interestTags: '',
    coverPhoto: '',
  });

  const [
    formError,
    setFormError,
  ] = useState('');

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  // ==========================================================
  // GENERIC INPUT CHANGE HANDLER
  // ==========================================================
  //
  // All normal text/number/date inputs have a "name".
  //
  // Example:
  //
  // name="destination"
  //
  // So one function can update all fields instead of writing:
  //
  // handleDestinationChange()
  // handleBudgetChange()
  // handleDescriptionChange()
  // etc.

  function handleInputChange(
    event
  ) {
    const {
      name,
      value,
    } = event.target;

    setFormData(
      (currentData) => ({
        ...currentData,

        // [name] means:
        //
        // "Use the value inside the variable called name
        // as the object property to update."
        [name]: value,
      })
    );
  }

  // ==========================================================
  // FORM SUBMISSION
  // ==========================================================

  async function handleSubmit(
    event
  ) {
    // Prevent the browser's traditional HTML form submission,
    // which would reload the whole page.
    event.preventDefault();

    setFormError('');

    // --------------------------------------------------------
    // Simple frontend validation
    // --------------------------------------------------------

    if (
      !formData.roomName.trim() ||
      !formData.destination.trim()
    ) {
      setFormError(
        'Room name and destination are required.'
      );

      return;
    }

    if (
      !formData.startDate ||
      !formData.endDate
    ) {
      setFormError(
        'Start date and end date are required.'
      );

      return;
    }

    if (
      new Date(
        formData.endDate
      ) <
      new Date(
        formData.startDate
      )
    ) {
      setFormError(
        'End date cannot be before the start date.'
      );

      return;
    }

    if (
      Number(
        formData.estimatedBudget
      ) < 0
    ) {
      setFormError(
        'Estimated budget cannot be negative.'
      );

      return;
    }

    const maxMembers =
      Number(
        formData.maxMembers
      );

    if (
      !Number.isInteger(
        maxMembers
      ) ||
      maxMembers < 2
    ) {
      setFormError(
        'Maximum members must be at least 2.'
      );

      return;
    }

    if (
      formData.description
        .trim()
        .length < 10
    ) {
      setFormError(
        'Description must contain at least 10 characters.'
      );

      return;
    }

    // --------------------------------------------------------
    // Convert the comma-separated tag input into an array.
    // --------------------------------------------------------
    //
    // The user types:
    //
    // Beach, Adventure, Food
    //
    // React currently stores that as ONE string.
    //
    // Our MongoDB model expects:
    //
    // [
    //   "Beach",
    //   "Adventure",
    //   "Food"
    // ]
    //
    // split(',') separates the text at commas.
    //
    // trim() removes unnecessary spaces.
    //
    // filter(Boolean) removes empty values.

    const interestTags =
      formData.interestTags
        .split(',')
        .map((tag) =>
          tag.trim()
        )
        .filter(Boolean);

    if (
      interestTags.length === 0
    ) {
      setFormError(
        'Add at least one interest tag.'
      );

      return;
    }

    setIsSubmitting(true);

    try {
      // Build an explicit object for the API.
      //
      // We do NOT send creator or members.
      //
      // The backend handles those securely.
      const roomData = {
        roomName:
          formData.roomName.trim(),

        destination:
          formData.destination.trim(),

        startDate:
          formData.startDate,

        endDate:
          formData.endDate,

        estimatedBudget:
          Number(
            formData.estimatedBudget
          ),

        maxMembers,

        description:
          formData.description.trim(),

        interestTags,

        coverPhoto:
          formData.coverPhoto.trim(),
      };

      const result =
        await createPublicRoom(
          roomData
        );

      const createdRoomId =
        result?.data?._id;

      // If creation succeeded, take the traveler directly to
      // the room they just created.
      if (createdRoomId) {
        navigate(
          `/event-rooms/${createdRoomId}`
        );

        return;
      }

      // This should be rare because a successful backend
      // creation normally returns the new room.
      navigate(
        '/event-rooms'
      );
    } catch (error) {
      setFormError(
        error.response?.data
          ?.message ||
          'Unable to create the public room.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCancel() {
    navigate(
      '/event-rooms'
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      {/* Page heading */}
      <div>
        <button
          type="button"
          onClick={handleCancel}
          className="mb-4 text-sm font-semibold text-[#0F6B4D] hover:underline"
        >
          ← Back to Event Rooms
        </button>

        <h1 className="text-2xl font-bold text-[#17211D] md:text-3xl">
          Create New Room
        </h1>

        <p className="mt-1 text-sm text-[#66756D]">
          Create a public travel
          group that other travelers
          can discover and request to
          join.
        </p>
      </div>

      {formError && (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {formError}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="mt-6 rounded-xl border border-[#DCE5E0] bg-white p-5 shadow-sm md:p-7"
      >
        {/* Basic information section */}
        <section>
          <h2 className="text-lg font-bold text-[#17211D]">
            Room Information
          </h2>

          <p className="mt-1 text-sm text-[#66756D]">
            Tell travelers what this
            trip group is about.
          </p>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className="mb-1.5 block text-sm font-semibold text-[#44524B]">
                Room Name *
              </span>

              <input
                type="text"
                name="roomName"
                value={
                  formData.roomName
                }
                onChange={
                  handleInputChange
                }
                maxLength="100"
                placeholder="e.g. Cox's Bazar Getaway"
                className="w-full rounded-lg border border-[#D6DEDA] px-3 py-2.5 text-sm text-[#17211D] outline-none transition focus:border-[#0F6B4D]"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="mb-1.5 block text-sm font-semibold text-[#44524B]">
                Destination *
              </span>

              <input
                type="text"
                name="destination"
                value={
                  formData.destination
                }
                onChange={
                  handleInputChange
                }
                maxLength="120"
                placeholder="e.g. Cox's Bazar"
                className="w-full rounded-lg border border-[#D6DEDA] px-3 py-2.5 text-sm text-[#17211D] outline-none transition focus:border-[#0F6B4D]"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#44524B]">
                Start Date *
              </span>

              <input
                type="date"
                name="startDate"
                value={
                  formData.startDate
                }
                onChange={
                  handleInputChange
                }
                className="w-full rounded-lg border border-[#D6DEDA] px-3 py-2.5 text-sm text-[#17211D] outline-none transition focus:border-[#0F6B4D]"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#44524B]">
                End Date *
              </span>

              <input
                type="date"
                name="endDate"
                value={
                  formData.endDate
                }
                onChange={
                  handleInputChange
                }
                min={
                  formData.startDate ||
                  undefined
                }
                className="w-full rounded-lg border border-[#D6DEDA] px-3 py-2.5 text-sm text-[#17211D] outline-none transition focus:border-[#0F6B4D]"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#44524B]">
                Estimated Budget (৳)
                *
              </span>

              <input
                type="number"
                name="estimatedBudget"
                min="0"
                value={
                  formData.estimatedBudget
                }
                onChange={
                  handleInputChange
                }
                placeholder="e.g. 12000"
                className="w-full rounded-lg border border-[#D6DEDA] px-3 py-2.5 text-sm text-[#17211D] outline-none transition focus:border-[#0F6B4D]"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#44524B]">
                Maximum Members *
              </span>

              <input
                type="number"
                name="maxMembers"
                min="2"
                max="100"
                step="1"
                value={
                  formData.maxMembers
                }
                onChange={
                  handleInputChange
                }
                className="w-full rounded-lg border border-[#D6DEDA] px-3 py-2.5 text-sm text-[#17211D] outline-none transition focus:border-[#0F6B4D]"
              />

              <span className="mt-1 block text-xs text-[#7A8780]">
                You count as the
                first member.
              </span>
            </label>

            <label className="block md:col-span-2">
              <span className="mb-1.5 block text-sm font-semibold text-[#44524B]">
                Description *
              </span>

              <textarea
                name="description"
                value={
                  formData.description
                }
                onChange={
                  handleInputChange
                }
                rows="5"
                maxLength="2000"
                placeholder="Describe the trip, expected travel style, and the type of travelers you would like to join."
                className="w-full resize-y rounded-lg border border-[#D6DEDA] px-3 py-2.5 text-sm text-[#17211D] outline-none transition focus:border-[#0F6B4D]"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="mb-1.5 block text-sm font-semibold text-[#44524B]">
                Interest Tags *
              </span>

              <input
                type="text"
                name="interestTags"
                value={
                  formData.interestTags
                }
                onChange={
                  handleInputChange
                }
                placeholder="Beach, Adventure, Food"
                className="w-full rounded-lg border border-[#D6DEDA] px-3 py-2.5 text-sm text-[#17211D] outline-none transition focus:border-[#0F6B4D]"
              />

              <span className="mt-1 block text-xs text-[#7A8780]">
                Separate multiple
                interests with commas.
              </span>
            </label>

            {/* Current team features use public image URLs
                rather than a new upload/storage system.

                Therefore we follow the same architecture here. */}
            <label className="block md:col-span-2">
              <span className="mb-1.5 block text-sm font-semibold text-[#44524B]">
                Cover Photo URL
                (Optional)
              </span>

              <input
                type="url"
                name="coverPhoto"
                value={
                  formData.coverPhoto
                }
                onChange={
                  handleInputChange
                }
                placeholder="https://example.com/photo.jpg"
                className="w-full rounded-lg border border-[#D6DEDA] px-3 py-2.5 text-sm text-[#17211D] outline-none transition focus:border-[#0F6B4D]"
              />
            </label>
          </div>
        </section>

        {/* Form actions */}
        <div className="mt-7 flex flex-col-reverse gap-3 border-t border-[#E1E8E4] pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="rounded-lg border border-[#D6DEDA] bg-white px-5 py-2.5 text-sm font-semibold text-[#44524B] transition hover:bg-[#F7FAF8] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-[#0F6B4D] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0A523B] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? 'Creating Room...'
              : 'Create Public Room'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default PublicRoomCreatePage;