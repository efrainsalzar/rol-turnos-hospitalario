import type { GuardarServicioDto } from '../../application/dto/guardar-servicio.dto';
import { Servicio } from '../entities/servicio';
import { ServicioDetalle } from '../entities/servicio-detalle';

export interface ListarServiciosFiltro {
  idDepartamento?: number;
  idsDepartamentoPermitidos?: number[];
  idsServicioPermitidos?: number[];
  soloActivos?: boolean;
}

export abstract class ServicioRepository {
  abstract listar(filtro?: ListarServiciosFiltro): Promise<Servicio[]>;

  abstract obtenerPorId(id: number): Promise<Servicio | null>;

  abstract obtenerDetalle(id: number): Promise<ServicioDetalle | null>;

  abstract crear(input: GuardarServicioDto): Promise<Servicio>;

  abstract actualizar(id: number, input: GuardarServicioDto): Promise<Servicio>;

  abstract activar(id: number): Promise<void>;

  abstract desactivar(id: number): Promise<void>;
}
