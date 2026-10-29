import PropTypes from 'prop-types';
import { Navigate, useLocation } from 'react-router-dom';

import { useActiveSession } from 'hooks/use-active-session';
import { getStoredActiveSessionToken } from 'services/sessionStorage';

export default function RequireAuth({ children }) {
  const location = useLocation();
  const session = useActiveSession();
  const tokenSesion = getStoredActiveSessionToken();

  if (!session && tokenSesion) {
    return null;
  }

  if (!session) {
    return <Navigate replace state={{ from: location.pathname }} to="/login" />;
  }

  return children;
}

RequireAuth.propTypes = {
  children: PropTypes.node.isRequired
};
