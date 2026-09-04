import {
  useEffect,
  useState,
} from 'react';

import {
  Link,
  useLocation,
} from 'react-router-dom';

import {
  createGuideReview,
  getMyGuideBookings,
  getTravelerGuideReviews,
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

  const [
    bookings,
    setBookings,
  ] = useState([]);

  const [
    reviewedBookingIds,
    setReviewedBookingIds,
  ] = useState(
    new Set()
  );

  const [
    reviewingBooking,
    setReviewingBooking,
  ] = useState(null);

  const [
    reviewRating,
    setReviewRating,
  ] = useState(0);

  const [
    reviewComment,
    setReviewComment,
  ] = useState('');

  const [
    isSubmittingReview,
    setIsSubmittingReview,
  ] = useState(false);

  const [
    reviewActionError,
    setReviewActionError,
  ] = useState('');

  const [
    reviewActionMessage,
    setReviewActionMessage,
  ] = useState('');

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('');

  const successMessage =
    location.state?.successMessage || '';

  useEffect(() => {
    let ignore = false;

    async function loadPage() {
      try {
        const [
          bookingResult,
          reviewResult,
        ] = await Promise.all([
          getMyGuideBookings(),
          getTravelerGuideReviews(),
        ]);

        if (ignore) {
          return;
        }

        const loadedBookings =
          bookingResult?.data
            ?.bookings ?? [];

        const loadedReviews =
          reviewResult?.data
            ?.reviews ?? [];

        setBookings(
          loadedBookings
        );

        setReviewedBookingIds(
          new Set(
            loadedReviews.map(
              (review) =>
                String(
                  review.bookingId
                )
            )
          )
        );
      } catch (error) {
        if (ignore) {
          return;
        }

        setErrorMessage(
          error?.response?.data
            ?.message ||
            'Unable to load guide bookings.'
        );
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadPage();

    return () => {
      ignore = true;
    };
  }, []);

  function handleOpenReview(
    booking
  ) {
    if (
      !booking?._id ||
      booking.bookingStatus !==
        'completed'
    ) {
      return;
    }

    if (
      reviewedBookingIds.has(
        String(booking._id)
      )
    ) {
      return;
    }

    setReviewingBooking(
      booking
    );

    setReviewRating(0);
    setReviewComment('');
    setReviewActionError('');
  }

  function handleCloseReview() {
    if (isSubmittingReview) {
      return;
    }

    setReviewingBooking(null);
    setReviewRating(0);
    setReviewComment('');
    setReviewActionError('');
  }

  async function handleSubmitReview(
    event
  ) {
    event.preventDefault();

    if (
      !reviewingBooking?._id
    ) {
      return;
    }

    setReviewActionError('');

    if (
      !Number.isInteger(
        reviewRating
      ) ||
      reviewRating < 1 ||
      reviewRating > 5
    ) {
      setReviewActionError(
        'Please select a star rating from 1 to 5.'
      );

      return;
    }

    const trimmedComment =
      reviewComment.trim();

    if (!trimmedComment) {
      setReviewActionError(
        'Please write a review before submitting.'
      );

      return;
    }

    if (
      trimmedComment.length >
      1000
    ) {
      setReviewActionError(
        'Review cannot exceed 1000 characters.'
      );

      return;
    }

    setIsSubmittingReview(true);

    try {
      await createGuideReview({
        bookingId:
          reviewingBooking._id,

        rating:
          reviewRating,

        comment:
          trimmedComment,
      });

      setReviewedBookingIds(
        (currentIds) => {
          const nextIds =
            new Set(
              currentIds
            );

          nextIds.add(
            String(
              reviewingBooking._id
            )
          );

          return nextIds;
        }
      );

      setReviewActionMessage(
        `Your review for ${reviewingBooking.packageName} was submitted successfully.`
      );

      setReviewingBooking(null);
      setReviewRating(0);
      setReviewComment('');
    } catch (error) {
      setReviewActionError(
        error?.response?.data
          ?.message ||
          'Unable to submit your guide review.'
      );
    } finally {
      setIsSubmittingReview(false);
    }
  }

  return (
    <section className="mx-auto max-w-6xl">
      {reviewingBooking && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
          role="presentation"
          onClick={
            handleCloseReview
          }
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="guide-review-title"
            className="w-full max-w-lg rounded-2xl border border-[#DCE5E0] bg-white p-6 shadow-2xl sm:p-7"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="guide-review-title"
                  className="text-xl font-bold text-[#17211D]"
                >
                  Review Your Guide
                </h2>

                <p className="mt-1 text-sm text-[#66756D]">
                  {
                    reviewingBooking.packageName
                  }
                </p>
              </div>

              <button
                type="button"
                onClick={
                  handleCloseReview
                }
                disabled={
                  isSubmittingReview
                }
                aria-label="Close review form"
                className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-[#66756D] transition hover:bg-[#F0F2F1] disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={
                handleSubmitReview
              }
              className="mt-6"
            >
              <fieldset>
                <legend className="text-sm font-semibold text-[#17211D]">
                  How was your guide?
                </legend>

                <div className="mt-3 flex gap-2">
                  {[
                    1,
                    2,
                    3,
                    4,
                    5,
                  ].map(
                    (star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() =>
                          setReviewRating(
                            star
                          )
                        }
                        aria-label={`${star} star rating`}
                        aria-pressed={
                          reviewRating ===
                          star
                        }
                        className={[
                          'text-4xl leading-none transition',

                          star <=
                          reviewRating
                            ? 'text-[#E7A622]'
                            : 'text-[#D5DDD9] hover:text-[#E7A622]',
                        ].join(' ')}
                      >
                        ★
                      </button>
                    )
                  )}
                </div>

                <p className="mt-2 text-xs text-[#66756D]">
                  {reviewRating > 0
                    ? `${reviewRating} out of 5 stars`
                    : 'Select a rating'}
                </p>
              </fieldset>

              <label className="mt-6 block">
                <span className="text-sm font-semibold text-[#17211D]">
                  Written Review
                </span>

                <textarea
                  value={
                    reviewComment
                  }
                  onChange={(event) =>
                    setReviewComment(
                      event.target.value
                    )
                  }
                  maxLength="1000"
                  rows="5"
                  placeholder="Share your experience with this guide..."
                  className="mt-2 w-full resize-none rounded-xl border border-[#D6DEDA] bg-white px-4 py-3 text-sm leading-6 text-[#17211D] outline-none transition focus:border-[#0F6B4D]"
                />

                <div className="mt-1 flex justify-end">
                  <span className="text-xs text-[#8A9690]">
                    {
                      reviewComment.length
                    }
                    /1000
                  </span>
                </div>
              </label>

              {reviewActionError && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {
                    reviewActionError
                  }
                </div>
              )}

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={
                    handleCloseReview
                  }
                  disabled={
                    isSubmittingReview
                  }
                  className="rounded-lg border border-[#D6DEDA] bg-white px-5 py-2.5 text-sm font-semibold text-[#44524B] transition hover:bg-[#F7FAF8] disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    isSubmittingReview
                  }
                  className="rounded-lg bg-[#0F6B4D] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0A523B] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmittingReview
                    ? 'Submitting...'
                    : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

      {reviewActionMessage && (
        <div
          className="mb-6 rounded-xl border border-[#BFDCCB] bg-[#EDF8F2] px-4 py-3 text-sm font-medium text-[#08734F]"
          role="status"
        >
          {reviewActionMessage}
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
            {bookings.map(
              (booking) => {
                const guide =
                  booking.guideId;

                const guideName =
                  guide?.userId?.name ||
                  'Local Guide';

                const isCompleted =
                  booking.bookingStatus ===
                  'completed';

                const isReviewed =
                  reviewedBookingIds.has(
                    String(
                      booking._id
                    )
                  );

                return (
                  <article
                    key={booking._id}
                    className="rounded-2xl border border-[#DCE5E0] bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h2 className="text-lg font-bold text-[#17211D]">
                            {
                              booking.packageName
                            }
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
                          {
                            booking.groupSize
                          }{' '}
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

                    <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-[#E5ECE8] pt-4">
                      {guide?._id && (
                        <Link
                          to={`/guides/${guide._id}`}
                          className="text-sm font-semibold text-[#08734F] hover:underline"
                        >
                          View Guide
                        </Link>
                      )}

                      {isCompleted &&
                        !isReviewed && (
                          <button
                            type="button"
                            onClick={() =>
                              handleOpenReview(
                                booking
                              )
                            }
                            className="ml-auto rounded-lg border border-[#0F6B4D] bg-white px-4 py-2.5 text-sm font-semibold text-[#0F6B4D] transition hover:bg-[#EEF7F2]"
                          >
                            Leave Review
                          </button>
                        )}

                      {isCompleted &&
                        isReviewed && (
                          <div className="ml-auto rounded-lg bg-[#FFF8E8] px-3 py-2 text-sm font-semibold text-[#8A6816]">
                            ★ Reviewed
                          </div>
                        )}
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}
    </section>
  );
}

export default TravelerGuideBookingsPage;