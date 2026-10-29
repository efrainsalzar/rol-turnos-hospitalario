import {
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';

// Estandar de mensajes al usuario (docs/frontend/estandar-notificaciones.md):
// el frontend muestra el `message` del backend tal cual, asi que ningun id
// interno debe llegar ahi. El id va al log del servidor (ARQUITECTURA.md §9) y el
// usuario recibe un texto que entiende.

type Genero = 'm' | 'f';

const ENTIDADES = {
  departamento: { nombre: 'departamento', genero: 'm' },
  servicio: { nombre: 'servicio', genero: 'm' },
  personal: { nombre: 'personal', genero: 'm' },
  asignacion: { nombre: 'asignacion', genero: 'f' },
  usuario: { nombre: 'usuario', genero: 'm' },
  rolSeguridad: { nombre: 'rol de seguridad', genero: 'm' },
  rolFuncional: { nombre: 'rol funcional', genero: 'm' },
  nivelCargo: { nombre: 'cargo', genero: 'm' },
  cargaHoraria: { nombre: 'carga horaria', genero: 'f' },
  tipoContrato: { nombre: 'tipo de contrato', genero: 'm' },
  turno: { nombre: 'horario', genero: 'm' },
  incidenciaPersonal: { nombre: 'incidencia de personal', genero: 'f' },
  feriado: { nombre: 'feriado', genero: 'm' },
  tipoFeriado: { nombre: 'tipo de feriado', genero: 'm' },
  calendario: { nombre: 'dia del calendario', genero: 'm' },
  planificacion: { nombre: 'planificacion', genero: 'f' },
  rolTurno: { nombre: 'registro de la matriz', genero: 'm' },
  configuracionOperativa: { nombre: 'configuracion operativa', genero: 'f' },
  codigoOperativo: { nombre: 'codigo operativo', genero: 'm' },
} as const satisfies Record<string, { nombre: string; genero: Genero }>;

export type EntidadMensaje = keyof typeof ENTIDADES;

function articulo(entidad: EntidadMensaje): string {
  return ENTIDADES[entidad].genero === 'f' ? 'la' : 'el';
}

function concordar(entidad: EntidadMensaje, raiz: string): string {
  return `${raiz}${ENTIDADES[entidad].genero === 'f' ? 'a' : 'o'}`;
}

/** "el departamento", "la planificacion". */
export function nombreEntidad(entidad: EntidadMensaje): string {
  return `${articulo(entidad)} ${ENTIDADES[entidad].nombre}`;
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/**
 * El registro pedido no existe (o se dio de baja mientras el usuario tenia la
 * pantalla abierta). No hay nombre que mostrar, porque el registro no existe:
 * se pide refrescar y el id queda en el log.
 */
export function noEncontrado(
  entidad: EntidadMensaje,
  id: number | string,
  contexto: string,
): NotFoundException {
  new Logger(contexto).warn(
    `${ENTIDADES[entidad].nombre} no encontrado: id=${id}.`,
  );

  return new NotFoundException(
    `${capitalizar(nombreEntidad(entidad))} ${concordar(entidad, 'seleccionad')} ya no existe ` +
      `o fue ${concordar(entidad, 'dad')} de baja. Actualiza la pantalla e intenta de nuevo.`,
  );
}

/**
 * La escritura se ejecuto pero no se pudo releer el registro. No deberia
 * ocurrir; si ocurre dentro de una transaccion, esta se revierte, por eso el
 * mensaje no afirma que los cambios se guardaron.
 */
export function errorAlConfirmarGuardado(
  entidad: EntidadMensaje,
  id: number | string | null,
  contexto: string,
): InternalServerErrorException {
  new Logger(contexto).error(
    `No se pudo releer ${ENTIDADES[entidad].nombre} tras guardar: id=${id ?? 'desconocido'}.`,
  );

  return new InternalServerErrorException(
    `No se pudo confirmar el resultado de la operacion sobre ${nombreEntidad(entidad)}. ` +
      'Actualiza la pantalla para verificar si los cambios se guardaron.',
  );
}

export const MENSAJE_ERROR_INESPERADO =
  'Ocurrio un error inesperado al procesar la solicitud. Intenta de nuevo; si el problema ' +
  'continua, informa al administrador del sistema la hora en que ocurrio.';
