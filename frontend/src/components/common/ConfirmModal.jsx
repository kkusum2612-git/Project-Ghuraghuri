import {
  useEffect,
  useId,
} from 'react';

function ConfirmModal({
  isOpen,
  title,
  description,
  warning,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isConfirming = false,
  onCancel,
  onConfirm,
}) {
  /*
   * useId gives this modal unique IDs
   * for accessibility.
   *
   * aria-labelledby connects the dialog
   * to its heading.
   *
   * aria-describedby connects the dialog
   * to its explanatory text.
   */
  const titleId =
    useId();

  const descriptionId =
    useId();

  /*
   * Allow Escape to close the modal.
   *
   * We intentionally disable Escape
   * while the destructive operation is
   * already running so the user cannot
   * make the UI appear cancelled while
   * the backend request is still active.
   */
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function handleKeyDown(
      event
    ) {
      if (
        event.key ===
          'Escape' &&
        !isConfirming
      ) {
        onCancel?.();
      }
    }

    window.addEventListener(
      'keydown',
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        'keydown',
        handleKeyDown
      );
    };
  }, [
    isConfirming,
    isOpen,
    onCancel,
  ]);

  /*
   * Nothing is rendered until a parent
   * component actually asks for the
   * confirmation dialog.
   */
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 px-4 py-6">
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-[#DCE5E0] bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={
          titleId
        }
        aria-describedby={
          description
            ? descriptionId
            : undefined
        }
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            {/*
             * Red warning icon.
             *
             * Using an SVG instead of an
             * emoji keeps the visual style
             * consistent across browsers.
             */}
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-6 w-6"
                aria-hidden="true"
              >
                <path
                  d="M12 8V13"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />

                <path
                  d="M12 16.5V16.51"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />

                <path
                  d="M10.29 3.86L2.82 17A2 2 0 0 0 4.56 20H19.44A2 2 0 0 0 21.18 17L13.71 3.86A2 2 0 0 0 10.29 3.86Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div className="min-w-0 flex-1">
              <h2
                id={
                  titleId
                }
                className="text-xl font-bold text-[#17211D]"
              >
                {title}
              </h2>

              {description && (
                <div
                  id={
                    descriptionId
                  }
                  className="mt-2 text-sm leading-6 text-[#66756D]"
                >
                  {description}
                </div>
              )}
            </div>
          </div>

          {/*
           * warning is optional.
           *
           * It can contain either a simple
           * string or richer JSX such as a
           * list of days/stops that will be
           * permanently removed.
           */}
          {warning && (
            <div className="mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
              {warning}
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-[#E5ECE8] bg-[#F9FBFA] px-6 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={
              onCancel
            }
            disabled={
              isConfirming
            }
            className="rounded-lg border border-[#CAD7D0] bg-white px-4 py-2.5 text-sm font-semibold text-[#44524B] transition hover:bg-[#F3F6F4] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={
              onConfirm
            }
            disabled={
              isConfirming
            }
            className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isConfirming
              ? 'Please wait...'
              : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;