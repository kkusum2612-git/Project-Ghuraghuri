import { useEffect, useState } from 'react';

import useAuth from '../../auth/hooks/useAuth';

import { createGuideProfile, getMyGuideProfile, updateGuideProfile } from '../api/guideApi';

function createInitialForm() {
  return {
    location: '',
    languages: '',
    specialties: '',
    bio: '',
    yearsOfExperience: '',
    photos: [''],
  };
}

function GuideProfilePage() {
  const { user } = useAuth();

  const [formData, setFormData] = useState(createInitialForm);

  const [profileExists, setProfileExists] = useState(false);

  const [isLoading, setIsLoading] = useState(true);

  const [isSaving, setIsSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');

  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    let ignore = false;

    async function loadProfile() {
      try {
        setIsLoading(true);
        setErrorMessage('');

        const result = await getMyGuideProfile();

        if (ignore) {
          return;
        }

        const guide = result?.data?.guide;

        setFormData({
          location: guide?.location ?? '',

          languages: guide?.languages?.join(', ') ?? '',

          specialties: guide?.specialties?.join(', ') ?? '',

          bio: guide?.bio ?? '',

          yearsOfExperience: String(guide?.yearsOfExperience ?? ''),

          photos: guide?.photos?.length ? guide.photos : [''],
        });

        setProfileExists(true);
      } catch (error) {
        if (ignore) {
          return;
        }

        if (error?.response?.status === 404) {
          setProfileExists(false);
          setFormData(createInitialForm());
        } else {
          setErrorMessage(error?.response?.data?.message || 'Unable to load your guide profile.');
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      ignore = true;
    };
  }, []);

  function updateField(event) {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function updatePhoto(index, value) {
    setFormData((current) => ({
      ...current,

      photos: current.photos.map((photo, photoIndex) => (photoIndex === index ? value : photo)),
    }));
  }

  function addPhoto() {
    setFormData((current) => ({
      ...current,

      photos: [...current.photos, ''],
    }));
  }

  function removePhoto(index) {
    setFormData((current) => ({
      ...current,

      photos:
        current.photos.length === 1
          ? ['']
          : current.photos.filter((_, photoIndex) => photoIndex !== index),
    }));
  }

  function parseCommaSeparated(value) {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function validateForm() {
    if (!formData.location.trim()) {
      return 'Location is required.';
    }

    if (parseCommaSeparated(formData.languages).length === 0) {
      return 'Please provide at least one language.';
    }

    if (parseCommaSeparated(formData.specialties).length === 0) {
      return 'Please provide at least one specialty.';
    }

    if (!formData.bio.trim()) {
      return 'Bio is required.';
    }

    const experience = Number(formData.yearsOfExperience);

    if (Number.isNaN(experience) || experience < 0) {
      return 'Years of experience must be 0 or greater.';
    }

    return '';
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setErrorMessage(validationError);
      setSuccessMessage('');
      return;
    }

    const payload = {
      location: formData.location.trim(),

      languages: parseCommaSeparated(formData.languages),

      specialties: parseCommaSeparated(formData.specialties),

      bio: formData.bio.trim(),

      yearsOfExperience: Number(formData.yearsOfExperience),

      photos: formData.photos.map((photo) => photo.trim()).filter(Boolean),
    };

    try {
      setIsSaving(true);
      setErrorMessage('');
      setSuccessMessage('');

      if (profileExists) {
        await updateGuideProfile(payload);

        setSuccessMessage('Guide profile updated successfully.');
      } else {
        await createGuideProfile(payload);

        setProfileExists(true);

        setSuccessMessage('Guide profile created successfully.');
      }
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || 'Unable to save your guide profile.');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <p className="text-sm font-medium text-[#66756D]" role="status">
          Loading guide profile...
        </p>
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#17211D] md:text-3xl">My Profile</h1>

        <p className="mt-1 text-sm text-[#66756D]">
          Manage the information travelers will see after your guide account is approved.
        </p>
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

      <form
        onSubmit={handleSubmit}
        className="overflow-hidden rounded-2xl border border-[#DCE5E0] bg-white shadow-sm"
      >
        <div className="border-b border-[#E5ECE8] p-6">
          <h2 className="text-lg font-bold text-[#17211D]">Account Information</h2>

          <p className="mt-1 text-sm text-[#66756D]">
            These details come from your registered Ghuraghuri account.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <label>
              <span className="text-sm font-medium text-[#44524B]">Full Name</span>

              <input
                type="text"
                value={user?.name || ''}
                disabled
                className="mt-1 w-full rounded-lg border border-[#D7E0DB] bg-[#F6F8F7] px-3 py-2.5 text-sm text-[#66756D]"
              />
            </label>

            <label>
              <span className="text-sm font-medium text-[#44524B]">Email</span>

              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="mt-1 w-full rounded-lg border border-[#D7E0DB] bg-[#F6F8F7] px-3 py-2.5 text-sm text-[#66756D]"
              />
            </label>

            <label>
              <span className="text-sm font-medium text-[#44524B]">Phone</span>

              <input
                type="text"
                value={user?.phone || ''}
                disabled
                className="mt-1 w-full rounded-lg border border-[#D7E0DB] bg-[#F6F8F7] px-3 py-2.5 text-sm text-[#66756D]"
              />
            </label>
          </div>
        </div>

        <div className="p-6">
          <h2 className="text-lg font-bold text-[#17211D]">Professional Information</h2>

          <p className="mt-1 text-sm text-[#66756D]">
            Tell travelers about your expertise and tour-guide experience.
          </p>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <label className="md:col-span-2">
              <span className="text-sm font-medium text-[#44524B]">
                Location
                <span className="text-red-500"> *</span>
              </span>

              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={updateField}
                placeholder="e.g. Dhaka, Bangladesh"
                required
                className="mt-1 w-full rounded-lg border border-[#CBD6D0] px-3 py-2.5 text-sm outline-none transition focus:border-[#08734F] focus:ring-1 focus:ring-[#08734F]"
              />
            </label>

            <label>
              <span className="text-sm font-medium text-[#44524B]">
                Languages
                <span className="text-red-500"> *</span>
              </span>

              <input
                type="text"
                name="languages"
                value={formData.languages}
                onChange={updateField}
                placeholder="Bangla, English"
                required
                className="mt-1 w-full rounded-lg border border-[#CBD6D0] px-3 py-2.5 text-sm outline-none transition focus:border-[#08734F] focus:ring-1 focus:ring-[#08734F]"
              />

              <span className="mt-1 block text-xs text-[#839088]">
                Separate multiple languages with commas.
              </span>
            </label>

            <label>
              <span className="text-sm font-medium text-[#44524B]">
                Specialties
                <span className="text-red-500"> *</span>
              </span>

              <input
                type="text"
                name="specialties"
                value={formData.specialties}
                onChange={updateField}
                placeholder="Cultural Tours, City Tours"
                required
                className="mt-1 w-full rounded-lg border border-[#CBD6D0] px-3 py-2.5 text-sm outline-none transition focus:border-[#08734F] focus:ring-1 focus:ring-[#08734F]"
              />

              <span className="mt-1 block text-xs text-[#839088]">
                Separate multiple specialties with commas.
              </span>
            </label>

            <label>
              <span className="text-sm font-medium text-[#44524B]">Years of Experience</span>

              <input
                type="number"
                name="yearsOfExperience"
                value={formData.yearsOfExperience}
                onChange={updateField}
                min="0"
                step="1"
                placeholder="0"
                className="mt-1 w-full rounded-lg border border-[#CBD6D0] px-3 py-2.5 text-sm outline-none transition focus:border-[#08734F] focus:ring-1 focus:ring-[#08734F]"
              />
            </label>

            <div />

            <label className="md:col-span-2">
              <span className="text-sm font-medium text-[#44524B]">
                Professional Bio
                <span className="text-red-500"> *</span>
              </span>

              <textarea
                name="bio"
                value={formData.bio}
                onChange={updateField}
                required
                maxLength={1000}
                rows={5}
                placeholder="Describe your experience, interests, and what travelers can expect from your tours..."
                className="mt-1 w-full resize-y rounded-lg border border-[#CBD6D0] px-3 py-2.5 text-sm outline-none transition focus:border-[#08734F] focus:ring-1 focus:ring-[#08734F]"
              />

              <span className="mt-1 block text-right text-xs text-[#839088]">
                {formData.bio.length}/1000
              </span>
            </label>
          </div>

          <div className="mt-8 border-t border-[#E5ECE8] pt-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[#17211D]">Guide Photos</h2>

                <p className="mt-1 text-sm text-[#66756D]">
                  Add photo URLs for your professional listing.
                </p>
              </div>

              <button
                type="button"
                onClick={addPhoto}
                className="rounded-lg border border-[#08734F] px-4 py-2 text-sm font-semibold text-[#08734F] transition hover:bg-[#E9F6F0]"
              >
                + Add Photo
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {formData.photos.map((photo, index) => (
                <div key={`photo-${index}`} className="flex gap-2">
                  <input
                    type="url"
                    value={photo}
                    onChange={(event) => updatePhoto(index, event.target.value)}
                    placeholder="https://example.com/guide-photo.jpg"
                    className="min-w-0 flex-1 rounded-lg border border-[#CBD6D0] px-3 py-2.5 text-sm outline-none transition focus:border-[#08734F] focus:ring-1 focus:ring-[#08734F]"
                  />

                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-[#E5ECE8] bg-[#FAFBFA] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[#7B8881]">
            Your listing becomes public only after administrator approval.
          </p>

          <button
            type="submit"
            disabled={isSaving}
            className="rounded-lg bg-[#08734F] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#075D42] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? 'Saving...' : profileExists ? 'Save Changes' : 'Create Profile'}
          </button>
        </div>
      </form>
    </section>
  );
}

export default GuideProfilePage;
