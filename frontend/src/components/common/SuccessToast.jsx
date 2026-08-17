import {
  useEffect,
  useRef,
} from 'react';

function SuccessToast({
  message,
  onClose,
  duration = 3500,
}) {
  /*
   * Keep the newest onClose function in
   * a ref.
   *
   * This prevents unrelated parent
   * re-renders from restarting the toast
   * timer unnecessarily.
   */
  const onCloseRef =
    useRef(onClose);

  useEffect(() => {
    onCloseRef.current =
      onClose;
  }, [onClose]);

  /*
   * Automatically dismiss the success
   * message after a short period.
   *
   * The timer is also cleaned up when
   * the component disappears.
   */
  useEffect(() => {
    if (!message) {
      return undefined;
    }

    const timer =
      window.setTimeout(
        () => {
          onCloseRef.current?.();
        },
        duration
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [
    duration,
    message,
  ]);

  if (!message) {
    return null;
  }

  return (
    <div
      className="fixed right-4 top-20 z-[90] w-[calc(100%-2rem)] max-w-sm"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3 rounded-xl border border-[#BFD9CD] bg-white p-4 shadow-xl">
        {/*
         * Green success icon matching
         * Ghuraghuri's primary color.
         */}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EEF7F2] text-[#0F6B4D]">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <path
              d="M5 12.5L9.25 16.5L19 7"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[#17211D]">
            Success
          </p>

          <p className="mt-1 text-sm leading-5 text-[#66756D]">
            {message}
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            onCloseRef.current?.()
          }
          className="shrink-0 rounded-md p-1 text-[#7B8982] transition hover:bg-[#F3F6F4] hover:text-[#17211D]"
          aria-label="Close success message"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <path
              d="M6 6L18 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />

            <path
              d="M18 6L6 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default SuccessToast;