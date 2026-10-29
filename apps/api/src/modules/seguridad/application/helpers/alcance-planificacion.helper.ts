import { ForbiddenException } from '@nestjs/common';
import type { AlcancePlanificacionUsuario } from '../../domain/entities/usuario-sesion';

// Orden de poder de alcance: SISTEMA puede todo lo de DEPARTAMENTO/SERVICIO/LECTURA,
// pero no al reves. Un actor no puede crear, editar ni asignar un rolSeguridad con un
// alcance igual o mas amplio que el propio (evita escalamiento de privilegios
// entre pares: un JEFE_DEPARTAMENTO no puede nombrar a otro JEFE_DEPARTAMENTO).
// SISTEMA es la unica excepcion a la regla estricta: si puede otorgar su propio
// alcance, porque de lo contrario ningun SISTEMA podria crear a otro.
const ALCANCE_RANK: Record<AlcancePlanificacionUsuario, number> = {
  SISTEMA: 4,
  DEPARTAMENTO: 3,
  SERVICIO: 2,
  LECTURA: 1,
};

export function puedeOtorgarAlcance(
  alcanceActor: AlcancePlanificacionUsuario,
  alcanceObjetivo: AlcancePlanificacionUsuario,
): boolean {
  if (alcanceActor === 'SISTEMA') {
    return true;
  }
  return ALCANCE_RANK[alcanceActor] > ALCANCE_RANK[alcanceObjetivo];
}

const ETIQUETA_ALCANCE: Record<AlcancePlanificacionUsuario, string> = {
  SISTEMA: 'sistema (toda la institucion)',
  DEPARTAMENTO: 'departamento',
  SERVICIO: 'servicio',
  LECTURA: 'solo lectura',
};

export function assertAlcancePermitido(
  alcanceActor: AlcancePlanificacionUsuario,
  alcanceObjetivo: AlcancePlanificacionUsuario,
): void {
  if (!puedeOtorgarAlcance(alcanceActor, alcanceObjetivo)) {
    throw new ForbiddenException(
      `No tienes permiso para asignar ni modificar un rol de seguridad de alcance ${ETIQUETA_ALCANCE[alcanceObjetivo]}; ` +
        `tu alcance es ${ETIQUETA_ALCANCE[alcanceActor]}.`,
    );
  }
}
