import { Injectable, Logger } from '@nestjs/common';
import { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import { PersonalRepository } from '../../domain/repositories/personal.repository';
import { ConflictoPlanificacionAsignacionResponseDto } from '../dto/conflicto-planificacion-asignacion-response.dto';
import { AsignacionAccessPolicyService } from './helpers/asignacion-access-policy.service';

@Injectable()
export class ObtenerConflictoPlanificacionAsignacionUseCase {
  private readonly logger = new Logger(
    ObtenerConflictoPlanificacionAsignacionUseCase.name,
  );

  constructor(
    private readonly personalRepository: PersonalRepository,
    private readonly accessPolicy: AsignacionAccessPolicyService,
  ) {}

  async execute(
    actor: UsuarioSesionResponseDto,
    idAsignacion: number,
    destino?: { idServicio?: number; idDepartamento?: number },
  ): Promise<ConflictoPlanificacionAsignacionResponseDto> {
    // Consultar el conflicto es un precursor de la decision de cerrar, asi
    // que exige el mismo permiso que assertPuedeCerrar (docs/database/
    // decisiones-tecnicas.md seccion 50).
    this.accessPolicy.assertPuedeCerrar(actor);

    this.logger.log(
      `Consultando conflicto de planificacion para asignacion=${idAsignacion} por actor=${actor.username}.`,
    );

    const evaluaDestino = Boolean(
      destino?.idServicio || destino?.idDepartamento,
    );

    const [conflicto, planificacionAprobadaDestino] = await Promise.all([
      this.personalRepository.obtenerConflictoPlanificacionAbiertaParaAsignacion(
        idAsignacion,
      ),
      evaluaDestino
        ? this.personalRepository.obtenerPlanificacionAprobadaPorUnidadYFecha({
            idServicio: destino?.idServicio ?? null,
            idDepartamento: destino?.idDepartamento ?? null,
            // Misma fecha que usa moverAsignacion cuando no se envia una
            // fecha efectiva explicita (fecha de hoy).
            fecha: new Date().toISOString().slice(0, 10),
          })
        : null,
    ]);

    return {
      idAsignacion,
      tieneConflicto: conflicto !== null,
      unidadNombre: conflicto?.unidadNombre ?? null,
      periodo: conflicto?.periodo ?? null,
      tienePlanificacionAprobada: conflicto?.estado === 'APROBADA',
      planificacionAprobada:
        conflicto?.estado === 'APROBADA'
          ? {
              id: conflicto.idPlanificacion,
              unidadNombre: conflicto.unidadNombre,
              periodo: conflicto.periodo,
            }
          : null,
      destino: evaluaDestino
        ? {
            tienePlanificacionAprobada: planificacionAprobadaDestino !== null,
            planificacionAprobada: planificacionAprobadaDestino
              ? {
                  id: planificacionAprobadaDestino.idPlanificacion,
                  unidadNombre: planificacionAprobadaDestino.unidadNombre,
                  periodo: planificacionAprobadaDestino.periodo,
                }
              : null,
          }
        : null,
    };
  }
}
