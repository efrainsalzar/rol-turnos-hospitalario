import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import type { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import { TurnoRepository } from '../../domain/repositories/turno.repository';
import type { GuardarTurnoDto } from '../dto/guardar-turno.dto';
import type { TurnoResponseDto } from '../dto/turno-response.dto';
import { mapTurnoToResponse } from '../mappers/operacion-response.mappers';
import { OperacionAccessPolicyService } from './helpers/operacion-access-policy.service';
import {
  calcularTurnoDesdeHorario,
  calcularTurnoDesdeTramos,
} from './helpers/turno-time.helper';

@Injectable()
export class ActualizarTurnoUseCase {
  private readonly logger = new Logger(ActualizarTurnoUseCase.name);

  constructor(
    private readonly turnoRepository: TurnoRepository,
    private readonly accessPolicy: OperacionAccessPolicyService,
  ) {}

  async execute(
    actor: UsuarioSesionResponseDto,
    id: number,
    input: GuardarTurnoDto,
  ): Promise<TurnoResponseDto> {
    const antes = await this.turnoRepository.obtenerPorId(id);

    // Se valida el alcance del turno EXISTENTE (no solo el del body): sin
    // esto, un actor podia enviar un idServicio/idDepartamento propio en el
    // body para pasar la validacion y sobreescribir igual un turno de otro
    // servicio/departamento fuera de su alcance real.
    if (antes?.idServicio) {
      this.accessPolicy.assertPuedeGestionarTurnoServicio(
        actor,
        antes.idServicio,
      );
    } else if (antes?.idDepartamento) {
      this.accessPolicy.assertPuedeGestionarTurnoDepartamento(
        actor,
        antes.idDepartamento,
      );
    }

    if (input.idServicio) {
      this.accessPolicy.assertPuedeGestionarTurnoServicio(
        actor,
        input.idServicio,
      );
    } else if (input.idDepartamento) {
      this.accessPolicy.assertPuedeGestionarTurnoDepartamento(
        actor,
        input.idDepartamento,
      );
    } else {
      throw new BadRequestException(
        'Indica si el horario pertenece a un servicio o a un departamento.',
      );
    }

    this.logger.log(
      `Actualizando turno id=${id} servicio=${input.idServicio ?? 'n/a'} departamento=${input.idDepartamento ?? 'n/a'} por actor=${actor.username}.`,
    );
    const tipoHorario = input.tipoHorario ?? 'CONTINUO';

    let horaInicio: string;
    let horaFin: string;
    let cruzaMedianoche: boolean;
    let duracionHoras: number;
    let tramos: Array<{
      orden: number;
      horaInicio: string;
      horaFin: string;
      duracionHoras: number;
      cruzaMedianoche: boolean;
    }>;

    if (tipoHorario === 'DISCONTINUO') {
      const rawTramos = (input.tramos ?? []).map((t, i) => ({
        orden: i + 1,
        horaInicio: t.horaInicio,
        horaFin: t.horaFin,
      }));
      const calculado = calcularTurnoDesdeTramos(rawTramos);
      horaInicio = calculado.turno.horaInicio;
      horaFin = calculado.turno.horaFin;
      cruzaMedianoche = calculado.turno.cruzaMedianoche;
      duracionHoras = calculado.turno.duracionHoras;
      tramos = calculado.tramos;
    } else {
      const calculado = calcularTurnoDesdeHorario(
        input.horaInicio,
        input.horaFin,
      );
      horaInicio = input.horaInicio;
      horaFin = input.horaFin;
      cruzaMedianoche = calculado.cruzaMedianoche;
      duracionHoras = calculado.duracionHoras;
      tramos = [
        {
          orden: 1,
          horaInicio: input.horaInicio,
          horaFin: input.horaFin,
          duracionHoras: calculado.duracionHoras,
          cruzaMedianoche: calculado.cruzaMedianoche,
        },
      ];
    }

    const cambioHorario =
      !!antes &&
      (antes.horaInicio !== horaInicio ||
        antes.horaFin !== horaFin ||
        antes.cruzaMedianoche !== cruzaMedianoche ||
        antes.duracionHoras !== duracionHoras);

    if (cambioHorario) {
      const impacto = await this.turnoRepository.obtenerImpactoUso(id);

      if (impacto.totalCeldas > 0 && !input.estrategiaCeldasExistentes) {
        throw new ConflictException({
          status: 'error',
          message:
            'El horario esta asignado en planificaciones que aun no se cierran. Elige si quieres aplicar el nuevo horario a esas asignaciones o quitarlas para continuar.',
          impacto,
        });
      }
    }

    const turno = await this.turnoRepository.actualizar(id, {
      idServicio: input.idServicio ?? null,
      idDepartamento: input.idDepartamento ?? null,
      codigo: input.codigo,
      nombre: input.nombre,
      tipoHorario,
      horaInicio,
      horaFin,
      cruzaMedianoche,
      duracionHoras,
      tramos,
      // El frontend ya no manda vigenciaDesde (docs/database/decisiones-tecnicas.md
      // seccion 49) — a diferencia de crear, editar NUNCA debe reescribirla con hoy
      // si no llega: se conserva la vigencia_desde que ya tenia el turno.
      vigenciaDesde:
        input.vigenciaDesde ??
        antes?.vigenciaDesde.toISOString().slice(0, 10) ??
        new Date().toISOString().slice(0, 10),
      vigenciaHasta: input.vigenciaHasta ?? null,
      activo: input.activo ?? true,
      codigoVisual: input.codigoVisual,
      etiqueta: input.etiqueta,
    });

    if (cambioHorario && input.estrategiaCeldasExistentes === 'PROPAGAR') {
      const resultado = await this.turnoRepository.propagarHorarioACeldas(
        id,
        duracionHoras,
        actor.id,
      );
      this.logger.log(
        `Propagado nuevo horario del turno id=${id} a ${resultado.celdasActualizadas} celda(s) existentes, por actor=${actor.username}.`,
      );
    } else if (
      cambioHorario &&
      input.estrategiaCeldasExistentes === 'LIMPIAR'
    ) {
      const resultado = await this.turnoRepository.limpiarCeldasAsociadas(id);
      this.logger.log(
        `Limpiadas ${resultado.celdasEliminadas} celda(s) en ${resultado.planificacionesAfectadas} planificacion(es) tras cambio de horario del turno id=${id}, por actor=${actor.username}.`,
      );
    }

    return mapTurnoToResponse(turno);
  }
}
