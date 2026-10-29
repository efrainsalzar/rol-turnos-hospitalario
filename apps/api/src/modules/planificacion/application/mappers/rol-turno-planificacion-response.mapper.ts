import { RolTurnoPlanificacion } from '../../domain/entities/rol-turno-planificacion';
import { RolTurnoPlanificacionResponseDto } from '../dto/rol-turno-planificacion-response.dto';

export function mapRolTurnoPlanificacionToResponse(
  registro: RolTurnoPlanificacion,
): RolTurnoPlanificacionResponseDto {
  return {
    id: registro.id,
    idPlanificacion: registro.idPlanificacion,
    idAsignacionPersonal: registro.idAsignacionPersonal,
    idCalendario: registro.idCalendario,
    fecha: registro.fecha.toISOString(),
    diaMes: registro.diaMes,
    diaSemanaNombre: registro.diaSemanaNombre,
    secuenciaDia: registro.secuenciaDia,
    idTurno: registro.idTurno,
    codigoTurno: registro.codigoTurno,
    nombreTurno: registro.nombreTurno,
    horaInicio: registro.horaInicio ?? null,
    horaFin: registro.horaFin ?? null,
    cruzaMedianoche: registro.cruzaMedianoche ?? null,
    idIncidenciaPersonal: registro.idIncidenciaPersonal,
    codigoIncidenciaPersonal: registro.codigoIncidenciaPersonal,
    nombreIncidenciaPersonal: registro.nombreIncidenciaPersonal,
    horasProgramadas: registro.horasProgramadas,
    origenRegistro: registro.origenRegistro,
    idPersonal: registro.idPersonal,
    codigoPersonal: registro.codigoPersonal,
    nombreCompleto: registro.nombreCompleto,
  };
}
