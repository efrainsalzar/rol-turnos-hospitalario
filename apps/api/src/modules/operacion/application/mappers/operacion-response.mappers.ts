import type { IncidenciaPersonal } from '../../domain/entities/incidencia-personal';
import type { Turno } from '../../domain/entities/turno';
import type { IncidenciaPersonalResponseDto } from '../dto/incidencia-personal-response.dto';
import type { TurnoResponseDto } from '../dto/turno-response.dto';

export function mapIncidenciaPersonalToResponse(
  incidenciaPersonal: IncidenciaPersonal,
): IncidenciaPersonalResponseDto {
  return {
    id: incidenciaPersonal.id,
    codigo: incidenciaPersonal.codigo,
    nombre: incidenciaPersonal.nombre,
    descripcion: incidenciaPersonal.descripcion,
    alcance: incidenciaPersonal.alcance,
    esLaborable: incidenciaPersonal.esLaborable,
    generaHorasTrabajadas: incidenciaPersonal.generaHorasTrabajadas,
    computaParaMetaHoras: incidenciaPersonal.computaParaMetaHoras,
    requiereRespaldo: incidenciaPersonal.requiereRespaldo,
    activo: incidenciaPersonal.activo,
  };
}

export function mapTurnoToResponse(turno: Turno): TurnoResponseDto {
  return {
    id: turno.id,
    idServicio: turno.idServicio,
    codigoServicio: turno.codigoServicio,
    nombreServicio: turno.nombreServicio,
    idDepartamento: turno.idDepartamento,
    codigoDepartamento: turno.codigoDepartamento,
    nombreDepartamento: turno.nombreDepartamento,
    codigo: turno.codigo,
    nombre: turno.nombre,
    codigoVisual: turno.codigoVisual,
    etiquetaVisual: turno.etiquetaVisual,
    tipoHorario: turno.tipoHorario,
    horaInicio: turno.horaInicio,
    horaFin: turno.horaFin,
    cruzaMedianoche: turno.cruzaMedianoche,
    duracionHoras: turno.duracionHoras,
    tramos: turno.tramos.map((t) => ({
      id: t.id,
      orden: t.orden,
      horaInicio: t.horaInicio,
      horaFin: t.horaFin,
      duracionHoras: t.duracionHoras,
      cruzaMedianoche: t.cruzaMedianoche,
      activo: t.activo,
    })),
    vigenciaDesde: turno.vigenciaDesde.toISOString(),
    vigenciaHasta: turno.vigenciaHasta
      ? turno.vigenciaHasta.toISOString()
      : null,
    activo: turno.activo,
  };
}
