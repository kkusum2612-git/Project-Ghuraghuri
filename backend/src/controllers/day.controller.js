import mongoose from 'mongoose';

import Day from '../models/day.model.js';
import Stop from '../models/stop.model.js';
import Trip from '../models/trip.model.js';

export const getTripDays = async (req, res) => {
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
     * Confirm that the trip exists and belongs to the requested user.
     * This prevents one traveler from viewing another traveler's trip days.
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
          'Trip not found or you do not have permission to view its days.',
      });
    }

    const days = await Day.find({
      trip: tripId,
    })
      .sort({
        dayNumber: 1,
      })
      .lean();

    /*
     * Add the number of stops belonging to each day.
     * The map interface can use this information when showing day tabs.
     */
    const daysWithStopCount = await Promise.all(
      days.map(async (day) => {
        const stopCount = await Stop.countDocuments({
          day: day._id,
        });

        return {
          ...day,
          stopCount,
        };
      }),
    );

    return res.status(200).json({
      success: true,
      message: 'Trip days fetched successfully.',
      count: daysWithStopCount.length,
      data: {
        trip,
        days: daysWithStopCount,
      },
    });
  } catch (error) {
    console.error('Get trip days error:', error);

    return res.status(500).json({
      success: false,
      message:
        'Unable to retrieve the trip days because of a server error.',
    });
  }
};