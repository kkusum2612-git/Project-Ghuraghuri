import {
  useEffect,
  useState,
} from 'react';

import {
  useNavigate,
  useParams,
} from 'react-router-dom';

import {
  createHotel,
  getVendorHotelById,
  updateHotel,
} from '../api/hotelApi';

const AMENITY_OPTIONS = [
  'Free WiFi',
  'Breakfast',
  'Air Conditioning',
  'Swimming Pool',
  'Sea View',
  'Parking',
];

function createEmptyRoom() {
  return {
    name: '',
    capacity: '',
    availableRooms: '',
    pricePerNight: '',
  };
}

function createInitialForm() {
  return {
    name: '',
    location: {
      city: '',
      address: '',
    },
    description: '',
    photos: [''],
    amenities: [],
    roomTypes: [
      createEmptyRoom(),
    ],
    status: 'active',
  };
}

function HotelFormPage() {
  const { hotelId } = useParams();
  const navigate = useNavigate();

  const isEditMode = Boolean(hotelId);

  const [
    formData,
    setFormData,
  ] = useState(createInitialForm);

  const [
    isLoading,
    setIsLoading,
  ] = useState(isEditMode);

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    formError,
    setFormError,
  ] = useState('');

  useEffect(() => {
    if (!isEditMode) {
      return undefined;
    }

    let ignoreResult = false;

    async function loadHotel() {
      try {
        const result =
          await getVendorHotelById(hotelId);

        if (ignoreResult) {
          return;
        }

        const hotel =
          result?.data?.hotel;

        if (!hotel) {
          throw new Error(
            'Hotel information was not returned.'
          );
        }

        setFormData({
          name:
            hotel.name ?? '',

          location: {
            city:
              hotel.location?.city ?? '',
            address:
              hotel.location?.address ?? '',
          },

          description:
            hotel.description ?? '',

          photos:
            hotel.photos?.length
              ? hotel.photos
              : [''],

          amenities:
            hotel.amenities ?? [],

          roomTypes:
            hotel.roomTypes?.length
              ? hotel.roomTypes.map(
                  (room) => ({
                    _id: room._id,
                    name:
                      room.name ?? '',
                    capacity:
                      String(
                        room.capacity ?? ''
                      ),
                    availableRooms:
                      String(
                        room.availableRooms ?? ''
                      ),
                    pricePerNight:
                      String(
                        room.pricePerNight ?? ''
                      ),
                  })
                )
              : [createEmptyRoom()],

          status:
            hotel.status ?? 'active',
        });
      } catch (error) {
        if (!ignoreResult) {
          setFormError(
            error.response?.data?.message ||
              'Unable to load this hotel listing.'
          );
        }
      } finally {
        if (!ignoreResult) {
          setIsLoading(false);
        }
      }
    }

    void loadHotel();

    return () => {
      ignoreResult = true;
    };
  }, [
    hotelId,
    isEditMode,
  ]);

  function updateBasicField(event) {
    const {
      name,
      value,
    } = event.target;

    setFormData(
      (current) => ({
        ...current,
        [name]: value,
      })
    );
  }

  function updateLocation(event) {
    const {
      name,
      value,
    } = event.target;

    setFormData(
      (current) => ({
        ...current,
        location: {
          ...current.location,
          [name]: value,
        },
      })
    );
  }

  function updatePhoto(index, value) {
    setFormData(
      (current) => ({
        ...current,
        photos:
          current.photos.map(
            (photo, photoIndex) =>
              photoIndex === index
                ? value
                : photo
          ),
      })
    );
  }

  function addPhoto() {
    setFormData(
      (current) => ({
        ...current,
        photos: [
          ...current.photos,
          '',
        ],
      })
    );
  }

  function removePhoto(index) {
    setFormData(
      (current) => ({
        ...current,
        photos:
          current.photos.length === 1
            ? ['']
            : current.photos.filter(
                (_, photoIndex) =>
                  photoIndex !== index
              ),
      })
    );
  }

  function toggleAmenity(amenity) {
    setFormData(
      (current) => {
        const selected =
          current.amenities.includes(
            amenity
          );

        return {
          ...current,

          amenities: selected
            ? current.amenities.filter(
                (item) =>
                  item !== amenity
              )
            : [
                ...current.amenities,
                amenity,
              ],
        };
      }
    );
  }

  function updateRoom(
    index,
    field,
    value
  ) {
    setFormData(
      (current) => ({
        ...current,

        roomTypes:
          current.roomTypes.map(
            (room, roomIndex) =>
              roomIndex === index
                ? {
                    ...room,
                    [field]: value,
                  }
                : room
          ),
      })
    );
  }

  function addRoomType() {
    setFormData(
      (current) => ({
        ...current,

        roomTypes: [
          ...current.roomTypes,
          createEmptyRoom(),
        ],
      })
    );
  }

  function removeRoomType(index) {
    if (
      formData.roomTypes.length <= 1
    ) {
      return;
    }

    setFormData(
      (current) => ({
        ...current,

        roomTypes:
          current.roomTypes.filter(
            (_, roomIndex) =>
              roomIndex !== index
          ),
      })
    );
  }

  function validateForm() {
    if (!formData.name.trim()) {
      return 'Hotel name is required.';
    }

    if (
      !formData.location.city.trim()
    ) {
      return 'Hotel city is required.';
    }

    if (
      !formData.location.address.trim()
    ) {
      return 'Hotel address is required.';
    }

    if (!formData.description.trim()) {
      return 'Hotel description is required.';
    }

    for (
      let index = 0;
      index < formData.roomTypes.length;
      index += 1
    ) {
      const room =
        formData.roomTypes[index];

      if (!room.name.trim()) {
        return `Room type ${
          index + 1
        } needs a name.`;
      }

      if (
        Number(room.capacity) < 1
      ) {
        return `Room type ${
          index + 1
        } needs a valid capacity.`;
      }

      if (
        Number(room.availableRooms) < 0
      ) {
        return `Room type ${
          index + 1
        } has an invalid available room count.`;
      }

      if (
        Number(room.pricePerNight) < 0
      ) {
        return `Room type ${
          index + 1
        } has an invalid price.`;
      }
    }

    return '';
  }

  async function submitHotel(status) {
    const validationError =
      validateForm();

    if (validationError) {
      setFormError(
        validationError
      );
      return;
    }

    setFormError('');
    setIsSubmitting(true);

    const payload = {
      name:
        formData.name.trim(),

      location: {
        city:
          formData.location.city.trim(),

        address:
          formData.location.address.trim(),
      },

      description:
        formData.description.trim(),

      photos:
        formData.photos
          .map((photo) =>
            photo.trim()
          )
          .filter(Boolean),

      amenities:
        formData.amenities,

      roomTypes:
        formData.roomTypes.map(
          (room) => ({
            ...(room._id
              ? {
                  _id: room._id,
                }
              : {}),

            name:
              room.name.trim(),

            capacity:
              Number(
                room.capacity
              ),

            availableRooms:
              Number(
                room.availableRooms
              ),

            pricePerNight:
              Number(
                room.pricePerNight
              ),
          })
        ),

      status,
    };

    try {
      if (isEditMode) {
        await updateHotel(
          hotelId,
          payload
        );
      } else {
        await createHotel(
          payload
        );
      }

      navigate(
        '/hotel/dashboard#listings'
      );
    } catch (error) {
      setFormError(
        error.response?.data?.message ||
          'Unable to save the hotel listing.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();

    void submitHotel('active');
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm font-medium text-[#66756D]">
          Loading hotel information...
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Page heading */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-[#17211D] md:text-3xl">
          {isEditMode
            ? 'Edit Hotel'
            : 'Add New Hotel'}
        </h1>

        <p className="mt-1 text-sm text-[#66756D]">
          {isEditMode
            ? 'Update your hotel listing information'
            : 'Create a new hotel listing with basic details'}
        </p>
      </div>

      {formError && (
        <div
          className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {formError}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="overflow-hidden rounded-xl border border-[#DCE5E0] bg-white shadow-sm"
      >
        <div className="grid lg:grid-cols-2">

          {/* LEFT SIDE */}
          <div className="border-b border-[#DCE5E0] p-5 lg:border-b-0 lg:border-r">

            {/* 1. BASIC INFORMATION */}
            <section>
              <h2 className="font-bold text-[#17211D]">
                1. Basic Information
              </h2>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label>
                  <span className="text-sm font-medium text-[#44524B]">
                    Hotel Name
                  </span>

                  <input
                    type="text"
                    name="name"
                    required
                    value={
                      formData.name
                    }
                    onChange={
                      updateBasicField
                    }
                    placeholder="Enter hotel name"
                    className="mt-1 w-full rounded-lg border border-[#CBD6D0] px-3 py-2.5 text-sm outline-none focus:border-[#0F6B4D] focus:ring-1 focus:ring-[#0F6B4D]"
                  />
                </label>

                <label>
                  <span className="text-sm font-medium text-[#44524B]">
                    City
                  </span>

                  <input
                    type="text"
                    name="city"
                    required
                    value={
                      formData.location.city
                    }
                    onChange={
                      updateLocation
                    }
                    placeholder="Cox's Bazar"
                    className="mt-1 w-full rounded-lg border border-[#CBD6D0] px-3 py-2.5 text-sm outline-none focus:border-[#0F6B4D] focus:ring-1 focus:ring-[#0F6B4D]"
                  />
                </label>
              </div>

              <label className="mt-4 block">
                <span className="text-sm font-medium text-[#44524B]">
                  Full Address
                </span>

                <input
                  type="text"
                  name="address"
                  required
                  value={
                    formData.location.address
                  }
                  onChange={
                    updateLocation
                  }
                  placeholder="Enter full hotel address"
                  className="mt-1 w-full rounded-lg border border-[#CBD6D0] px-3 py-2.5 text-sm outline-none focus:border-[#0F6B4D]"
                />
              </label>

              <label className="mt-4 block">
                <span className="text-sm font-medium text-[#44524B]">
                  Short Description
                </span>

                <textarea
                  name="description"
                  required
                  rows="4"
                  value={
                    formData.description
                  }
                  onChange={
                    updateBasicField
                  }
                  placeholder="Describe your hotel, nearby attractions and what makes it special"
                  className="mt-1 w-full resize-none rounded-lg border border-[#CBD6D0] px-3 py-2.5 text-sm outline-none focus:border-[#0F6B4D]"
                />
              </label>
            </section>

            {/* 3. ROOM TYPES */}
            <section className="mt-7 border-t border-[#E5ECE8] pt-6">
              <h2 className="font-bold text-[#17211D]">
                3. Room Type & Pricing
              </h2>

              <div className="mt-4 overflow-x-auto rounded-lg border border-[#DCE5E0]">
                <table className="w-full min-w-[560px]">
                  <thead className="bg-[#F0F2F1]">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs">
                        Room Type
                      </th>

                      <th className="px-3 py-2 text-left text-xs">
                        Capacity
                      </th>

                      <th className="px-3 py-2 text-left text-xs">
                        Available Rooms
                      </th>

                      <th className="px-3 py-2 text-left text-xs">
                        Price / Night
                      </th>

                      <th className="px-3 py-2 text-center text-xs">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#E5ECE8]">
                    {formData.roomTypes.map(
                      (room, index) => (
                        <tr
                          key={
                            room._id ||
                            index
                          }
                        >
                          <td className="p-2">
                            <input
                              type="text"
                              required
                              placeholder="Deluxe Room"
                              value={
                                room.name
                              }
                              onChange={(
                                event
                              ) =>
                                updateRoom(
                                  index,
                                  'name',
                                  event.target.value
                                )
                              }
                              className="w-full rounded border border-[#D4DED9] px-2 py-2 text-xs"
                            />
                          </td>

                          <td className="p-2">
                            <input
                              type="number"
                              min="1"
                              required
                              placeholder="2"
                              value={
                                room.capacity
                              }
                              onChange={(
                                event
                              ) =>
                                updateRoom(
                                  index,
                                  'capacity',
                                  event.target.value
                                )
                              }
                              className="w-full rounded border border-[#D4DED9] px-2 py-2 text-xs"
                            />
                          </td>

                          <td className="p-2">
                            <input
                              type="number"
                              min="0"
                              required
                              placeholder="10"
                              value={
                                room.availableRooms
                              }
                              onChange={(
                                event
                              ) =>
                                updateRoom(
                                  index,
                                  'availableRooms',
                                  event.target.value
                                )
                              }
                              className="w-full rounded border border-[#D4DED9] px-2 py-2 text-xs"
                            />
                          </td>

                          <td className="p-2">
                            <input
                              type="number"
                              min="0"
                              required
                              placeholder="5000"
                              value={
                                room.pricePerNight
                              }
                              onChange={(
                                event
                              ) =>
                                updateRoom(
                                  index,
                                  'pricePerNight',
                                  event.target.value
                                )
                              }
                              className="w-full rounded border border-[#D4DED9] px-2 py-2 text-xs"
                            />
                          </td>

                          <td className="p-2 text-center">
                            <button
                              type="button"
                              disabled={
                                formData.roomTypes.length ===
                                1
                              }
                              onClick={() =>
                                removeRoomType(
                                  index
                                )
                              }
                              className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                onClick={
                  addRoomType
                }
                className="mt-3 rounded-md border border-[#79B993] bg-[#EEF7F2] px-4 py-2 text-sm font-semibold text-[#0F6B4D] hover:bg-[#DFF0E6]"
              >
                + Add Room Type
              </button>
            </section>
          </div>

          {/* RIGHT SIDE */}
          <div className="p-5">

            {/* 2. PHOTOS */}
            <section>
              <h2 className="font-bold text-[#17211D]">
                2. Photos
              </h2>

              <p className="mt-1 text-xs text-[#66756D]">
                Add public image URLs for your hotel.
              </p>

              <div className="mt-4 space-y-3">
                {formData.photos.map(
                  (photo, index) => (
                    <div
                      key={index}
                      className="flex gap-2"
                    >
                      <input
                        type="url"
                        value={photo}
                        onChange={(
                          event
                        ) =>
                          updatePhoto(
                            index,
                            event.target.value
                          )
                        }
                        placeholder="https://example.com/hotel.jpg"
                        className="min-w-0 flex-1 rounded-lg border border-[#CBD6D0] px-3 py-2.5 text-sm outline-none focus:border-[#0F6B4D]"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          removePhoto(
                            index
                          )
                        }
                        className="rounded-lg border border-red-200 px-3 text-sm font-semibold text-red-600 hover:bg-red-50"
                      >
                        ×
                      </button>
                    </div>
                  )
                )}
              </div>

              <button
                type="button"
                onClick={
                  addPhoto
                }
                className="mt-3 text-sm font-semibold text-[#0F6B4D]"
              >
                + Add another photo
              </button>

              {/* Photo previews */}
              <div className="mt-4 grid grid-cols-3 gap-2">
                {formData.photos
                  .filter(Boolean)
                  .slice(0, 6)
                  .map(
                    (photo, index) => (
                      <div
                        key={`${photo}-${index}`}
                        className="aspect-[4/3] overflow-hidden rounded-lg border border-[#DCE5E0] bg-[#EEF2F0]"
                      >
                        <img
                          src={photo}
                          alt="Hotel preview"
                          className="h-full w-full object-cover"
                          onError={(
                            event
                          ) => {
                            event.currentTarget.style.display =
                              'none';
                          }}
                        />
                      </div>
                    )
                  )}
              </div>
            </section>

            {/* 4. AMENITIES */}
            <section className="mt-7 border-t border-[#E5ECE8] pt-6">
              <h2 className="font-bold text-[#17211D]">
                4. Amenities
              </h2>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {AMENITY_OPTIONS.map(
                  (amenity) => (
                    <label
                      key={amenity}
                      className="flex cursor-pointer items-center gap-2 text-sm text-[#0F6B4D]"
                    >
                      <input
                        type="checkbox"
                        checked={
                          formData.amenities.includes(
                            amenity
                          )
                        }
                        onChange={() =>
                          toggleAmenity(
                            amenity
                          )
                        }
                        className="h-4 w-4 accent-[#0F6B4D]"
                      />

                      {amenity}
                    </label>
                  )
                )}
              </div>
            </section>

            {/* ACTION BUTTONS */}
            <div className="mt-10 flex flex-wrap justify-end gap-3 border-t border-[#E5ECE8] pt-6">
              <button
                type="button"
                onClick={() =>
                  navigate(
                    '/hotel/dashboard'
                  )
                }
                className="rounded-lg px-4 py-2.5 text-sm font-semibold text-[#0F6B4D] hover:bg-[#EEF7F2]"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={
                  isSubmitting
                }
                onClick={() =>
                  void submitHotel(
                    'inactive'
                  )
                }
                className="rounded-lg border border-[#79B993] bg-[#EEF7F2] px-5 py-2.5 text-sm font-semibold text-[#0F6B4D] hover:bg-[#DFF0E6] disabled:opacity-50"
              >
                Save as Draft
              </button>

              <button
                type="submit"
                disabled={
                  isSubmitting
                }
                className="rounded-lg bg-[#0F6B4D] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0A523B] disabled:opacity-50"
              >
                {isSubmitting
                  ? 'Saving...'
                  : isEditMode
                    ? 'Save Changes'
                    : 'Publish Listing'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export default HotelFormPage;