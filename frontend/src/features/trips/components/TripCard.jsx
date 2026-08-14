import { useState } from 'react';

function formatDate(value) {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat(
    'en-GB',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }
  ).format(new Date(value));
}

function calculateDays(
  startDate,
  endDate
) {
  const start =
    new Date(startDate);

  const end =
    new Date(endDate);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime())
  ) {
    return 0;
  }

  const millisecondsPerDay =
    24 * 60 * 60 * 1000;

  return (
    Math.floor(
      (end - start) /
        millisecondsPerDay
    ) + 1
  );
}

function TripCard({
  trip,
  onOpen,
  onEdit,
  onDelete,
  isDeleting,
}) {
  const [
    isMenuOpen,
    setIsMenuOpen,
  ] = useState(false);

  const tripDays =
    calculateDays(
      trip.startDate,
      trip.endDate
    );

    function handleOpen() {
  onOpen(trip);
}

  function handleEdit() {
    setIsMenuOpen(false);
    onEdit(trip);
  }

  function handleDelete() {
    setIsMenuOpen(false);
    onDelete(trip);
  }

  return (
    <article className="relative rounded-xl border border-[#DCE5E0] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative h-48 overflow-hidden rounded-t-xl bg-[#E8F0EC]">
        {trip.coverPhoto ? (
          <img
            src={trip.coverPhoto}
            alt={`${trip.tripName} cover`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#DDF1E5] to-[#EEF7F2]">
            <span className="text-sm font-semibold text-[#557067]">
              No cover photo
            </span>
          </div>
        )}

        <div className="absolute right-3 top-3">
          <button
            type="button"
            onClick={() =>
              setIsMenuOpen(
                (current) =>
                  !current
              )
            }
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-xl font-bold text-[#44524B] shadow-sm transition hover:bg-[#F0F4F2]"
            aria-label="Trip actions"
          >
            ⋮
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-11 z-20 w-32 overflow-hidden rounded-lg border border-[#DCE5E0] bg-white shadow-lg">
              <button
                type="button"
                onClick={handleEdit}
                className="block w-full px-4 py-2.5 text-left text-sm font-medium text-[#17211D] transition hover:bg-[#F2F6F4]"
              >
                Edit
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="block w-full border-t border-[#E5ECE8] px-4 py-2.5 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="p-5">
        <h2 className="text-lg font-bold text-[#17211D]">
          {trip.tripName}
        </h2>

        <div className="mt-3 space-y-1.5 text-sm text-[#66756D]">
          <p>
            <span className="font-semibold text-[#44524B]">
              Destination:
            </span>{' '}
            {trip.destination?.name ||
              'Not specified'}
          </p>

          <p>
            <span className="font-semibold text-[#44524B]">
              Date:
            </span>{' '}
            {formatDate(
              trip.startDate
            )}{' '}
            –{' '}
            {formatDate(
              trip.endDate
            )}
          </p>

          <p>
            <span className="font-semibold text-[#44524B]">
              Places:
            </span>{' '}
            {trip.placeCount ?? 0}{' '}
            added
          </p>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#E5ECE8] pt-3">
          <p className="text-sm font-semibold text-[#0F6B4D]">
            {tripDays}{' '}
            {tripDays === 1
              ? 'Day'
              : 'Days'}
          </p>

          <button
            type="button"
            onClick={handleOpen}
            className="rounded-lg bg-[#0F6B4D] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0A523B]"
          >
            View Tour Plan
          </button>
        </div>
      </div>
    </article>
  );
}

export default TripCard;