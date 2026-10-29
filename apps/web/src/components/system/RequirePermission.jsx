import PropTypes from 'prop-types';
import { Navigate } from 'react-router-dom';

import { canAccessProfile } from 'hooks/use-access-control';
import { useActiveSession } from 'hooks/use-active-session';

export default function RequirePermission({
  children,
  capability,
  capabilities,
  permission,
  permissions,
  requireGlobalCatalogs = false,
  anyOf,
  fallbackTo = '/'
}) {
  const session = useActiveSession();

  if (!session) {
    return <Navigate replace to="/login" />;
  }

  // `anyOf` permite combinar dos perfiles de acceso independientes con OR,
  // para pantallas/tabs que conviven bajo una misma ruta pero requieren
  // permisos distintos (ej. Cargos vs Cargas horarias).
  const profiles = anyOf?.length ? anyOf : [{ permission, permissions, capability, capabilities, requireGlobalCatalogs }];

  if (!profiles.some((profile) => canAccessProfile(session, profile))) {
    return <Navigate replace to={fallbackTo} />;
  }

  return children;
}

const accessProfileShape = PropTypes.shape({
  capabilities: PropTypes.arrayOf(PropTypes.string),
  capability: PropTypes.string,
  permission: PropTypes.string,
  permissions: PropTypes.arrayOf(PropTypes.string),
  requireGlobalCatalogs: PropTypes.bool
});

RequirePermission.propTypes = {
  anyOf: PropTypes.arrayOf(accessProfileShape),
  capabilities: PropTypes.arrayOf(PropTypes.string),
  capability: PropTypes.string,
  children: PropTypes.node.isRequired,
  fallbackTo: PropTypes.string,
  permission: PropTypes.string,
  permissions: PropTypes.arrayOf(PropTypes.string),
  requireGlobalCatalogs: PropTypes.bool
};
