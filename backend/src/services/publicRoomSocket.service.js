import { Server } from 'socket.io';

import User from '../models/User.js';
import PublicRoomMessage from '../models/publicRoomMessage.model.js';

import {
  getAuthorizedRoom,
} from '../controllers/publicRoomChat.controller.js';

import {
  AUTH_COOKIE_NAME,
} from './auth-cookie.service.js';

import {
  verifyAccessToken,
} from './token.service.js';

// Reads one cookie value from the Socket.IO handshake.
function getCookieValue(cookieHeader, cookieName) {
  if (!cookieHeader) {
    return '';
  }

  const cookies = cookieHeader.split(';');

  for (const cookie of cookies) {
    const [name, ...valueParts] =
      cookie.trim().split('=');

    if (name === cookieName) {
      return decodeURIComponent(
        valueParts.join('=')
      );
    }
  }

  return '';
}

// Creates the Socket.IO room name for one Public Event Room.
function getSocketRoomName(roomId) {
  return `public-room:${roomId}`;
}

// Attaches Public Room real-time chat to the HTTP server.
function initializePublicRoomSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin:
        process.env.CLIENT_URL ||
        'http://localhost:5173',
      credentials: true,
    },
  });

  // Authenticate every socket using the existing JWT cookie.
  io.use(async (socket, next) => {
    try {
      const token = getCookieValue(
        socket.handshake.headers.cookie,
        AUTH_COOKIE_NAME
      );

      if (!token) {
        return next(
          new Error(
            'Authentication is required.'
          )
        );
      }

      const payload =
        verifyAccessToken(token);

      const user =
        await User.findById(
          payload.sub
        );

      if (
        !user ||
        user.accountStatus !== 'active' ||
        user.role !== 'traveler'
      ) {
        return next(
          new Error(
            'Chat access is not allowed.'
          )
        );
      }

      socket.user = user;

      return next();
    } catch {
      return next(
        new Error(
          'Your login session is invalid or has expired.'
        )
      );
    }
  });

  io.on(
    'connection',
    (socket) => {
      // Join the Socket.IO room only after membership is verified.
      socket.on(
        'join_public_room',
        async (
          { roomId } = {},
          callback = () => {}
        ) => {
          try {
            const room =
              await getAuthorizedRoom(
                roomId,
                socket.user._id
              );

            socket.join(
              getSocketRoomName(
                room._id
              )
            );

            callback({
              success: true,
            });
          } catch (error) {
            callback({
              success: false,
              message: error.message,
            });
          }
        }
      );

      // Save the message first, then broadcast it to room members.
      socket.on(
        'send_public_room_message',
        async (
          { roomId, text } = {},
          callback = () => {}
        ) => {
          try {
            const cleanText =
              typeof text === 'string'
                ? text.trim()
                : '';

            if (!cleanText) {
              return callback({
                success: false,
                message:
                  'Message text is required.',
              });
            }

            if (
              cleanText.length > 1000
            ) {
              return callback({
                success: false,
                message:
                  'A message cannot contain more than 1000 characters.',
              });
            }

            const room =
              await getAuthorizedRoom(
                roomId,
                socket.user._id
              );

            const savedMessage =
              await PublicRoomMessage.create({
                publicRoom:
                  room._id,
                sender:
                  socket.user._id,
                text:
                  cleanText,
              });

            await savedMessage.populate(
              'sender',
              'name'
            );

            const message =
              savedMessage.toObject();

            io.to(
              getSocketRoomName(
                room._id
              )
            ).emit(
              'public_room_message',
              message
            );

            return callback({
              success: true,
              data: {
                message,
              },
            });
          } catch (error) {
            return callback({
              success: false,
              message:
                error.message ||
                'The message could not be sent.',
            });
          }
        }
      );

      socket.on(
        'leave_public_room',
        ({ roomId } = {}) => {
          if (roomId) {
            socket.leave(
              getSocketRoomName(
                roomId
              )
            );
          }
        }
      );
    }
  );

  return io;
}

export {
  initializePublicRoomSocket,
};