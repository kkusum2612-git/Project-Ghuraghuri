import mongoose from 'mongoose';

import Day from '../models/day.model.js';
import Stop from '../models/stop.model.js';
import Trip from '../models/trip.model.js';

export const addStop = async (req, res) => {
  try {
    const { tripId, dayId } = req.params;
    const { ownerId } = req.query;

    const {
      placeName,
      description,
      latitude,
      longitude,
      visitTime,
      estimatedDurationMinutes,
    } = req.body;

    // Validate the trip ID.
    if (!mongoose.isValidObjectId(tripId)) {
      return res.status(400).json({
        success: false,
        message: 'tripId must be a valid MongoDB ObjectId.',
      });
    }

    // Validate the day ID.
    if (!mongoose.isValidObjectId(dayId)) {
      return res.status(400).json({
        success: false,
        message: 'dayId must be a valid MongoDB ObjectId.',
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

    // Validate the required request-body fields.
    if (
      !placeName?.trim() ||
      latitude === undefined ||
      longitude === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: 'placeName, latitude, and longitude are required.',
      });
    }

    const parsedLatitude = Number(latitude);
    const parsedLongitude = Number(longitude);

    if (
      !Number.isFinite(parsedLatitude) ||
      parsedLatitude < -90 ||
      parsedLatitude > 90
    ) {
      return res.status(400).json({
        success: false,
        message: 'Latitude must be a number between -90 and 90.',
      });
    }

    if (
      !Number.isFinite(parsedLongitude) ||
      parsedLongitude < -180 ||
      parsedLongitude > 180
    ) {
      return res.status(400).json({
        success: false,
        message: 'Longitude must be a number between -180 and 180.',
      });
    }

    if (
      visitTime !== undefined &&
      visitTime !== '' &&
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(visitTime)
    ) {
      return res.status(400).json({
        success: false,
        message: 'visitTime must use the HH:MM 24-hour format.',
      });
    }

    if (
      estimatedDurationMinutes !== undefined &&
      (
        !Number.isFinite(Number(estimatedDurationMinutes)) ||
        Number(estimatedDurationMinutes) < 0
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'estimatedDurationMinutes must be a non-negative number.',
      });
    }

    /*
     * Confirm that the trip exists and belongs to the requested owner.
     */
    const trip = await Trip.findOne({
      _id: tripId,
      owner: ownerId,
    })
      .select('_id tripName')
      .lean();

    if (!trip) {
      return res.status(404).json({
        success: false,
        message:
          'Trip not found or you do not have permission to modify it.',
      });
    }

    /*
     * Confirm that the selected day belongs to the selected trip.
     */
    const day = await Day.findOne({
      _id: dayId,
      trip: tripId,
    })
      .select('_id dayNumber date')
      .lean();

    if (!day) {
      return res.status(404).json({
        success: false,
        message: 'Day not found in the selected trip.',
      });
    }

    /*
     * Find the highest existing order and assign the next pin number.
     */
    const lastStop = await Stop.findOne({
      day: dayId,
    })
      .sort({
        order: -1,
      })
      .select('order')
      .lean();

    const nextOrder = (lastStop?.order ?? 0) + 1;

    const stop = await Stop.create({
      trip: tripId,
      day: dayId,
      placeName: placeName.trim(),
      description: description?.trim() ?? '',
      latitude: parsedLatitude,
      longitude: parsedLongitude,
      visitTime: visitTime ?? '',
      estimatedDurationMinutes:
        estimatedDurationMinutes !== undefined
          ? Number(estimatedDurationMinutes)
          : 0,
      order: nextOrder,
    });

    return res.status(201).json({
      success: true,
      message: 'Stop added successfully.',
      data: {
        trip: {
          _id: trip._id,
          tripName: trip.tripName,
        },
        day,
        stop,
        pinNumber: stop.order,
      },
    });
  } catch (error) {
    console.error('Add stop error:', error);

    if (error.name === 'ValidationError') {
      const validationMessages = Object.values(error.errors).map(
        (validationError) => validationError.message,
      );

      return res.status(400).json({
        success: false,
        message: 'Stop validation failed.',
        errors: validationMessages,
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          'A stop with the same order already exists for this day.',
      });
    }

    return res.status(500).json({
      success: false,
      message:
        'Unable to add the stop because of a server error.',
    });
  }
};










export const getDayStops = async (req, res) => {
  try {
    const { tripId, dayId } = req.params;
    const { ownerId } = req.query;

    // Validate the trip ID.
    if (!mongoose.isValidObjectId(tripId)) {
      return res.status(400).json({
        success: false,
        message: 'tripId must be a valid MongoDB ObjectId.',
      });
    }

    // Validate the day ID.
    if (!mongoose.isValidObjectId(dayId)) {
      return res.status(400).json({
        success: false,
        message: 'dayId must be a valid MongoDB ObjectId.',
      });
    }

    // ownerId is temporary until JWT authentication is added.
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
     * Confirm that the trip exists and belongs to the requested owner.
     */
    const trip = await Trip.findOne({
      _id: tripId,
      owner: ownerId,
    })
      .select('_id tripName destination startDate endDate')
      .lean();

    if (!trip) {
      return res.status(404).json({
        success: false,
        message:
          'Trip not found or you do not have permission to view it.',
      });
    }

    /*
     * Confirm that the selected day belongs to the selected trip.
     */
    const day = await Day.findOne({
      _id: dayId,
      trip: tripId,
    })
      .select('_id trip dayNumber date')
      .lean();

    if (!day) {
      return res.status(404).json({
        success: false,
        message: 'Day not found in the selected trip.',
      });
    }

    /*
     * Retrieve the stops according to their pin order.
     */
    const stops = await Stop.find({
      trip: tripId,
      day: dayId,
    })
      .sort({
        order: 1,
      })
      .lean();

    /*
     * Prepare the coordinate sequence that can later be sent to OSRM.
     */
    const routeCoordinates = stops.map((stop) => ({
      stopId: stop._id,
      order: stop.order,
      latitude: stop.latitude,
      longitude: stop.longitude,
    }));

    return res.status(200).json({
      success: true,
      message:
        stops.length > 0
          ? 'Day stops fetched successfully.'
          : 'No stops have been added to this day.',
      count: stops.length,
      data: {
        trip,
        day,
        stops,
        routeCoordinates,
      },
    });
  } catch (error) {
    console.error('Get day stops error:', error);

    return res.status(500).json({
      success: false,
      message:
        'Unable to retrieve the day stops because of a server error.',
    });
  }
};













export const updateStop = async (req, res) => {
  try {
    const { tripId, dayId, stopId } = req.params;
    const { ownerId } = req.query;

    const {
      placeName,
      description,
      latitude,
      longitude,
      visitTime,
      estimatedDurationMinutes,
    } = req.body;

    // Validate IDs received from the URL.
    if (!mongoose.isValidObjectId(tripId)) {
      return res.status(400).json({
        success: false,
        message: 'tripId must be a valid MongoDB ObjectId.',
      });
    }

    if (!mongoose.isValidObjectId(dayId)) {
      return res.status(400).json({
        success: false,
        message: 'dayId must be a valid MongoDB ObjectId.',
      });
    }

    if (!mongoose.isValidObjectId(stopId)) {
      return res.status(400).json({
        success: false,
        message: 'stopId must be a valid MongoDB ObjectId.',
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

    // At least one editable field must be provided.
    const noUpdateWasProvided =
      placeName === undefined &&
      description === undefined &&
      latitude === undefined &&
      longitude === undefined &&
      visitTime === undefined &&
      estimatedDurationMinutes === undefined;

    if (noUpdateWasProvided) {
      return res.status(400).json({
        success: false,
        message: 'Provide at least one stop field to update.',
      });
    }

    if (placeName !== undefined && !placeName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Place name cannot be empty.',
      });
    }

    let parsedLatitude;

    if (latitude !== undefined) {
      parsedLatitude = Number(latitude);

      if (
        !Number.isFinite(parsedLatitude) ||
        parsedLatitude < -90 ||
        parsedLatitude > 90
      ) {
        return res.status(400).json({
          success: false,
          message: 'Latitude must be a number between -90 and 90.',
        });
      }
    }

    let parsedLongitude;

    if (longitude !== undefined) {
      parsedLongitude = Number(longitude);

      if (
        !Number.isFinite(parsedLongitude) ||
        parsedLongitude < -180 ||
        parsedLongitude > 180
      ) {
        return res.status(400).json({
          success: false,
          message: 'Longitude must be a number between -180 and 180.',
        });
      }
    }

    if (
      visitTime !== undefined &&
      visitTime !== '' &&
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(visitTime)
    ) {
      return res.status(400).json({
        success: false,
        message: 'visitTime must use the HH:MM 24-hour format.',
      });
    }

    let parsedDuration;

    if (estimatedDurationMinutes !== undefined) {
      parsedDuration = Number(estimatedDurationMinutes);

      if (!Number.isFinite(parsedDuration) || parsedDuration < 0) {
        return res.status(400).json({
          success: false,
          message:
            'estimatedDurationMinutes must be a non-negative number.',
        });
      }
    }

    /*
     * Confirm that the trip belongs to the requested traveler.
     */
    const trip = await Trip.findOne({
      _id: tripId,
      owner: ownerId,
    })
      .select('_id tripName')
      .lean();

    if (!trip) {
      return res.status(404).json({
        success: false,
        message:
          'Trip not found or you do not have permission to modify it.',
      });
    }

    /*
     * Confirm that the day belongs to the selected trip.
     */
    const day = await Day.findOne({
      _id: dayId,
      trip: tripId,
    })
      .select('_id dayNumber date')
      .lean();

    if (!day) {
      return res.status(404).json({
        success: false,
        message: 'Day not found in the selected trip.',
      });
    }

    /*
     * Find the stop only if it belongs to both the selected trip and day.
     */
    const stop = await Stop.findOne({
      _id: stopId,
      trip: tripId,
      day: dayId,
    });

    if (!stop) {
      return res.status(404).json({
        success: false,
        message: 'Stop not found in the selected trip day.',
      });
    }

    if (placeName !== undefined) {
      stop.placeName = placeName.trim();
    }

    if (description !== undefined) {
      stop.description = description.trim();
    }

    if (latitude !== undefined) {
      stop.latitude = parsedLatitude;
    }

    if (longitude !== undefined) {
      stop.longitude = parsedLongitude;
    }

    if (visitTime !== undefined) {
      stop.visitTime = visitTime;
    }

    if (estimatedDurationMinutes !== undefined) {
      stop.estimatedDurationMinutes = parsedDuration;
    }

    await stop.save();

    return res.status(200).json({
      success: true,
      message: 'Stop updated successfully.',
      data: {
        trip,
        day,
        stop,
        pinNumber: stop.order,
      },
    });
  } catch (error) {
    console.error('Update stop error:', error);

    if (error.name === 'ValidationError') {
      const validationMessages = Object.values(error.errors).map(
        (validationError) => validationError.message,
      );

      return res.status(400).json({
        success: false,
        message: 'Stop validation failed.',
        errors: validationMessages,
      });
    }

    return res.status(500).json({
      success: false,
      message:
        'Unable to update the stop because of a server error.',
    });
  }
};



















export const deleteStop = async (req, res) => {
  let session = null;

  try {
    const { tripId, dayId, stopId } = req.params;
    const { ownerId } = req.query;

    // Validate all MongoDB IDs received through the URL.
    if (!mongoose.isValidObjectId(tripId)) {
      return res.status(400).json({
        success: false,
        message: 'tripId must be a valid MongoDB ObjectId.',
      });
    }

    if (!mongoose.isValidObjectId(dayId)) {
      return res.status(400).json({
        success: false,
        message: 'dayId must be a valid MongoDB ObjectId.',
      });
    }

    if (!mongoose.isValidObjectId(stopId)) {
      return res.status(400).json({
        success: false,
        message: 'stopId must be a valid MongoDB ObjectId.',
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
     * Confirm that the trip belongs to the requested traveler.
     */
    const trip = await Trip.findOne({
      _id: tripId,
      owner: ownerId,
    })
      .select('_id tripName')
      .lean();

    if (!trip) {
      return res.status(404).json({
        success: false,
        message:
          'Trip not found or you do not have permission to modify it.',
      });
    }

    /*
     * Confirm that the selected day belongs to the selected trip.
     */
    const day = await Day.findOne({
      _id: dayId,
      trip: tripId,
    })
      .select('_id dayNumber date')
      .lean();

    if (!day) {
      return res.status(404).json({
        success: false,
        message: 'Day not found in the selected trip.',
      });
    }

    /*
     * Confirm that the selected stop belongs to the trip and day.
     */
    const existingStop = await Stop.findOne({
      _id: stopId,
      trip: tripId,
      day: dayId,
    }).lean();

    if (!existingStop) {
      return res.status(404).json({
        success: false,
        message: 'Stop not found in the selected trip day.',
      });
    }

    session = await mongoose.startSession();

    const shiftedStops = [];

    /*
     * Delete the selected stop and update later pin numbers together.
     * Every database operation runs sequentially inside the transaction.
     */
    await session.withTransaction(async () => {
      const deletionResult = await Stop.deleteOne(
        {
          _id: stopId,
          trip: tripId,
          day: dayId,
        },
        {
          session,
        },
      );

      if (deletionResult.deletedCount !== 1) {
        throw new Error('The selected stop could not be deleted.');
      }

      /*
       * Find all stops that appeared after the deleted stop.
       *
       * Example:
       * Deleted order 2
       * Existing order 3 becomes 2
       * Existing order 4 becomes 3
       */
      const followingStops = await Stop.find({
        trip: tripId,
        day: dayId,
        order: {
          $gt: existingStop.order,
        },
      })
        .sort({
          order: 1,
        })
        .session(session);

      /*
       * Update one stop at a time to avoid duplicate-order conflicts.
       */
      for (const followingStop of followingStops) {
        followingStop.order -= 1;

        await followingStop.save({
          session,
        });

        shiftedStops.push({
          _id: followingStop._id,
          placeName: followingStop.placeName,
          newOrder: followingStop.order,
        });
      }
    });

    const remainingStopCount = await Stop.countDocuments({
      trip: tripId,
      day: dayId,
    });

    return res.status(200).json({
      success: true,
      message: 'Stop deleted and pin numbers updated successfully.',
      data: {
        trip,
        day,
        deletedStop: {
          _id: existingStop._id,
          placeName: existingStop.placeName,
          previousOrder: existingStop.order,
        },
        shiftedStops,
        remainingStopCount,
      },
    });
  } catch (error) {
    console.error('Delete stop error:', error);

    return res.status(500).json({
      success: false,
      message:
        'Unable to delete the stop because of a server error.',
    });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};




















export const reorderStops = async (req, res) => {
  let session = null;

  try {
    const { tripId, dayId } = req.params;
    const { ownerId } = req.query;
    const { stopIds } = req.body;

    // Validate the IDs received through the URL.
    if (!mongoose.isValidObjectId(tripId)) {
      return res.status(400).json({
        success: false,
        message: 'tripId must be a valid MongoDB ObjectId.',
      });
    }

    if (!mongoose.isValidObjectId(dayId)) {
      return res.status(400).json({
        success: false,
        message: 'dayId must be a valid MongoDB ObjectId.',
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

    // The request body must contain an ordered array of stop IDs.
    if (!Array.isArray(stopIds) || stopIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'stopIds must be a non-empty array.',
      });
    }

    // Make sure every submitted stop ID is valid.
    const invalidStopId = stopIds.find(
      (stopId) => !mongoose.isValidObjectId(stopId),
    );

    if (invalidStopId) {
      return res.status(400).json({
        success: false,
        message: `${invalidStopId} is not a valid stop ID.`,
      });
    }

    // A stop ID must not appear more than once.
    const uniqueStopIds = new Set(stopIds);

    if (uniqueStopIds.size !== stopIds.length) {
      return res.status(400).json({
        success: false,
        message: 'stopIds cannot contain duplicate values.',
      });
    }

    /*
     * Confirm that the trip belongs to the requested traveler.
     */
    const trip = await Trip.findOne({
      _id: tripId,
      owner: ownerId,
    })
      .select('_id tripName')
      .lean();

    if (!trip) {
      return res.status(404).json({
        success: false,
        message:
          'Trip not found or you do not have permission to modify it.',
      });
    }

    /*
     * Confirm that the selected day belongs to the selected trip.
     */
    const day = await Day.findOne({
      _id: dayId,
      trip: tripId,
    })
      .select('_id dayNumber date')
      .lean();

    if (!day) {
      return res.status(404).json({
        success: false,
        message: 'Day not found in the selected trip.',
      });
    }

    /*
     * Retrieve every existing stop belonging to the selected day.
     */
    const existingStops = await Stop.find({
      trip: tripId,
      day: dayId,
    })
      .select('_id placeName order')
      .sort({
        order: 1,
      })
      .lean();

    if (existingStops.length !== stopIds.length) {
      return res.status(400).json({
        success: false,
        message:
          'The submitted list must contain every stop belonging to the day.',
      });
    }

    /*
     * Confirm that all submitted IDs belong to this exact trip day.
     */
    const existingStopIdSet = new Set(
      existingStops.map((stop) => stop._id.toString()),
    );

    const containsUnknownStop = stopIds.some(
      (stopId) => !existingStopIdSet.has(stopId),
    );

    if (containsUnknownStop) {
      return res.status(400).json({
        success: false,
        message:
          'One or more submitted stops do not belong to the selected day.',
      });
    }

    session = await mongoose.startSession();

    let reorderedStops = [];

    await session.withTransaction(async () => {
      /*
       * First assign temporary negative orders.
       *
       * This avoids conflicts with the unique day + order index.
       * The operations run sequentially, not with Promise.all().
       */
      for (let index = 0; index < stopIds.length; index += 1) {
        await Stop.updateOne(
          {
            _id: stopIds[index],
            trip: tripId,
            day: dayId,
          },
          {
            $set: {
              order: -(index + 1),
            },
          },
          {
            session,
          },
        );
      }

      /*
       * Assign the final positive pin numbers according to the
       * position of every ID in the submitted array.
       */
      for (let index = 0; index < stopIds.length; index += 1) {
        await Stop.updateOne(
          {
            _id: stopIds[index],
            trip: tripId,
            day: dayId,
          },
          {
            $set: {
              order: index + 1,
            },
          },
          {
            session,
          },
        );
      }

      reorderedStops = await Stop.find({
        trip: tripId,
        day: dayId,
      })
        .sort({
          order: 1,
        })
        .session(session)
        .lean();
    });

    return res.status(200).json({
      success: true,
      message: 'Stops reordered successfully.',
      data: {
        trip,
        day,
        count: reorderedStops.length,
        stops: reorderedStops,
      },
    });
  } catch (error) {
    console.error('Reorder stops error:', error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          'The stop order could not be updated because of an order conflict.',
      });
    }

    return res.status(500).json({
      success: false,
      message:
        'Unable to reorder the stops because of a server error.',
    });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};