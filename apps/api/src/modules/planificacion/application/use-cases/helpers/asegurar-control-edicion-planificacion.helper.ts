import { ConflictException } from '@nestjs/common';
import { SesionEdicionPlanificacionRepository } from '../../../domain/repositories/sesion-edicion-planificacion.repository';
import { obtenerEtiquetaCortaRol } from './jerarquia-edicion-planificacion.helper';

/**
 * Punto unico donde se exige el control exclusivo de edicion antes de
 * escribir en una planificacion (celdas de matriz, rol_turno manual, etc.).
 * Adquiere o renueva el latido del actor; si otro usuario tiene el control
 * vigente, corta con 409 en vez de dejar que la escritura siga y pise datos
 * en silencio.
 */
export async function asegurarControlEdicionPlanificacion(
  sesionEdicionPlanificacionRepository: SesionEdicionPlanificacionRepository,
  idUsuario: number,
  idPlanificacion: number,
): Promise<void> {
  const resultado =
    await sesionEdicionPlanificacionRepository.intentarAdquirirOLatir(
      idPlanificacion,
      idUsuario,
    );

  if (!resultado.controlPropio) {
    throw new ConflictException(
      `Esta planificacion esta siendo editada por ${obtenerEtiquetaCortaRol(resultado.sesion.codigoRolEditor)}. Espera a que termine o toma el control si tu rol lo permite.`,
    );
  }
}
