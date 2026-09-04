const OSRM_BASE_URL =
  'https://router.project-osrm.org';

const MAX_SNAP_DISTANCE_METERS =
  1500;

const MIN_MEANINGFUL_ROUTE_METERS =
  10;

const MIN_DISTINCT_STOP_DISTANCE_METERS =
  50;

const EARTH_RADIUS_METERS =
  6371000;

function isValidCoordinate(
  latitude,
  longitude
) {
  const numericLatitude =
    Number(latitude);

  const numericLongitude =
    Number(longitude);

  return (
    Number.isFinite(
      numericLatitude
    ) &&
    Number.isFinite(
      numericLongitude
    ) &&
    numericLatitude >= -90 &&
    numericLatitude <= 90 &&
    numericLongitude >= -180 &&
    numericLongitude <= 180
  );
}

function prepareStops(stops) {
  if (!Array.isArray(stops)) {
    return [];
  }

  return stops
    .filter((stop) =>
      isValidCoordinate(
        stop.latitude,
        stop.longitude
      )
    )
    .sort(
      (
        first,
        second
      ) =>
        first.order -
        second.order
    );
}

function toRadians(value) {
  return (
    value *
    (Math.PI / 180)
  );
}

function getStraightLineDistance(
  firstStop,
  secondStop
) {
  const firstLatitude =
    Number(
      firstStop.latitude
    );

  const firstLongitude =
    Number(
      firstStop.longitude
    );

  const secondLatitude =
    Number(
      secondStop.latitude
    );

  const secondLongitude =
    Number(
      secondStop.longitude
    );

  const latitudeDifference =
    toRadians(
      secondLatitude -
        firstLatitude
    );

  const longitudeDifference =
    toRadians(
      secondLongitude -
        firstLongitude
    );

  const firstLatitudeRadians =
    toRadians(
      firstLatitude
    );

  const secondLatitudeRadians =
    toRadians(
      secondLatitude
    );

  const haversineValue =
    Math.sin(
      latitudeDifference / 2
    ) ** 2 +
    Math.cos(
      firstLatitudeRadians
    ) *
      Math.cos(
        secondLatitudeRadians
      ) *
      Math.sin(
        longitudeDifference / 2
      ) ** 2;

  const angularDistance =
    2 *
    Math.atan2(
      Math.sqrt(
        haversineValue
      ),
      Math.sqrt(
        1 -
          haversineValue
      )
    );

  return (
    EARTH_RADIUS_METERS *
    angularDistance
  );
}

function hasClearlyDistinctStops(
  stops
) {
  for (
    let index = 0;
    index <
    stops.length - 1;
    index += 1
  ) {
    const distance =
      getStraightLineDistance(
        stops[index],
        stops[index + 1]
      );

    if (
      distance >=
      MIN_DISTINCT_STOP_DISTANCE_METERS
    ) {
      return true;
    }
  }

  return false;
}

function createRouteUnavailableError() {
  return new Error(
    'A usable driving route could not be calculated between these destinations. Some stops may require boat, walking, or other local transport.'
  );
}

async function getRouteForStops(
  stops,
  options = {}
) {
  const validStops =
    prepareStops(stops);

  /*
   * Fewer than two valid stops means
   * there is nothing to route.
   */
  if (validStops.length < 2) {
    return null;
  }

  /*
   * OSRM expects:
   *
   * longitude,latitude
   */
  const coordinates =
    validStops
      .map(
        (stop) =>
          `${Number(
            stop.longitude
          )},${Number(
            stop.latitude
          )}`
      )
      .join(';');

  /*
   * Limit how far OSRM is allowed to
   * snap each stop to the driving road
   * network.
   */
  const radiuses =
    validStops
      .map(
        () =>
          MAX_SNAP_DISTANCE_METERS
      )
      .join(';');

  const query =
    new URLSearchParams({
      overview: 'full',
      geometries:
        'geojson',
      steps: 'false',
      radiuses,
    });

  const url =
    `${OSRM_BASE_URL}` +
    `/route/v1/driving/` +
    `${coordinates}` +
    `?${query.toString()}`;

  let response;

  /*
   * A real network failure is different
   * from OSRM reporting NoRoute or
   * NoSegment.
   */
  try {
    response =
      await fetch(
        url,
        {
          signal:
            options.signal,
        }
      );
  } catch (error) {
    if (
      error.name ===
      'AbortError'
    ) {
      throw error;
    }

    /*
     * Preserve the caught error as the
     * cause so ESLint's
     * preserve-caught-error rule passes.
     */
    throw new Error(
      'Unable to contact the routing service right now.',
      {
        cause: error,
      }
    );
  }

  let result;

  /*
   * OSRM normally returns JSON even when
   * a route itself cannot be calculated.
   */
  try {
    result =
      await response.json();
  } catch (error) {
    throw new Error(
      'The routing service returned an unexpected response.',
      {
        cause: error,
      }
    );
  }

  /*
   * NoSegment:
   * One or more coordinates could not
   * be matched to the road network.
   *
   * NoRoute:
   * Coordinates were accepted, but no
   * driving route connects them.
   *
   * These are routing limitations, not
   * service outages.
   */
  if (
    result.code ===
      'NoSegment' ||
    result.code ===
      'NoRoute'
  ) {
    throw createRouteUnavailableError();
  }

  /*
   * Other HTTP failures represent a
   * service/request issue.
   */
  if (!response.ok) {
    throw new Error(
      result.message ||
        'Unable to calculate the driving route right now.'
    );
  }

  if (
    result.code !== 'Ok' ||
    !Array.isArray(
      result.routes
    ) ||
    result.routes.length === 0
  ) {
    throw createRouteUnavailableError();
  }

  const route =
    result.routes[0];

  const coordinatesFromRoute =
    route.geometry
      ?.coordinates;

  if (
    !Array.isArray(
      coordinatesFromRoute
    ) ||
    coordinatesFromRoute.length <
      2
  ) {
    throw createRouteUnavailableError();
  }

  const distanceMeters =
    Number(
      route.distance
    );

  const durationSeconds =
    Number(
      route.duration
    );

  /*
   * Never silently turn an invalid
   * distance or duration into zero.
   */
  if (
    !Number.isFinite(
      distanceMeters
    ) ||
    !Number.isFinite(
      durationSeconds
    ) ||
    distanceMeters < 0 ||
    durationSeconds < 0
  ) {
    throw createRouteUnavailableError();
  }

  /*
   * If the actual stops are clearly
   * separated but OSRM reports an
   * almost-zero route, reject the result
   * as unreliable.
   */
  if (
    hasClearlyDistinctStops(
      validStops
    ) &&
    distanceMeters <
      MIN_MEANINGFUL_ROUTE_METERS
  ) {
    throw createRouteUnavailableError();
  }

  /*
   * OSRM GeoJSON returns:
   *
   * [longitude, latitude]
   *
   * Leaflet requires:
   *
   * [latitude, longitude]
   */
  const routePoints =
    coordinatesFromRoute.map(
      (coordinate) => [
        coordinate[1],
        coordinate[0],
      ]
    );

  return {
    routePoints,
    distanceMeters,
    durationSeconds,
  };
}

export {
  getRouteForStops,
};