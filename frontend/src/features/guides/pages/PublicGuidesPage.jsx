import { useEffect, useState } from 'react';

import { getPublicGuides } from '../api/guideApi';

function PublicGuidesPage() {
  const [guides, setGuides] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

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

        setErrorMessage(error?.response?.data?.message || 'Unable to load guides.');
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
      <section className="mx-auto max-w-7xl px-5 py-10">
        <p className="text-center text-sm text-[#66756D]" role="status">
          Loading guides...
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-5 py-10">
      <div className="mb-8">
        <p className="text-sm text-[#7B8881]">Home / Guides</p>

        <h1 className="mt-2 text-3xl font-bold text-[#17211D]">
          Find the Perfect Guide for Your Trip
        </h1>

        <p className="mt-2 text-sm text-[#66756D]">
          Browse verified local guides and discover their available tour packages.
        </p>
      </div>

      {errorMessage && (
        <div
          className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {errorMessage}
        </div>
      )}

      {!errorMessage && guides.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[#C9D7D0] bg-white px-6 py-16 text-center">
          <div className="text-4xl">🧭</div>

          <h2 className="mt-4 text-xl font-bold text-[#17211D]">No approved guides yet</h2>

          <p className="mt-2 text-sm text-[#66756D]">Approved guide profiles will appear here.</p>
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {guides.map((guide) => {
          const user = guide.userId;

          const firstPhoto = guide.photos?.[0] || user?.profileImageUrl;

          const minimumPrice = guide.tourPackages?.length
            ? Math.min(...guide.tourPackages.map((tourPackage) => tourPackage.pricePerPerson))
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
                    alt={user?.name || 'Guide'}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-4xl">🏞️</div>
                )}

                <div className="absolute bottom-3 left-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-[#E9F6F0] text-xl font-bold text-[#08734F] shadow-sm">
                  {user?.profileImageUrl ? (
                    <img
                      src={user.profileImageUrl}
                      alt={user.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    user?.name?.charAt(0)?.toUpperCase() || 'G'
                  )}
                </div>
              </div>

              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-[#17211D]">
                      {user?.name || 'Local Guide'}
                    </h2>

                    <span className="mt-1 inline-flex rounded-full bg-[#DDF1E5] px-2.5 py-1 text-[11px] font-semibold text-[#08734F]">
                      Verified Guide
                    </span>
                  </div>

                  {minimumPrice !== null && (
                    <div className="text-right">
                      <p className="font-bold text-[#17211D]">
                        ৳{new Intl.NumberFormat('en-BD').format(minimumPrice)}
                      </p>

                      <p className="text-[11px] text-[#7B8881]">from / person</p>
                    </div>
                  )}
                </div>

                <p className="mt-4 text-sm text-[#66756D]">📍 {guide.location}</p>

                <p className="mt-1 text-sm text-[#66756D]">
                  Languages: {guide.languages?.join(', ')}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {guide.specialties?.map((specialty) => (
                    <span
                      key={specialty}
                      className="rounded-full bg-[#F1F5F3] px-3 py-1 text-xs text-[#526159]"
                    >
                      {specialty}
                    </span>
                  ))}
                </div>

                <p className="mt-4 line-clamp-3 text-sm leading-6 text-[#66756D]">{guide.bio}</p>

                <div className="mt-5 border-t border-[#E5ECE8] pt-4">
                  <p className="mb-3 text-xs text-[#7B8881]">
                    {guide.tourPackages?.length} active tour
                    {guide.tourPackages?.length === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default PublicGuidesPage;
