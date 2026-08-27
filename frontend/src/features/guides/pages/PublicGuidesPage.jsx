import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { getPublicGuides } from '../api/guideApi';

const initialFilters = {
  location: '',
  language: '',
  specialty: '',
  minPrice: '',
  maxPrice: '',
};

function PublicGuidesPage() {
  const [guides, setGuides] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  async function loadGuides(searchFilters = {}) {
    try {
      setIsLoading(true);
      setErrorMessage('');

      const result = await getPublicGuides(searchFilters);

      setGuides(result?.data?.guides ?? []);
    } catch (error) {
      setErrorMessage(
        error?.response?.data?.message ||
          'Unable to load guides.'
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
  let ignore = false;

  getPublicGuides()
    .then((result) => {
      if (ignore) {
        return;
      }

      setGuides(result?.data?.guides ?? []);
    })
    .catch((error) => {
      if (ignore) {
        return;
      }

      setErrorMessage(
        error?.response?.data?.message ||
          'Unable to load guides.'
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

  function handleFilterChange(event) {
    const { name, value } = event.target;

    setFilters((currentFilters) => ({
      ...currentFilters,
      [name]: value,
    }));
  }

  function handleSearch(event) {
    event.preventDefault();

    const activeFilters = Object.fromEntries(
      Object.entries(filters).filter(
        ([, value]) => value !== ''
      )
    );

    loadGuides(activeFilters);
  }

  function handleReset() {
    setFilters(initialFilters);
    loadGuides();
  }

  return (
    <section className="mx-auto max-w-7xl px-5 py-10">
      <div className="mb-8">
        <p className="text-sm text-[#7B8881]">
          Home / Guides
        </p>

        <h1 className="mt-2 text-3xl font-bold text-[#17211D]">
          Find the Perfect Guide for Your Trip
        </h1>

        <p className="mt-2 text-sm text-[#66756D]">
          Search verified local guides and explore their
          available tour packages.
        </p>
      </div>

      {/* Guide search and filter section */}
      <form
        onSubmit={handleSearch}
        className="mb-8 rounded-2xl border border-[#DCE5E0] bg-white p-5 shadow-sm"
      >
        <div className="mb-4">
          <h2 className="text-lg font-bold text-[#17211D]">
            Search Guides
          </h2>

          <p className="mt-1 text-sm text-[#66756D]">
            Filter guides by location, language, specialty,
            and package price.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div>
            <label
              htmlFor="location"
              className="mb-1.5 block text-sm font-medium text-[#36453D]"
            >
              Location
            </label>

            <input
              id="location"
              name="location"
              type="text"
              value={filters.location}
              onChange={handleFilterChange}
              placeholder="e.g. Cox's Bazar"
              className="w-full rounded-xl border border-[#D4DED9] px-3 py-2.5 text-sm text-[#17211D] outline-none transition focus:border-[#08734F] focus:ring-2 focus:ring-[#DDF1E5]"
            />
          </div>

          <div>
            <label
              htmlFor="language"
              className="mb-1.5 block text-sm font-medium text-[#36453D]"
            >
              Language
            </label>

            <input
              id="language"
              name="language"
              type="text"
              value={filters.language}
              onChange={handleFilterChange}
              placeholder="e.g. English"
              className="w-full rounded-xl border border-[#D4DED9] px-3 py-2.5 text-sm text-[#17211D] outline-none transition focus:border-[#08734F] focus:ring-2 focus:ring-[#DDF1E5]"
            />
          </div>

          <div>
            <label
              htmlFor="specialty"
              className="mb-1.5 block text-sm font-medium text-[#36453D]"
            >
              Specialty
            </label>

            <input
              id="specialty"
              name="specialty"
              type="text"
              value={filters.specialty}
              onChange={handleFilterChange}
              placeholder="e.g. Adventure"
              className="w-full rounded-xl border border-[#D4DED9] px-3 py-2.5 text-sm text-[#17211D] outline-none transition focus:border-[#08734F] focus:ring-2 focus:ring-[#DDF1E5]"
            />
          </div>

          <div>
            <label
              htmlFor="minPrice"
              className="mb-1.5 block text-sm font-medium text-[#36453D]"
            >
              Min Price
            </label>

            <input
              id="minPrice"
              name="minPrice"
              type="number"
              min="0"
              value={filters.minPrice}
              onChange={handleFilterChange}
              placeholder="৳0"
              className="w-full rounded-xl border border-[#D4DED9] px-3 py-2.5 text-sm text-[#17211D] outline-none transition focus:border-[#08734F] focus:ring-2 focus:ring-[#DDF1E5]"
            />
          </div>

          <div>
            <label
              htmlFor="maxPrice"
              className="mb-1.5 block text-sm font-medium text-[#36453D]"
            >
              Max Price
            </label>

            <input
              id="maxPrice"
              name="maxPrice"
              type="number"
              min="0"
              value={filters.maxPrice}
              onChange={handleFilterChange}
              placeholder="৳10000"
              className="w-full rounded-xl border border-[#D4DED9] px-3 py-2.5 text-sm text-[#17211D] outline-none transition focus:border-[#08734F] focus:ring-2 focus:ring-[#DDF1E5]"
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={isLoading}
            className="rounded-xl bg-[#08734F] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#065E41] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? 'Searching...' : 'Search Guides'}
          </button>

          <button
            type="button"
            onClick={handleReset}
            disabled={isLoading}
            className="rounded-xl border border-[#C9D7D0] bg-white px-5 py-2.5 text-sm font-semibold text-[#526159] transition hover:bg-[#F4F8F6] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Reset Filters
          </button>
        </div>
      </form>

      {errorMessage && (
        <div
          className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {errorMessage}
        </div>
      )}

      {isLoading && (
        <div className="py-12 text-center">
          <p
            className="text-sm text-[#66756D]"
            role="status"
          >
            Loading guides...
          </p>
        </div>
      )}

      {!isLoading &&
        !errorMessage &&
        guides.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[#C9D7D0] bg-white px-6 py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#E9F6F0] text-xl font-bold text-[#08734F]">
              G
            </div>

            <h2 className="mt-4 text-xl font-bold text-[#17211D]">
              No matching guides found
            </h2>

            <p className="mt-2 text-sm text-[#66756D]">
              Try changing or resetting your search filters.
            </p>
          </div>
        )}

      {!isLoading &&
        !errorMessage &&
        guides.length > 0 && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-[#66756D]">
                {guides.length} guide
                {guides.length === 1 ? '' : 's'} found
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {guides.map((guide) => {
                const user = guide.userId;

                const firstPhoto =
                  guide.photos?.[0] ||
                  user?.profileImageUrl;

                const minimumPrice =
                  guide.tourPackages?.length
                    ? Math.min(
                        ...guide.tourPackages.map(
                          (tourPackage) =>
                            tourPackage.pricePerPerson
                        )
                      )
                    : null;

                return (
                  <article
                    key={guide._id}
                    className="overflow-hidden rounded-2xl border border-[#DCE5E0] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="relative h-40 bg-gradient-to-br from-[#D5EBE0] to-[#A8CDBB]">
                      {firstPhoto ? (
                        <img
                          src={firstPhoto}
                          alt={
                            user?.name ||
                            'Guide'
                          }
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-3xl font-bold text-[#08734F]">
                          {user?.name
                            ?.charAt(0)
                            ?.toUpperCase() ||
                            'G'}
                        </div>
                      )}

                      <div className="absolute bottom-3 left-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-[#E9F6F0] text-xl font-bold text-[#08734F] shadow-sm">
                        {user?.profileImageUrl ? (
                          <img
                            src={
                              user.profileImageUrl
                            }
                            alt={
                              user.name ||
                              'Guide'
                            }
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          user?.name
                            ?.charAt(0)
                            ?.toUpperCase() ||
                          'G'
                        )}
                      </div>
                    </div>

                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h2 className="text-lg font-bold text-[#17211D]">
                            {user?.name ||
                              'Local Guide'}
                          </h2>

                          <span className="mt-1 inline-flex rounded-full bg-[#DDF1E5] px-2.5 py-1 text-[11px] font-semibold text-[#08734F]">
                            Verified Guide
                          </span>
                        </div>

                        {minimumPrice !== null && (
                          <div className="text-right">
                            <p className="font-bold text-[#17211D]">
                              ৳
                              {new Intl.NumberFormat(
                                'en-BD'
                              ).format(
                                minimumPrice
                              )}
                            </p>

                            <p className="text-[11px] text-[#7B8881]">
                              from / person
                            </p>
                          </div>
                        )}
                      </div>

                      <p className="mt-4 text-sm text-[#66756D]">
                        Location: {guide.location}
                      </p>

                      <p className="mt-1 text-sm text-[#66756D]">
                        Languages:{' '}
                        {guide.languages?.join(
                          ', '
                        )}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {guide.specialties?.map(
                          (specialty) => (
                            <span
                              key={
                                specialty
                              }
                              className="rounded-full bg-[#F1F5F3] px-3 py-1 text-xs text-[#526159]"
                            >
                              {specialty}
                            </span>
                          )
                        )}
                      </div>

                      <p className="mt-4 line-clamp-3 text-sm leading-6 text-[#66756D]">
                        {guide.bio}
                      </p>

                      <div className="mt-5 border-t border-[#E5ECE8] pt-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs text-[#7B8881]">
                            {
                              guide
                                .tourPackages
                                ?.length
                            }{' '}
                            active tour
                            {guide
                              .tourPackages
                              ?.length === 1
                              ? ''
                              : 's'}
                          </p>

                          <Link
                            to={`/guides/${guide._id}`}
                            className="rounded-lg bg-[#08734F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#065E41]"
                          >
                            View Guide
                          </Link>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
    </section>
  );
}

export default PublicGuidesPage;