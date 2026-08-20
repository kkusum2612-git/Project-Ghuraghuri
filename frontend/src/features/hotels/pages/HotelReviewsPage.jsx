import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  getVendorHotels,
} from '../api/hotelApi';

import {
  getVendorHotelReviews,
} from '../api/hotelReviewApi';

/*
 * ------------------------------------------------------------
 * DATE FORMATTER
 * ------------------------------------------------------------
 */
function formatDate(value) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '—';
  }

  return new Intl.DateTimeFormat(
    'en-GB',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }
  ).format(date);
}

/*
 * ------------------------------------------------------------
 * STAR DISPLAY
 * ------------------------------------------------------------
 */
function RatingStars({
  rating,
  sizeClass = 'text-base',
}) {
  const numericRating =
    Number(rating) || 0;

  return (
    <span
      className={[
        'inline-flex gap-0.5',
        sizeClass,
      ].join(' ')}
      aria-label={`${numericRating} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map(
        (star) => (
          <span
            key={star}
            className={
              star <=
              numericRating
                ? 'text-[#E7A622]'
                : 'text-[#D5DDD9]'
            }
          >
            ★
          </span>
        )
      )}
    </span>
  );
}

function HotelReviewsPage() {
  const [
    hotels,
    setHotels,
  ] = useState([]);

  const [
    reviews,
    setReviews,
  ] = useState([]);

  /*
   * Stores the hotel currently opened in the review modal.
   *
   * An empty string means the modal is closed.
   */
  const [
    activeHotelId,
    setActiveHotelId,
  ] = useState('');

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    pageError,
    setPageError,
  ] = useState('');

  /*
   * ------------------------------------------------------------
   * LOAD VENDOR HOTELS + REVIEWS
   * ------------------------------------------------------------
   */
  useEffect(() => {
    let ignoreResult = false;

    async function loadReviewPage() {
      setIsLoading(true);
      setPageError('');

      try {
        const [
          hotelResult,
          reviewResult,
        ] = await Promise.all([
          getVendorHotels(),
          getVendorHotelReviews(),
        ]);

        if (ignoreResult) {
          return;
        }

        setHotels(
          hotelResult?.data
            ?.hotels ?? []
        );

        setReviews(
          reviewResult?.data
            ?.reviews ?? []
        );
      } catch (error) {
        if (!ignoreResult) {
          setPageError(
            error.response?.data
              ?.message ||
              'Unable to load guest reviews.'
          );
        }
      } finally {
        if (!ignoreResult) {
          setIsLoading(false);
        }
      }
    }

    void loadReviewPage();

    return () => {
      ignoreResult = true;
    };
  }, []);

  /*
   * ------------------------------------------------------------
   * CLOSE MODAL WITH ESCAPE
   * ------------------------------------------------------------
   */
  useEffect(() => {
    if (!activeHotelId) {
      return undefined;
    }

    function handleKeyDown(
      event
    ) {
      if (
        event.key ===
        'Escape'
      ) {
        setActiveHotelId('');
      }
    }

    window.addEventListener(
      'keydown',
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        'keydown',
        handleKeyDown
      );
    };
  }, [activeHotelId]);

  /*
   * ------------------------------------------------------------
   * PER-HOTEL REVIEW SUMMARY
   * ------------------------------------------------------------
   *
   * Each hotel receives its own:
   *
   * averageRating
   * reviewCount
   *
   * Ratings from different hotel listings are never mixed.
   */
  const reviewSummaryByHotel =
    useMemo(() => {
      const summaryMap =
        new Map();

      reviews.forEach(
        (review) => {
          const hotelId =
            review.hotelId
              ?._id;

          if (!hotelId) {
            return;
          }

          const key =
            String(hotelId);

          const current =
            summaryMap.get(
              key
            ) || {
              ratingTotal: 0,
              reviewCount: 0,
            };

          current.ratingTotal +=
            Number(
              review.rating || 0
            );

          current.reviewCount +=
            1;

          summaryMap.set(
            key,
            current
          );
        }
      );

      const finalMap =
        new Map();

      summaryMap.forEach(
        (
          summary,
          hotelId
        ) => {
          finalMap.set(
            hotelId,
            {
              averageRating:
                summary.reviewCount >
                0
                  ? summary.ratingTotal /
                    summary.reviewCount
                  : 0,

              reviewCount:
                summary.reviewCount,
            }
          );
        }
      );

      return finalMap;
    }, [reviews]);

  /*
   * ------------------------------------------------------------
   * ACTIVE HOTEL + ITS REVIEWS
   * ------------------------------------------------------------
   */
  const activeHotel =
    useMemo(() => {
      if (!activeHotelId) {
        return null;
      }

      return (
        hotels.find(
          (hotel) =>
            String(
              hotel._id
            ) ===
            activeHotelId
        ) || null
      );
    }, [
      activeHotelId,
      hotels,
    ]);

  const activeReviews =
    useMemo(() => {
      if (!activeHotelId) {
        return [];
      }

      return reviews.filter(
        (review) =>
          String(
            review.hotelId
              ?._id
          ) ===
          activeHotelId
      );
    }, [
      activeHotelId,
      reviews,
    ]);

  const activeSummary =
    activeHotelId
      ? reviewSummaryByHotel.get(
          activeHotelId
        ) || {
          averageRating: 0,
          reviewCount: 0,
        }
      : {
        averageRating: 0,
        reviewCount: 0,
      };

  /*
   * Vendor-wide counts are okay because they describe volume,
   * not rating quality.
   *
   * There is intentionally no combined vendor average rating.
   */
  const reviewedHotelCount =
    useMemo(() => {
      return hotels.filter(
        (hotel) =>
          (
            reviewSummaryByHotel.get(
              String(
                hotel._id
              )
            )?.reviewCount || 0
          ) > 0
      ).length;
    }, [
      hotels,
      reviewSummaryByHotel,
    ]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm font-medium text-[#66756D]">
          Loading guest reviews...
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* ======================================================
          HOTEL REVIEW MODAL
         ====================================================== */}
      {activeHotel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6"
          role="presentation"
          onClick={() =>
            setActiveHotelId('')
          }
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="hotel-review-modal-title"
            className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#DCE5E0] bg-white shadow-2xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            {/* Modal header */}
            <div className="shrink-0 border-b border-[#E5ECE8] bg-white px-5 py-5 sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#8A9690]">
                    Guest Reviews
                  </p>

                  <h2
                    id="hotel-review-modal-title"
                    className="mt-1 truncate text-xl font-bold text-[#17211D]"
                  >
                    {activeHotel.name}
                  </h2>

                  <p className="mt-1 text-sm text-[#66756D]">
                    {activeHotel
                      .location
                      ?.address}

                    {activeHotel
                      .location
                      ?.address &&
                    activeHotel
                      .location
                      ?.city
                      ? ', '
                      : ''}

                    {activeHotel
                      .location
                      ?.city}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setActiveHotelId(
                      ''
                    )
                  }
                  aria-label="Close hotel reviews"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl text-[#66756D] transition hover:bg-[#F0F2F1]"
                >
                  ×
                </button>
              </div>

              {/* Hotel-specific rating */}
              {activeSummary.reviewCount >
              0 ? (
                <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-[#F0DFA6] bg-[#FFF8E8] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-[#17211D]">
                      {activeSummary.averageRating.toFixed(
                        1
                      )}
                    </span>

                    <span className="text-xl text-[#E7A622]">
                      ★
                    </span>
                  </div>

                  <div className="h-7 w-px bg-[#E8D8A7]" />

                  <RatingStars
                    rating={Math.round(
                      activeSummary.averageRating
                    )}
                    sizeClass="text-sm"
                  />

                  <span className="text-xs text-[#8A7350]">
                    {
                      activeSummary.reviewCount
                    }{' '}
                    {activeSummary.reviewCount ===
                    1
                      ? 'review'
                      : 'reviews'}
                  </span>
                </div>
              ) : (
                <div className="mt-4 rounded-xl bg-[#F7FAF8] px-4 py-3 text-sm text-[#8A9690]">
                  This hotel has no
                  guest reviews yet.
                </div>
              )}
            </div>

            {/* Scrollable review area */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              {activeReviews.length ===
              0 ? (
                <div className="px-6 py-16 text-center">
                  <div className="text-4xl text-[#D5DDD9]">
                    ★
                  </div>

                  <h3 className="mt-4 font-bold text-[#17211D]">
                    No reviews yet
                  </h3>

                  <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#66756D]">
                    Traveler reviews
                    will appear here
                    after completed
                    stays at this
                    hotel.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[#E5ECE8]">
                  {activeReviews.map(
                    (review) => {
                      const travelerName =
                        review
                          .travelerId
                          ?.name ||
                        'Traveler';

                      const travelerPhoto =
                        review
                          .travelerId
                          ?.profileImageUrl;

                      return (
                        <article
                          key={
                            review._id
                          }
                          className="px-5 py-5 sm:px-6"
                        >
                          <div className="flex items-start gap-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#DDF1E5] font-bold text-[#0F6B4D]">
                              {travelerPhoto ? (
                                <img
                                  src={
                                    travelerPhoto
                                  }
                                  alt={
                                    travelerName
                                  }
                                  className="h-full w-full object-cover"
                                  onError={(
                                    event
                                  ) => {
                                    event.currentTarget.style.display =
                                      'none';
                                  }}
                                />
                              ) : (
                                travelerName
                                  .charAt(
                                    0
                                  )
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

                                  <div className="mt-1 flex flex-wrap items-center gap-2">
                                    <RatingStars
                                      rating={
                                        review.rating
                                      }
                                      sizeClass="text-sm"
                                    />

                                    <span className="text-xs font-semibold text-[#44524B]">
                                      {
                                        review.rating
                                      }
                                      /5
                                    </span>
                                  </div>
                                </div>

                                <p className="shrink-0 text-xs text-[#8A9690]">
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

            {/* Modal footer */}
            <div className="shrink-0 border-t border-[#E5ECE8] bg-[#F7FAF8] px-5 py-4 sm:px-6">
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs text-[#66756D]">
                  Press Esc or click
                  outside to close.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    setActiveHotelId(
                      ''
                    )
                  }
                  className="rounded-lg bg-[#0F6B4D] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0A523B]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------
          PAGE HEADER
         ------------------------------------------------------ */}
      <div>
        <h1 className="text-2xl font-bold text-[#17211D] md:text-3xl">
          Guest Reviews
        </h1>

        <p className="mt-1 text-sm text-[#66756D]">
          View ratings and traveler
          feedback separately for each
          of your hotels.
        </p>
      </div>

      {pageError && (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {pageError}
        </div>
      )}

      {/* ------------------------------------------------------
          VENDOR COUNTS
         ------------------------------------------------------ */}
      <section className="mt-7 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[#DCE5E0] bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#8A9690]">
            My Hotels
          </p>

          <p className="mt-3 text-3xl font-bold text-[#17211D]">
            {hotels.length}
          </p>

          <p className="mt-2 text-xs text-[#66756D]">
            Total hotel listings
          </p>
        </div>

        <div className="rounded-xl border border-[#DCE5E0] bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#8A9690]">
            Hotels Reviewed
          </p>

          <p className="mt-3 text-3xl font-bold text-[#17211D]">
            {
              reviewedHotelCount
            }
          </p>

          <p className="mt-2 text-xs text-[#66756D]">
            Listings with traveler
            feedback
          </p>
        </div>

        <div className="rounded-xl border border-[#DCE5E0] bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#8A9690]">
            Total Reviews
          </p>

          <p className="mt-3 text-3xl font-bold text-[#17211D]">
            {reviews.length}
          </p>

          <p className="mt-2 text-xs text-[#66756D]">
            Across all your hotel
            listings
          </p>
        </div>
      </section>

      {/* ------------------------------------------------------
          HOTEL CARDS
         ------------------------------------------------------ */}
      <section className="pt-8">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-[#17211D]">
            Reviews by Hotel
          </h2>

          <p className="mt-1 text-sm text-[#66756D]">
            Select a hotel to open its
            guest reviews.
          </p>
        </div>

        {hotels.length === 0 ? (
          <div className="rounded-xl border border-[#DCE5E0] bg-white px-6 py-14 text-center shadow-sm">
            <p className="font-semibold text-[#17211D]">
              No hotel listings yet
            </p>

            <p className="mt-2 text-sm text-[#66756D]">
              Create a hotel listing
              before receiving guest
              reviews.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {hotels.map(
              (hotel) => {
                const hotelId =
                  String(
                    hotel._id
                  );

                const summary =
                  reviewSummaryByHotel.get(
                    hotelId
                  ) || {
                    averageRating: 0,
                    reviewCount: 0,
                  };

                const photo =
                  hotel.photos?.[0];

                return (
                  <button
                    key={hotel._id}
                    type="button"
                    onClick={() =>
                      setActiveHotelId(
                        hotelId
                      )
                    }
                    className="overflow-hidden rounded-xl border border-[#DCE5E0] bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#A9D9BB] hover:shadow-md"
                  >
                    <div className="h-36 bg-[#EEF2F0]">
                      {photo ? (
                        <img
                          src={photo}
                          alt={
                            hotel.name
                          }
                          className="h-full w-full object-cover"
                          onError={(
                            event
                          ) => {
                            event.currentTarget.style.display =
                              'none';
                          }}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-[#8A9690]">
                          No hotel photo
                        </div>
                      )}
                    </div>

                    <div className="p-4">
                      <h3 className="truncate font-bold text-[#17211D]">
                        {hotel.name}
                      </h3>

                      <p className="mt-1 line-clamp-1 text-xs text-[#66756D]">
                        {hotel.location
                          ?.address}

                        {hotel.location
                          ?.address &&
                        hotel.location
                          ?.city
                          ? ', '
                          : ''}

                        {hotel.location
                          ?.city}
                      </p>

                      {summary.reviewCount >
                      0 ? (
                        <div className="mt-4 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-lg text-[#E7A622]">
                              ★
                            </span>

                            <span className="text-lg font-bold text-[#17211D]">
                              {summary.averageRating.toFixed(
                                1
                              )}
                            </span>
                          </div>

                          <span className="text-xs text-[#66756D]">
                            {
                              summary.reviewCount
                            }{' '}
                            {summary.reviewCount ===
                            1
                              ? 'review'
                              : 'reviews'}
                          </span>
                        </div>
                      ) : (
                        <p className="mt-4 text-sm text-[#8A9690]">
                          No reviews yet
                        </p>
                      )}

                      <div className="mt-4 border-t border-[#E5ECE8] pt-3">
                        <p className="text-xs font-semibold text-[#0F6B4D]">
                          View Reviews →
                        </p>
                      </div>
                    </div>
                  </button>
                );
              }
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default HotelReviewsPage;