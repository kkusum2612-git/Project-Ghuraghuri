import mongoose from 'mongoose';

const notificationDispatchSchema =
  new mongoose.Schema(
    {
      /*
       * A unique key prevents the same automated
       * notification from being sent more than once.
       */
      dispatchKey: {
        type: String,
        required: true,
        unique: true,
        trim: true,
      },

      type: {
        type: String,
        required: true,
        enum: [
          'upcoming_trip_collaborator',
        ],
      },

      recipientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
      },

      tripId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Trip',
        default: null,
        index: true,
      },

      recipientEmail: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
      },

      sentAt: {
        type: Date,
        default: Date.now,
      },
    },
    {
      timestamps: true,
    }
  );

notificationDispatchSchema.index({
  type: 1,
  tripId: 1,
});

const NotificationDispatch =
  mongoose.models.NotificationDispatch ||
  mongoose.model(
    'NotificationDispatch',
    notificationDispatchSchema
  );

export default NotificationDispatch;