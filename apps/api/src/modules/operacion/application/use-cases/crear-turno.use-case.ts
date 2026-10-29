import { BadRequestException, Injectable, Logger } from '@nestjs/common';
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
export class CrearTurnoUseCase {
  private readonly logger = new Logger(CrearTurnoUseCase.name);

  constructor(
    private readonly turnoRepository: TurnoRepository,
    private readonly accessPolicy: OperacionAccessPolicyService,
  ) {}

  async execute(
    actor: UsuarioSesionResponseDto,
    input: GuardarTurnoDto,
  ): Promise<TurnoResponseDto> {
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
      `Creando turno codigo=${input.codigo} servicio=${input.idServicio ?? 'n/a'} departamento=${input.idDepartamento ?? 'n/a'} por actor=${actor.username}.`,
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

    const turno = await this.turnoRepository.crear({
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
      // seccion 49) — se completa con la fecha actual si no llega.
      vigenciaDesde:
        input.vigenciaDesde ?? new Date().toISOString().slice(0, 10),
      vigenciaHasta: input.vigenciaHasta ?? null,
      activo: input.activo ?? true,
      codigoVisual: input.codigoVisual,
      etiqueta: input.etiqueta,
    });

    return mapTurnoToResponse(turno);
  }
}
