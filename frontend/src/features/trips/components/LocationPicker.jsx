import {
  useState,
} from 'react';

import {
  searchPlaces,
} from '../api/nominatimApi';

const EMPTY_LOCATION = {
  latitude: '',
  longitude: '',
  displayName: '',
  source: '',
};

function hasCoordinates(
  location
) {
  return (
    location.latitude !== '' &&
    location.longitude !== ''
  );
}

function LocationPicker({
  value = EMPTY_LOCATION,
  onChange,
  searchSuggestion = '',
  idPrefix = 'location-picker',
  isMapPicking = false,
  onStartMapPicking,
  onStopMapPicking,
}) {
  const [
    mode,
    setMode,
  ] = useState('search');

  const [
    searchText,
    setSearchText,
  ] = useState('');

  const [
    searchResults,
    setSearchResults,
  ] = useState([]);

  const [
    isSearching,
    setIsSearching,
  ] = useState(false);

  const [
    searchError,
    setSearchError,
  ] = useState('');

  const [
    manualLatitude,
    setManualLatitude,
  ] = useState('');

  const [
    manualLongitude,
    setManualLongitude,
  ] = useState('');

  const [
    coordinateError,
    setCoordinateError,
  ] = useState('');

  const locationSelected =
    hasCoordinates(value);

  const searchInputId =
    `${idPrefix}-search`;

  const latitudeInputId =
    `${idPrefix}-latitude`;

  const longitudeInputId =
    `${idPrefix}-longitude`;

  function handleModeChange(
    nextMode
  ) {
    setMode(nextMode);

    setSearchError('');
    setCoordinateError('');

    if (nextMode === 'map') {
      onStartMapPicking?.();
      return;
    }

    onStopMapPicking?.();

    if (
      nextMode ===
        'coordinates' &&
      locationSelected
    ) {
      setManualLatitude(
        String(
          value.latitude
        )
      );

      setManualLongitude(
        String(
          value.longitude
        )
      );
    }
  }

  async function handleSearch() {
    const normalizedSearch =
      searchText.trim() ||
      searchSuggestion.trim();

    if (
      normalizedSearch.length < 2
    ) {
      setSearchError(
        'Enter a place name to search.'
      );

      setSearchResults([]);

      return;
    }

    setIsSearching(true);
    setSearchError('');
    setSearchResults([]);

    setSearchText(
      normalizedSearch
    );

    try {
      const results =
        await searchPlaces(
          normalizedSearch
        );

      setSearchResults(
        results
      );

      if (
        results.length === 0
      ) {
        setSearchError(
          'No matching map locations were found. Try a broader search, Pick on Map, or use Coordinates.'
        );
      }
    } catch (error) {
      setSearchResults([]);

      setSearchError(
        error.message ||
          'Unable to search for places.'
      );
    } finally {
      setIsSearching(false);
    }
  }

  function handleSearchKeyDown(
    event
  ) {
    if (
      event.key !== 'Enter'
    ) {
      return;
    }

    event.preventDefault();

    if (!isSearching) {
      void handleSearch();
    }
  }

  function handleSelectSearchResult(
    place
  ) {
    onStopMapPicking?.();

    onChange({
      latitude:
        place.latitude,

      longitude:
        place.longitude,

      displayName:
        place.displayName,

      source:
        'search',
    });

    setSearchResults([]);
    setSearchError('');
  }

  function handleUseCoordinates() {
    const latitudeText =
      manualLatitude.trim();

    const longitudeText =
      manualLongitude.trim();

    if (
      !latitudeText ||
      !longitudeText
    ) {
      setCoordinateError(
        'Enter both latitude and longitude.'
      );

      return;
    }

    const latitude =
      Number(latitudeText);

    const longitude =
      Number(longitudeText);

    if (
      !Number.isFinite(
        latitude
      ) ||
      latitude < -90 ||
      latitude > 90
    ) {
      setCoordinateError(
        'Latitude must be a number between -90 and 90.'
      );

      return;
    }

    if (
      !Number.isFinite(
        longitude
      ) ||
      longitude < -180 ||
      longitude > 180
    ) {
      setCoordinateError(
        'Longitude must be a number between -180 and 180.'
      );

      return;
    }

    setCoordinateError('');
    onStopMapPicking?.();

    onChange({
      latitude,
      longitude,

      displayName:
        'Location entered using coordinates',

      source:
        'coordinates',
    });
  }

  function handleClearLocation() {
    onChange({
      ...EMPTY_LOCATION,
    });

    setSearchResults([]);
    setSearchError('');

    setManualLatitude('');
    setManualLongitude('');
    setCoordinateError('');

    if (
      mode !== 'map'
    ) {
      onStopMapPicking?.();
    }
  }

  function getSelectedLocationTitle() {
    if (
      value.source ===
      'coordinates'
    ) {
      return 'Exact coordinates';
    }

    if (
      value.source ===
      'saved'
    ) {
      return 'Current saved location';
    }

    if (
      value.source ===
      'map'
    ) {
      return 'Point selected on map';
    }

    return 'Map search result';
  }

  return (
    <div className="min-w-0">
      <div>
        <p className="text-sm font-semibold text-[#44524B]">
          Choose location
        </p>

        <p className="mt-1 text-xs leading-5 text-[#7B8982]">
          Search, pick a point on
          the trip map, or enter
          exact coordinates.
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-1 rounded-lg border border-[#CBD8D1] bg-white p-1">
        <button
          type="button"
          onClick={() =>
            handleModeChange(
              'search'
            )
          }
          className={`min-w-[88px] flex-1 rounded-md px-3 py-2 text-sm font-semibold transition ${
            mode === 'search'
              ? 'bg-[#0F6B4D] text-white'
              : 'text-[#66756D] hover:bg-[#F3F6F4]'
          }`}
        >
          Search
        </button>

        <button
          type="button"
          onClick={() =>
            handleModeChange(
              'map'
            )
          }
          className={`min-w-[110px] flex-1 rounded-md px-3 py-2 text-sm font-semibold transition ${
            mode === 'map'
              ? 'bg-[#0F6B4D] text-white'
              : 'text-[#66756D] hover:bg-[#F3F6F4]'
          }`}
        >
          Pick on Map
        </button>

        <button
          type="button"
          onClick={() =>
            handleModeChange(
              'coordinates'
            )
          }
          className={`min-w-[105px] flex-1 rounded-md px-3 py-2 text-sm font-semibold transition ${
            mode ===
            'coordinates'
              ? 'bg-[#0F6B4D] text-white'
              : 'text-[#66756D] hover:bg-[#F3F6F4]'
          }`}
        >
          Coordinates
        </button>
      </div>

      {mode === 'search' && (
        <div className="mt-3">
          <label
            htmlFor={
              searchInputId
            }
            className="text-xs font-semibold uppercase tracking-wide text-[#66756D]"
          >
            Find location
          </label>

          <div className="mt-1 grid gap-2">
            <input
              id={
                searchInputId
              }
              type="text"
              value={
                searchText
              }
              onChange={(
                event
              ) =>
                setSearchText(
                  event.target
                    .value
                )
              }
              onKeyDown={
                handleSearchKeyDown
              }
              placeholder={
                searchSuggestion
                  ? `Search ${searchSuggestion}`
                  : 'e.g. Jaflong, Sylhet'
              }
              className="min-w-0 w-full rounded-lg border border-[#CBD8D1] bg-white px-3 py-2 text-sm outline-none focus:border-[#0F6B4D]"
            />

            <button
              type="button"
              disabled={
                isSearching
              }
              onClick={() =>
                void handleSearch()
              }
              className="w-full rounded-lg bg-[#0F6B4D] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0A523B] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSearching
                ? 'Searching...'
                : 'Search Location'}
            </button>
          </div>

          <p className="mt-1.5 text-xs leading-5 text-[#7B8982]">
            Leave the search box
            empty to search using
            the Stop Name.
          </p>

          {searchError && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-5 text-amber-700">
              {searchError}
            </div>
          )}

          {searchResults.length >
            0 && (
            <div className="mt-3 overflow-hidden rounded-lg border border-[#DCE5E0] bg-white">
              <div className="border-b border-[#E5ECE8] bg-[#F7FAF8] px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#66756D]">
                  Search results
                </p>
              </div>

              <div className="divide-y divide-[#E5ECE8]">
                {searchResults.map(
                  (place) => (
                    <button
                      key={
                        place.id
                      }
                      type="button"
                      onClick={() =>
                        handleSelectSearchResult(
                          place
                        )
                      }
                      className="block w-full px-3 py-3 text-left transition hover:bg-[#EEF7F2]"
                    >
                      <p className="break-words text-sm font-semibold text-[#17211D]">
                        {
                          place.name
                        }
                      </p>

                      <p className="mt-1 break-words text-xs leading-5 text-[#66756D]">
                        {
                          place.displayName
                        }
                      </p>
                    </button>
                  )
                )}
              </div>

              <div className="border-t border-[#E5ECE8] bg-[#F7FAF8] px-3 py-2">
                <p className="text-[11px] text-[#7B8982]">
                  Place search data
                  {' '}
                  &copy;
                  {' '}
                  OpenStreetMap
                  contributors
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {mode === 'map' && (
        <div className="mt-3 rounded-lg border border-[#BFD9CD] bg-[#EEF7F2] p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#0F6B4D]">
            Main map selection
          </p>

          {isMapPicking ? (
            <>
              <p className="mt-1 text-sm font-semibold text-[#17211D]">
                Location picking is active
              </p>

              <p className="mt-1 text-xs leading-5 text-[#66756D]">
                Click anywhere on the
                large trip map beside
                this form. Click again
                to fine-tune the point.
              </p>
            </>
          ) : (
            <>
              <p className="mt-1 text-sm font-semibold text-[#17211D]">
                Use the large trip map
              </p>

              <p className="mt-1 text-xs leading-5 text-[#66756D]">
                Activate map picking,
                then click the exact
                location on the main
                map.
              </p>

              <button
                type="button"
                onClick={
                  onStartMapPicking
                }
                className="mt-3 w-full rounded-lg border border-[#0F6B4D] bg-white px-3 py-2 text-sm font-semibold text-[#0F6B4D] transition hover:bg-[#DCEFE4]"
              >
                Start Map Picking
              </button>
            </>
          )}
        </div>
      )}

      {mode ===
        'coordinates' && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#66756D]">
            Exact coordinates
          </p>

          <div className="mt-2 grid gap-3">
            <div className="min-w-0">
              <label
                htmlFor={
                  latitudeInputId
                }
                className="text-sm font-medium text-[#44524B]"
              >
                Latitude
              </label>

              <input
                id={
                  latitudeInputId
                }
                type="number"
                step="any"
                min="-90"
                max="90"
                value={
                  manualLatitude
                }
                onChange={(
                  event
                ) =>
                  setManualLatitude(
                    event.target
                      .value
                  )
                }
                placeholder="21.426"
                className="mt-1 min-w-0 w-full rounded-lg border border-[#CBD8D1] bg-white px-3 py-2 text-sm outline-none focus:border-[#0F6B4D]"
              />
            </div>

            <div className="min-w-0">
              <label
                htmlFor={
                  longitudeInputId
                }
                className="text-sm font-medium text-[#44524B]"
              >
                Longitude
              </label>

              <input
                id={
                  longitudeInputId
                }
                type="number"
                step="any"
                min="-180"
                max="180"
                value={
                  manualLongitude
                }
                onChange={(
                  event
                ) =>
                  setManualLongitude(
                    event.target
                      .value
                  )
                }
                placeholder="92.005"
                className="mt-1 min-w-0 w-full rounded-lg border border-[#CBD8D1] bg-white px-3 py-2 text-sm outline-none focus:border-[#0F6B4D]"
              />
            </div>
          </div>

          <p className="mt-2 text-xs leading-5 text-[#7B8982]">
            Useful for local or
            remote places that are
            missing from search.
          </p>

          {coordinateError && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm leading-5 text-red-700">
              {coordinateError}
            </div>
          )}

          <button
            type="button"
            onClick={
              handleUseCoordinates
            }
            className="mt-3 w-full rounded-lg border border-[#0F6B4D] bg-white px-4 py-2.5 text-sm font-semibold text-[#0F6B4D] transition hover:bg-[#EEF7F2]"
          >
            Use These Coordinates
          </button>
        </div>
      )}

      {locationSelected && (
        <div className="mt-4 min-w-0 rounded-lg border border-[#BFD9CD] bg-[#EEF7F2] p-3">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#0F6B4D]">
                Location selected
              </p>

              <p className="mt-1 break-words text-sm font-semibold text-[#17211D]">
                {
                  getSelectedLocationTitle()
                }
              </p>

              <p className="mt-1 break-words text-xs leading-5 text-[#66756D]">
                {
                  value.displayName
                }
              </p>

              <p className="mt-2 break-all font-mono text-[11px] text-[#66756D]">
                {Number(
                  value.latitude
                ).toFixed(6)}
                {', '}
                {Number(
                  value.longitude
                ).toFixed(6)}
              </p>
            </div>

            <button
              type="button"
              onClick={
                handleClearLocation
              }
              className="shrink-0 text-xs font-semibold text-[#0F6B4D] hover:underline"
            >
              Change
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default LocationPicker;