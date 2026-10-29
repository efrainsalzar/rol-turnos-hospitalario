import {
  FuenteExternaPersonal,
  IdentidadesPorFuente,
  OpcionesRegistroPersonalDesdeFuente,
  RegistroPersonalDesdeFuente,
  ResultadoRegistroPersonalDesdeFuente,
} from '../entities/identidad-fuente-externa';

export abstract class PersonalFuenteRepository {
  abstract obtenerIdentidadesPorFuente(
    fuente: FuenteExternaPersonal,
  ): Promise<IdentidadesPorFuente>;

  // Procesa el lote completo en una sola transaccion. Es idempotente: un
  // registro ya vinculado solo refresca `last_seen_at`, nunca se duplica.
  abstract registrarLoteDesdeFuente(
    fuente: FuenteExternaPersonal,
    lote: RegistroPersonalDesdeFuente[],
    opciones: OpcionesRegistroPersonalDesdeFuente,
  ): Promise<ResultadoRegistroPersonalDesdeFuente[]>;
}
