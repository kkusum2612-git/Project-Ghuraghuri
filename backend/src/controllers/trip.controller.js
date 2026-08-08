import mongoose from 'mongoose';

import Day from '../models/day.model.js';
import Stop from '../models/stop.model.js';
import Trip from '../models/trip.model.js';

const ONE_DAY_IN_MILLISECONDS =
  24 * 60 * 60 * 1000;

function normalizeDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setUTCHours(0, 0, 0, 0);

  return date;
}

function createDateRange(startDate, endDate) {
  const dates = [];

  for (
    let currentDate = new Date(startDate);
    currentDate <= endDate;
    currentDate = new Date(
      currentDate.getTime() +
        ONE_DAY_IN_MILLISECONDS
    )
  ) {
    dates.push(new Date(currentDate));
  }

  return dates;
}

function validateDestination(destination) {
  if (
    !destination ||
    typeof destination !== 'object' ||
    typeof destination.name !== 'string' ||
    destination.name.trim() === ''
  ) {
    return 'Destination name is required.';
  }

  if (
    destination.latitude !== undefined &&
    destination.latitude !== null
  ) {
    const latitude = Number(
      destination.latitude
    );

    if (
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90
    ) {
      return 'Destination latitude must be between -90 and 90.';
    }
  }

  if (
    destination.longitude !== undefined &&
    destination.longitude !== null
  ) {
    const longitude = Number(
      destination.longitude
    );

    if (
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      return 'Destination longitude must be between -180 and 180.';
    }
  }

  return null;
}

function formatDestination(destination) {
  return {
    name: destination.name.trim(),

    latitude:
      destination.latitude === undefined ||
      destination.latitude === null ||
      destination.latitude === ''
        ? null
        : Number(destination.latitude),

    longitude:
      destination.longitude === undefined ||
      destination.longitude === null ||
      destination.longitude === ''
        ? null
        : Number(destination.longitude),
  };
}

async function synchronizeTripDays(
  tripId,
  startDate,
  endDate
) {
  const desiredDates = createDateRange(
    startDate,
    endDate
  );

  const existingDays = await Day.find({
    trip: tripId,
  }).sort({
    dayNumber: 1,
  });

  const sharedLength = Math.min(
    existingDays.length,
    desiredDates.length
  );

  for (
    let index = 0;
    index < sharedLength;
    index += 1
  ) {
    existingDays[index].dayNumber =
      index + 1;

    existingDays[index].date =
      desiredDates[index];

    await existingDays[index].save();
  }

  if (
    desiredDates.length >
    existingDays.length
  ) {
    const newDays = [];

    for (
      let index = existingDays.length;
      index < desiredDates.length;
      index += 1
    ) {
      newDays.push({
        trip: tripId,
        dayNumber: index + 1,
        date: desiredDates[index],
      });
    }

    if (newDays.length > 0) {
      await Day.insertMany(newDays);
    }
  }

  if (
    existingDays.length >
    desiredDates.length
  ) {
    const removedDays =
      existingDays.slice(
        desiredDates.length
      );

    const removedDayIds =
      removedDays.map((day) => day._id);

    await Stop.deleteMany({
      day: {
        $in: removedDayIds,
      },
    });

    await Day.deleteMany({
      _id: {
        $in: removedDayIds,
      },
    });
  }

  return desiredDates.length;
}

async function deleteOptionalCollection(
  collectionName,
  filter
) {
  const database =
    mongoose.connection.db;

  if (!database) {
    return 0;
  }

  const exists =
    await database
      .listCollections(
        {
          name: collectionName,
        },
        {
          nameOnly: true,
        }
      )
      .hasNext();

  if (!exists) {
    return 0;
  }

  const result =
    await database
      .collection(collectionName)
      .deleteMany(filter);

  return result.deletedCount || 0;
}

async function createTrip(
  req,
  res,
  next
) {
  try {
    const {
      tripName,
      destination,
      startDate,
      endDate,
      coverPhoto = '',
    } = req.body;

    if (
      typeof tripName !== 'string' ||
      tripName.trim().length < 2
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Trip name must contain at least 2 characters.',
      });
    }

    const destinationError =
      validateDestination(destination);

    if (destinationError) {
      return res.status(400).json({
        success: false,
        message: destinationError,
      });
    }

    const parsedStartDate =
      normalizeDate(startDate);

    const parsedEndDate =
      normalizeDate(endDate);

    if (
      !parsedStartDate ||
      !parsedEndDate
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Valid start and end dates are required.',
      });
    }

    if (
      parsedEndDate <
      parsedStartDate
    ) {
      return res.status(400).json({
        success: false,
        message:
          'End date cannot be before the start date.',
      });
    }

    const trip = await Trip.create({
      owner: req.user._id,
      tripName: tripName.trim(),
      destination:
        formatDestination(destination),
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      coverPhoto:
        typeof coverPhoto === 'string'
          ? coverPhoto.trim()
          : '',
    });

    try {
      const dates = createDateRange(
        parsedStartDate,
        parsedEndDate
      );

      const dayDocuments =
        dates.map(
          (date, index) => ({
            trip: trip._id,
            dayNumber: index + 1,
            date,
          })
        );

      await Day.insertMany(
        dayDocuments
      );
    } catch (error) {
      await Day.deleteMany({
        trip: trip._id,
      });

      await Trip.findByIdAndDelete(
        trip._id
      );

      throw error;
    }

    return res.status(201).json({
      success: true,
      message:
        'Trip created successfully.',
      data: trip,
    });
  } catch (error) {
    return next(error);
  }
}

async function getTrips(
  req,
  res,
  next
) {
  try {
    const trips = await Trip.find({
      owner: req.user._id,
    }).lean();

    const tripsWithPlaceCount =
      await Promise.all(
        trips.map(async (trip) => {
          const placeCount =
            await Stop.countDocuments({
              trip: trip._id,
            });

          return {
            ...trip,
            placeCount,
          };
        })
      );

    const today = new Date();

    today.setUTCHours(
      0,
      0,
      0,
      0
    );

    tripsWithPlaceCount.sort(
      (firstTrip, secondTrip) => {
        const firstUpcoming =
          new Date(
            firstTrip.endDate
          ) >= today;

        const secondUpcoming =
          new Date(
            secondTrip.endDate
          ) >= today;

        if (
          firstUpcoming !==
          secondUpcoming
        ) {
          return firstUpcoming
            ? -1
            : 1;
        }

        if (firstUpcoming) {
          return (
            new Date(
              firstTrip.startDate
            ) -
            new Date(
              secondTrip.startDate
            )
          );
        }

        return (
          new Date(
            secondTrip.endDate
          ) -
          new Date(
            firstTrip.endDate
          )
        );
      }
    );

    return res.status(200).json({
      success: true,
      message:
        tripsWithPlaceCount.length > 0
          ? 'Trips fetched successfully.'
          : 'No trips found. Create your first trip.',
      count:
        tripsWithPlaceCount.length,
      data: tripsWithPlaceCount,
    });
  } catch (error) {
    return next(error);
  }
}

async function getTripById(
  req,
  res,
  next
) {
  try {
    const { tripId } = req.params;

    if (
      !mongoose.isValidObjectId(
        tripId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid trip ID.',
      });
    }

    const trip =
      await Trip.findOne({
        _id: tripId,
        owner: req.user._id,
      }).lean();

    if (!trip) {
      return res.status(404).json({
        success: false,
        message:
          'Trip not found.',
      });
    }

    const [
      dayCount,
      placeCount,
    ] = await Promise.all([
      Day.countDocuments({
        trip: tripId,
      }),
      Stop.countDocuments({
        trip: tripId,
      }),
    ]);

    return res.status(200).json({
      success: true,
      message:
        'Trip fetched successfully.',
      data: {
        ...trip,
        dayCount,
        placeCount,
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function updateTrip(
  req,
  res,
  next
) {
  try {
    const { tripId } = req.params;

    if (
      !mongoose.isValidObjectId(
        tripId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid trip ID.',
      });
    }

    const allowedFields = [
      'tripName',
      'destination',
      'startDate',
      'endDate',
      'coverPhoto',
    ];

    const hasUpdate =
      allowedFields.some(
        (field) =>
          req.body[field] !==
          undefined
      );

    if (!hasUpdate) {
      return res.status(400).json({
        success: false,
        message:
          'Provide at least one trip field to update.',
      });
    }

    const trip =
      await Trip.findOne({
        _id: tripId,
        owner: req.user._id,
      });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message:
          'Trip not found.',
      });
    }

    if (
      req.body.tripName !==
      undefined
    ) {
      if (
        typeof req.body
          .tripName !==
          'string' ||
        req.body.tripName
          .trim().length < 2
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              'Trip name must contain at least 2 characters.',
          });
      }

      trip.tripName =
        req.body.tripName.trim();
    }

    if (
      req.body.destination !==
      undefined
    ) {
      const destinationError =
        validateDestination(
          req.body.destination
        );

      if (destinationError) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              destinationError,
          });
      }

      trip.destination =
        formatDestination(
          req.body.destination
        );
    }

    const oldStartDate =
      normalizeDate(
        trip.startDate
      );

    const oldEndDate =
      normalizeDate(
        trip.endDate
      );

    const newStartDate =
      req.body.startDate !==
      undefined
        ? normalizeDate(
            req.body.startDate
          )
        : oldStartDate;

    const newEndDate =
      req.body.endDate !==
      undefined
        ? normalizeDate(
            req.body.endDate
          )
        : oldEndDate;

    if (
      !newStartDate ||
      !newEndDate
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Valid start and end dates are required.',
      });
    }

    if (
      newEndDate <
      newStartDate
    ) {
      return res.status(400).json({
        success: false,
        message:
          'End date cannot be before the start date.',
      });
    }

    const datesChanged =
      oldStartDate.getTime() !==
        newStartDate.getTime() ||
      oldEndDate.getTime() !==
        newEndDate.getTime();

    trip.startDate =
      newStartDate;

    trip.endDate =
      newEndDate;

    if (
      req.body.coverPhoto !==
      undefined
    ) {
      trip.coverPhoto =
        typeof req.body
          .coverPhoto ===
        'string'
          ? req.body.coverPhoto.trim()
          : '';
    }

    await trip.save();

    let dayCount =
      await Day.countDocuments({
        trip: trip._id,
      });

    if (datesChanged) {
      dayCount =
        await synchronizeTripDays(
          trip._id,
          newStartDate,
          newEndDate
        );
    }

    return res.status(200).json({
      success: true,
      message:
        'Trip updated successfully.',
      data: {
        trip,
        dayCount,
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function deleteTrip(
  req,
  res,
  next
) {
  try {
    const { tripId } = req.params;

    if (
      !mongoose.isValidObjectId(
        tripId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid trip ID.',
      });
    }

    const trip =
      await Trip.findOne({
        _id: tripId,
        owner: req.user._id,
      });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message:
          'Trip not found.',
      });
    }

    const stopResult =
      await Stop.deleteMany({
        trip: trip._id,
      });

    const dayResult =
      await Day.deleteMany({
        trip: trip._id,
      });

    const expenseCount =
      await deleteOptionalCollection(
        'expenses',
        {
          trip: trip._id,
        }
      );

    const checklistCount =
      await deleteOptionalCollection(
        'checklistitems',
        {
          trip: trip._id,
        }
      );

    await Trip.deleteOne({
      _id: trip._id,
      owner: req.user._id,
    });

    return res.status(200).json({
      success: true,
      message:
        'Trip and all related data deleted successfully.',
      data: {
        deletedTripId:
          trip._id,
        deletedDays:
          dayResult.deletedCount,
        deletedStops:
          stopResult.deletedCount,
        deletedExpenses:
          expenseCount,
        deletedChecklistItems:
          checklistCount,
      },
    });
  } catch (error) {
    return next(error);
  }
}

export {
  createTrip,
  deleteTrip,
  getTripById,
  getTrips,
  updateTrip,
};