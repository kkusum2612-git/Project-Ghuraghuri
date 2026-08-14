const OSRM_BASE_URL =
  'https://router.project-osrm.org';

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

async function getRouteForStops(
  stops,
  options = {}
) {
  const validStops =
    prepareStops(stops);

  if (validStops.length < 2) {
    return null;
  }

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

  const url =
    `${OSRM_BASE_URL}` +
    `/route/v1/driving/` +
    `${coordinates}` +
    '?overview=full' +
    '&geometries=geojson' +
    '&steps=false';

  const response =
    await fetch(
      url,
      {
        signal:
          options.signal,
      }
    );

  if (!response.ok) {
    throw new Error(
      'Unable to reach the routing service.'
    );
  }

  const result =
    await response.json();

  if (
    result.code !== 'Ok' ||
    !Array.isArray(
      result.routes
    ) ||
    result.routes.length === 0
  ) {
    throw new Error(
      result.message ||
        'No road route could be found between these stops.'
    );
  }

  const route =
    result.routes[0];

  const coordinatesFromRoute =
    route.geometry
      ?.coordinates;

  if (
    !Array.isArray(
      coordinatesFromRoute
    )
  ) {
    throw new Error(
      'The routing service returned invalid route geometry.'
    );
  }

  const routePoints =
    coordinatesFromRoute.map(
      (coordinate) => [
        coordinate[1],
        coordinate[0],
      ]
    );

  return {
    routePoints,
    distanceMeters:
      route.distance || 0,
    durationSeconds:
      route.duration || 0,
  };
}

export {
  getRouteForStops,
};