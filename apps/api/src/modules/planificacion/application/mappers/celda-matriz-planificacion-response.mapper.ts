import { CeldaMatrizPersistida } from '../../domain/repositories/rol-turno.repository';
import { CeldaMatrizPlanificacionResponseDto } from '../dto/celda-matriz-planificacion-response.dto';

export function mapCeldaMatrizPersistidaToResponse(
  registro: CeldaMatrizPersistida,
): CeldaMatrizPlanificacionResponseDto {
  return {
    idRolTurno: registro.idRolTurno,
    secuenciaDia: registro.secuenciaDia,
    idTurno: registro.idTurno,
    codigoTurno: registro.codigoTurno,
    nombreTurno: registro.nombreTurno,
    horaInicio: registro.horaInicio,
    horaFin: registro.horaFin,
    cruzaMedianoche: registro.cruzaMedianoche,
    idIncidenciaPersonal: registro.idIncidenciaPersonal,
    codigoIncidenciaPersonal: registro.codigoIncidenciaPersonal,
    nombreIncidenciaPersonal: registro.nombreIncidenciaPersonal,
    horasProgramadas: registro.horasProgramadas,
  };
}
