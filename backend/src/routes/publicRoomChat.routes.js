import { Router } from 'express';

import {
  createPublicRoomMessage,
  getPublicRoomMessages,
} from '../controllers/publicRoomChat.controller.js';

import {
  authenticateUser,
  authorizeRoles,
} from '../middleware/auth.middleware.js';

const router = Router();

const travelerChatProtection = [
  authenticateUser,
  authorizeRoles('traveler'),
];

// Load persisted messages for one Public Event Room.
router.get(
  '/:roomId/messages',
  ...travelerChatProtection,
  getPublicRoomMessages
);

// Send one message through the REST API.
router.post(
  '/:roomId/messages',
  ...travelerChatProtection,
  createPublicRoomMessage
);

export default router;