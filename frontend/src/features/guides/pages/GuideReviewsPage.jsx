import {
  useEffect,
  useState,
} from 'react';

import {
  getMyGuideReviews,
} from '../api/guideApi';

function formatDate(value) {
  return new Intl.DateTimeFormat(
    'en-BD',
    {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }
  ).format(new Date(value));
}

function RatingStars({
  rating,
}) {
  const numericRating =
    Number(rating) || 0;

  return (
    <div
      className="flex gap-1"
      aria-label={`${numericRating} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map(
        (star) => (
          <span
            key={star}
            className={
              star <= numericRating
                ? 'text-[#E7A622]'
                : 'text-[#D5DDD9]'
            }
          >
            ★
          </span>
        )
      )}
    </div>
  );
}

function GuideReviewsPage() {
  const [
    reviews,
    setReviews,
  ] = useState([]);

  const [
    averageRating,
    setAverageRating,
  ] = useState(0);

  const [
    reviewCount,
    setReviewCount,
  ] = useState(0);

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

    getMyGuideReviews()
      .then((result) => {
        if (ignore) {
          return;
        }

        setReviews(
          result?.data?.reviews ??
            []
        );

        setAverageRating(
          Number(
            result?.data
              ?.averageRating || 0
          )
        );

        setReviewCount(
          Number(
            result?.data
              ?.reviewCount || 0
          )
        );
      })
      .catch((error) => {
        if (ignore) {
          return;
        }

        setErrorMessage(
          error?.response?.data
            ?.message ||
            'Unable to load guide reviews.'
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
          Loading reviews...
        </p>
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-6xl">
      <div>
        <h1 className="text-3xl font-bold text-[#17211D]">
          Traveler Reviews
        </h1>

        <p className="mt-2 text-sm text-[#66756D]">
          View ratings and feedback
          submitted by travelers after
          completed tours.
        </p>
      </div>

      {errorMessage && (
        <div
          className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {errorMessage}
        </div>
      )}

      {!errorMessage && (
        <>
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#DCE5E0] bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#8A9690]">
                Average Rating
              </p>

              <div className="mt-3 flex items-center gap-3">
                <p className="text-3xl font-bold text-[#17211D]">
                  {averageRating.toFixed(
                    1
                  )}
                </p>

                <span className="text-2xl text-[#E7A622]">
                  ★
                </span>
              </div>

              <div className="mt-2">
                <RatingStars
                  rating={Math.round(
                    averageRating
                  )}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-[#DCE5E0] bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#8A9690]">
                Total Reviews
              </p>

              <p className="mt-3 text-3xl font-bold text-[#17211D]">
                {reviewCount}
              </p>

              <p className="mt-2 text-xs text-[#66756D]">
                Traveler reviews received
              </p>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-xl font-bold text-[#17211D]">
              Reviews
            </h2>

            {reviews.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-[#C9D7D0] bg-white px-6 py-14 text-center">
                <h3 className="font-bold text-[#17211D]">
                  No reviews yet
                </h3>

                <p className="mt-2 text-sm text-[#66756D]">
                  Traveler feedback will
                  appear here after a
                  completed tour is reviewed.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {reviews.map(
                  (review) => {
                    const traveler =
                      review.travelerId;

                    const travelerName =
                      traveler?.name ||
                      'Traveler';

                    return (
                      <article
                        key={review._id}
                        className="rounded-2xl border border-[#DCE5E0] bg-white p-5 shadow-sm"
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#DDF1E5] font-bold text-[#0F6B4D]">
                            {traveler?.profileImageUrl ? (
                              <img
                                src={
                                  traveler.profileImageUrl
                                }
                                alt={
                                  travelerName
                                }
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              travelerName
                                .charAt(0)
                                .toUpperCase()
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p className="font-semibold text-[#17211D]">
                                  {
                                    travelerName
                                  }
                                </p>

                                <div className="mt-1 flex items-center gap-2">
                                  <RatingStars
                                    rating={
                                      review.rating
                                    }
                                  />

                                  <span className="text-xs font-semibold text-[#526159]">
                                    {
                                      review.rating
                                    }
                                    /5
                                  </span>
                                </div>
                              </div>

                              <p className="text-xs text-[#8A9690]">
                                {formatDate(
                                  review.createdAt
                                )}
                              </p>
                            </div>

                            <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-[#44524B]">
                              {
                                review.comment
                              }
                            </p>
                          </div>
                        </div>
                      </article>
                    );
                  }
                )}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}

export default GuideReviewsPage;