import {
  useEffect,
  useMemo,
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
  uploadHotelImages,
} from '../api/hotelApi';

const AMENITY_OPTIONS = [
  'Free WiFi',
  'Breakfast',
  'Air Conditioning',
  'Swimming Pool',
  'Sea View',
  'Parking',
];

const MAX_PHOTOS = 6;

const MAX_IMAGE_SIZE_BYTES =
  5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES =
  new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
  ]);

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

    /*
     * photos contains only already-uploaded/public URLs.
     *
     * Actual File objects selected from the computer are
     * kept separately in selectedPhotoFiles.
     */
    photos: [],

    amenities: [],

    roomTypes: [
      createEmptyRoom(),
    ],

    status: 'active',
  };
}

function HotelFormPage() {
  const { hotelId } =
    useParams();

  const navigate =
    useNavigate();

  const isEditMode =
    Boolean(hotelId);

  const [
    formData,
    setFormData,
  ] = useState(
    createInitialForm
  );

  /*
   * Local image files selected by the vendor.
   *
   * These have not yet been uploaded to Supabase.
   */
  const [
    selectedPhotoFiles,
    setSelectedPhotoFiles,
  ] = useState([]);

  const [
    isLoading,
    setIsLoading,
  ] = useState(
    isEditMode
  );

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    isUploadingPhotos,
    setIsUploadingPhotos,
  ] = useState(false);

  const [
    formError,
    setFormError,
  ] = useState('');

  /*
   * Browser preview URLs for newly selected local files.
   *
   * URL.createObjectURL lets us show a local image before
   * it has been uploaded to Supabase.
   */
  const localPhotoPreviews =
    useMemo(
      () =>
        selectedPhotoFiles.map(
          (file) => ({
            file,

            previewUrl:
              URL.createObjectURL(
                file
              ),
          })
        ),
      [selectedPhotoFiles]
    );

  /*
   * Object URLs should be released when they are no
   * longer needed so the browser does not keep their
   * memory allocated.
   */
  useEffect(
    () => () => {
      localPhotoPreviews.forEach(
        ({ previewUrl }) => {
          URL.revokeObjectURL(
            previewUrl
          );
        }
      );
    },
    [localPhotoPreviews]
  );

  useEffect(() => {
    if (!isEditMode) {
      return undefined;
    }

    let ignoreResult = false;

    async function loadHotel() {
      try {
        const result =
          await getVendorHotelById(
            hotelId
          );

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
              hotel.location
                ?.city ?? '',

            address:
              hotel.location
                ?.address ?? '',
          },

          description:
            hotel.description ??
            '',

          /*
           * Existing Supabase URLs, or old manually
           * entered URLs, continue working because
           * MongoDB simply stores strings.
           */
          photos:
            hotel.photos ?? [],

          amenities:
            hotel.amenities ??
            [],

          roomTypes:
            hotel.roomTypes
              ?.length
              ? hotel.roomTypes.map(
                  (room) => ({
                    _id:
                      room._id,

                    name:
                      room.name ??
                      '',

                    capacity:
                      String(
                        room.capacity ??
                          ''
                      ),

                    availableRooms:
                      String(
                        room.availableRooms ??
                          ''
                      ),

                    pricePerNight:
                      String(
                        room.pricePerNight ??
                          ''
                      ),
                  })
                )
              : [
                  createEmptyRoom(),
                ],

          status:
            hotel.status ??
            'active',
        });
      } catch (error) {
        if (
          !ignoreResult
        ) {
          setFormError(
            error.response
              ?.data
              ?.message ||
              'Unable to load this hotel listing.'
          );
        }
      } finally {
        if (
          !ignoreResult
        ) {
          setIsLoading(
            false
          );
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

  function updateBasicField(
    event
  ) {
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

  function updateLocation(
    event
  ) {
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

  /*
   * Handles files chosen from the vendor's computer.
   *
   * Frontend validation improves the user experience,
   * but the backend still performs the real security
   * validation.
   */
  function handlePhotoSelection(
    event
  ) {
    const files =
      Array.from(
        event.target.files ||
          []
      );

    /*
     * Reset the input so selecting the same file again
     * after removing it still triggers onChange.
     */
    event.target.value = '';

    if (
      files.length === 0
    ) {
      return;
    }

    const currentPhotoCount =
      formData.photos.length +
      selectedPhotoFiles.length;

    if (
      currentPhotoCount +
        files.length >
      MAX_PHOTOS
    ) {
      setFormError(
        `A hotel can have a maximum of ${MAX_PHOTOS} photos.`
      );

      return;
    }

    for (const file of files) {
      if (
        !ALLOWED_IMAGE_TYPES.has(
          file.type
        )
      ) {
        setFormError(
          'Only JPEG, PNG, and WebP images are allowed.'
        );

        return;
      }

      if (
        file.size >
        MAX_IMAGE_SIZE_BYTES
      ) {
        setFormError(
          'Each image must be 5 MB or smaller.'
        );

        return;
      }
    }

    setFormError('');

    setSelectedPhotoFiles(
      (current) => [
        ...current,
        ...files,
      ]
    );
  }

  /*
   * Removes a picture that is already represented by
   * a stored URL.
   *
   * At this stage we remove the URL from the hotel
   * record only. We are not deleting the underlying
   * Supabase file yet.
   */
  function removeExistingPhoto(
    index
  ) {
    setFormData(
      (current) => ({
        ...current,

        photos:
          current.photos.filter(
            (
              _,
              photoIndex
            ) =>
              photoIndex !==
              index
          ),
      })
    );
  }

  /*
   * Removes a local image before it has been uploaded.
   */
  function removeSelectedPhoto(
    index
  ) {
    setSelectedPhotoFiles(
      (current) =>
        current.filter(
          (
            _,
            photoIndex
          ) =>
            photoIndex !==
            index
        )
    );
  }

  function toggleAmenity(
    amenity
  ) {
    setFormData(
      (current) => {
        const selected =
          current.amenities.includes(
            amenity
          );

        return {
          ...current,

          amenities:
            selected
              ? current.amenities.filter(
                  (item) =>
                    item !==
                    amenity
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
            (
              room,
              roomIndex
            ) =>
              roomIndex ===
              index
                ? {
                    ...room,
                    [field]:
                      value,
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

  function removeRoomType(
    index
  ) {
    if (
      formData.roomTypes
        .length <= 1
    ) {
      return;
    }

    setFormData(
      (current) => ({
        ...current,

        roomTypes:
          current.roomTypes.filter(
            (
              _,
              roomIndex
            ) =>
              roomIndex !==
              index
          ),
      })
    );
  }

  function validateForm() {
    if (
      !formData.name.trim()
    ) {
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

    if (
      !formData.description.trim()
    ) {
      return 'Hotel description is required.';
    }

    if (
      formData.photos.length +
        selectedPhotoFiles.length >
      MAX_PHOTOS
    ) {
      return `A hotel can have a maximum of ${MAX_PHOTOS} photos.`;
    }

    for (
      let index = 0;
      index <
      formData.roomTypes.length;
      index += 1
    ) {
      const room =
        formData.roomTypes[
          index
        ];

      if (
        !room.name.trim()
      ) {
        return `Room type ${
          index + 1
        } needs a name.`;
      }

      if (
        Number(
          room.capacity
        ) < 1
      ) {
        return `Room type ${
          index + 1
        } needs a valid capacity.`;
      }

      if (
        Number(
          room.availableRooms
        ) < 0
      ) {
        return `Room type ${
          index + 1
        } has an invalid available room count.`;
      }

      if (
        Number(
          room.pricePerNight
        ) < 0
      ) {
        return `Room type ${
          index + 1
        } has an invalid price.`;
      }
    }

    return '';
  }

  async function submitHotel(
    status
  ) {
    const validationError =
      validateForm();

    if (
      validationError
    ) {
      setFormError(
        validationError
      );

      return;
    }

    setFormError('');
    setIsSubmitting(true);

    try {
      /*
       * Start with already-stored image URLs.
       */
      let photoUrls = [
        ...formData.photos,
      ];

      /*
       * Upload any newly selected local files before
       * creating/updating the MongoDB hotel document.
       */
      if (
        selectedPhotoFiles.length >
        0
      ) {
        setIsUploadingPhotos(
          true
        );

        const uploadResult =
          await uploadHotelImages(
            selectedPhotoFiles
          );

        const uploadedImages =
          uploadResult?.data
            ?.images ?? [];

        const uploadedUrls =
          uploadedImages
            .map(
              (image) =>
                image.url
            )
            .filter(Boolean);

        if (
          uploadedUrls.length !==
          selectedPhotoFiles.length
        ) {
          throw new Error(
            'One or more hotel images could not be uploaded.'
          );
        }

        /*
         * Combine existing URLs with new Supabase URLs.
         *
         * Set removes accidental duplicate strings.
         */
        photoUrls =
          Array.from(
            new Set([
              ...photoUrls,
              ...uploadedUrls,
            ])
          );

        /*
         * Immediately remember successful uploads locally.
         *
         * If saving the hotel later fails for another reason,
         * clicking Save again will not upload identical copies.
         */
        setFormData(
          (current) => ({
            ...current,
            photos:
              photoUrls,
          })
        );

        setSelectedPhotoFiles(
          []
        );

        setIsUploadingPhotos(
          false
        );
      }

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

        /*
         * MongoDB continues storing only string URLs.
         *
         * The binary image itself lives in Supabase.
         */
        photos:
          photoUrls,

        amenities:
          formData.amenities,

        roomTypes:
          formData.roomTypes.map(
            (room) => ({
              ...(room._id
                ? {
                    _id:
                      room._id,
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
        error.response?.data
          ?.message ||
          error.message ||
          'Unable to save the hotel listing.'
      );
    } finally {
      setIsUploadingPhotos(
        false
      );

      setIsSubmitting(
        false
      );
    }
  }

  function handleSubmit(
    event
  ) {
    event.preventDefault();

    void submitHotel(
      'active'
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm font-medium text-[#66756D]">
          Loading hotel
          information...
        </p>
      </div>
    );
  }

  const totalPhotoCount =
    formData.photos.length +
    selectedPhotoFiles.length;

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
        onSubmit={
          handleSubmit
        }
        className="overflow-hidden rounded-xl border border-[#DCE5E0] bg-white shadow-sm"
      >
        <div className="grid lg:grid-cols-2">
          {/* LEFT SIDE */}
          <div className="border-b border-[#DCE5E0] p-5 lg:border-b-0 lg:border-r">
            {/* 1. BASIC INFORMATION */}
            <section>
              <h2 className="font-bold text-[#17211D]">
                1. Basic
                Information
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
                      formData
                        .location
                        .city
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
                    formData
                      .location
                      .address
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
                  Short
                  Description
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
                3. Room Type &
                Pricing
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
                        Available
                        Rooms
                      </th>

                      <th className="px-3 py-2 text-left text-xs">
                        Price /
                        Night
                      </th>

                      <th className="px-3 py-2 text-center text-xs">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#E5ECE8]">
                    {formData.roomTypes.map(
                      (
                        room,
                        index
                      ) => (
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
                                  event
                                    .target
                                    .value
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
                                  event
                                    .target
                                    .value
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
                                  event
                                    .target
                                    .value
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
                                  event
                                    .target
                                    .value
                                )
                              }
                              className="w-full rounded border border-[#D4DED9] px-2 py-2 text-xs"
                            />
                          </td>

                          <td className="p-2 text-center">
                            <button
                              type="button"
                              disabled={
                                formData
                                  .roomTypes
                                  .length ===
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
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold text-[#17211D]">
                    2. Hotel
                    Photos
                  </h2>

                  <p className="mt-1 text-xs leading-5 text-[#66756D]">
                    Upload JPEG,
                    PNG, or WebP
                    images. Maximum
                    5 MB per image.
                  </p>
                </div>

                <span className="rounded-full bg-[#EEF7F2] px-3 py-1 text-xs font-semibold text-[#0F6B4D]">
                  {
                    totalPhotoCount
                  }
                  /{MAX_PHOTOS}
                </span>
              </div>

              <label
                className={[
                  'mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition',
                  totalPhotoCount >=
                  MAX_PHOTOS
                    ? 'cursor-not-allowed border-[#DCE5E0] bg-[#F7FAF8] opacity-60'
                    : 'border-[#A9D9BB] bg-[#F7FAF8] hover:border-[#0F6B4D] hover:bg-[#EEF7F2]',
                ].join(' ')}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#DCEFE4] text-2xl text-[#0F6B4D]">
                  +
                </span>

                <span className="mt-3 text-sm font-semibold text-[#17211D]">
                  Choose hotel
                  images
                </span>

                <span className="mt-1 text-xs text-[#66756D]">
                  Select one or
                  multiple files
                  from your device
                </span>

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  disabled={
                    totalPhotoCount >=
                    MAX_PHOTOS
                  }
                  onChange={
                    handlePhotoSelection
                  }
                  className="hidden"
                />
              </label>

              {totalPhotoCount ===
                0 && (
                <div className="mt-4 rounded-lg border border-[#DCE5E0] bg-[#F7FAF8] px-4 py-3 text-xs text-[#66756D]">
                  No hotel
                  photos selected
                  yet. Photos are
                  optional, but
                  adding them makes
                  the listing easier
                  for travelers to
                  recognize.
                </div>
              )}

              {/* Existing uploaded photos */}
              {formData.photos
                .length > 0 && (
                <div className="mt-5">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#66756D]">
                    Uploaded Photos
                  </p>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {formData.photos.map(
                      (
                        photo,
                        index
                      ) => (
                        <div
                          key={`${photo}-${index}`}
                          className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-[#DCE5E0] bg-[#EEF2F0]"
                        >
                          <img
                            src={
                              photo
                            }
                            alt={`Hotel ${index + 1}`}
                            className="h-full w-full object-cover"
                            onError={(
                              event
                            ) => {
                              event.currentTarget.style.display =
                                'none';
                            }}
                          />

                          {index ===
                            0 && (
                            <span className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2 py-1 text-[10px] font-bold text-[#0F6B4D] shadow-sm">
                              Cover
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              removeExistingPhoto(
                                index
                              )
                            }
                            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-sm font-bold text-red-600 shadow transition hover:bg-red-50"
                            aria-label="Remove uploaded hotel photo"
                          >
                            ×
                          </button>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Newly selected local photos */}
              {localPhotoPreviews
                .length > 0 && (
                <div className="mt-5">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#66756D]">
                    Ready to Upload
                  </p>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {localPhotoPreviews.map(
                      (
                        {
                          file,
                          previewUrl,
                        },
                        index
                      ) => (
                        <div
                          key={`${file.name}-${file.lastModified}-${index}`}
                          className="relative overflow-hidden rounded-xl border border-[#A9D9BB] bg-[#EEF2F0]"
                        >
                          <div className="aspect-[4/3] overflow-hidden">
                            <img
                              src={
                                previewUrl
                              }
                              alt={`Selected ${index + 1}`}
                              className="h-full w-full object-cover"
                            />
                          </div>

                          <div className="border-t border-[#DCE5E0] bg-white px-2 py-2">
                            <p
                              className="truncate text-[11px] font-medium text-[#44524B]"
                              title={
                                file.name
                              }
                            >
                              {
                                file.name
                              }
                            </p>

                            <p className="mt-0.5 text-[10px] text-[#8A9690]">
                              {(
                                file.size /
                                1024 /
                                1024
                              ).toFixed(
                                2
                              )}{' '}
                              MB
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              removeSelectedPhoto(
                                index
                              )
                            }
                            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-sm font-bold text-red-600 shadow transition hover:bg-red-50"
                            aria-label="Remove selected hotel photo"
                          >
                            ×
                          </button>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {isUploadingPhotos && (
                <div className="mt-4 rounded-lg border border-[#A9D9BB] bg-[#EEF7F2] px-4 py-3 text-sm font-medium text-[#0F6B4D]">
                  Uploading hotel
                  photos...
                </div>
              )}
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
                      key={
                        amenity
                      }
                      className="flex cursor-pointer items-center gap-2 text-sm text-[#0F6B4D]"
                    >
                      <input
                        type="checkbox"
                        checked={formData.amenities.includes(
                          amenity
                        )}
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
                disabled={
                  isSubmitting
                }
                onClick={() =>
                  navigate(
                    '/hotel/dashboard'
                  )
                }
                className="rounded-lg px-4 py-2.5 text-sm font-semibold text-[#0F6B4D] hover:bg-[#EEF7F2] disabled:cursor-not-allowed disabled:opacity-50"
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
                className="rounded-lg border border-[#79B993] bg-[#EEF7F2] px-5 py-2.5 text-sm font-semibold text-[#0F6B4D] hover:bg-[#DFF0E6] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isUploadingPhotos
                  ? 'Uploading...'
                  : 'Save as Draft'}
              </button>

              <button
                type="submit"
                disabled={
                  isSubmitting
                }
                className="rounded-lg bg-[#0F6B4D] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0A523B] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isUploadingPhotos
                  ? 'Uploading Photos...'
                  : isSubmitting
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