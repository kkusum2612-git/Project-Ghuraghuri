import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { getPublicGuideById } from '../api/guideApi';
import PublicGuideReviewsSection from '../components/PublicGuideReviewsSection';

function formatDate(dateValue) {
  return new Intl.DateTimeFormat('en-BD', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateValue));
}

function PublicGuideDetailsPage() {
  const { guideId } = useParams();

  const [guide, setGuide] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let ignore = false;

    getPublicGuideById(guideId)
      .then((result) => {
        if (ignore) {
          return;
        }

        setGuide(result?.data?.guide ?? null);
      })
      .catch((error) => {
        if (ignore) {
          return;
        }

        setErrorMessage(
          error?.response?.data?.message ||
            'Unable to load guide details.'
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

  if (isLoading) {
    return (
      <section className="mx-auto max-w-7xl px-5 py-10">
        <p
          className="text-center text-sm text-[#66756D]"
          role="status"
        >
          Loading guide details...
        </p>
      </section>
    );
  }

  if (errorMessage || !guide) {
    return (
      <section className="mx-auto max-w-7xl px-5 py-10">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <p className="text-sm text-red-700">
            {errorMessage || 'Guide not found.'}
          </p>

          <Link
            to="/guides"
            className="mt-4 inline-flex rounded-xl bg-[#08734F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#065E41]"
          >
            Back to Guides
          </Link>
        </div>
      </section>
    );
  }

  const user = guide.userId;

  const coverPhoto =
    guide.photos?.[0] ||
    user?.profileImageUrl;

  return (
    <section className="mx-auto max-w-7xl px-5 py-10">
      <div className="mb-6">
        <Link
          to="/guides"
          className="text-sm font-medium text-[#08734F] hover:underline"
        >
          Back to Guides
        </Link>
      </div>

      {/* Guide profile */}
      <div className="overflow-hidden rounded-2xl border border-[#DCE5E0] bg-white shadow-sm">
        <div className="relative h-64 bg-gradient-to-br from-[#D5EBE0] to-[#A8CDBB] md:h-80">
          {coverPhoto ? (
            <img
              src={coverPhoto}
              alt={user?.name || 'Guide'}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-6xl font-bold text-[#08734F]">
              {user?.name
                ?.charAt(0)
                ?.toUpperCase() || 'G'}
            </div>
          )}
        </div>

        <div className="p-6 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold text-[#17211D]">
                  {user?.name || 'Local Guide'}
                </h1>

                <span className="rounded-full bg-[#DDF1E5] px-3 py-1 text-xs font-semibold text-[#08734F]">
                  Verified Guide
                </span>
              </div>

              <p className="mt-3 text-sm text-[#66756D]">
                Location: {guide.location}
              </p>

              <p className="mt-1 text-sm text-[#66756D]">
                Languages:{' '}
                {guide.languages?.join(', ')}
              </p>

              <p className="mt-1 text-sm text-[#66756D]">
                Experience:{' '}
                {guide.yearsOfExperience || 0}{' '}
                year
                {guide.yearsOfExperience === 1
                  ? ''
                  : 's'}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <h2 className="text-lg font-bold text-[#17211D]">
              Specialties
            </h2>

            <div className="mt-3 flex flex-wrap gap-2">
              {guide.specialties?.map(
                (specialty) => (
                  <span
                    key={specialty}
                    className="rounded-full bg-[#F1F5F3] px-3 py-1.5 text-sm text-[#526159]"
                  >
                    {specialty}
                  </span>
                )
              )}
            </div>
          </div>

          <div className="mt-6">
            <h2 className="text-lg font-bold text-[#17211D]">
              About
            </h2>

            <p className="mt-2 whitespace-pre-line text-sm leading-7 text-[#66756D]">
              {guide.bio}
            </p>
          </div>
        </div>
      </div>

      {/* Tour packages */}
      <div className="mt-10">
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-[#17211D]">
            Available Tour Packages
          </h2>

          <p className="mt-1 text-sm text-[#66756D]">
            Choose a package and available date to
            book this guide.
          </p>
        </div>

        {guide.tourPackages?.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#C9D7D0] bg-white p-10 text-center">
            <p className="text-sm text-[#66756D]">
              This guide currently has no active
              tour packages.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {guide.tourPackages.map(
              (tourPackage) => {
                const packagePhoto =
                  tourPackage.photos?.[0];

                return (
                  <article
                    key={tourPackage._id}
                    className="overflow-hidden rounded-2xl border border-[#DCE5E0] bg-white shadow-sm"
                  >
                    {packagePhoto && (
                      <img
                        src={packagePhoto}
                        alt={tourPackage.name}
                        className="h-52 w-full object-cover"
                      />
                    )}

                    <div className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-xl font-bold text-[#17211D]">
                            {tourPackage.name}
                          </h3>

                          <p className="mt-1 text-sm text-[#66756D]">
                            {tourPackage.location}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-xl font-bold text-[#08734F]">
                            ৳
                            {new Intl.NumberFormat(
                              'en-BD'
                            ).format(
                              tourPackage.pricePerPerson
                            )}
                          </p>

                          <p className="text-xs text-[#7B8881]">
                            per person
                          </p>
                        </div>
                      </div>

                      <p className="mt-4 text-sm leading-6 text-[#66756D]">
                        {tourPackage.description}
                      </p>

                      <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-[#F7FAF8] p-4">
                        <div>
                          <p className="text-xs text-[#7B8881]">
                            Duration
                          </p>

                          <p className="mt-1 text-sm font-semibold text-[#17211D]">
                            {
                              tourPackage.durationDays
                            }{' '}
                            day
                            {tourPackage.durationDays ===
                            1
                              ? ''
                              : 's'}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-[#7B8881]">
                            Max Group
                          </p>

                          <p className="mt-1 text-sm font-semibold text-[#17211D]">
                            {
                              tourPackage.maxGroupSize
                            }{' '}
                            people
                          </p>
                        </div>
                      </div>

                      <div className="mt-5">
                        <p className="text-sm font-semibold text-[#36453D]">
                          Available Dates
                        </p>

                        <div className="mt-2 flex flex-wrap gap-2">
                          {tourPackage.availableDates?.map(
                            (date) => (
                              <span
                                key={date}
                                className="rounded-lg border border-[#D4DED9] bg-white px-3 py-1.5 text-xs text-[#526159]"
                              >
                                {formatDate(
                                  date
                                )}
                              </span>
                            )
                          )}
                        </div>
                      </div>

                      {tourPackage.inclusions
                        ?.length > 0 && (
                        <div className="mt-5">
                          <p className="text-sm font-semibold text-[#36453D]">
                            Included
                          </p>

                          <ul className="mt-2 space-y-1 text-sm text-[#66756D]">
                            {tourPackage.inclusions.map(
                              (item) => (
                                <li key={item}>
                                  • {item}
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      )}

                      {tourPackage.exclusions
                        ?.length > 0 && (
                        <div className="mt-5">
                          <p className="text-sm font-semibold text-[#36453D]">
                            Not Included
                          </p>

                          <ul className="mt-2 space-y-1 text-sm text-[#66756D]">
                            {tourPackage.exclusions.map(
                              (item) => (
                                <li key={item}>
                                  • {item}
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      )}

                      <Link
                        to={`/guides/${guide._id}/book/${tourPackage._id}`}
                        className="mt-6 flex w-full items-center justify-center rounded-xl bg-[#08734F] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#065E41]"
                      >
                        Book This Tour
                      </Link>
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}
      </div>
      <PublicGuideReviewsSection
      guideId={guide._id}
      />
    </section>
  );
}

export default PublicGuideDetailsPage;