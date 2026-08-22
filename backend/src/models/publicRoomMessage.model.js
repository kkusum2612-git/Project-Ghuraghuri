import mongoose from 'mongoose';

// Stores one text message inside one Public Event Room.
const publicRoomMessageSchema = new mongoose.Schema(
  {
    // The room where this message was sent.
    publicRoom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PublicRoom',
      required: true,
      index: true,
    },

    // The logged-in traveler who sent the message.
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // For now, the chat supports text messages only.
    text: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  }
);

// Helps load one room's messages efficiently in time order.
publicRoomMessageSchema.index({
  publicRoom: 1,
  createdAt: 1,
});

const PublicRoomMessage =
  mongoose.models.PublicRoomMessage ||
  mongoose.model(
    'PublicRoomMessage',
    publicRoomMessageSchema
  );

export default PublicRoomMessage;