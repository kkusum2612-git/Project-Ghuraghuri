import {
  useEffect,
} from 'react';

import L from 'leaflet';

import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet';

import 'leaflet/dist/leaflet.css';

const DEFAULT_CENTER = [
  23.685,
  90.3563,
];

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

function isValidRoutePoint(
  point
) {
  return (
    Array.isArray(point) &&
    point.length >= 2 &&
    isValidCoordinate(
      point[0],
      point[1]
    )
  );
}

function createNumberedIcon(
  number
) {
  const markerElement =
    L.DomUtil.create('div');

  markerElement.style.width =
    '34px';

  markerElement.style.height =
    '34px';

  markerElement.style.borderRadius =
    '50%';

  markerElement.style.background =
    '#0F6B4D';

  markerElement.style.color =
    '#FFFFFF';

  markerElement.style.border =
    '3px solid #FFFFFF';

  markerElement.style.boxShadow =
    '0 2px 8px rgba(0, 0, 0, 0.25)';

  markerElement.style.display =
    'flex';

  markerElement.style.alignItems =
    'center';

  markerElement.style.justifyContent =
    'center';

  markerElement.style.fontSize =
    '14px';

  markerElement.style.fontWeight =
    '700';

  markerElement.textContent =
    String(number);

  return L.divIcon({
    html:
      markerElement.outerHTML,

    className: '',

    iconSize: [
      34,
      34,
    ],

    iconAnchor: [
      17,
      17,
    ],

    popupAnchor: [
      0,
      -20,
    ],
  });
}

function MapViewport({
  stops,
  routePoints,
}) {
  const map = useMap();

  useEffect(() => {
    const stopPoints =
      stops
        .filter((stop) =>
          isValidCoordinate(
            stop.latitude,
            stop.longitude
          )
        )
        .map((stop) => [
          Number(
            stop.latitude
          ),
          Number(
            stop.longitude
          ),
        ]);

    const validRoutePoints =
      Array.isArray(
        routePoints
      )
        ? routePoints.filter(
            isValidRoutePoint
          )
        : [];

    const pointsToDisplay =
      validRoutePoints.length >= 2
        ? validRoutePoints
        : stopPoints;

    if (
      pointsToDisplay.length ===
      0
    ) {
      map.setView(
        DEFAULT_CENTER,
        7
      );

      return;
    }

    if (
      pointsToDisplay.length ===
      1
    ) {
      map.setView(
        pointsToDisplay[0],
        13
      );

      return;
    }

    const bounds =
      L.latLngBounds(
        pointsToDisplay
      );

    map.fitBounds(
      bounds,
      {
        padding: [
          40,
          40,
        ],
      }
    );
  }, [
    map,
    routePoints,
    stops,
  ]);

  return null;
}

function TripMap({
  stops = [],
  routePoints = [],
}) {
  const validStops =
    stops.filter((stop) =>
      isValidCoordinate(
        stop.latitude,
        stop.longitude
      )
    );

  const validRoutePoints =
    Array.isArray(routePoints)
      ? routePoints.filter(
          isValidRoutePoint
        )
      : [];

  return (
    <div className="overflow-hidden rounded-xl border border-[#DCE5E0] bg-white shadow-sm">
      <MapContainer
        center={
          DEFAULT_CENTER
        }
        zoom={7}
        scrollWheelZoom
        className="h-[480px] w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapViewport
          stops={
            validStops
          }
          routePoints={
            validRoutePoints
          }
        />

        {validRoutePoints.length >=
          2 && (
          <Polyline
            positions={
              validRoutePoints
            }
            pathOptions={{
              color:
                '#0F6B4D',
              weight: 5,
              opacity: 0.8,
            }}
          />
        )}

        {validStops.map(
          (stop) => (
            <Marker
              key={
                stop._id
              }
              position={[
                Number(
                  stop.latitude
                ),
                Number(
                  stop.longitude
                ),
              ]}
              icon={createNumberedIcon(
                stop.order
              )}
            >
              <Popup>
                <div className="min-w-[180px]">
                  <p className="font-bold">
                    {stop.order}.{' '}
                    {
                      stop.placeName
                    }
                  </p>

                  {stop.visitTime && (
                    <p className="mt-1">
                      Visit time:{' '}
                      {
                        stop.visitTime
                      }
                    </p>
                  )}

                  {stop.description && (
                    <p className="mt-1">
                      {
                        stop.description
                      }
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          )
        )}
      </MapContainer>

      {validStops.length ===
        0 && (
        <div className="border-t border-[#DCE5E0] bg-[#F7FAF8] px-4 py-3 text-sm text-[#66756D]">
          Add destinations
          with valid coordinates
          to display them on
          the map.
        </div>
      )}
    </div>
  );
}

export default TripMap;