import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';

import 'leaflet/dist/leaflet.css';
import { getDrivingRoute } from '../../../services/osrm.service.js';
import './trip-map-demo.css';

const demoStops = [
  {
    _id: 'burmese-market-demo',
    placeName: 'Burmese Market',
    description: 'Explore the local market and buy souvenirs.',
    latitude: 21.4412,
    longitude: 91.9785,
    visitTime: '19:30',
    order: 1,
  },
  {
    _id: 'sugandha-beach-demo',
    placeName: 'Sugandha Sea Beach',
    description: 'Enjoy the beach and watch the evening sunset.',
    latitude: 21.4219,
    longitude: 91.9829,
    visitTime: '17:00',
    order: 2,
  },
];

const createNumberedIcon = (order) => {
  return L.divIcon({
    className: 'ghuraghuri-numbered-icon',
    html: `<span>${order}</span>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -22],
  });
};

const createPopupContent = (stop) => {
  const container = document.createElement('div');

  const heading = document.createElement('strong');
  heading.textContent = `${stop.order}. ${stop.placeName}`;

  const description = document.createElement('p');
  description.textContent = stop.description;

  const visitTime = document.createElement('p');
  visitTime.textContent = `Visit time: ${stop.visitTime}`;

  container.append(heading, description, visitTime);

  return container;
};

const TripMapDemo = () => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);

  const [routeState, setRouteState] = useState({
    loading: true,
    distanceKm: null,
    durationMinutes: null,
    error: '',
  });

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return undefined;
    }

    let componentIsActive = true;

    const map = L.map(mapContainerRef.current).setView(
      [21.4315, 91.98],
      14,
    );

    mapRef.current = map;

    L.tileLayer(
      'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      },
    ).addTo(map);

    const stopCoordinates = demoStops.map((stop) => [
      stop.latitude,
      stop.longitude,
    ]);

    demoStops.forEach((stop) => {
      L.marker(
        [stop.latitude, stop.longitude],
        {
          icon: createNumberedIcon(stop.order),
        },
      )
        .addTo(map)
        .bindPopup(createPopupContent(stop));
    });

    map.fitBounds(stopCoordinates, {
      padding: [50, 50],
    });

    const loadRoute = async () => {
      try {
        const route = await getDrivingRoute(demoStops);

        if (!componentIsActive) {
          return;
        }

        const routeFeature = {
          type: 'Feature',
          properties: {},
          geometry: route.geometry,
        };

        const routeLayer = L.geoJSON(routeFeature, {
          style: {
            weight: 5,
            opacity: 0.85,
          },
        }).addTo(map);

        map.fitBounds(routeLayer.getBounds(), {
          padding: [50, 50],
        });

        setRouteState({
          loading: false,
          distanceKm: (
            route.distanceMeters / 1000
          ).toFixed(2),
          durationMinutes: Math.ceil(
            route.durationSeconds / 60,
          ),
          error: '',
        });
      } catch (error) {
        if (!componentIsActive) {
          return;
        }

        console.error('Leaflet route loading error:', error);

        setRouteState({
          loading: false,
          distanceKm: null,
          durationMinutes: null,
          error: error.message,
        });
      }
    };

    loadRoute();

    return () => {
      componentIsActive = false;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <main className="trip-map-demo-page">
      <section className="trip-map-demo-card">
        <header className="trip-map-demo-header">
          <div>
            <p className="trip-map-demo-label">
              Interactive Map View
            </p>

            <h1>Cox&apos;s Bazar Adventure — Day 1</h1>

            <p>
              Numbered places and the OSRM driving route
              are displayed using Leaflet.
            </p>
          </div>

          <div className="trip-route-summary">
            {routeState.loading && (
              <span>Calculating route...</span>
            )}

            {!routeState.loading &&
              !routeState.error && (
                <>
                  <strong>
                    {routeState.distanceKm} km
                  </strong>

                  <span>
                    About {routeState.durationMinutes} minutes
                  </span>
                </>
              )}

            {routeState.error && (
              <span>
                Route unavailable: {routeState.error}
              </span>
            )}
          </div>
        </header>

        <div className="trip-map-demo-layout">
          <div
            ref={mapContainerRef}
            className="trip-map-canvas"
            aria-label="Interactive trip map"
          />

          <aside className="trip-stop-panel">
            <h2>Day 1 Stops</h2>

            <ol>
              {demoStops.map((stop) => (
                <li key={stop._id}>
                  <span className="trip-stop-number">
                    {stop.order}
                  </span>

                  <div>
                    <strong>{stop.placeName}</strong>
                    <p>{stop.description}</p>
                    <small>
                      Visit time: {stop.visitTime}
                    </small>
                  </div>
                </li>
              ))}
            </ol>

            <p className="trip-stop-help">
              Click a numbered map pin to view its
              details.
            </p>
          </aside>
        </div>
      </section>
    </main>
  );
};

export default TripMapDemo;