import L from 'leaflet';

import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet';

import 'leaflet/dist/leaflet.css';

const DEFAULT_CENTER = [
  23.685,
  90.3563,
];

function createNumberedIcon(
  number
) {
  const marker =
    L.DomUtil.create('div');

  marker.textContent =
    String(number);

  marker.style.width =
    '34px';

  marker.style.height =
    '34px';

  marker.style.display =
    'flex';

  marker.style.alignItems =
    'center';

  marker.style.justifyContent =
    'center';

  marker.style.borderRadius =
    '9999px';

  marker.style.background =
    '#0F6B4D';

  marker.style.color =
    '#FFFFFF';

  marker.style.fontWeight =
    '700';

  marker.style.fontSize =
    '14px';

  marker.style.border =
    '3px solid #FFFFFF';

  marker.style.boxShadow =
    '0 2px 8px rgba(0, 0, 0, 0.25)';

  return L.divIcon({
    html: marker,
    className: '',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
  });
}

function MapViewport({
  stops,
}) {
  const map = useMap();

  const validStops =
    stops.filter(
      (stop) =>
        Number.isFinite(
          Number(
            stop.latitude
          )
        ) &&
        Number.isFinite(
          Number(
            stop.longitude
          )
        )
    );

  if (
    validStops.length === 1
  ) {
    const stop =
      validStops[0];

    map.setView(
      [
        Number(
          stop.latitude
        ),
        Number(
          stop.longitude
        ),
      ],
      13
    );

    return null;
  }

  if (
    validStops.length > 1
  ) {
    const bounds =
      L.latLngBounds(
        validStops.map(
          (stop) => [
            Number(
              stop.latitude
            ),
            Number(
              stop.longitude
            ),
          ]
        )
      );

    map.fitBounds(
      bounds,
      {
        padding: [50, 50],
      }
    );
  }

  return null;
}

function TripMap({
  stops,
}) {
  const validStops =
    stops.filter(
      (stop) =>
        Number.isFinite(
          Number(
            stop.latitude
          )
        ) &&
        Number.isFinite(
          Number(
            stop.longitude
          )
        )
    );

  const initialCenter =
    validStops.length > 0
      ? [
          Number(
            validStops[0]
              .latitude
          ),
          Number(
            validStops[0]
              .longitude
          ),
        ]
      : DEFAULT_CENTER;

  return (
    <div className="overflow-hidden rounded-xl border border-[#DCE5E0] bg-white shadow-sm">
      <MapContainer
        center={
          initialCenter
        }
        zoom={
          validStops.length > 0
            ? 13
            : 7
        }
        scrollWheelZoom
        className="h-[480px] w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapViewport
          stops={validStops}
        />

        {validStops.map(
          (stop) => (
            <Marker
              key={stop._id}
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
                  <p className="font-semibold">
                    {stop.order}.{' '}
                    {
                      stop.placeName
                    }
                  </p>

                  {stop.visitTime && (
                    <p className="mt-1 text-sm">
                      Visit time:{' '}
                      {
                        stop.visitTime
                      }
                    </p>
                  )}

                  {stop.description && (
                    <p className="mt-2 text-sm">
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
          Add stops with
          coordinates to this
          day to display them
          on the map.
        </div>
      )}
    </div>
  );
}

export default TripMap;