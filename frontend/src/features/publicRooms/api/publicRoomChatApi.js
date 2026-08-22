import apiClient from '../../../api/axiosClient';

// Loads persisted messages for one Public Event Room.
async function getPublicRoomMessages(
  roomId
) {
  const response = await apiClient.get(
    `/public-room-chat/${roomId}/messages`
  );

  return response.data;
}

// Sends one message through the REST API.
// Socket.IO will handle real-time sending in the chat component.
async function createPublicRoomMessage(
  roomId,
  text
) {
  const response = await apiClient.post(
    `/public-room-chat/${roomId}/messages`,
    {
      text,
    }
  );

  return response.data;
}

export {
  createPublicRoomMessage,
  getPublicRoomMessages,
};