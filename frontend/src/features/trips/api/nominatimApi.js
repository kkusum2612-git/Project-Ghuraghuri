const NOMINATIM_SEARCH_URL =
  'https://nominatim.openstreetmap.org/search';

const MIN_REQUEST_INTERVAL_MS =
  1100;

const searchCache =
  new Map();

let lastRequestTime = 0;

function wait(milliseconds) {
  return new Promise(
    (resolve) => {
      window.setTimeout(
        resolve,
        milliseconds
      );
    }
  );
}

async function searchPlaces(
  searchText
) {
  const normalizedSearch =
    searchText.trim();

  if (
    normalizedSearch.length < 2
  ) {
    return [];
  }

  const cacheKey =
    normalizedSearch.toLowerCase();

  if (
    searchCache.has(cacheKey)
  ) {
    return searchCache.get(
      cacheKey
    );
  }

  const currentTime =
    Date.now();

  const elapsedTime =
    currentTime -
    lastRequestTime;

  if (
    elapsedTime <
    MIN_REQUEST_INTERVAL_MS
  ) {
    await wait(
      MIN_REQUEST_INTERVAL_MS -
        elapsedTime
    );
  }

  const query =
    new URLSearchParams({
      q: normalizedSearch,
      format: 'jsonv2',
      addressdetails: '1',
      limit: '5',

      // Ghuraghuri currently focuses on
      // travel destinations in Bangladesh.
      countrycodes: 'bd',
    });

  lastRequestTime =
    Date.now();

  const response =
    await fetch(
      `${NOMINATIM_SEARCH_URL}?${query.toString()}`
    );

  if (!response.ok) {
    throw new Error(
      'Unable to search for places right now.'
    );
  }

  const data =
    await response.json();

  const places =
    Array.isArray(data)
      ? data.map(
          (place) => ({
            id:
              place.place_id,

            name:
              place.display_name
                ?.split(',')[0]
                ?.trim() ||
              'Selected place',

            displayName:
              place.display_name ||
              'Unknown location',

            latitude:
              Number(
                place.lat
              ),

            longitude:
              Number(
                place.lon
              ),

            category:
              place.category ||
              '',

            type:
              place.type ||
              '',
          })
        )
      : [];

  searchCache.set(
    cacheKey,
    places
  );

  return places;
}

export {
  searchPlaces,
};