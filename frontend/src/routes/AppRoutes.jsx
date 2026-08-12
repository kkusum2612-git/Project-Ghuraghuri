import {
  BrowserRouter,
  Route,
  Routes,
} from 'react-router-dom';

import AdminRoute from '../features/admin/components/AdminRoute';
import AdminDashboardPage from '../features/admin/pages/AdminDashboardPage';

import ProtectedRoute from '../features/auth/components/ProtectedRoute';

import HotelVendorRoute from '../features/hotels/components/HotelVendorRoute';
import HotelVendorWorkspace from '../features/hotels/components/HotelVendorWorkspace';

import HotelDashboardPage from '../features/hotels/pages/HotelDashboardPage';
import HotelDetailsPage from '../features/hotels/pages/HotelDetailsPage';
import HotelFormPage from '../features/hotels/pages/HotelFormPage';
import HotelSearchPage from '../features/hotels/pages/HotelSearchPage';
import TravelerBookingsPage from '../features/hotels/pages/TravelerBookingsPage';

import TravelerRoute from '../features/trips/components/TravelerRoute';
import TripWorkspace from '../features/trips/components/TripWorkspace';

import TripDashboardPage from '../features/trips/pages/TripDashboardPage';
import TripFormPage from '../features/trips/pages/TripFormPage';

import TripTourPlanPage from '../features/trips/pages/TripTourPlanPage';

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

          <Route element={<ProtectedRoute />}>
            <Route element={<AdminRoute />}>
              <Route
                path="/admin"
                element={
                  <AdminDashboardPage />
                }
              />
            </Route>

            <Route element={<TravelerRoute />}>
              <Route element={<TripWorkspace />}>
                <Route
                  path="/trips"
                  element={
                    <TripDashboardPage />
                  }
                />

                <Route
                  path="/trips/new"
                  element={
                    <TripFormPage />
                  }
                />

                <Route
                  path="/trips/:tripId/plan"
                  element={
                    <TripTourPlanPage />
                  }
                />
                <Route
                  path="/trips/:tripId/edit"
                  element={
                    <TripFormPage />
                  }
                />

                <Route
                  path="/hotels"
                  element={
                    <HotelSearchPage />
                  }
                />

                <Route
                  path="/hotels/:hotelId"
                  element={
                    <HotelDetailsPage />
                  }
                />

                <Route
                  path="/bookings"
                  element={
                    <TravelerBookingsPage />
                  }
                />
              </Route>
            </Route>

            <Route element={<HotelVendorRoute />}>
              <Route
                element={
                  <HotelVendorWorkspace />
                }
              >
                <Route
                  path="/hotel/dashboard"
                  element={
                    <HotelDashboardPage />
                  }
                />

                <Route
                  path="/hotel/listings/new"
                  element={
                    <HotelFormPage />
                  }
                />

                <Route
                  path="/hotel/listings/:hotelId/edit"
                  element={
                    <HotelFormPage />
                  }
                />
              </Route>
            </Route>
          </Route>

          <Route
            path="*"
            element={
              <NotFoundPage />
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;