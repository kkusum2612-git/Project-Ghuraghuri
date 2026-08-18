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

// ============================================================
// RAFI - PUBLIC EVENT ROOMS
// ============================================================
//
// These pages belong to Rafi's Module 1 Feature 1.
//
// They are imported here because AppRoutes.jsx is the central
// frontend route map for the entire Ghuraghuri application.
import PublicRoomCreatePage from '../features/publicRooms/pages/PublicRoomCreatePage';
import PublicRoomDetailsPage from '../features/publicRooms/pages/PublicRoomDetailsPage';
import PublicRoomsPage from '../features/publicRooms/pages/PublicRoomsPage';

import TravelerRoute from '../features/trips/components/TravelerRoute';
import TripWorkspace from '../features/trips/components/TripWorkspace';

import TripCollaboratorsPage from '../features/trips/pages/TripCollaboratorsPage';
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
        {/* MainLayout contains the global website structure,
            including shared navigation.

            Public Rooms should live inside this same structure,
            not inside a separate standalone application. */}
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

          {/* Everything below this point requires login. */}
          <Route element={<ProtectedRoute />}>
            {/* ---------------- ADMIN ---------------- */}
            <Route element={<AdminRoute />}>
              <Route
                path="/admin"
                element={
                  <AdminDashboardPage />
                }
              />
            </Route>

            {/* --------------- TRAVELER --------------- */}
            <Route element={<TravelerRoute />}>
              {/* TripWorkspace is the shared traveler sidebar
                  and content area.

                  Rafi's Event Rooms routes are intentionally
                  placed HERE, beside Farhan's trips and
                  Kusum's traveler hotel pages. */}
              <Route element={<TripWorkspace />}>
                {/* Farhan - Trip Management */}
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
                  path="/trips/:tripId/collaborators"
                  element={
                    <TripCollaboratorsPage />
                  }
                />

                <Route
                  path="/trips/:tripId/edit"
                  element={
                    <TripFormPage />
                  }
                />

                {/* Kusum - Traveler Hotel Search */}
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

                {/* =====================================
                    RAFI - PUBLIC EVENT ROOMS

                    /event-rooms
                    Main dashboard + discovery.

                    /event-rooms/new
                    Creation form.

                    /event-rooms/:roomId
                    Room details + Request to Join.
                   ===================================== */}
                <Route
                  path="/event-rooms"
                  element={
                    <PublicRoomsPage />
                  }
                />

                <Route
                  path="/event-rooms/new"
                  element={
                    <PublicRoomCreatePage />
                  }
                />

                <Route
                  path="/event-rooms/:roomId"
                  element={
                    <PublicRoomDetailsPage />
                  }
                />
              </Route>
            </Route>

            {/* ------------- HOTEL VENDOR ------------- */}
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

          {/* Any unknown frontend URL reaches the existing
              Not Found page. */}
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