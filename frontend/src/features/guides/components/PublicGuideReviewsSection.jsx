import {
  useEffect,
  useState,
} from 'react';

import {
  getPublicGuideReviews,
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

function PublicGuideReviewsSection({
  guideId,
}) {
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

    getPublicGuideReviews(
      guideId
    )
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
  }, [
    guideId,
  ]);

  return (
    <section className="mt-10">
      <div>
        <h2 className="text-2xl font-bold text-[#17211D]">
          Traveler Reviews
        </h2>

        <p className="mt-1 text-sm text-[#66756D]">
          Ratings and feedback from
          travelers after completed tours.
        </p>
      </div>

      {isLoading && (
        <p
          className="mt-5 text-sm text-[#66756D]"
          role="status"
        >
          Loading reviews...
        </p>
      )}

      {errorMessage && (
        <div
          className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {errorMessage}
        </div>
      )}

      {!isLoading &&
        !errorMessage && (
          <>
            <div className="mt-5 flex flex-wrap items-center gap-4 rounded-2xl border border-[#DCE5E0] bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold text-[#17211D]">
                  {averageRating.toFixed(
                    1
                  )}
                </span>

                <span className="text-2xl text-[#E7A622]">
                  ★
                </span>
              </div>

              <RatingStars
                rating={Math.round(
                  averageRating
                )}
              />

              <span className="text-sm text-[#66756D]">
                {reviewCount}{' '}
                {reviewCount === 1
                  ? 'review'
                  : 'reviews'}
              </span>
            </div>

            {reviews.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-[#C9D7D0] bg-white px-6 py-12 text-center">
                <p className="text-sm text-[#66756D]">
                  This guide has no
                  traveler reviews yet.
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
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
          </>
        )}
    </section>
  );
}

export default PublicGuideReviewsSection;