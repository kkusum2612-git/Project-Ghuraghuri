import mongoose from 'mongoose';

// A JoinRequest represents one traveler asking to join
// one Public Event Room.
//
// Example:
//
// Traveler B opens a room created by Traveler A
// and clicks:
//
// "Request to Join"
//
// We must store that action in MongoDB.
//
// Feature 1 creates the request.
//
// Feature 2 will later allow the room creator to
// Accept or Reject this SAME request.
//
// Therefore we create the model now rather than building
// a temporary Feature-1-only solution.
const joinRequestSchema =
  new mongoose.Schema(
    {
      // The public room that the traveler wants to join.
      room: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: 'PublicRoom',

        required: true,

        index: true,
      },

      // The traveler who clicked "Request to Join".
      //
      // Just like room ownership, this ID will come from:
      //
      // req.user._id
      //
      // and NOT from a browser-supplied requester ID.
      requester: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: 'User',

        required: true,

        index: true,
      },

      // Every new request begins as pending.
      //
      // Feature 2 will later change this to
      // accepted or rejected.
      status: {
        type: String,

        enum: [
          'pending',
          'accepted',
          'rejected',
        ],

        default: 'pending',

        index: true,
      },
    },
    {
      // Adds createdAt and updatedAt.
      //
      // createdAt is especially useful later when the
      // creator views pending requests in chronological order.
      timestamps: true,
    }
  );

// A traveler should not have multiple request documents
// for the exact same room.
//
// Without this database rule, a user could potentially
// press the button several times very quickly and create:
//
// Request 1
// Request 2
// Request 3
//
// for the same room.
//
// The combination:
//
// room + requester
//
// must therefore be unique.
joinRequestSchema.index(
  {
    room: 1,
    requester: 1,
  },
  {
    unique: true,
  }
);

const JoinRequest =
  mongoose.models.JoinRequest ||
  mongoose.model(
    'JoinRequest',
    joinRequestSchema
  );

export default JoinRequest;