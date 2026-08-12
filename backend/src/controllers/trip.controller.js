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

async function resequenceDayStops(
  dayId
) {
  const stops =
    await Stop.find({
      day: dayId,
    })
      .sort({
        order: 1,
        _id: 1,
      })
      .select('_id order')
      .lean();

  if (stops.length === 0) {
    return;
  }

  const highestOrder =
    Math.max(
      ...stops.map(
        (stop) => stop.order
      )
    );

  const temporaryBase =
    highestOrder +
    stops.length +
    1000;

  await Promise.all(
    stops.map(
      (stop, index) =>
        Stop.updateOne(
          {
            _id: stop._id,
          },
          {
            $set: {
              order:
                temporaryBase +
                index +
                1,
            },
          }
        )
    )
  );

  await Promise.all(
    stops.map(
      (stop, index) =>
        Stop.updateOne(
          {
            _id: stop._id,
          },
          {
            $set: {
              order:
                index + 1,
            },
          }
        )
    )
  );
}

function getTripDayCount(
  startDate,
  endDate
) {
  return (
    Math.floor(
      (endDate.getTime() -
        startDate.getTime()) /
        ONE_DAY_IN_MILLISECONDS
    ) + 1
  );
}


async function getDayRemovalImpact(
  tripId,
  desiredDayCount
) {
  const removedDays =
    await Day.find({
      trip: tripId,
      dayNumber: {
        $gt: desiredDayCount,
      },
    })
      .sort({
        dayNumber: 1,
      })
      .lean();

  if (removedDays.length === 0) {
    return {
      removedDays: [],
      removedStopCount: 0,
    };
  }

  const removedDayIds =
    removedDays.map(
      (day) => day._id
    );

  const stopCounts =
    await Stop.aggregate([
      {
        $match: {
          day: {
            $in: removedDayIds,
          },
        },
      },
      {
        $group: {
          _id: '$day',
          count: {
            $sum: 1,
          },
        },
      },
    ]);

  const stopCountByDay =
    new Map(
      stopCounts.map(
        (item) => [
          item._id.toString(),
          item.count,
        ]
      )
    );

  const daySummaries =
    removedDays.map(
      (day) => ({
        dayId: day._id,
        dayNumber:
          day.dayNumber,
        date: day.date,
        stopCount:
          stopCountByDay.get(
            day._id.toString()
          ) || 0,
      })
    );

  const removedStopCount =
    daySummaries.reduce(
      (total, day) =>
        total + day.stopCount,
      0
    );

  return {
    removedDays:
      daySummaries,
    removedStopCount,
  };
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



async function getTripDays(
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

    const days =
      await Day.find({
        trip: tripId,
      })
        .sort({
          dayNumber: 1,
        })
        .lean();

    return res.status(200).json({
      success: true,
      message:
        'Trip days fetched successfully.',
      count: days.length,
      data: days,
    });
  } catch (error) {
    return next(error);
  }
}


async function addStop(
  req,
  res,
  next
) {
  try {
    const {
      tripId,
      dayId,
    } = req.params;

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

    if (
      !mongoose.isValidObjectId(
        dayId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid day ID.',
      });
    }

    const trip =
      await Trip.findOne({
        _id: tripId,
        owner: req.user._id,
      })
        .select('_id')
        .lean();

    if (!trip) {
      return res.status(404).json({
        success: false,
        message:
          'Trip not found.',
      });
    }

    const day =
      await Day.findOne({
        _id: dayId,
        trip: tripId,
      })
        .select(
          '_id dayNumber date'
        )
        .lean();

    if (!day) {
      return res.status(404).json({
        success: false,
        message:
          'Day not found for this trip.',
      });
    }

    const {
      placeName,
      description = '',
      latitude,
      longitude,
      visitTime = '',
      estimatedDurationMinutes = 0,
    } = req.body;

    if (
      typeof placeName !==
        'string' ||
      placeName.trim() === ''
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Place name is required.',
      });
    }

    if (
      description !== undefined &&
      typeof description !==
        'string'
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Description must be text.',
      });
    }

    if (
      visitTime !== undefined &&
      typeof visitTime !== 'string'
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Visit time must be text.',
      });
    }

    if (
      latitude === undefined ||
      latitude === null ||
      latitude === ''
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Latitude is required.',
      });
    }

    if (
      longitude === undefined ||
      longitude === null ||
      longitude === ''
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Longitude is required.',
      });
    }

    const parsedLatitude =
      Number(latitude);

    const parsedLongitude =
      Number(longitude);

    if (
      !Number.isFinite(
        parsedLatitude
      ) ||
      parsedLatitude < -90 ||
      parsedLatitude > 90
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Latitude must be between -90 and 90.',
      });
    }

    if (
      !Number.isFinite(
        parsedLongitude
      ) ||
      parsedLongitude < -180 ||
      parsedLongitude > 180
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Longitude must be between -180 and 180.',
      });
    }

    const parsedDuration =
      Number(
        estimatedDurationMinutes
      );

    if (
      !Number.isFinite(
        parsedDuration
      ) ||
      parsedDuration < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Estimated duration must be zero or greater.',
      });
    }

    const lastStop =
      await Stop.findOne({
        day: dayId,
      })
        .sort({
          order: -1,
        })
        .select('order')
        .lean();

    const nextOrder =
      lastStop
        ? lastStop.order + 1
        : 1;

    const stop =
      await Stop.create({
        trip: tripId,
        day: dayId,

        placeName:
          placeName.trim(),

        description:
          description.trim(),

        latitude:
          parsedLatitude,

        longitude:
          parsedLongitude,

        visitTime:
          visitTime.trim(),

        estimatedDurationMinutes:
          parsedDuration,

        order: nextOrder,
      });

    return res.status(201).json({
      success: true,
      message:
        'Stop added successfully.',
      data: stop,
    });
  } catch (error) {
    return next(error);
  }
}



async function getDayStops(
  req,
  res,
  next
) {
  try {
    const {
      tripId,
      dayId,
    } = req.params;

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

    if (
      !mongoose.isValidObjectId(
        dayId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid day ID.',
      });
    }

    const trip =
      await Trip.findOne({
        _id: tripId,
        owner: req.user._id,
      })
        .select('_id')
        .lean();

    if (!trip) {
      return res.status(404).json({
        success: false,
        message:
          'Trip not found.',
      });
    }

    const day =
      await Day.findOne({
        _id: dayId,
        trip: tripId,
      })
        .select(
          '_id dayNumber date'
        )
        .lean();

    if (!day) {
      return res.status(404).json({
        success: false,
        message:
          'Day not found for this trip.',
      });
    }

    const stops =
      await Stop.find({
        trip: tripId,
        day: dayId,
      })
        .sort({
          order: 1,
        })
        .lean();

    return res.status(200).json({
      success: true,
      message:
        'Day stops fetched successfully.',
      count: stops.length,
      data: {
        day,
        stops,
      },
    });
  } catch (error) {
    return next(error);
  }
}




async function updateStop(
  req,
  res,
  next
) {
  try {
    const {
      tripId,
      dayId,
      stopId,
    } = req.params;

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

    if (
      !mongoose.isValidObjectId(
        dayId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid day ID.',
      });
    }

    if (
      !mongoose.isValidObjectId(
        stopId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid stop ID.',
      });
    }

    const trip =
      await Trip.findOne({
        _id: tripId,
        owner: req.user._id,
      })
        .select('_id')
        .lean();

    if (!trip) {
      return res.status(404).json({
        success: false,
        message:
          'Trip not found.',
      });
    }

    const day =
      await Day.findOne({
        _id: dayId,
        trip: tripId,
      })
        .select('_id')
        .lean();

    if (!day) {
      return res.status(404).json({
        success: false,
        message:
          'Day not found for this trip.',
      });
    }

    const stop =
      await Stop.findOne({
        _id: stopId,
        trip: tripId,
        day: dayId,
      });

    if (!stop) {
      return res.status(404).json({
        success: false,
        message:
          'Stop not found for this day.',
      });
    }

    const {
      placeName,
      description,
      latitude,
      longitude,
      visitTime,
      estimatedDurationMinutes,
    } = req.body;

    if (
      placeName !== undefined
    ) {
      if (
        typeof placeName !==
          'string' ||
        placeName.trim() === ''
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Place name cannot be empty.',
        });
      }

      stop.placeName =
        placeName.trim();
    }

    if (
      description !== undefined
    ) {
      if (
        typeof description !==
        'string'
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Description must be text.',
        });
      }

      stop.description =
        description.trim();
    }

    if (
      latitude !== undefined
    ) {
      const parsedLatitude =
        Number(latitude);

      if (
        !Number.isFinite(
          parsedLatitude
        ) ||
        parsedLatitude < -90 ||
        parsedLatitude > 90
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Latitude must be between -90 and 90.',
        });
      }

      stop.latitude =
        parsedLatitude;
    }

    if (
      longitude !== undefined
    ) {
      const parsedLongitude =
        Number(longitude);

      if (
        !Number.isFinite(
          parsedLongitude
        ) ||
        parsedLongitude < -180 ||
        parsedLongitude > 180
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Longitude must be between -180 and 180.',
        });
      }

      stop.longitude =
        parsedLongitude;
    }

    if (
      visitTime !== undefined
    ) {
      if (
        typeof visitTime !==
        'string'
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Visit time must be text.',
        });
      }

      stop.visitTime =
        visitTime.trim();
    }

    if (
      estimatedDurationMinutes !==
      undefined
    ) {
      const parsedDuration =
        Number(
          estimatedDurationMinutes
        );

      if (
        !Number.isFinite(
          parsedDuration
        ) ||
        parsedDuration < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Estimated duration must be zero or greater.',
        });
      }

      stop.estimatedDurationMinutes =
        parsedDuration;
    }

    await stop.save();

    return res.status(200).json({
      success: true,
      message:
        'Stop updated successfully.',
      data: stop,
    });
  } catch (error) {
    return next(error);
  }
}



async function deleteStop(
  req,
  res,
  next
) {
  try {
    const {
      tripId,
      dayId,
      stopId,
    } = req.params;

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

    if (
      !mongoose.isValidObjectId(
        dayId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid day ID.',
      });
    }

    if (
      !mongoose.isValidObjectId(
        stopId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid stop ID.',
      });
    }

    const trip =
      await Trip.findOne({
        _id: tripId,
        owner: req.user._id,
      })
        .select('_id')
        .lean();

    if (!trip) {
      return res.status(404).json({
        success: false,
        message:
          'Trip not found.',
      });
    }

    const day =
      await Day.findOne({
        _id: dayId,
        trip: tripId,
      })
        .select('_id')
        .lean();

    if (!day) {
      return res.status(404).json({
        success: false,
        message:
          'Day not found for this trip.',
      });
    }

    const stop =
      await Stop.findOne({
        _id: stopId,
        trip: tripId,
        day: dayId,
      });

    if (!stop) {
      return res.status(404).json({
        success: false,
        message:
          'Stop not found for this day.',
      });
    }

    const deletedStop = {
      _id: stop._id,
      placeName:
        stop.placeName,
      order: stop.order,
    };

    await stop.deleteOne();

    await resequenceDayStops(
      dayId
    );

    return res.status(200).json({
      success: true,
      message:
        'Stop deleted successfully.',
      data: deletedStop,
    });
  } catch (error) {
    return next(error);
  }
}



async function reorderStops(
  req,
  res,
  next
) {
  try {
    const {
      tripId,
      dayId,
    } = req.params;

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

    if (
      !mongoose.isValidObjectId(
        dayId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid day ID.',
      });
    }

    const {
      stopIds,
    } = req.body;

    if (
      !Array.isArray(stopIds) ||
      stopIds.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          'stopIds must be a non-empty array.',
      });
    }

    const hasInvalidStopId =
      stopIds.some(
        (stopId) =>
          !mongoose.isValidObjectId(
            stopId
          )
      );

    if (hasInvalidStopId) {
      return res.status(400).json({
        success: false,
        message:
          'Every stop ID must be valid.',
      });
    }

    const uniqueStopIds =
      new Set(
        stopIds.map(
          (stopId) =>
            stopId.toString()
        )
      );

    if (
      uniqueStopIds.size !==
      stopIds.length
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Duplicate stop IDs are not allowed.',
      });
    }

    const trip =
      await Trip.findOne({
        _id: tripId,
        owner: req.user._id,
      })
        .select('_id')
        .lean();

    if (!trip) {
      return res.status(404).json({
        success: false,
        message:
          'Trip not found.',
      });
    }

    const day =
      await Day.findOne({
        _id: dayId,
        trip: tripId,
      })
        .select('_id')
        .lean();

    if (!day) {
      return res.status(404).json({
        success: false,
        message:
          'Day not found for this trip.',
      });
    }

    const existingStops =
      await Stop.find({
        trip: tripId,
        day: dayId,
      })
        .select('_id order')
        .sort({
          order: 1,
        })
        .lean();

    if (
      existingStops.length !==
      stopIds.length
    ) {
      return res.status(400).json({
        success: false,
        message:
          'The reorder request must include every stop for this day exactly once.',
      });
    }

    const existingStopIds =
      new Set(
        existingStops.map(
          (stop) =>
            stop._id.toString()
        )
      );

    const containsUnknownStop =
      stopIds.some(
        (stopId) =>
          !existingStopIds.has(
            stopId.toString()
          )
      );

    if (containsUnknownStop) {
      return res.status(400).json({
        success: false,
        message:
          'One or more stops do not belong to this day.',
      });
    }

    const highestOrder =
      Math.max(
        ...existingStops.map(
          (stop) =>
            stop.order
        )
      );

    const temporaryBase =
      highestOrder +
      existingStops.length +
      1000;

    await Promise.all(
      stopIds.map(
        (stopId, index) =>
          Stop.updateOne(
            {
              _id: stopId,
              trip: tripId,
              day: dayId,
            },
            {
              $set: {
                order:
                  temporaryBase +
                  index +
                  1,
              },
            }
          )
      )
    );

    await Promise.all(
      stopIds.map(
        (stopId, index) =>
          Stop.updateOne(
            {
              _id: stopId,
              trip: tripId,
              day: dayId,
            },
            {
              $set: {
                order:
                  index + 1,
              },
            }
          )
      )
    );

    const reorderedStops =
      await Stop.find({
        trip: tripId,
        day: dayId,
      })
        .sort({
          order: 1,
        })
        .lean();

    return res.status(200).json({
      success: true,
      message:
        'Stops reordered successfully.',
      data: reorderedStops,
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

    if (datesChanged) {
      const oldDayCount =
        getTripDayCount(
          oldStartDate,
          oldEndDate
        );

      const newDayCount =
        getTripDayCount(
          newStartDate,
          newEndDate
        );

      if (
        newDayCount <
        oldDayCount
      ) {
        const removalImpact =
          await getDayRemovalImpact(
            trip._id,
            newDayCount
          );

        if (
          removalImpact
            .removedStopCount > 0 &&
          req.body
            .confirmDayRemoval !==
            true
        ) {
          return res
            .status(409)
            .json({
              success: false,

              message:
                'Shortening this trip will remove itinerary days containing stops. Confirmation is required.',

              data: {
                requiresConfirmation:
                  true,

                oldDayCount,
                newDayCount,

                removedDayCount:
                  removalImpact
                    .removedDays
                    .length,

                removedStopCount:
                  removalImpact
                    .removedStopCount,

                removedDays:
                  removalImpact
                    .removedDays,
              },
            });
        }
      }
    }

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
  addStop,
  createTrip,
  deleteStop,
  deleteTrip,
  getDayStops,
  getTripById,
  getTripDays,
  getTrips,
  reorderStops,
  updateStop,
  updateTrip,
};