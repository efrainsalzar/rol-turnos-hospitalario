import { PersonaExterna } from '../entities/persona-externa';

export interface DescripcionConexionFuente {
  // Por ejemplo `MISMA_INSTANCIA/PROPIAS`; se guarda en la ejecucion.
  modo: string;
  // servidor\instancia/base, sin credenciales: solo para logs y reportes.
  destino: string;
  permisoEscritura: boolean;
  advertencias: string[];
}

export interface LecturaFuente<TRegistro> {
  registros: TRegistro[];
  conexion: DescripcionConexionFuente;
}

// Contrato que cumple cada sistema externo capaz de entregar personal
// (un sistema de RRHH hoy; otros sistemas en el futuro).
export abstract class FuentePersonalExterna {
  abstract leerPersonas(): Promise<LecturaFuente<PersonaExterna>>;
}
