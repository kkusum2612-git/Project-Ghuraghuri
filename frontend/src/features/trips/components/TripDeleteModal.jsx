function TripDeleteModal({
  trip,
  isDeleting,
  onCancel,
  onConfirm,
}) {
  if (!trip) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div
        className="w-full max-w-md rounded-xl border border-[#DCE5E0] bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-trip-title"
      >
        <h2
          id="delete-trip-title"
          className="text-xl font-bold text-[#17211D]"
        >
          Delete trip?
        </h2>

        <p className="mt-3 text-sm leading-6 text-[#66756D]">
          Are you sure you want to
          delete{' '}
          <span className="font-semibold text-[#17211D]">
            {trip.tripName}
          </span>
          ?
        </p>

        <div className="mt-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
          This will also remove its
          related days, stops,
          expenses and checklist
          items.
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="rounded-lg border border-[#CAD7D0] bg-white px-4 py-2.5 text-sm font-semibold text-[#44524B] transition hover:bg-[#F3F6F4] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeleting
              ? 'Deleting...'
              : 'Delete Trip'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default TripDeleteModal;