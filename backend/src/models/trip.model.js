import mongoose from 'mongoose';

const destinationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    latitude: {
      type: Number,
      default: null,
      min: -90,
      max: 90,
    },

    longitude: {
      type: Number,
      default: null,
      min: -180,
      max: 180,
    },
  },
  {
    _id: false,
  }
);

const tripSchema = new mongoose.Schema(
  {
    // The traveler who originally created the trip.
    //
    // The owner keeps full control over owner-level actions
    // such as editing the main trip details, deleting the trip,
    // and managing collaborators.
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Travelers who have been added to this trip by the owner.
    //
    // We store User ObjectIds instead of email addresses.
    // Email will only be used by the collaborator API to find
    // the correct registered user.
    //
    // Existing trips are also safe because an older document
    // without this field behaves as having no collaborators.
    collaborators: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      default: [],
    },

    tripName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    destination: {
      type: destinationSchema,
      required: true,
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,

      validate: {
        validator(value) {
          if (
            !this.startDate ||
            !value
          ) {
            return true;
          }

          return (
            value >=
            this.startDate
          );
        },

        message:
          'End date must be on or after the start date.',
      },
    },

    coverPhoto: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// This index already existed for efficiently finding
// a traveler's owned trips ordered/filtered by date.
tripSchema.index({
  owner: 1,
  startDate: 1,
});

// This additional index helps MongoDB find trips where
// a particular traveler appears inside the collaborators
// array.
//
// This becomes useful when the My Trips dashboard needs
// to return both owned trips and shared trips.
tripSchema.index({
  collaborators: 1,
});

const Trip =
  mongoose.models.Trip ||
  mongoose.model(
    'Trip',
    tripSchema
  );

export default Trip;