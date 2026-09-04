import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { getMyGuideProfile } from '../api/guideApi';

function GuideDashboardPage() {
  const [guide, setGuide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileMissing, setProfileMissing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let ignore = false;

    async function loadGuide() {
      try {
        setLoading(true);
        setErrorMessage('');

        const response = await getMyGuideProfile();

        if (!ignore) {
          setGuide(response.data.guide);
          setProfileMissing(false);
        }
      } catch (error) {
        if (ignore) {
          return;
        }

        if (error?.response?.status === 404) {
          setProfileMissing(true);
          setGuide(null);
        } else {
          setErrorMessage(error?.response?.data?.message || 'Unable to load your guide dashboard.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadGuide();

    return () => {
      ignore = true;
    };
  }, []);
  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <p className="text-sm font-medium text-[#66756D]">Loading guide dashboard...</p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5">
        <h2 className="font-semibold text-red-800">Unable to load dashboard</h2>

        <p className="mt-1 text-sm text-red-700">{errorMessage}</p>
      </div>
    );
  }

  if (profileMissing) {
    return (
      <section>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#17211D]">Guide Dashboard</h1>

          <p className="mt-1 text-sm text-[#66756D]">
            Complete your guide profile to start creating tour packages.
          </p>
        </div>

        <div className="rounded-2xl border border-[#DCE5E0] bg-white p-8 shadow-sm">
          <div className="max-w-xl">
            <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
              Profile incomplete
            </span>

            <h2 className="mt-4 text-xl font-bold text-[#17211D]">
              Set up your professional guide profile
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#66756D]">
              Add your location, languages, specialties, experience, bio, and photos before
              submitting your guide information for review.
            </p>

            <Link
              to="/guide/profile"
              className="mt-6 inline-flex rounded-lg bg-[#08734F] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#075D42]"
            >
              Complete Profile
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const tourPackages = guide?.tourPackages || [];

  const activePackages = tourPackages.filter(
    (tourPackage) => tourPackage.status === 'active'
  ).length;

  const draftPackages = tourPackages.filter((tourPackage) => tourPackage.status === 'draft').length;

  const profileFields = [
    guide?.location,
    guide?.bio,
    guide?.languages?.length,
    guide?.specialties?.length,
  ];

  const completedFields = profileFields.filter(Boolean).length;

  const profileCompletion = Math.round((completedFields / profileFields.length) * 100);

  const stats = [
    {
      label: 'Profile Completion',
      value: `${profileCompletion}%`,
    },
    {
      label: 'Total Packages',
      value: tourPackages.length,
    },
    {
      label: 'Active Packages',
      value: activePackages,
    },
    {
      label: 'Draft Packages',
      value: draftPackages,
    },
  ];

  return (
    <section>
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#17211D]">Guide Dashboard</h1>

          <p className="mt-1 text-sm text-[#66756D]">
            Manage your professional profile and tour packages.
          </p>
        </div>

        <Link
          to="/guide/tours"
          className="inline-flex w-fit rounded-lg bg-[#08734F] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#075D42]"
        >
          Manage Tours
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <article
            key={stat.label}
            className="rounded-2xl border border-[#DCE5E0] bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-[#66756D]">{stat.label}</p>

            <p className="mt-2 text-2xl font-bold text-[#17211D]">{stat.value}</p>
          </article>
        ))}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <article className="rounded-2xl border border-[#DCE5E0] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-[#17211D]">Professional Profile</h2>

          <p className="mt-2 text-sm leading-6 text-[#66756D]">
            Keep your location, languages, specialties, bio, and experience information accurate.
          </p>

          <Link
            to="/guide/profile"
            className="mt-5 inline-flex rounded-lg border border-[#08734F] px-4 py-2 text-sm font-semibold text-[#08734F] transition hover:bg-[#E9F6F0]"
          >
            Edit Profile
          </Link>
        </article>

        <article className="rounded-2xl border border-[#DCE5E0] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-[#17211D]">Tour Packages</h2>

          <p className="mt-2 text-sm leading-6 text-[#66756D]">
            Create and manage packages with pricing, availability, group size, inclusions, and
            photos.
          </p>

          <Link
            to="/guide/tours"
            className="mt-5 inline-flex rounded-lg border border-[#08734F] px-4 py-2 text-sm font-semibold text-[#08734F] transition hover:bg-[#E9F6F0]"
          >
            View My Tours
          </Link>
        </article>
      </div>
    </section>
  );
}

export default GuideDashboardPage;
