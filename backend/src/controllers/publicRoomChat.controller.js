import mongoose from 'mongoose';

import PublicRoom from '../models/publicRoom.model.js';
import PublicRoomMessage from '../models/publicRoomMessage.model.js';

const MAX_MESSAGES = 100;

// Creates an error that the shared error middleware can handle.
function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;

  return error;
}

// Checks whether the user is the creator or an accepted room member.
function isRoomMember(room, userId) {
  const currentUserId = String(userId);

  if (String(room.creator) === currentUserId) {
    return true;
  }

  return room.members.some(
    (memberId) =>
      String(memberId) === currentUserId
  );
}

// Loads the room and checks chat permission.
async function getAuthorizedRoom(roomId, userId) {
  if (!mongoose.isValidObjectId(roomId)) {
    throw createHttpError(
      'The public room ID is invalid.',
      400
    );
  }

  const room = await PublicRoom.findById(
    roomId
  ).select(
    'creator members roomName destination status'
  );

  if (!room) {
    throw createHttpError(
      'Public room not found.',
      404
    );
  }

  if (!isRoomMember(room, userId)) {
    throw createHttpError(
      'You must be a member of this public room to use its chat.',
      403
    );
  }

  return room;
}

// GET /api/v1/public-room-chat/:roomId/messages
async function getPublicRoomMessages(
  req,
  res,
  next
) {
  try {
    const room =
      await getAuthorizedRoom(
        req.params.roomId,
        req.user._id
      );

    // Load the newest 100 messages, then return them oldest-first.
    const messages =
      await PublicRoomMessage.find({
        publicRoom: room._id,
      })
        .sort({
          createdAt: -1,
        })
        .limit(MAX_MESSAGES)
        .populate(
          'sender',
          'name'
        )
        .lean();

    messages.reverse();

    return res.status(200).json({
      success: true,
      message:
        'Public room messages loaded successfully.',
      data: {
        room: {
          _id: room._id,
          roomName: room.roomName,
        },
        messages,
      },
    });
  } catch (error) {
    return next(error);
  }
}

// POST /api/v1/public-room-chat/:roomId/messages
async function createPublicRoomMessage(
  req,
  res,
  next
) {
  try {
    const text =
      typeof req.body?.text === 'string'
        ? req.body.text.trim()
        : '';

    if (!text) {
      throw createHttpError(
        'Message text is required.',
        400
      );
    }

    if (text.length > 1000) {
      throw createHttpError(
        'A message cannot contain more than 1000 characters.',
        400
      );
    }

    const room =
      await getAuthorizedRoom(
        req.params.roomId,
        req.user._id
      );

    // sender always comes from the authenticated user.
    const message =
      await PublicRoomMessage.create({
        publicRoom: room._id,
        sender: req.user._id,
        text,
      });

    await message.populate(
      'sender',
      'name'
    );

    return res.status(201).json({
      success: true,
      message:
        'Message sent successfully.',
      data: {
        message,
      },
    });
  } catch (error) {
    return next(error);
  }
}

export {
  createPublicRoomMessage,
  getAuthorizedRoom,
  getPublicRoomMessages,
  isRoomMember,
};