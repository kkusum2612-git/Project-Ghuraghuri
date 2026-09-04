import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { deleteTourPackage, getMyGuideProfile } from '../api/guideApi';

function GuideToursPage() {
  const [guide, setGuide] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [deletingPackageId, setDeletingPackageId] = useState(null);

  useEffect(() => {
    let ignore = false;

    getMyGuideProfile()
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

        if (error?.response?.status === 404) {
          setGuide(null);
        } else {
          setErrorMessage(error?.response?.data?.message || 'Unable to load your tour packages.');
        }
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

  async function handleDelete(tourPackage) {
    const confirmed = window.confirm(`Delete "${tourPackage.name}"? This action cannot be undone.`);

    if (!confirmed) {
      return;
    }

    try {
      setDeletingPackageId(tourPackage._id);

      setErrorMessage('');
      setSuccessMessage('');

      await deleteTourPackage(tourPackage._id);

      setGuide((currentGuide) => ({
        ...currentGuide,

        tourPackages: currentGuide.tourPackages.filter((item) => item._id !== tourPackage._id),
      }));

      setSuccessMessage('Tour package deleted successfully.');
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || 'Unable to delete the tour package.');
    } finally {
      setDeletingPackageId(null);
    }
  }

  function formatPrice(price) {
    return new Intl.NumberFormat('en-BD').format(price);
  }

  function formatDate(date) {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(date));
  }

  if (isLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <p className="text-sm font-medium text-[#66756D]" role="status">
          Loading tour packages...
        </p>
      </div>
    );
  }

  if (!guide && !errorMessage) {
    return (
      <section>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#17211D] md:text-3xl">My Tour Packages</h1>

          <p className="mt-1 text-sm text-[#66756D]">
            Create and manage the tour packages travelers can view.
          </p>
        </div>

        <div className="rounded-2xl border border-[#DCE5E0] bg-white p-8 shadow-sm">
          <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
            Profile required
          </span>

          <h2 className="mt-4 text-xl font-bold text-[#17211D]">
            Complete your guide profile first
          </h2>

          <p className="mt-2 max-w-xl text-sm leading-6 text-[#66756D]">
            Your professional profile must exist before you can create tour packages.
          </p>

          <Link
            to="/guide/profile"
            className="mt-6 inline-flex rounded-lg bg-[#08734F] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#075D42]"
          >
            Complete Profile
          </Link>
        </div>
      </section>
    );
  }

  const tourPackages = guide?.tourPackages ?? [];

  return (
    <section>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#17211D] md:text-3xl">My Tour Packages</h1>

          <p className="mt-1 text-sm text-[#66756D]">
            Create, edit, and manage your tour packages.
          </p>
        </div>

        <Link
          to="/guide/tours/new"
          className="inline-flex w-fit items-center justify-center rounded-lg bg-[#08734F] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#075D42]"
        >
          + Add New Package
        </Link>
      </div>

      {errorMessage && (
        <div
          className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div
          className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
          role="status"
        >
          {successMessage}
        </div>
      )}

      {tourPackages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#C9D7D0] bg-white px-6 py-14 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#E9F6F0] text-2xl">
            🧭
          </div>

          <h2 className="mt-4 text-lg font-bold text-[#17211D]">No tour packages yet</h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#66756D]">
            Create your first package with location, price, duration, availability, group size, and
            tour details.
          </p>

          <Link
            to="/guide/tours/new"
            className="mt-6 inline-flex rounded-lg bg-[#08734F] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#075D42]"
          >
            Create First Package
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {tourPackages.map((tourPackage) => {
            const firstPhoto = tourPackage.photos?.[0];

            const isDeleting = deletingPackageId === tourPackage._id;

            return (
              <article
                key={tourPackage._id}
                className="overflow-hidden rounded-2xl border border-[#DCE5E0] bg-white shadow-sm transition hover:shadow-md"
              >
                <div className="grid min-h-52 sm:grid-cols-[190px_1fr]">
                  <div className="relative min-h-44 bg-[#E4EFE9]">
                    {firstPhoto ? (
                      <img
                        src={firstPhoto}
                        alt={tourPackage.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full min-h-44 items-center justify-center bg-gradient-to-br from-[#D7EEE2] to-[#AFCFBE] px-5 text-center">
                        <div>
                          <div className="text-3xl">🗺️</div>

                          <p className="mt-2 text-xs font-semibold text-[#35644F]">Tour Package</p>
                        </div>
                      </div>
                    )}

                    <span
                      className={[
                        'absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize shadow-sm',
                        tourPackage.status === 'active'
                          ? 'bg-[#DDF1E5] text-[#08734F]'
                          : 'bg-slate-100 text-slate-600',
                      ].join(' ')}
                    >
                      {tourPackage.status}
                    </span>
                  </div>

                  <div className="flex flex-col p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-bold text-[#17211D]">{tourPackage.name}</h2>

                        <p className="mt-1 text-sm font-medium text-[#08734F]">
                          {tourPackage.location}
                        </p>
                      </div>

                      <p className="shrink-0 text-right">
                        <span className="block text-lg font-bold text-[#17211D]">
                          ৳{formatPrice(tourPackage.pricePerPerson)}
                        </span>

                        <span className="text-[11px] text-[#7C8982]">per person</span>
                      </p>
                    </div>

                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#66756D]">
                      {tourPackage.description}
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-[#56655D]">
                      <div className="rounded-lg bg-[#F6F8F7] px-3 py-2">
                        <span className="block text-[#8A9790]">Duration</span>

                        <strong className="mt-0.5 block font-semibold text-[#33413A]">
                          {tourPackage.durationDays}{' '}
                          {tourPackage.durationDays === 1 ? 'Day' : 'Days'}
                        </strong>
                      </div>

                      <div className="rounded-lg bg-[#F6F8F7] px-3 py-2">
                        <span className="block text-[#8A9790]">Max Group</span>

                        <strong className="mt-0.5 block font-semibold text-[#33413A]">
                          Up to {tourPackage.maxGroupSize} people
                        </strong>
                      </div>
                    </div>

                    {tourPackage.availableDates?.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs font-semibold text-[#44524B]">Next Available</p>

                        <p className="mt-1 text-xs text-[#66756D]">
                          {formatDate(tourPackage.availableDates[0])}
                          {tourPackage.availableDates.length > 1 &&
                            ` +${tourPackage.availableDates.length - 1} more`}
                        </p>
                      </div>
                    )}

                    <div className="mt-auto flex flex-wrap justify-end gap-2 pt-5">
                      <Link
                        to={`/guide/tours/${tourPackage._id}/edit`}
                        className="rounded-lg border border-[#08734F] px-4 py-2 text-xs font-semibold text-[#08734F] transition hover:bg-[#E9F6F0]"
                      >
                        Edit Package
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleDelete(tourPackage)}
                        disabled={isDeleting}
                        className="rounded-lg border border-red-200 px-4 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default GuideToursPage;
