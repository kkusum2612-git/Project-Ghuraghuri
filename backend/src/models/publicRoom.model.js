import mongoose from 'mongoose';

// A public event room represents a travel group created by a traveler.
//
// Example:
//
// Rafi creates a room called "Cox's Bazar Trip Buddies".
// Other travelers can discover that room and request to join it.
//
// This model stores the main information about that room in MongoDB.
const publicRoomSchema = new mongoose.Schema(
  {
    // "creator" stores the MongoDB User ID of the traveler
    // who created this room.
    //
    // We store a reference instead of copying the user's name/email.
    // That means MongoDB can connect this room document with the
    // original User document.
    //
    // IMPORTANT SECURITY RULE:
    // The frontend will NOT decide the creator ID.
    //
    // The backend will take it from:
    //
    // req.user._id
    //
    // after authentication.
    //
    // This prevents somebody from pretending to create a room
    // on behalf of another traveler.
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // A readable name for the public room.
    //
    // Example:
    // "Cox's Bazar Trip Buddies"
    //
    // The Figma design shows room names prominently on cards,
    // so we keep this separate from the destination.
    roomName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    // Destination is stored as simple text for this feature.
    //
    // Example:
    // "Cox's Bazar"
    //
    // We are intentionally NOT creating another map/location
    // structure here because map functionality belongs to
    // another feature and is unnecessary for Public Room
    // Creation & Discovery.
    destination: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
      index: true,
    },

    // First day of the planned group trip.
    startDate: {
      type: Date,
      required: true,
    },

    // Last day of the planned group trip.
    endDate: {
      type: Date,
      required: true,

      // Mongoose runs this validation before saving the room.
      //
      // The end date cannot happen before the start date.
      validate: {
        validator(value) {
          // If one of the dates is missing, the normal "required"
          // validation will handle it.
          if (!this.startDate || !value) {
            return true;
          }

          return value >= this.startDate;
        },

        message:
          'End date must be on or after the start date.',
      },
    },

    // The requirement says the creator provides an
    // estimated budget for the trip.
    //
    // We store it as a Number instead of text because later
    // the discovery page needs to filter rooms by budget.
    estimatedBudget: {
      type: Number,
      required: true,
      min: 0,
    },

    // This is the maximum number of people allowed in the room.
    //
    // IMPORTANT:
    // The creator counts as a member.
    //
    // Therefore:
    //
    // maxMembers = 10
    //
    // means:
    //
    // creator + maximum 9 additional travelers.
    maxMembers: {
      type: Number,
      required: true,
      min: 2,
      max: 100,

      // Member limits should be whole numbers.
      //
      // 10 is valid.
      // 10.5 is not valid.
      validate: {
        validator: Number.isInteger,
        message:
          'Maximum members must be a whole number.',
      },
    },

    // Longer explanation written by the room creator.
    //
    // Example:
    // "We are planning a relaxed beach trip and looking
    // for travelers who enjoy food and photography."
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 2000,
    },

    // Interest tags are used both for display and searching.
    //
    // Example:
    //
    // [
    //   "Beach",
    //   "Adventure",
    //   "Food"
    // ]
    interestTags: {
      type: [String],
      default: [],

      // Keeping the maximum small prevents somebody from
      // creating hundreds of unnecessary tags.
      validate: {
        validator(tags) {
          return tags.length <= 10;
        },

        message:
          'A room can contain at most 10 interest tags.',
      },
    },

    // Your Figma room cards contain travel photographs.
    //
    // The current Ghuraghuri project already uses URL-based
    // images for trips and hotels, so we follow the same
    // approach instead of adding an image-upload system.
    //
    // This field is optional.
    coverPhoto: {
      type: String,
      trim: true,
      default: '',
    },

    // This array stores the User IDs of travelers who are
    // currently members of the public room.
    //
    // When a room is first created, the backend automatically
    // puts the creator inside this array.
    //
    // Feature 2 will later add accepted travelers here.
    members: {
      type: [
        {
          type:
            mongoose.Schema.Types
              .ObjectId,

          ref: 'User',
        },
      ],

      default: [],
    },

    // For now every newly created room starts as "open".
    //
    // Having a status field gives us a clean way to stop
    // future join requests later without deleting the room.
    status: {
      type: String,

      enum: [
        'open',
        'closed',
      ],

      default: 'open',

      index: true,
    },
  },
  {
    // Automatically creates:
    //
    // createdAt
    // updatedAt
    //
    // These are useful for dashboard sorting and future
    // management features.
    timestamps: true,
  }
);

// These indexes help MongoDB efficiently answer common
// dashboard/discovery queries.
//
// Example:
// "Give me Rafi's rooms ordered by travel date."
publicRoomSchema.index({
  creator: 1,
  startDate: 1,
});

// Example:
// "Give me open rooms ordered by travel date."
publicRoomSchema.index({
  status: 1,
  startDate: 1,
});

// Helps searches involving interest tags.
publicRoomSchema.index({
  interestTags: 1,
});

// mongoose.models.PublicRoom is checked first.
//
// This is useful in development environments where files
// may reload. It prevents Mongoose from trying to register
// the exact same model multiple times.
const PublicRoom =
  mongoose.models.PublicRoom ||
  mongoose.model(
    'PublicRoom',
    publicRoomSchema
  );

export default PublicRoom;