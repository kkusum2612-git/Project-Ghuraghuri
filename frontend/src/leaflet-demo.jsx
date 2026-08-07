import { createRoot } from 'react-dom/client';

import TripMapDemo from './features/trips/components/TripMapDemo.jsx';

const rootElement = document.getElementById('leaflet-demo-root');

if (!rootElement) {
  throw new Error('Leaflet demo root element was not found.');
}

createRoot(rootElement).render(<TripMapDemo />);