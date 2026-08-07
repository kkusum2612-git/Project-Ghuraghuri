import mongoose from 'mongoose';

import Day from '../models/day.model.js';
import Trip from '../models/trip.model.js';
import Stop from '../models/stop.model.js';

const createUtcDate = (dateString) => {
  return new Date(`${dateString}T00:00:00.000Z`);
};

export const createTrip = async (req, res) => {
  let createdTrip = null;

  try {
    const {
      ownerId,
      tripName,
      destination,
      startDate,
      endDate,
      coverPhoto,
    } = req.body;

    // Check the required request fields.
    if (
      !ownerId ||
      !tripName ||
      !destination?.name ||
      !startDate ||
      !endDate
    ) {
      return res.status(400).json({
        success: false,
        message:
          'ownerId, tripName, destination name, startDate, and endDate are required.',
      });
    }

    // Make sure the temporary owner ID has a valid MongoDB ObjectId format.
    if (!mongoose.isValidObjectId(ownerId)) {
      return res.status(400).json({
        success: false,
        message: 'ownerId must be a valid MongoDB ObjectId.',
      });
    }

    const parsedStartDate = createUtcDate(startDate);
    const parsedEndDate = createUtcDate(endDate);

    // Check whether the date strings can be converted to real dates.
    if (
      Number.isNaN(parsedStartDate.getTime()) ||
      Number.isNaN(parsedEndDate.getTime())
    ) {
      return res.status(400).json({
        success: false,
        message: 'Dates must use the YYYY-MM-DD format.',
      });
    }

    if (parsedEndDate < parsedStartDate) {
      return res.status(400).json({
        success: false,
        message: 'End date cannot be earlier than start date.',
      });
    }

    // Save the trip.
    createdTrip = await Trip.create({
      owner: ownerId,

      tripName,

      destination: {
        name: destination.name,
        latitude: destination.latitude,
        longitude: destination.longitude,
      },

      startDate: parsedStartDate,
      endDate: parsedEndDate,
      coverPhoto: coverPhoto ?? '',
    });

    // Create one Day document for every date in the trip.
    const daysToCreate = [];
    let dayNumber = 1;

    for (
      let currentDate = new Date(parsedStartDate);
      currentDate <= parsedEndDate;
      currentDate.setUTCDate(currentDate.getUTCDate() + 1)
    ) {
      daysToCreate.push({
        trip: createdTrip._id,
        dayNumber,
        date: new Date(currentDate),
      });

      dayNumber += 1;
    }

    const createdDays = await Day.insertMany(daysToCreate);

    return res.status(201).json({
      success: true,
      message: 'Trip created successfully.',
      data: {
        trip: createdTrip,
        dayCount: createdDays.length,
        days: createdDays,
      },
    });
  } catch (error) {
    /*
     * If the trip was created but creating its days failed,
     * remove the incomplete trip and any partially created days.
     */
    if (createdTrip?._id) {
      await Promise.allSettled([
        Day.deleteMany({
          trip: createdTrip._id,
        }),

        Trip.findByIdAndDelete(createdTrip._id),
      ]);
    }

    console.error('Create trip error:', error);

    if (error.name === 'ValidationError') {
      const validationMessages = Object.values(error.errors).map(
        (validationError) => validationError.message,
      );

      return res.status(400).json({
        success: false,
        message: 'Trip validation failed.',
        errors: validationMessages,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Unable to create the trip because of a server error.',
    });
  }
};













export const getUserTrips = async (req, res) => {
  try {
    const { ownerId } = req.query;

    // ownerId is temporarily received through a query parameter.
    if (!ownerId) {
      return res.status(400).json({
        success: false,
        message: 'ownerId query parameter is required.',
      });
    }

    if (!mongoose.isValidObjectId(ownerId)) {
      return res.status(400).json({
        success: false,
        message: 'ownerId must be a valid MongoDB ObjectId.',
      });
    }

    // Find every trip belonging to the requested traveler.
    const trips = await Trip.find({
      owner: ownerId,
    }).lean();

    // Count how many stops or places have been added to every trip.
    const tripsWithPlaceCount = await Promise.all(
      trips.map(async (trip) => {
        const placeCount = await Stop.countDocuments({
          trip: trip._id,
        });

        return {
          ...trip,
          placeCount,
        };
      }),
    );

    const currentDate = new Date();

    /*
     * Active and upcoming trips are placed first.
     * Past trips are placed after them.
     */
    tripsWithPlaceCount.sort((firstTrip, secondTrip) => {
      const firstTripIsActive =
        new Date(firstTrip.endDate) >= currentDate;

      const secondTripIsActive =
        new Date(secondTrip.endDate) >= currentDate;

      if (firstTripIsActive !== secondTripIsActive) {
        return firstTripIsActive ? -1 : 1;
      }

      if (firstTripIsActive) {
        return (
          new Date(firstTrip.startDate) -
          new Date(secondTrip.startDate)
        );
      }

      return (
        new Date(secondTrip.endDate) -
        new Date(firstTrip.endDate)
      );
    });

    return res.status(200).json({
      success: true,
      message:
        tripsWithPlaceCount.length > 0
          ? 'Trips fetched successfully.'
          : 'No trips found. Create your first trip.',
      count: tripsWithPlaceCount.length,
      data: tripsWithPlaceCount,
    });
  } catch (error) {
    console.error('Get user trips error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve trips because of a server error.',
    });
  }
};



















export const getTripById = async (req, res) => {
  try {
    const { tripId } = req.params;
    const { ownerId } = req.query;

    // Validate the trip ID received from the URL.
    if (!mongoose.isValidObjectId(tripId)) {
      return res.status(400).json({
        success: false,
        message: 'tripId must be a valid MongoDB ObjectId.',
      });
    }

    // ownerId is temporary until JWT authentication is integrated.
    if (!ownerId) {
      return res.status(400).json({
        success: false,
        message: 'ownerId query parameter is required.',
      });
    }

    if (!mongoose.isValidObjectId(ownerId)) {
      return res.status(400).json({
        success: false,
        message: 'ownerId must be a valid MongoDB ObjectId.',
      });
    }

    // Find the trip only if it belongs to the requested owner.
    const trip = await Trip.findOne({
      _id: tripId,
      owner: ownerId,
    }).lean();

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found or you do not have permission to view it.',
      });
    }

    // Count the trip's related days and places.
    const [dayCount, placeCount] = await Promise.all([
      Day.countDocuments({
        trip: tripId,
      }),

      Stop.countDocuments({
        trip: tripId,
      }),
    ]);

    return res.status(200).json({
      success: true,
      message: 'Trip fetched successfully.',
      data: {
        ...trip,
        dayCount,
        placeCount,
      },
    });
  } catch (error) {
    console.error('Get trip by ID error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve the trip because of a server error.',
    });
  }
};














export const updateTrip = async (req, res) => {
  try {
    const { tripId } = req.params;
    const { ownerId } = req.query;

    const {
      tripName,
      destination,
      startDate,
      endDate,
      coverPhoto,
    } = req.body;

    if (!mongoose.isValidObjectId(tripId)) {
      return res.status(400).json({
        success: false,
        message: 'tripId must be a valid MongoDB ObjectId.',
      });
    }

    if (!ownerId) {
      return res.status(400).json({
        success: false,
        message: 'ownerId query parameter is required.',
      });
    }

    if (!mongoose.isValidObjectId(ownerId)) {
      return res.status(400).json({
        success: false,
        message: 'ownerId must be a valid MongoDB ObjectId.',
      });
    }

    const noUpdateWasProvided =
      tripName === undefined &&
      destination === undefined &&
      startDate === undefined &&
      endDate === undefined &&
      coverPhoto === undefined;

    if (noUpdateWasProvided) {
      return res.status(400).json({
        success: false,
        message: 'Provide at least one trip field to update.',
      });
    }

    const trip = await Trip.findOne({
      _id: tripId,
      owner: ownerId,
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found or you do not have permission to update it.',
      });
    }

    const nextStartDate =
      startDate !== undefined
        ? createUtcDate(startDate)
        : new Date(trip.startDate);

    const nextEndDate =
      endDate !== undefined
        ? createUtcDate(endDate)
        : new Date(trip.endDate);

    if (
      Number.isNaN(nextStartDate.getTime()) ||
      Number.isNaN(nextEndDate.getTime())
    ) {
      return res.status(400).json({
        success: false,
        message: 'Dates must use the YYYY-MM-DD format.',
      });
    }

    if (nextEndDate < nextStartDate) {
      return res.status(400).json({
        success: false,
        message: 'End date cannot be earlier than start date.',
      });
    }

    const datesChanged =
      nextStartDate.getTime() !== new Date(trip.startDate).getTime() ||
      nextEndDate.getTime() !== new Date(trip.endDate).getTime();

    if (tripName !== undefined) {
      if (!tripName.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Trip name cannot be empty.',
        });
      }

      trip.tripName = tripName;
    }

    if (destination !== undefined) {
      const nextDestinationName =
        destination.name ?? trip.destination.name;

      if (!nextDestinationName?.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Destination name cannot be empty.',
        });
      }

      trip.destination = {
        name: nextDestinationName,
        latitude:
          destination.latitude ?? trip.destination.latitude,
        longitude:
          destination.longitude ?? trip.destination.longitude,
      };
    }

    trip.startDate = nextStartDate;
    trip.endDate = nextEndDate;

    if (coverPhoto !== undefined) {
      trip.coverPhoto = coverPhoto;
    }

    await trip.save();

    /*
     * If the dates change, update the Day records while preserving
     * existing days and their stops by day number where possible.
     */
    if (datesChanged) {
      const desiredDates = [];

      for (
        let currentDate = new Date(nextStartDate);
        currentDate <= nextEndDate;
        currentDate.setUTCDate(currentDate.getUTCDate() + 1)
      ) {
        desiredDates.push(new Date(currentDate));
      }

      const existingDays = await Day.find({
        trip: tripId,
      }).sort({
        dayNumber: 1,
      });

      for (let index = 0; index < desiredDates.length; index += 1) {
        const existingDay = existingDays[index];

        if (existingDay) {
          existingDay.dayNumber = index + 1;
          existingDay.date = desiredDates[index];
          await existingDay.save();
        } else {
          await Day.create({
            trip: tripId,
            dayNumber: index + 1,
            date: desiredDates[index],
          });
        }
      }

      /*
       * When the updated trip is shorter, remove extra trailing days
       * and any stops that belonged to those removed days.
       */
      const removedDays = existingDays.slice(desiredDates.length);

      if (removedDays.length > 0) {
        const removedDayIds = removedDays.map((day) => day._id);

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
    }

    const dayCount = await Day.countDocuments({
      trip: tripId,
    });

    return res.status(200).json({
      success: true,
      message: 'Trip updated successfully.',
      data: {
        trip,
        dayCount,
      },
    });
  } catch (error) {
    console.error('Update trip error:', error);

    if (error.name === 'ValidationError') {
      const validationMessages = Object.values(error.errors).map(
        (validationError) => validationError.message,
      );

      return res.status(400).json({
        success: false,
        message: 'Trip validation failed.',
        errors: validationMessages,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Unable to update the trip because of a server error.',
    });
  }
};
















export const deleteTrip = async (req, res) => {
  let session = null;

  try {
    const { tripId } = req.params;
    const { ownerId } = req.query;

    if (!mongoose.isValidObjectId(tripId)) {
      return res.status(400).json({
        success: false,
        message: 'tripId must be a valid MongoDB ObjectId.',
      });
    }

    if (!ownerId) {
      return res.status(400).json({
        success: false,
        message: 'ownerId query parameter is required.',
      });
    }

    if (!mongoose.isValidObjectId(ownerId)) {
      return res.status(400).json({
        success: false,
        message: 'ownerId must be a valid MongoDB ObjectId.',
      });
    }

    /*
     * Find the trip using both its ID and owner ID.
     * This prevents one traveler from deleting another traveler's trip.
     */
    const trip = await Trip.findOne({
      _id: tripId,
      owner: ownerId,
    }).lean();

    if (!trip) {
      return res.status(404).json({
        success: false,
        message:
          'Trip not found or you do not have permission to delete it.',
      });
    }

    const tripObjectId = new mongoose.Types.ObjectId(tripId);
    const ownerObjectId = new mongoose.Types.ObjectId(ownerId);

    session = await mongoose.startSession();

    let deletedCounts = null;

    /*
     * Run every deletion one after another.
     * Parallel operations such as Promise.all() cannot be used
     * inside the same MongoDB transaction.
     */
    await session.withTransaction(async () => {
      const deletedStops = await Stop.deleteMany(
        {
          trip: tripObjectId,
        },
        {
          session,
        },
      );

      const deletedDays = await Day.deleteMany(
        {
          trip: tripObjectId,
        },
        {
          session,
        },
      );

      const deletedExpenses = await mongoose.connection.db
        .collection('expenses')
        .deleteMany(
          {
            trip: tripObjectId,
          },
          {
            session,
          },
        );

      const deletedChecklistItems = await mongoose.connection.db
        .collection('checklistitems')
        .deleteMany(
          {
            trip: tripObjectId,
          },
          {
            session,
          },
        );

      const deletedTrip = await Trip.deleteOne(
        {
          _id: tripObjectId,
          owner: ownerObjectId,
        },
        {
          session,
        },
      );

      if (deletedTrip.deletedCount !== 1) {
        throw new Error('The trip could not be deleted.');
      }

      deletedCounts = {
        trips: deletedTrip.deletedCount,
        days: deletedDays.deletedCount,
        stops: deletedStops.deletedCount,
        expenses: deletedExpenses.deletedCount,
        checklistItems: deletedChecklistItems.deletedCount,
      };
    });

    return res.status(200).json({
      success: true,
      message: 'Trip and all related data deleted successfully.',
      data: {
        deletedTripId: tripId,
        deletedTripName: trip.tripName,
        deletedCounts,
      },
    });
  } catch (error) {
    console.error('Delete trip error:', error);

    return res.status(500).json({
      success: false,
      message:
        'Unable to delete the trip because of a server error.',
    });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};