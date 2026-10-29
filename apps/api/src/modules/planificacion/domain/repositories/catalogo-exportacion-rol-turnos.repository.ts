import type { CodigoExportacionRolTurnos } from '../entities/codigo-exportacion-rol-turnos';

export abstract class CatalogoExportacionRolTurnosRepository {
  abstract listarCodigos(): Promise<CodigoExportacionRolTurnos[]>;
}
