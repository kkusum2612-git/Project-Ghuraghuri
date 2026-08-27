import { useEffect, useState } from 'react';
import {
  Link,
  useLocation,
} from 'react-router-dom';

import {
  getMyGuideBookings,
} from '../api/guideApi';

function formatDate(dateValue) {
  return new Intl.DateTimeFormat(
    'en-BD',
    {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }
  ).format(new Date(dateValue));
}

function getStatusClasses(status) {
  switch (status) {
    case 'confirmed':
      return 'bg-[#DDF1E5] text-[#08734F]';

    case 'completed':
      return 'bg-blue-50 text-blue-700';

    case 'declined':
      return 'bg-red-50 text-red-700';

    case 'cancelled':
      return 'bg-gray-100 text-gray-600';

    default:
      return 'bg-amber-50 text-amber-700';
  }
}

function TravelerGuideBookingsPage() {
  const location = useLocation();

  const [bookings, setBookings] =
    useState([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState('');

  const successMessage =
    location.state?.successMessage || '';

  useEffect(() => {
    let ignore = false;

    getMyGuideBookings()
      .then((result) => {
        if (ignore) {
          return;
        }

        setBookings(
          result?.data?.bookings ?? []
        );
      })
      .catch((error) => {
        if (ignore) {
          return;
        }

        setErrorMessage(
          error?.response?.data?.message ||
            'Unable to load guide bookings.'
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

  return (
    <section className="mx-auto max-w-6xl">
      <div className="mb-7">
        <h1 className="text-3xl font-bold text-[#17211D]">
          Guide Bookings
        </h1>

        <p className="mt-2 text-sm text-[#66756D]">
          View your guide tour booking
          requests and their current status.
        </p>
      </div>

      {successMessage && (
        <div
          className="mb-6 rounded-xl border border-[#BFDCCB] bg-[#EDF8F2] px-4 py-3 text-sm font-medium text-[#08734F]"
          role="status"
        >
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div
          className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {errorMessage}
        </div>
      )}

      {isLoading && (
        <p
          className="py-12 text-center text-sm text-[#66756D]"
          role="status"
        >
          Loading guide bookings...
        </p>
      )}

      {!isLoading &&
        !errorMessage &&
        bookings.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[#C9D7D0] bg-white px-6 py-14 text-center">
            <h2 className="text-xl font-bold text-[#17211D]">
              No guide bookings yet
            </h2>

            <p className="mt-2 text-sm text-[#66756D]">
              Find a guide and send your
              first tour booking request.
            </p>

            <Link
              to="/guides"
              className="mt-5 inline-flex rounded-xl bg-[#08734F] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#065E41]"
            >
              Browse Guides
            </Link>
          </div>
        )}

      {!isLoading &&
        !errorMessage &&
        bookings.length > 0 && (
          <div className="space-y-5">
            {bookings.map((booking) => {
              const guide =
                booking.guideId;

              const guideName =
                guide?.userId?.name ||
                'Local Guide';

              return (
                <article
                  key={booking._id}
                  className="rounded-2xl border border-[#DCE5E0] bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-lg font-bold text-[#17211D]">
                          {booking.packageName}
                        </h2>

                        <span
                          className={[
                            'rounded-full px-3 py-1 text-xs font-semibold capitalize',
                            getStatusClasses(
                              booking.bookingStatus
                            ),
                          ].join(' ')}
                        >
                          {
                            booking.bookingStatus
                          }
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-[#66756D]">
                        Guide:{' '}
                        <span className="font-medium text-[#36453D]">
                          {guideName}
                        </span>
                      </p>

                      <p className="mt-1 text-sm text-[#66756D]">
                        Tour date:{' '}
                        <span className="font-medium text-[#36453D]">
                          {formatDate(
                            booking.tourDate
                          )}
                        </span>
                      </p>
                    </div>

                    <div className="md:text-right">
                      <p className="text-xs text-[#7B8881]">
                        Total Cost
                      </p>

                      <p className="mt-1 text-xl font-bold text-[#08734F]">
                        ৳
                        {new Intl.NumberFormat(
                          'en-BD'
                        ).format(
                          booking.totalPrice
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 rounded-xl bg-[#F7FAF8] p-4 sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-[#7B8881]">
                        Group Size
                      </p>

                      <p className="mt-1 text-sm font-semibold text-[#17211D]">
                        {booking.groupSize}{' '}
                        people
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-[#7B8881]">
                        Price / Person
                      </p>

                      <p className="mt-1 text-sm font-semibold text-[#17211D]">
                        ৳
                        {new Intl.NumberFormat(
                          'en-BD'
                        ).format(
                          booking.pricePerPerson
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-[#7B8881]">
                        Payment
                      </p>

                      <p className="mt-1 text-sm font-semibold capitalize text-[#17211D]">
                        {
                          booking.paymentStatus
                        }
                      </p>
                    </div>
                  </div>

                  {guide?._id && (
                    <div className="mt-5 border-t border-[#E5ECE8] pt-4">
                      <Link
                        to={`/guides/${guide._id}`}
                        className="text-sm font-semibold text-[#08734F] hover:underline"
                      >
                        View Guide
                      </Link>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
    </section>
  );
}

export default TravelerGuideBookingsPage;