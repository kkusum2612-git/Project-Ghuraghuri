function TripEmptyState({
  onCreateTrip,
}) {
  return (
    <div className="rounded-xl border border-dashed border-[#BFD3C8] bg-white px-6 py-16 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#DDF1E5] text-2xl font-bold text-[#0F6B4D]">
        +
      </div>

      <h2 className="mt-5 text-xl font-bold text-[#17211D]">
        No trips yet
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#66756D]">
        Start planning your first
        journey by creating a trip.
      </p>

      <button
        type="button"
        onClick={onCreateTrip}
        className="mt-6 rounded-lg bg-[#0F6B4D] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0A523B]"
      >
        + Create Your First Trip
      </button>
    </div>
  );
}

export default TripEmptyState;