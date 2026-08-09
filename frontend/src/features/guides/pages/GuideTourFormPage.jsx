import { useEffect, useState } from 'react';

import { useNavigate, useParams } from 'react-router-dom';

import { createTourPackage, getMyGuideProfile, updateTourPackage } from '../api/guideApi';

function createInitialForm() {
  return {
    name: '',
    location: '',
    durationDays: '',
    pricePerPerson: '',
    maxGroupSize: '',
    description: '',
    availableDates: [''],
    inclusions: [''],
    exclusions: [''],
    photos: [''],
    status: 'active',
  };
}

function formatDateForInput(date) {
  if (!date) {
    return '';
  }

  return new Date(date).toISOString().slice(0, 10);
}

function GuideTourFormPage() {
  const { packageId } = useParams();
  const navigate = useNavigate();

  const isEditMode = Boolean(packageId);

  const [formData, setFormData] = useState(createInitialForm);

  const [isLoading, setIsLoading] = useState(isEditMode);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isEditMode) {
      return undefined;
    }

    let ignore = false;

    getMyGuideProfile()
      .then((result) => {
        if (ignore) {
          return;
        }

        const packages = result?.data?.guide?.tourPackages ?? [];

        const tourPackage = packages.find((item) => item._id === packageId);

        if (!tourPackage) {
          throw new Error('Tour package not found.');
        }

        setFormData({
          name: tourPackage.name ?? '',

          location: tourPackage.location ?? '',

          durationDays: String(tourPackage.durationDays ?? ''),

          pricePerPerson: String(tourPackage.pricePerPerson ?? ''),

          maxGroupSize: String(tourPackage.maxGroupSize ?? ''),

          description: tourPackage.description ?? '',

          availableDates: tourPackage.availableDates?.length
            ? tourPackage.availableDates.map(formatDateForInput)
            : [''],

          inclusions: tourPackage.inclusions?.length ? tourPackage.inclusions : [''],

          exclusions: tourPackage.exclusions?.length ? tourPackage.exclusions : [''],

          photos: tourPackage.photos?.length ? tourPackage.photos : [''],

          status: tourPackage.status ?? 'active',
        });
      })
      .catch((error) => {
        if (!ignore) {
          setErrorMessage(
            error?.response?.data?.message || error.message || 'Unable to load the tour package.'
          );
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
  }, [isEditMode, packageId]);

  function updateField(event) {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function updateArrayField(field, index, value) {
    setFormData((current) => ({
      ...current,

      [field]: current[field].map((item, itemIndex) => (itemIndex === index ? value : item)),
    }));
  }

  function addArrayField(field) {
    setFormData((current) => ({
      ...current,

      [field]: [...current[field], ''],
    }));
  }

  function removeArrayField(field, index) {
    setFormData((current) => ({
      ...current,

      [field]:
        current[field].length === 1
          ? ['']
          : current[field].filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function cleanStringArray(values) {
    return values.map((value) => value.trim()).filter(Boolean);
  }

  function validateForm() {
    if (!formData.name.trim()) {
      return 'Package name is required.';
    }

    if (!formData.location.trim()) {
      return 'Location is required.';
    }

    if (!formData.description.trim()) {
      return 'Description is required.';
    }

    const duration = Number(formData.durationDays);

    if (Number.isNaN(duration) || duration < 1) {
      return 'Duration must be at least 1 day.';
    }

    const price = Number(formData.pricePerPerson);

    if (Number.isNaN(price) || price < 0) {
      return 'Price must be 0 or greater.';
    }

    const groupSize = Number(formData.maxGroupSize);

    if (Number.isNaN(groupSize) || groupSize < 1) {
      return 'Maximum group size must be at least 1.';
    }

    if (cleanStringArray(formData.availableDates).length === 0) {
      return 'Please provide at least one available date.';
    }

    return '';
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setErrorMessage(validationError);

      return;
    }

    const payload = {
      name: formData.name.trim(),

      location: formData.location.trim(),

      durationDays: Number(formData.durationDays),

      pricePerPerson: Number(formData.pricePerPerson),

      maxGroupSize: Number(formData.maxGroupSize),

      description: formData.description.trim(),

      availableDates: cleanStringArray(formData.availableDates),

      inclusions: cleanStringArray(formData.inclusions),

      exclusions: cleanStringArray(formData.exclusions),

      photos: cleanStringArray(formData.photos),

      status: formData.status,
    };

    try {
      setIsSubmitting(true);
      setErrorMessage('');

      if (isEditMode) {
        await updateTourPackage(packageId, payload);
      } else {
        await createTourPackage(payload);
      }

      navigate('/guide/tours', {
        replace: true,
      });
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || 'Unable to save the tour package.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <p className="text-sm font-medium text-[#66756D]" role="status">
          Loading tour package...
        </p>
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-6xl">
      <div className="mb-6">
        <button
          type="button"
          onClick={() => navigate('/guide/tours')}
          className="mb-3 text-sm font-semibold text-[#08734F] hover:underline"
        >
          ← Back to My Tours
        </button>

        <h1 className="text-2xl font-bold text-[#17211D] md:text-3xl">
          {isEditMode ? 'Edit Tour Package' : 'Create Tour Package'}
        </h1>

        <p className="mt-1 text-sm text-[#66756D]">
          Add the details travelers need to understand and book your tour.
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

      <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-[#DCE5E0] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-[#17211D]">Basic Information</h2>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <label className="md:col-span-2">
                <span className="text-sm font-medium text-[#44524B]">Package Name *</span>

                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={updateField}
                  required
                  placeholder="e.g. Old Dhaka Cultural Experience"
                  className="mt-1 w-full rounded-lg border border-[#CBD6D0] px-3 py-2.5 text-sm outline-none focus:border-[#08734F] focus:ring-1 focus:ring-[#08734F]"
                />
              </label>

              <label className="md:col-span-2">
                <span className="text-sm font-medium text-[#44524B]">Location *</span>

                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={updateField}
                  required
                  placeholder="e.g. Old Dhaka, Bangladesh"
                  className="mt-1 w-full rounded-lg border border-[#CBD6D0] px-3 py-2.5 text-sm outline-none focus:border-[#08734F] focus:ring-1 focus:ring-[#08734F]"
                />
              </label>

              <label>
                <span className="text-sm font-medium text-[#44524B]">Duration (Days) *</span>

                <input
                  type="number"
                  name="durationDays"
                  value={formData.durationDays}
                  onChange={updateField}
                  min="1"
                  step="1"
                  required
                  placeholder="1"
                  className="mt-1 w-full rounded-lg border border-[#CBD6D0] px-3 py-2.5 text-sm outline-none focus:border-[#08734F] focus:ring-1 focus:ring-[#08734F]"
                />
              </label>

              <label>
                <span className="text-sm font-medium text-[#44524B]">Maximum Group Size *</span>

                <input
                  type="number"
                  name="maxGroupSize"
                  value={formData.maxGroupSize}
                  onChange={updateField}
                  min="1"
                  step="1"
                  required
                  placeholder="8"
                  className="mt-1 w-full rounded-lg border border-[#CBD6D0] px-3 py-2.5 text-sm outline-none focus:border-[#08734F] focus:ring-1 focus:ring-[#08734F]"
                />
              </label>

              <label>
                <span className="text-sm font-medium text-[#44524B]">Price Per Person (৳) *</span>

                <input
                  type="number"
                  name="pricePerPerson"
                  value={formData.pricePerPerson}
                  onChange={updateField}
                  min="0"
                  step="1"
                  required
                  placeholder="1500"
                  className="mt-1 w-full rounded-lg border border-[#CBD6D0] px-3 py-2.5 text-sm outline-none focus:border-[#08734F] focus:ring-1 focus:ring-[#08734F]"
                />
              </label>

              <label>
                <span className="text-sm font-medium text-[#44524B]">Status</span>

                <select
                  name="status"
                  value={formData.status}
                  onChange={updateField}
                  className="mt-1 w-full rounded-lg border border-[#CBD6D0] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#08734F] focus:ring-1 focus:ring-[#08734F]"
                >
                  <option value="active">Active</option>

                  <option value="draft">Draft</option>
                </select>
              </label>

              <label className="md:col-span-2">
                <span className="text-sm font-medium text-[#44524B]">Description *</span>

                <textarea
                  name="description"
                  value={formData.description}
                  onChange={updateField}
                  rows={6}
                  maxLength={2000}
                  required
                  placeholder="Describe the tour experience, important locations, activities, and what travelers should expect..."
                  className="mt-1 w-full resize-y rounded-lg border border-[#CBD6D0] px-3 py-2.5 text-sm outline-none focus:border-[#08734F] focus:ring-1 focus:ring-[#08734F]"
                />

                <span className="mt-1 block text-right text-xs text-[#839088]">
                  {formData.description.length}
                  /2000
                </span>
              </label>
            </div>
          </div>

          <ArraySection
            title="What's Included"
            description="Add services or items included with this package."
            values={formData.inclusions}
            placeholder="e.g. Professional guide"
            addLabel="+ Add Inclusion"
            onChange={(index, value) => updateArrayField('inclusions', index, value)}
            onAdd={() => addArrayField('inclusions')}
            onRemove={(index) => removeArrayField('inclusions', index)}
          />

          <ArraySection
            title="What's Not Included"
            description="Tell travelers about expenses that are not covered."
            values={formData.exclusions}
            placeholder="e.g. Personal expenses"
            addLabel="+ Add Exclusion"
            onChange={(index, value) => updateArrayField('exclusions', index, value)}
            onAdd={() => addArrayField('exclusions')}
            onRemove={(index) => removeArrayField('exclusions', index)}
          />

          <ArraySection
            title="Package Photos"
            description="Add image URLs that represent this tour."
            values={formData.photos}
            placeholder="https://example.com/tour-photo.jpg"
            addLabel="+ Add Photo"
            inputType="url"
            onChange={(index, value) => updateArrayField('photos', index, value)}
            onAdd={() => addArrayField('photos')}
            onRemove={(index) => removeArrayField('photos', index)}
          />
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-[#DCE5E0] bg-white p-6 shadow-sm xl:sticky xl:top-24">
            <h2 className="text-lg font-bold text-[#17211D]">Availability</h2>

            <p className="mt-1 text-sm leading-6 text-[#66756D]">
              Select at least one date when this package is available.
            </p>

            <div className="mt-5 space-y-3">
              {formData.availableDates.map((date, index) => (
                <div key={`date-${index}`} className="flex gap-2">
                  <input
                    type="date"
                    value={date}
                    onChange={(event) =>
                      updateArrayField('availableDates', index, event.target.value)
                    }
                    className="min-w-0 flex-1 rounded-lg border border-[#CBD6D0] px-3 py-2.5 text-sm outline-none focus:border-[#08734F] focus:ring-1 focus:ring-[#08734F]"
                  />

                  <button
                    type="button"
                    onClick={() => removeArrayField('availableDates', index)}
                    className="rounded-lg border border-red-200 px-3 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => addArrayField('availableDates')}
              className="mt-3 text-sm font-semibold text-[#08734F] hover:underline"
            >
              + Add Another Date
            </button>

            <div className="my-6 border-t border-[#E5ECE8]" />

            <div className="rounded-xl bg-[#F6F8F7] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#7B8881]">
                Package Summary
              </p>

              <p className="mt-3 font-bold text-[#17211D]">{formData.name || 'Untitled Package'}</p>

              <p className="mt-1 text-sm text-[#66756D]">
                {formData.location || 'Location not added'}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[#839088]">Price</span>

                  <p className="mt-0.5 font-semibold text-[#33413A]">
                    ৳{formData.pricePerPerson || '0'}
                  </p>
                </div>

                <div>
                  <span className="text-[#839088]">Group</span>

                  <p className="mt-0.5 font-semibold text-[#33413A]">
                    {formData.maxGroupSize || '0'} people
                  </p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-6 w-full rounded-lg bg-[#08734F] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#075D42] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Package'}
            </button>

            <button
              type="button"
              onClick={() => navigate('/guide/tours')}
              disabled={isSubmitting}
              className="mt-2 w-full rounded-lg border border-[#CBD6D0] px-5 py-3 text-sm font-semibold text-[#44524B] transition hover:bg-[#F6F8F7]"
            >
              Cancel
            </button>
          </div>
        </aside>
      </form>
    </section>
  );
}

function ArraySection({
  title,
  description,
  values,
  placeholder,
  addLabel,
  inputType = 'text',
  onChange,
  onAdd,
  onRemove,
}) {
  return (
    <div className="rounded-2xl border border-[#DCE5E0] bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#17211D]">{title}</h2>

          <p className="mt-1 text-sm text-[#66756D]">{description}</p>
        </div>

        <button
          type="button"
          onClick={onAdd}
          className="rounded-lg border border-[#08734F] px-3 py-2 text-xs font-semibold text-[#08734F] transition hover:bg-[#E9F6F0]"
        >
          {addLabel}
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {values.map((value, index) => (
          <div key={`${title}-${index}`} className="flex gap-2">
            <input
              type={inputType}
              value={value}
              onChange={(event) => onChange(index, event.target.value)}
              placeholder={placeholder}
              className="min-w-0 flex-1 rounded-lg border border-[#CBD6D0] px-3 py-2.5 text-sm outline-none focus:border-[#08734F] focus:ring-1 focus:ring-[#08734F]"
            />

            <button
              type="button"
              onClick={() => onRemove(index)}
              className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default GuideTourFormPage;
