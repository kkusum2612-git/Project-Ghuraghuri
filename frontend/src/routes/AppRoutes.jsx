import {
  BrowserRouter,
  Route,
  Routes,
} from 'react-router-dom';

import AdminRoute from '../features/admin/components/AdminRoute';
import AdminDashboardPage from '../features/admin/pages/AdminDashboardPage';

/*
 * ============================================================
 * RAFI FEATURE 4 - AI TRAVEL PLANNER
 * ============================================================
 *
 * This is Rafi's Premium-only AI Travel Planner page.
 *
 * The route itself will already be inside:
 *
 * ProtectedRoute
 *      ↓
 * TravelerRoute
 *      ↓
 * TripWorkspace
 *
 * Therefore only logged-in travelers can reach the traveler
 * workspace.
 *
 * Premium access is also enforced separately by the Feature 4
 * backend. The frontend sidebar lock is only for user experience.
 */
import AITravelPlannerPage from '../features/aiPlanner/pages/AITravelPlannerPage';

import ProtectedRoute from '../features/auth/components/ProtectedRoute';

import HotelVendorRoute from '../features/hotels/components/HotelVendorRoute';
import HotelVendorWorkspace from '../features/hotels/components/HotelVendorWorkspace';

import HotelDashboardPage from '../features/hotels/pages/HotelDashboardPage';
import HotelDetailsPage from '../features/hotels/pages/HotelDetailsPage';
import HotelFormPage from '../features/hotels/pages/HotelFormPage';
import HotelReviewsPage from '../features/hotels/pages/HotelReviewsPage';
import HotelSearchPage from '../features/hotels/pages/HotelSearchPage';
import TravelerBookingsPage from '../features/hotels/pages/TravelerBookingsPage';

/*
 * Kusum Feature 3 - shared traveler payment history.
 *
 * Payment history is intentionally separate from the hotel
 * feature because the same page can later display payments for
 * guide bookings as well.
 */
import TravelerPaymentsPage from '../features/payments/pages/TravelerPaymentsPage';


/*
 * ============================================================
 * RAFI - PREMIUM MEMBERSHIP AND REWARD POINTS
 * ============================================================
 *
 * PremiumPage serves two states:
 *
 * Normal traveler:
 *
 *   /premium
 *      -> Upgrade Account page
 *
 *
 * Premium traveler:
 *
 *   /premium
 *      -> Premium membership/reward dashboard
 *
 *
 * The backend decides whether the traveler is Premium.
 */
import PremiumPage from '../features/premium/pages/PremiumPage';


// ============================================================
// RAFI - PUBLIC EVENT ROOMS
// ============================================================
//
// Rafi originally implemented Public Event Room creation,
// discovery, join requests and member management.
//
// Farhan later added the real-time group-chat feature that works
// inside those Public Event Rooms.
//
// Both features therefore share the same publicRooms frontend
// area, but each member's feature remains logically separate.
import PublicRoomChatPage from '../features/publicRooms/pages/PublicRoomChatPage';
import PublicRoomCreatePage from '../features/publicRooms/pages/PublicRoomCreatePage';
import PublicRoomDetailsPage from '../features/publicRooms/pages/PublicRoomDetailsPage';
import PublicRoomsPage from '../features/publicRooms/pages/PublicRoomsPage';

import GuideRoute from '../features/guides/components/GuideRoute';
import GuideWorkspace from '../features/guides/components/GuideWorkspace';

import GuideDashboardPage from '../features/guides/pages/GuideDashboardPage';
import GuideProfilePage from '../features/guides/pages/GuideProfilePage';
import GuideTourFormPage from '../features/guides/pages/GuideTourFormPage';
import GuideToursPage from '../features/guides/pages/GuideToursPage';
import PublicGuidesPage from '../features/guides/pages/PublicGuidesPage';
import PublicGuideDetailsPage from '../features/guides/pages/PublicGuideDetailsPage';
import GuideBookingPage from '../features/guides/pages/GuideBookingPage';
import TravelerGuideBookingsPage from '../features/guides/pages/TravelerGuideBookingsPage';
import GuideReceivedBookingsPage from '../features/guides/pages/GuideReceivedBookingsPage';
import GuideReviewsPage from '../features/guides/pages/GuideReviewsPage';
import GuideAnalyticsPage from '../features/guides/pages/GuideAnalyticsPage';

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
        {/*
         * MainLayout is the shared outer page structure.
         *
         * It contains the common application layout used across
         * public and authenticated pages.
         */}
        <Route element={<MainLayout />}>
          {/* ---------------- PUBLIC ROUTES ---------------- */}

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
          <Route
            path="/guides/:guideId"
            element={<PublicGuideDetailsPage />}
          />


          {/*
           * ==================================================
           * AUTHENTICATED AREA
           * ==================================================
           *
           * Everything nested under ProtectedRoute requires a
           * valid logged-in Ghuraghuri user.
           *
           * Individual role wrappers below provide additional
           * traveler/admin/hotel-vendor restrictions.
           */}
          <Route element={<ProtectedRoute />}>
            {/* =================================================
                ADMIN
               ================================================= */}

            <Route element={<AdminRoute />}>
              <Route
                path="/admin"
                element={
                  <AdminDashboardPage />
                }
              />
            </Route>


            {/* =================================================
                TRAVELER
               =================================================
               
               TravelerRoute makes sure these pages are available
               only to users whose account role is "traveler".

               TripWorkspace then provides the shared traveler
               sidebar around these pages.
            */}

            <Route element={<TravelerRoute />}>
              <Route element={<TripWorkspace />}>
                {/* ---------------------------------------------
                    FARHAN - TRIP MANAGEMENT
                   --------------------------------------------- */}

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
                {/* ---------------------------------------------
                    TAFSIR - GUIDE BOOKING
                  --------------------------------------------- */}

                <Route
                  path="/guides/:guideId/book/:packageId"
                  element={
                    <GuideBookingPage />
                  }
                />
                <Route
                  path="/guide-bookings"
                  element={
                    <TravelerGuideBookingsPage />
                  }
                />


                {/* ---------------------------------------------
                    KUSUM - TRAVELER HOTEL SEARCH
                   --------------------------------------------- */}

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


                {/* ---------------------------------------------
                    KUSUM - HOTEL BOOKINGS
                   --------------------------------------------- */}

                <Route
                  path="/bookings"
                  element={
                    <TravelerBookingsPage />
                  }
                />


                {/* ---------------------------------------------
                    KUSUM - PAYMENT HISTORY
                   --------------------------------------------- */}

                <Route
                  path="/payments"
                  element={
                    <TravelerPaymentsPage />
                  }
                />


                {/* =============================================
                    RAFI - PUBLIC EVENT ROOMS
                   =============================================

                    These routes belong to Rafi's original Public
                    Event Room features:

                    /event-rooms
                        -> discover joined/available rooms

                    /event-rooms/new
                        -> create a Public Event Room

                    /event-rooms/:roomId
                        -> room information, members and join/
                           management functionality
                */}

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


                {/* =============================================
                    FARHAN - PUBLIC ROOM GROUP CHAT
                   =============================================

                    Farhan's latest feature adds real-time chat to
                    the existing Public Event Room system.

                    This route is intentionally KEPT alongside
                    Rafi's existing room-detail route.

                    Nothing about the existing Public Event Room
                    route has been removed or replaced.

                    Example:

                    /event-rooms/abc123
                        -> Rafi's room detail/member workspace

                    /event-rooms/abc123/chat
                        -> Farhan's real-time room chat
                */}

                <Route
                  path="/event-rooms/:roomId/chat"
                  element={
                    <PublicRoomChatPage />
                  }
                />


                {/* =============================================
                    RAFI FEATURE 3 - PREMIUM
                   =============================================

                    This is Rafi's Premium Membership and Reward
                    Points page.

                    The route already sits inside:

                    ProtectedRoute
                        ->
                    TravelerRoute
                        ->
                    TripWorkspace

                    Therefore:

                    - the user must be logged in
                    - the user must be a traveler
                    - the normal traveler sidebar surrounds the
                      page

                    The backend separately enforces traveler-only
                    authorization as well.

                    Normal traveler:
                    
                    /premium
                        -> Upgrade Account

                    Premium traveler:

                    /premium
                        -> Premium User / rewards dashboard
                */}

                <Route
                  path="/premium"
                  element={
                    <PremiumPage />
                  }
                />


                {/* =============================================
                    RAFI FEATURE 4 - AI TRAVEL PLANNER
                   =============================================

                    /ai-planner shows Rafi's AI Travel Planner.

                    This page belongs to the same traveler
                    workspace as My Trips, Hotels, Bookings,
                    Payments, Event Rooms and Premium.

                    A normal traveler should NOT be sent here from
                    the sidebar. TripWorkspace will instead show a
                    Premium-required notification.

                    However, users can manually type URLs, so the
                    frontend lock is not the real security layer.

                    If a non-Premium traveler manually reaches
                    this page and tries to generate a plan, the
                    backend Feature 4 API still returns 403.

                    A Premium traveler can use this page to:

                    - fill the AI planner form
                    - generate a real Groq itinerary
                    - see real Ghuraghuri hotel recommendations
                    - later view the route map
                    - later save the plan as My Trip
                    - later create a Public Event Room
                */}

                <Route
                  path="/ai-planner"
                  element={
                    <AITravelPlannerPage />
                  }
                />
              </Route>
            </Route>

            {/* =================================================
                HOTEL VENDOR
               ================================================= */}

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

                {/* Kusum - Hotel Reviews & Ratings */}
                <Route
                  path="/hotel/reviews"
                  element={
                    <HotelReviewsPage />
                  }
                />
              </Route>
            </Route>


            {/* =================================================
                TAFSIR - GUIDE MANAGEMENT
               =================================================

                GuideRoute restricts this workspace to accounts
                whose role is "guide".

                Pending guides are still allowed into their
                workspace so they can complete their profile and
                tour packages before administrator approval.
            */}

            <Route element={<GuideRoute />}>
              <Route
                element={
                  <GuideWorkspace />
                }
              >
                <Route
                  path="/guide/dashboard"
                  element={
                    <GuideDashboardPage />
                  }
                />

                <Route
                  path="/guide/profile"
                  element={
                    <GuideProfilePage />
                  }
                />

                <Route
                  path="/guide/tours"
                  element={
                    <GuideToursPage />
                  }
                />
                <Route
                  path="/guide/bookings"
                  element={
                    <GuideReceivedBookingsPage />
                  }
                />
                <Route
                  path="/guide/reviews"
                  element={
                    <GuideReviewsPage />
                  }
                />

                <Route
                  path="/guide/analytics"
                  element={
                    <GuideAnalyticsPage />
                  }
                />

                <Route
                  path="/guide/tours/new"
                  element={
                    <GuideTourFormPage />
                  }
                />

                <Route
                  path="/guide/tours/:packageId/edit"
                  element={
                    <GuideTourFormPage />
                  }
                />
              </Route>
            </Route>
          </Route>



          {/*
           * Catch-all route.
           *
           * If none of the routes above match the requested URL,
           * React displays the application's Not Found page.
           */}
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