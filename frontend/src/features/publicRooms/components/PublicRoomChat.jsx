import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  io,
} from 'socket.io-client';

import {
  getPublicRoomMessages,
} from '../api/publicRoomChatApi';

// Socket.IO connects to the backend origin, not /api/v1.
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:5000/api/v1';

const SOCKET_URL =
  API_BASE_URL.replace(
    /\/api\/v1\/?$/,
    ''
  );

function formatMessageTime(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '';
  }

  return date.toLocaleTimeString(
    'en-GB',
    {
      hour: '2-digit',
      minute: '2-digit',
    }
  );
}

function PublicRoomChat({
  roomId,
}) {
  const [
    messages,
    setMessages,
  ] = useState([]);

  const [
    messageText,
    setMessageText,
  ] = useState('');

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isSending,
    setIsSending,
  ] = useState(false);

  const [
    chatError,
    setChatError,
  ] = useState('');

  const [
    isConnected,
    setIsConnected,
  ] = useState(false);

  const socketRef =
    useRef(null);

  const messagesEndRef =
    useRef(null);

  // Load saved history first, then join the real-time room.
  useEffect(() => {
    let ignoreResult = false;

    async function setupChat() {
      setIsLoading(true);
      setChatError('');

      try {
        const result =
          await getPublicRoomMessages(
            roomId
          );

        if (ignoreResult) {
          return;
        }

        setMessages(
          Array.isArray(
            result?.data?.messages
          )
            ? result.data.messages
            : []
        );

        const socket = io(
          SOCKET_URL,
          {
            withCredentials: true,
          }
        );

        socketRef.current =
          socket;

        socket.on(
          'connect',
          () => {
            setIsConnected(
              true
            );

            socket.emit(
              'join_public_room',
              {
                roomId,
              },
              (response) => {
                if (
                  !response?.success
                ) {
                  setChatError(
                    response?.message ||
                      'Unable to join the room chat.'
                  );
                }
              }
            );
          }
        );

        socket.on(
          'disconnect',
          () => {
            setIsConnected(
              false
            );
          }
        );

        socket.on(
          'connect_error',
          (error) => {
            setIsConnected(
              false
            );

            setChatError(
              error.message ||
                'Unable to connect to the live chat.'
            );
          }
        );

        socket.on(
          'public_room_message',
          (message) => {
            setMessages(
              (currentMessages) => {
                // Prevent accidental duplicate rendering.
                if (
                  currentMessages.some(
                    (item) =>
                      item._id ===
                      message._id
                  )
                ) {
                  return currentMessages;
                }

                return [
                  ...currentMessages,
                  message,
                ];
              }
            );
          }
        );
      } catch (error) {
        if (!ignoreResult) {
          setChatError(
            error.response?.data
              ?.message ||
              'Unable to load the room chat.'
          );
        }
      } finally {
        if (!ignoreResult) {
          setIsLoading(false);
        }
      }
    }

    void setupChat();

    return () => {
      ignoreResult = true;

      const socket =
        socketRef.current;

      if (socket) {
        socket.emit(
          'leave_public_room',
          {
            roomId,
          }
        );

        socket.disconnect();

        socketRef.current =
          null;
      }
    };
  }, [roomId]);

  // Keep the newest message visible.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
    });
  }, [messages]);

  function handleSubmit(
    event
  ) {
    event.preventDefault();

    const text =
      messageText.trim();

    if (
      !text ||
      isSending
    ) {
      return;
    }

    const socket =
      socketRef.current;

    if (
      !socket ||
      !socket.connected
    ) {
      setChatError(
        'Live chat is disconnected. Please try again.'
      );

      return;
    }

    setIsSending(true);
    setChatError('');

    socket.emit(
      'send_public_room_message',
      {
        roomId,
        text,
      },
      (response) => {
        setIsSending(false);

        if (
          !response?.success
        ) {
          setChatError(
            response?.message ||
              'Unable to send the message.'
          );

          return;
        }

        setMessageText('');
      }
    );
  }

  return (
    <section className="rounded-xl border border-[#DCE5E0] bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#17211D]">
            Group Chat
          </h2>

          <p className="mt-1 text-sm text-[#66756D]">
            Chat with the members of this public room.
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1.5 text-xs font-bold ${
            isConnected
              ? 'bg-[#EEF7F2] text-[#0F6B4D]'
              : 'bg-[#F7FAF8] text-[#66756D]'
          }`}
        >
          {isConnected
            ? 'Live'
            : 'Connecting...'}
        </span>
      </div>

      {chatError && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {chatError}
        </div>
      )}

      <div className="mt-5 h-80 overflow-y-auto rounded-lg border border-[#E1E8E4] bg-[#F7FAF8] p-4">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-[#66756D]">
              Loading messages...
            </p>
          </div>
        ) : messages.length ===
          0 ? (
          <div className="flex h-full items-center justify-center text-center">
            <div>
              <p className="text-sm font-semibold text-[#44524B]">
                No messages yet
              </p>

              <p className="mt-1 text-xs text-[#7A8780]">
                Start the conversation with the group.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map(
              (message) => (
                <article
                  key={
                    message._id
                  }
                  className="rounded-lg border border-[#E1E8E4] bg-white px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-[#0F6B4D]">
                      {message
                        .sender
                        ?.name ||
                        'Traveler'}
                    </p>

                    <span className="text-xs text-[#8A9690]">
                      {formatMessageTime(
                        message.createdAt
                      )}
                    </span>
                  </div>

                  <p className="mt-1 break-words text-sm leading-6 text-[#44524B]">
                    {
                      message.text
                    }
                  </p>
                </article>
              )
            )}

            <div
              ref={
                messagesEndRef
              }
            />
          </div>
        )}
      </div>

      <form
        onSubmit={
          handleSubmit
        }
        className="mt-4 flex gap-3"
      >
        <input
          type="text"
          value={
            messageText
          }
          onChange={(
            event
          ) =>
            setMessageText(
              event.target.value
            )
          }
          maxLength={1000}
          placeholder="Write a message..."
          className="min-w-0 flex-1 rounded-lg border border-[#DCE5E0] bg-white px-4 py-3 text-sm text-[#17211D] outline-none transition focus:border-[#0F6B4D]"
        />

        <button
          type="submit"
          disabled={
            isSending ||
            !messageText.trim() ||
            !isConnected
          }
          className="rounded-lg bg-[#0F6B4D] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0A523B] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSending
            ? 'Sending...'
            : 'Send'}
        </button>
      </form>
    </section>
  );
}

export default PublicRoomChat;