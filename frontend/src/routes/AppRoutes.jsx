import {
  BrowserRouter,
  Route,
  Routes,
} from 'react-router-dom';

import ProtectedRoute from '../features/auth/components/ProtectedRoute';
import HotelVendorRoute from '../features/hotels/components/HotelVendorRoute';
import HotelVendorWorkspace from '../features/hotels/components/HotelVendorWorkspace';

import HotelDashboardPage from '../features/hotels/pages/HotelDashboardPage';
import HotelFormPage from '../features/hotels/pages/HotelFormPage';

import GuideRoute from '../features/guides/components/GuideRoute';
import GuideWorkspace from '../features/guides/components/GuideWorkspace';

import GuideDashboardPage from '../features/guides/pages/GuideDashboardPage';
import GuideProfilePage from '../features/guides/pages/GuideProfilePage';
import GuideTourFormPage from '../features/guides/pages/GuideTourFormPage';
import GuideToursPage from '../features/guides/pages/GuideToursPage';
import PublicGuidesPage from '../features/guides/pages/PublicGuidesPage';

import TravelerRoute from '../features/trips/components/TravelerRoute';
import TripWorkspace from '../features/trips/components/TripWorkspace';

import TripDashboardPage from '../features/trips/pages/TripDashboardPage';

import TripFormPage from '../features/trips/pages/TripFormPage';

import MainLayout from '../layouts/MainLayout';

import HomePage from '../pages/HomePage';
import LoginPage from '../pages/LoginPage';
import NotFoundPage from '../pages/NotFoundPage';
import RegisterPage from '../pages/RegisterPage';

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route
            path="/"
            element={<HomePage />}
          />

          <Route
            path="/login"
            element={<LoginPage />}
          />

          <Route
            path="/register"
            element={<RegisterPage />}
          />
          <Route
            path="/guides"
            element={<PublicGuidesPage />}
          />

          <Route element={<ProtectedRoute />}>
            <Route element={<TravelerRoute />}>
              <Route element={<TripWorkspace />}>
                <Route
                  path="/trips"
                  element={<TripDashboardPage />}
                />
                <Route
                  path="/trips/new"
                  element={<TripFormPage />}
                />

                <Route
                  path="/trips/:tripId/edit"
                  element={<TripFormPage />}
                />
              </Route>
            </Route>

            <Route element={<HotelVendorRoute />}>
              <Route element={<HotelVendorWorkspace />}>
                <Route
                  path="/hotel/dashboard"
                  element={<HotelDashboardPage />}
                />

                <Route
                  path="/hotel/listings/new"
                  element={<HotelFormPage />}
                />

                <Route
                  path="/hotel/listings/:hotelId/edit"
                  element={<HotelFormPage />}
                />
              </Route>
            </Route>
                    <Route element={<GuideRoute />}>
          <Route element={<GuideWorkspace />}>
            <Route
              path="/guide/dashboard"
              element={<GuideDashboardPage />}
            />

            <Route
              path="/guide/profile"
              element={<GuideProfilePage />}
            />

            <Route
              path="/guide/tours"
              element={<GuideToursPage />}
            />

            <Route
              path="/guide/tours/new"
              element={<GuideTourFormPage />}
            />

            <Route
              path="/guide/tours/:packageId/edit"
              element={<GuideTourFormPage />}
            />
          </Route>
        </Route>
          </Route>

          <Route
            path="*"
            element={<NotFoundPage />}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;