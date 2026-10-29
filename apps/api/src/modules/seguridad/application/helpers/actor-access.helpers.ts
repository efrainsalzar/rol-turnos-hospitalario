import type { UsuarioSesionResponseDto } from '../dto/usuario-sesion-response.dto';

export function hasSystemScope(actor: UsuarioSesionResponseDto): boolean {
  return Boolean(
    actor.puedeGestionarTodo || actor.alcancePlanificacion === 'SISTEMA',
  );
}

export function isDepartamentoHead(actor: UsuarioSesionResponseDto): boolean {
  return actor.rolSeguridad.codigo === 'JEFE_DEPARTAMENTO';
}

export function isServicioHead(actor: UsuarioSesionResponseDto): boolean {
  return actor.rolSeguridad.codigo === 'JEFE_SERVICIO';
}

export function hasDepartamentoScope(actor: UsuarioSesionResponseDto): boolean {
  return (
    actor.alcancePlanificacion === 'DEPARTAMENTO' &&
    actor.departamentosGestionables.length > 0
  );
}

export function hasServicioScope(actor: UsuarioSesionResponseDto): boolean {
  return (
    actor.alcancePlanificacion === 'SERVICIO' &&
    actor.serviciosGestionables.length > 0
  );
}

export function canAccessDepartamento(
  actor: UsuarioSesionResponseDto,
  idDepartamento: number,
): boolean {
  if (hasSystemScope(actor)) {
    return true;
  }

  if (hasDepartamentoScope(actor)) {
    return actor.departamentosGestionables.some(
      (departamento) => departamento.id === idDepartamento,
    );
  }

  if (hasServicioScope(actor)) {
    return actor.serviciosGestionables.some(
      (servicio) => servicio.idDepartamento === idDepartamento,
    );
  }

  return false;
}

export function canAccessServicio(
  actor: UsuarioSesionResponseDto,
  idServicio: number,
  idDepartamento?: number,
): boolean {
  if (hasSystemScope(actor)) {
    return true;
  }

  if (!hasServicioScope(actor) && !hasDepartamentoScope(actor)) {
    return false;
  }

  // serviciosGestionables es la fuente de verdad de que servicios puede tocar
  // el actor: para alcance SERVICIO son los propios; para alcance DEPARTAMENTO
  // ya viene expandido con todos los servicios de sus departamentos
  // (TypeOrmUsuarioRepository). Buscar aqui, en vez de delegar en
  // canAccessDepartamento, evita confiar ciegamente en que el llamador haya
  // pasado un idServicio/idDepartamento coherentes.
  const servicioGestionable = actor.serviciosGestionables.find(
    (servicio) => servicio.id === idServicio,
  );

  if (!servicioGestionable) {
    return false;
  }

  if (
    typeof idDepartamento === 'number' &&
    servicioGestionable.idDepartamento !== idDepartamento
  ) {
    return false;
  }

  return true;
}

export function canManagePersonalCatalogs(
  actor: UsuarioSesionResponseDto,
): boolean {
  return actor.permisos.puedeGestionarPersonal;
}

export function canManageOrganizacionCatalog(
  actor: UsuarioSesionResponseDto,
): boolean {
  return Boolean(actor.capacidades?.gestionarServicios);
}
