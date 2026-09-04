import {
  Navigate,
  Outlet,
} from 'react-router-dom';

import useAuth from '../../auth/hooks/useAuth';

function TravelerRoute() {
  const { user } = useAuth();

  if (user?.role !== 'traveler') {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }

  return <Outlet />;
}

export default TravelerRoute;