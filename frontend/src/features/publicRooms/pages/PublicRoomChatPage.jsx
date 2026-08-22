import {
  useEffect,
  useState,
} from 'react';

import {
  useNavigate,
  useParams,
} from 'react-router-dom';

import {
  getPublicRoomById,
} from '../api/publicRoomApi';

import PublicRoomChat from '../components/PublicRoomChat';
import PublicRoomSectionNav from '../components/PublicRoomSectionNav';

function PublicRoomChatPage() {
  const {
    roomId,
  } = useParams();

  const navigate =
    useNavigate();

  const [
    room,
    setRoom,
  ] = useState(null);

  const [
    viewerStatus,
    setViewerStatus,
  ] = useState('none');

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    pageError,
    setPageError,
  ] = useState('');

  useEffect(() => {
    let ignoreResult = false;

    async function loadRoom() {
      setIsLoading(true);
      setPageError('');

      try {
        const result =
          await getPublicRoomById(
            roomId
          );

        if (ignoreResult) {
          return;
        }

        setRoom(
          result?.data?.room ||
            null
        );

        setViewerStatus(
          result?.data
            ?.viewerStatus ||
            'none'
        );
      } catch (error) {
        if (!ignoreResult) {
          setPageError(
            error.response?.data
              ?.message ||
              'Unable to load this public room.'
          );
        }
      } finally {
        if (!ignoreResult) {
          setIsLoading(false);
        }
      }
    }

    void loadRoom();

    return () => {
      ignoreResult = true;
    };
  }, [roomId]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm font-medium text-[#66756D]">
          Loading room chat...
        </p>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="mx-auto max-w-4xl">
        <button
          type="button"
          onClick={() =>
            navigate(
              '/event-rooms'
            )
          }
          className="mb-5 text-sm font-semibold text-[#0F6B4D] hover:underline"
        >
          ← Back to Event Rooms
        </button>

        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {pageError ||
            'Public room not found.'}
        </div>
      </div>
    );
  }

  const canUseChat =
    viewerStatus ===
      'creator' ||
    viewerStatus ===
      'member';

  return (
    <div className="mx-auto max-w-6xl">
      <button
        type="button"
        onClick={() =>
          navigate(
            '/event-rooms'
          )
        }
        className="mb-5 text-sm font-semibold text-[#0F6B4D] hover:underline"
      >
        ← Back to Event Rooms
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#17211D]">
          {room.roomName}
        </h1>

        <p className="mt-1 text-sm text-[#66756D]">
          {room.destination}
        </p>
      </div>

      <PublicRoomSectionNav
        roomId={roomId}
        showChat={canUseChat}
      />

      {canUseChat ? (
        <PublicRoomChat
          roomId={roomId}
        />
      ) : (
        <div className="rounded-xl border border-[#DCE5E0] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-[#17211D]">
            Group Chat
          </h2>

          <p className="mt-2 text-sm leading-6 text-[#66756D]">
            You must be an accepted member of this room to use the group chat.
          </p>
        </div>
      )}
    </div>
  );
}

export default PublicRoomChatPage;