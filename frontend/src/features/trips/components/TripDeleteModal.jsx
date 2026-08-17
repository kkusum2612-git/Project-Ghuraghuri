import ConfirmModal
  from '../../../components/common/ConfirmModal';

function TripDeleteModal({
  trip,
  isDeleting,
  onCancel,
  onConfirm,
}) {
  return (
    <ConfirmModal
      isOpen={Boolean(
        trip
      )}
      title="Delete trip?"
      description={
        trip ? (
          <p>
            Are you sure you want
            to delete{' '}
            <span className="font-semibold text-[#17211D]">
              {trip.tripName}
            </span>
            ?
          </p>
        ) : null
      }
      warning={
        <p>
          This action is permanent.
          The trip and its related
          days, stops, expenses, and
          checklist items will be
          removed.
        </p>
      }
      confirmLabel="Delete Trip"
      cancelLabel="Cancel"
      isConfirming={
        isDeleting
      }
      onCancel={
        onCancel
      }
      onConfirm={
        onConfirm
      }
    />
  );
}

export default TripDeleteModal;