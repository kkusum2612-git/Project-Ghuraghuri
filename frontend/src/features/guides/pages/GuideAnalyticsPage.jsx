import {
  useEffect,
  useState,
} from 'react';

import {
  getMyGuideAnalytics,
} from '../api/guideApi';

function formatMoney(value) {
  return `৳${new Intl.NumberFormat(
    'en-BD'
  ).format(Number(value) || 0)}`;
}

function GuideAnalyticsPage() {
  const [
    analytics,
    setAnalytics,
  ] = useState(null);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('');

  useEffect(() => {
    let ignore = false;

    getMyGuideAnalytics()
      .then((result) => {
        if (ignore) {
          return;
        }

        setAnalytics(
          result?.data ?? null
        );
      })
      .catch((error) => {
        if (ignore) {
          return;
        }

        setErrorMessage(
          error?.response?.data
            ?.message ||
            'Unable to load guide analytics.'
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
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm font-medium text-[#66756D]">
          Loading analytics...
        </p>
      </div>
    );
  }

  if (
    errorMessage ||
    !analytics
  ) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {errorMessage ||
          'Analytics unavailable.'}
      </div>
    );
  }

  const performance =
    analytics.performance || {};

  return (
    <section className="mx-auto max-w-6xl">
      <div>
        <h1 className="text-3xl font-bold text-[#17211D]">
          Guide Analytics
        </h1>

        <p className="mt-2 text-sm text-[#66756D]">
          Track your completed tours,
          revenue, traveler feedback,
          and booking performance.
        </p>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-[#DCE5E0] bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#8A9690]">
            Total Tours
          </p>

          <p className="mt-3 text-3xl font-bold text-[#17211D]">
            {analytics.totalTours}
          </p>

          <p className="mt-2 text-xs text-[#66756D]">
            Completed guide tours
          </p>
        </div>

        <div className="rounded-2xl border border-[#DCE5E0] bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#8A9690]">
            Total Revenue
          </p>

          <p className="mt-3 text-3xl font-bold text-[#08734F]">
            {formatMoney(
              analytics.totalRevenue
            )}
          </p>

          <p className="mt-2 text-xs text-[#66756D]">
            Revenue from completed tours
          </p>
        </div>

        <div className="rounded-2xl border border-[#DCE5E0] bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#8A9690]">
            Average Rating
          </p>

          <div className="mt-3 flex items-center gap-2">
            <p className="text-3xl font-bold text-[#17211D]">
              {Number(
                analytics.averageRating ||
                  0
              ).toFixed(1)}
            </p>

            <span className="text-2xl text-[#E7A622]">
              ★
            </span>
          </div>

          <p className="mt-2 text-xs text-[#66756D]">
            {analytics.reviewCount || 0}{' '}
            traveler reviews
          </p>
        </div>

        <div className="rounded-2xl border border-[#DCE5E0] bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#8A9690]">
            Repeat Travelers
          </p>

          <p className="mt-3 text-3xl font-bold text-[#17211D]">
            {
              analytics.repeatTravelerCount
            }
          </p>

          <p className="mt-2 text-xs text-[#66756D]">
            Travelers with multiple
            completed tours
          </p>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-bold text-[#17211D]">
          Booking Performance
        </h2>

        <p className="mt-1 text-sm text-[#66756D]">
          Current booking counts by
          status.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-xl border border-[#E8DFC2] bg-amber-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              Pending
            </p>

            <p className="mt-2 text-2xl font-bold text-[#17211D]">
              {performance.pending || 0}
            </p>
          </div>

          <div className="rounded-xl border border-[#C7E1D2] bg-[#EDF8F2] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#08734F]">
              Confirmed
            </p>

            <p className="mt-2 text-2xl font-bold text-[#17211D]">
              {
                performance.confirmed ||
                0
              }
            </p>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
              Completed
            </p>

            <p className="mt-2 text-2xl font-bold text-[#17211D]">
              {
                performance.completed ||
                0
              }
            </p>
          </div>

          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
              Declined
            </p>

            <p className="mt-2 text-2xl font-bold text-[#17211D]">
              {
                performance.declined ||
                0
              }
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
              Cancelled
            </p>

            <p className="mt-2 text-2xl font-bold text-[#17211D]">
              {
                performance.cancelled ||
                0
              }
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default GuideAnalyticsPage;