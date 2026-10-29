import { AsignacionConsulta } from '../../domain/entities/asignacion-consulta';
import { AsignacionResponseDto } from '../dto/asignacion-response.dto';

export function mapAsignacionToResponse(
  item: AsignacionConsulta,
): AsignacionResponseDto {
  return {
    id: item.id,
    idPersonal: item.idPersonal,
    codigoPersonal: item.codigoPersonal,
    ci: item.ci,
    apellidoPaterno: item.apellidoPaterno,
    apellidoMaterno: item.apellidoMaterno,
    nombres: item.nombres,
    nombreCompleto: item.nombreCompleto,
    idServicio: item.idServicio,
    codigoServicio: item.codigoServicio,
    nombreServicio: item.nombreServicio,
    idDepartamento: item.idDepartamento,
    codigoDepartamento: item.codigoDepartamento,
    nombreDepartamento: item.nombreDepartamento,
    nombreNivelCargo: item.nombreNivelCargo,
    idTipoContrato: item.idTipoContrato,
    codigoTipoContrato: item.codigoTipoContrato,
    nombreTipoContrato: item.nombreTipoContrato,
    idRolFuncional: item.idRolFuncional,
    codigoRolFuncional: item.codigoRolFuncional,
    nombreRolFuncional: item.nombreRolFuncional,
    esJefaturaRolFuncional: item.esJefaturaRolFuncional,
    codigoFuenteItem: item.codigoFuenteItem,
    idCargaHoraria: item.idCargaHoraria,
    codigoCargaHoraria: item.codigoCargaHoraria,
    nombreCargaHoraria: item.nombreCargaHoraria,
    nroItem: item.nroItem,
    tipoAsignacion: item.tipoAsignacion,
    fechaInicio: item.fechaInicio.toISOString(),
    fechaFin: item.fechaFin ? item.fechaFin.toISOString() : null,
    activo: item.activo,
    tieneUsuario: item.tieneUsuario,
  };
}
