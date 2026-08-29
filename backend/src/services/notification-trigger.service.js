import NotificationDispatch from '../models/notificationDispatch.model.js';
import Trip from '../models/trip.model.js';

import {
  sendNotificationEmail,
} from './notification.service.js';

const DEFAULT_ALERT_DAYS = 3;
const DEFAULT_INTERVAL_MINUTES = 60;

function getPositiveNumber(
  value,
  fallback
) {
  const parsedValue =
    Number(value);

  if (
    !Number.isFinite(
      parsedValue
    ) ||
    parsedValue <= 0
  ) {
    return fallback;
  }

  return parsedValue;
}

function getDateKey(value) {
  return new Date(value)
    .toISOString()
    .slice(0, 10);
}

/*
 * Finds trips starting soon and emails each collaborator once.
 */
async function sendUpcomingTripCollaboratorAlerts() {
  const alertDays =
    getPositiveNumber(
      process.env
        .UPCOMING_TRIP_ALERT_DAYS,
      DEFAULT_ALERT_DAYS
    );

  const today =
    new Date();

  today.setUTCHours(
    0,
    0,
    0,
    0
  );

  const alertEnd =
    new Date(today);

  alertEnd.setUTCDate(
    alertEnd.getUTCDate() +
      alertDays
  );

  const trips =
    await Trip.find({
      startDate: {
        $gte: today,
        $lte: alertEnd,
      },

      'collaborators.0': {
        $exists: true,
      },
    })
      .populate(
        'collaborators',
        'name email accountStatus role'
      )
      .lean();

  for (const trip of trips) {
    const collaborators =
      Array.isArray(
        trip.collaborators
      )
        ? trip.collaborators
        : [];

    for (
      const collaborator
      of collaborators
    ) {
      if (
        !collaborator?.email ||
        collaborator.role !==
          'traveler' ||
        collaborator.accountStatus !==
          'active'
      ) {
        continue;
      }

      const dispatchKey =
        [
          'upcoming-trip',
          trip._id,
          collaborator._id,
        ].join(':');

      try {
        /*
         * Creating the unique dispatch first prevents two trigger
         * runs from sending the same reminder simultaneously.
         */
        const dispatch =
          await NotificationDispatch.create({
            dispatchKey,

            type:
              'upcoming_trip_collaborator',

            recipientId:
              collaborator._id,

            tripId:
              trip._id,

            recipientEmail:
              collaborator.email,
          });

        const startDateKey =
          getDateKey(
            trip.startDate
          );

        const result =
          await sendNotificationEmail({
            to:
              collaborator.email,

            subject:
              `Upcoming Trip Reminder - ${trip.tripName}`,

            text:
              `Your shared trip "${trip.tripName}" starts on ${startDateKey}.`,

            html: `
              <h2>Upcoming Trip Reminder</h2>
              <p>Hello ${collaborator.name || 'Traveler'},</p>
              <p>Your shared trip is starting soon.</p>
              <p><strong>Trip:</strong> ${trip.tripName}</p>
              <p><strong>Destination:</strong> ${trip.destination?.name || 'Not specified'}</p>
              <p><strong>Start Date:</strong> ${startDateKey}</p>
            `,
          });

        /*
         * If email delivery was not started, remove the dispatch
         * so the engine can retry during a later run.
         */
        if (!result.sent) {
          await NotificationDispatch.deleteOne({
            _id:
              dispatch._id,
          });
        }
      } catch (error) {
        /*
         * Duplicate dispatch means this collaborator was already
         * handled for this trip.
         */
        if (
          error?.code ===
          11000
        ) {
          continue;
        }

        console.error(
          'Upcoming trip notification failed:',
          error
        );
      }
    }
  }
}

/*
 * Runs all automated notification checks.
 */
async function runNotificationTriggerEngine() {
  try {
    await sendUpcomingTripCollaboratorAlerts();
  } catch (error) {
    console.error(
      'Notification trigger engine failed:',
      error
    );
  }
}

/*
 * Starts the engine immediately and repeats it periodically.
 */
function startNotificationTriggerEngine() {
  const intervalMinutes =
    getPositiveNumber(
      process.env
        .NOTIFICATION_TRIGGER_INTERVAL_MINUTES,
      DEFAULT_INTERVAL_MINUTES
    );

  void runNotificationTriggerEngine();

  const timer =
    setInterval(
      () => {
        void runNotificationTriggerEngine();
      },
      intervalMinutes *
        60 *
        1000
    );

  timer.unref();

  return timer;
}

export {
  runNotificationTriggerEngine,
  sendUpcomingTripCollaboratorAlerts,
  startNotificationTriggerEngine,
};