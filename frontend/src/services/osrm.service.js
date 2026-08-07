const OSRM_BASE_URL = 'https://router.project-osrm.org';

export const getDrivingRoute = async (stops) => {
  if (!Array.isArray(stops) || stops.length < 2) {
    throw new Error('At least two ordered stops are required.');
  }

  const coordinates = stops
    .map((stop) => {
      const longitude = Number(stop.longitude);
      const latitude = Number(stop.latitude);

      if (
        !Number.isFinite(longitude) ||
        !Number.isFinite(latitude)
      ) {
        throw new Error(
          'Every stop must contain valid latitude and longitude values.',
        );
      }

      return `${longitude},${latitude}`;
    })
    .join(';');

  const url =
    `${OSRM_BASE_URL}/route/v1/driving/${coordinates}` +
    '?overview=full&geometries=geojson&steps=false';

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `OSRM request failed with status ${response.status}.`,
    );
  }

  const result = await response.json();

  if (result.code !== 'Ok' || !result.routes?.length) {
    throw new Error(
      result.message || 'OSRM could not calculate a route.',
    );
  }

  const route = result.routes[0];

  return {
    distanceMeters: route.distance,
    durationSeconds: route.duration,
    geometry: route.geometry,
    waypoints: result.waypoints,
  };
};