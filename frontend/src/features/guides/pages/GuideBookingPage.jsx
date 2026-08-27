import { useEffect, useMemo, useState } from 'react';
import {
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom';

import {
  createGuideBooking,
  getPublicGuideById,
} from '../api/guideApi';

function formatDate(dateValue) {
  return new Intl.DateTimeFormat('en-BD', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateValue));
}

function toDateInputValue(dateValue) {
  return new Date(dateValue)
    .toISOString()
    .slice(0, 10);
}

function GuideBookingPage() {
  const {
    guideId,
    packageId,
  } = useParams();

  const navigate = useNavigate();

  const [guide, setGuide] =
    useState(null);

  const [tourDate, setTourDate] =
    useState('');

  const [groupSize, setGroupSize] =
    useState(1);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState('');

  useEffect(() => {
    let ignore = false;

    getPublicGuideById(guideId)
      .then((result) => {
        if (ignore) {
          return;
        }

        setGuide(
          result?.data?.guide ?? null
        );
      })
      .catch((error) => {
        if (ignore) {
          return;
        }

        setErrorMessage(
          error?.response?.data?.message ||
            'Unable to load tour package.'
        );
      })
      .finally(() => {
        if (!ignore) {
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [guideId]);

  const tourPackage = useMemo(
    () =>
      guide?.tourPackages?.find(
        (item) =>
          item._id === packageId
      ) ?? null,
    [
      guide,
      packageId,
    ]
  );

  const totalPrice =
    tourPackage
      ? Number(
          tourPackage.pricePerPerson
        ) * Number(groupSize || 0)
      : 0;

  async function handleSubmit(event) {
    event.preventDefault();

    if (!tourPackage) {
      setErrorMessage(
        'Tour package not found.'
      );

      return;
    }

    if (!tourDate) {
      setErrorMessage(
        'Please select a tour date.'
      );

      return;
    }

    const parsedGroupSize =
      Number(groupSize);

    if (
      !Number.isInteger(
        parsedGroupSize
      ) ||
      parsedGroupSize < 1
    ) {
      setErrorMessage(
        'Group size must be at least 1.'
      );

      return;
    }

    if (
      parsedGroupSize >
      tourPackage.maxGroupSize
    ) {
      setErrorMessage(
        `Maximum group size is ${tourPackage.maxGroupSize}.`
      );

      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');

      await createGuideBooking({
        guideId,
        packageId,
        tourDate,
        groupSize:
          parsedGroupSize,
      });

      navigate(
        '/guide-bookings',
        {
          state: {
            successMessage:
              'Guide booking request sent successfully.',
          },
        }
      );
    } catch (error) {
      setErrorMessage(
        error?.response?.data?.message ||
          'Unable to create guide booking.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <section className="mx-auto max-w-4xl">
        <p
          className="py-12 text-center text-sm text-[#66756D]"
          role="status"
        >
          Loading booking details...
        </p>
      </section>
    );
  }

  if (
    errorMessage &&
    !guide
  ) {
    return (
      <section className="mx-auto max-w-4xl">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <p className="text-sm text-red-700">
            {errorMessage}
          </p>

          <Link
            to="/guides"
            className="mt-4 inline-flex rounded-xl bg-[#08734F] px-4 py-2 text-sm font-semibold text-white"
          >
            Back to Guides
          </Link>
        </div>
      </section>
    );
  }

  if (!tourPackage) {
    return (
      <section className="mx-auto max-w-4xl">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <p className="text-sm text-red-700">
            Tour package not found.
          </p>

          <Link
            to={`/guides/${guideId}`}
            className="mt-4 inline-flex rounded-xl bg-[#08734F] px-4 py-2 text-sm font-semibold text-white"
          >
            Back to Guide
          </Link>
        </div>
      </section>
    );
  }

  const guideName =
    guide?.userId?.name ||
    'Local Guide';

  return (
    <section className="mx-auto max-w-4xl">
      <div className="mb-6">
        <Link
          to={`/guides/${guideId}`}
          className="text-sm font-medium text-[#08734F] hover:underline"
        >
          Back to Guide
        </Link>

        <h1 className="mt-3 text-3xl font-bold text-[#17211D]">
          Book Guide Tour
        </h1>

        <p className="mt-2 text-sm text-[#66756D]">
          Select an available date and
          group size before sending your
          booking request.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-[#DCE5E0] bg-white p-6 shadow-sm"
        >
          <div>
            <p className="text-sm text-[#7B8881]">
              Guide
            </p>

            <h2 className="mt-1 text-xl font-bold text-[#17211D]">
              {guideName}
            </h2>
          </div>

          <div className="mt-6">
            <p className="text-sm text-[#7B8881]">
              Tour Package
            </p>

            <h3 className="mt-1 text-lg font-semibold text-[#17211D]">
              {tourPackage.name}
            </h3>

            <p className="mt-2 text-sm leading-6 text-[#66756D]">
              {tourPackage.description}
            </p>
          </div>

          {errorMessage && (
            <div
              className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              role="alert"
            >
              {errorMessage}
            </div>
          )}

          <div className="mt-6">
            <label
              htmlFor="tourDate"
              className="mb-2 block text-sm font-semibold text-[#36453D]"
            >
              Tour Date
            </label>

            <select
              id="tourDate"
              value={tourDate}
              onChange={(event) =>
                setTourDate(
                  event.target.value
                )
              }
              required
              className="w-full rounded-xl border border-[#D4DED9] bg-white px-3 py-3 text-sm text-[#17211D] outline-none transition focus:border-[#08734F] focus:ring-2 focus:ring-[#DDF1E5]"
            >
              <option value="">
                Select an available date
              </option>

              {tourPackage.availableDates?.map(
                (date) => (
                  <option
                    key={date}
                    value={toDateInputValue(
                      date
                    )}
                  >
                    {formatDate(date)}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="mt-5">
            <label
              htmlFor="groupSize"
              className="mb-2 block text-sm font-semibold text-[#36453D]"
            >
              Group Size
            </label>

            <input
              id="groupSize"
              type="number"
              min="1"
              max={
                tourPackage.maxGroupSize
              }
              step="1"
              value={groupSize}
              onChange={(event) =>
                setGroupSize(
                  event.target.value
                )
              }
              required
              className="w-full rounded-xl border border-[#D4DED9] px-3 py-3 text-sm text-[#17211D] outline-none transition focus:border-[#08734F] focus:ring-2 focus:ring-[#DDF1E5]"
            />

            <p className="mt-2 text-xs text-[#7B8881]">
              Maximum{' '}
              {
                tourPackage.maxGroupSize
              }{' '}
              people
            </p>
          </div>

          <button
            type="submit"
            disabled={
              isSubmitting ||
              !tourDate
            }
            className="mt-7 w-full rounded-xl bg-[#08734F] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#065E41] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? 'Sending Request...'
              : 'Confirm Booking Request'}
          </button>
        </form>

        <aside className="h-fit rounded-2xl border border-[#DCE5E0] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-[#17211D]">
            Booking Summary
          </h2>

          <div className="mt-5 space-y-4 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-[#66756D]">
                Location
              </span>

              <span className="text-right font-medium text-[#17211D]">
                {tourPackage.location}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-[#66756D]">
                Duration
              </span>

              <span className="font-medium text-[#17211D]">
                {
                  tourPackage.durationDays
                }{' '}
                day
                {tourPackage.durationDays ===
                1
                  ? ''
                  : 's'}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-[#66756D]">
                Price / Person
              </span>

              <span className="font-medium text-[#17211D]">
                ৳
                {new Intl.NumberFormat(
                  'en-BD'
                ).format(
                  tourPackage.pricePerPerson
                )}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-[#66756D]">
                Travelers
              </span>

              <span className="font-medium text-[#17211D]">
                {groupSize || 0}
              </span>
            </div>
          </div>

          <div className="mt-5 border-t border-[#E5ECE8] pt-5">
            <div className="flex items-center justify-between gap-4">
              <span className="font-semibold text-[#17211D]">
                Total Cost
              </span>

              <span className="text-xl font-bold text-[#08734F]">
                ৳
                {new Intl.NumberFormat(
                  'en-BD'
                ).format(totalPrice)}
              </span>
            </div>

            <p className="mt-2 text-xs leading-5 text-[#7B8881]">
              The backend calculates the
              final amount again when the
              booking request is submitted.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}

export default GuideBookingPage;