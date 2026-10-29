import { Feriado } from '../../domain/entities/feriado';
import { FeriadoResponseDto } from '../dto/feriado-response.dto';

export function mapFeriadoToResponse(feriado: Feriado): FeriadoResponseDto {
  return {
    id: feriado.id,
    idTipoFeriado: feriado.idTipoFeriado,
    codigoTipoFeriado: feriado.codigoTipoFeriado,
    nombreTipoFeriado: feriado.nombreTipoFeriado,
    nombre: feriado.nombre,
    anio: feriado.anio,
    mes: feriado.mes,
    fechaInicio: feriado.fechaInicio.toISOString().slice(0, 10),
    fechaFin: feriado.fechaFin.toISOString().slice(0, 10),
    activo: feriado.activo,
  };
}
