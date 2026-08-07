import {
  BrowserRouter,
  Route,
  Routes,
} from 'react-router-dom';

import MainLayout from '../layouts/MainLayout';
import HomePage from '../pages/HomePage';
import LoginPage from '../pages/LoginPage';
import NotFoundPage from '../pages/NotFoundPage';

/**
 * Defines the frontend routes available in the Ghuraghuri application.
 *
 * BrowserRouter enables browser-based navigation without performing a complete
 * page reload for every internal route.
 *
 * MainLayout wraps the route pages so they share common interface elements,
 * including the Navbar and the main page container.
 */
function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Every nested route below uses MainLayout. */}
        <Route element={<MainLayout />}>
          {/* Public landing page. */}
          <Route
            path="/"
            element={<HomePage />}
          />

          {/* Public authentication page for existing users. */}
          <Route
            path="/login"
            element={<LoginPage />}
          />

          {/* Catch every unknown route and show the 404 page. */}
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