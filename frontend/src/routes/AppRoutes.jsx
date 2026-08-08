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