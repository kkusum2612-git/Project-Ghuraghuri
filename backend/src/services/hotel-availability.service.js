import Booking from '../models/booking.model.js';


/*
 * ============================================================
 * SHARED HOTEL AVAILABILITY SERVICE
 * ============================================================
 *
 * This service uses the SAME date-overlap rule that already
 * exists in Kusum's Hotel Search & Booking feature.
 *
 * Rafi Feature 4 uses this service when checking whether a real
 * Ghuraghuri hotel can accommodate the travelers for an
 * overnight stay.
 *
 * IMPORTANT:
 *
 * We are NOT changing Kusum's booking creation logic here.
 * The existing booking flow remains the final authority when
 * the traveler actually chooses "View & Book".
 */


/*
 * ------------------------------------------------------------
 * GET ROOM AVAILABILITY FOR ONE HOTEL
 * ------------------------------------------------------------
 *
 * Existing booking overlaps the requested stay when:
 *
 * existing.checkInDate < requested.checkOutDate
 *
 * AND
 *
 * existing.checkOutDate > requested.checkInDate
 *
 * Only pending and confirmed bookings reserve inventory.
 *
 * This is the same rule already used by the existing hotel
 * availability and booking controllers.
 */
async function getRoomAvailabilityForHotel({
  hotel,
  checkInDate,
  checkOutDate,
}) {
  if (!hotel) {
    return [];
  }


  const overlappingBookings =
    await Booking.find({
      hotelId:
        hotel._id,

      bookingStatus: {
        $in: [
          'pending',
          'confirmed',
        ],
      },

      checkInDate: {
        $lt:
          checkOutDate,
      },

      checkOutDate: {
        $gt:
          checkInDate,
      },
    }).select(
      'roomTypeId numberOfRooms'
    );


  /*
   * Build a lookup table such as:
   *
   * {
   *   "roomTypeId1": 2,
   *   "roomTypeId2": 1
   * }
   *
   * This tells us how many rooms of each type are already
   * reserved during the requested date range.
   */
  const reservedRoomsByType =
    {};


  overlappingBookings.forEach(
    (booking) => {
      const roomTypeId =
        booking
          .roomTypeId
          .toString();


      reservedRoomsByType[
        roomTypeId
      ] =
        (
          reservedRoomsByType[
            roomTypeId
          ] || 0
        ) +
        booking.numberOfRooms;
    }
  );


  /*
   * Convert every stored room type into a date-specific
   * availability result.
   *
   * roomType.availableRooms is the hotel's TOTAL inventory.
   *
   * We do not permanently decrease it when bookings are made.
   */
  return hotel.roomTypes.map(
    (roomType) => {
      const roomTypeId =
        roomType
          ._id
          .toString();


      const reservedRooms =
        reservedRoomsByType[
          roomTypeId
        ] || 0;


      const availableRooms =
        Math.max(
          roomType.availableRooms -
            reservedRooms,
          0
        );


      return {
        roomTypeId:
          roomType._id,

        name:
          roomType.name,

        pricePerNight:
          Number(
            roomType.pricePerNight
          ),

        capacity:
          Number(
            roomType.capacity
          ),

        totalRooms:
          Number(
            roomType.availableRooms
          ),

        reservedRooms,

        availableRooms,
      };
    }
  );
}


/*
 * ------------------------------------------------------------
 * FIND THE CHEAPEST PRACTICAL ROOM OPTION
 * ------------------------------------------------------------
 *
 * The AI result does NOT automatically select or book a room.
 *
 * However, we need a realistic accommodation estimate for the
 * entire travel party.
 *
 * Example:
 *
 * Travelers = 4
 *
 * Room capacity = 2
 * Price = BDT 3000
 *
 * Required rooms:
 *
 * ceil(4 / 2) = 2
 *
 * Estimated accommodation:
 *
 * 2 rooms x BDT 3000
 * = BDT 6000 for one night.
 *
 * The traveler still chooses the actual room later inside
 * Kusum's existing HotelDetailsPage.
 */
function findCheapestAvailableRoomOption(
  roomTypes,
  travelers
) {
  if (
    !Array.isArray(roomTypes) ||
    roomTypes.length === 0
  ) {
    return null;
  }


  const travelerCount =
    Number(travelers);


  if (
    !Number.isInteger(
      travelerCount
    ) ||
    travelerCount < 1
  ) {
    return null;
  }


  const possibleOptions =
    roomTypes
      .map(
        (roomType) => {
          const capacity =
            Number(
              roomType.capacity
            );


          const availableRooms =
            Number(
              roomType.availableRooms
            );


          const pricePerNight =
            Number(
              roomType.pricePerNight
            );


          if (
            !Number.isFinite(
              capacity
            ) ||
            capacity < 1 ||
            !Number.isFinite(
              availableRooms
            ) ||
            availableRooms < 1 ||
            !Number.isFinite(
              pricePerNight
            ) ||
            pricePerNight < 0
          ) {
            return null;
          }


          /*
           * How many rooms of this type would be necessary to
           * fit the full travel party?
           */
          const roomsNeeded =
            Math.ceil(
              travelerCount /
                capacity
            );


          /*
           * This room type is not practical if the hotel does
           * not have enough rooms available for these dates.
           */
          if (
            roomsNeeded >
            availableRooms
          ) {
            return null;
          }


          const totalNightlyCost =
            roomsNeeded *
            pricePerNight;


          return {
            roomTypeId:
              roomType.roomTypeId,

            roomTypeName:
              roomType.name,

            pricePerNight,

            capacity,

            availableRooms,

            roomsNeeded,

            totalNightlyCost,
          };
        }
      )
      .filter(Boolean);


  if (
    possibleOptions.length ===
    0
  ) {
    return null;
  }


  /*
   * We deliberately use a simple selection rule.
   *
   * Feature 4 does not need a complex hotel optimizer.
   *
   * First priority:
   * cheapest total cost for the whole travel party.
   *
   * Second priority:
   * cheaper individual room price.
   */
  possibleOptions.sort(
    (
      firstOption,
      secondOption
    ) => {
      const totalDifference =
        firstOption.totalNightlyCost -
        secondOption.totalNightlyCost;


      if (
        totalDifference !== 0
      ) {
        return totalDifference;
      }


      return (
        firstOption.pricePerNight -
        secondOption.pricePerNight
      );
    }
  );


  return possibleOptions[0];
}


export {
  findCheapestAvailableRoomOption,
  getRoomAvailabilityForHotel,
};