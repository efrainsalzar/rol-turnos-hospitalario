import { Injectable, Logger } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { resolveFromProjectRoot } from '../../../../../infrastructure/config/project-root';
import { PersonaExterna } from '../../../domain/entities/persona-externa';
import {
  FuentePersonalExterna,
  LecturaFuente,
} from '../../../domain/ports/fuente-personal-externa.port';
import { leerConfigFuenteSqlServer } from '../../config/fuente-sql-server.config';
import {
  LectorSqlServerSoloLectura,
  describirDestino,
  describirModo,
} from '../sql-server/lector-sql-server-solo-lectura';
import {
  FilaPersonaRrhh,
  mapearPersonaRrhh,
} from './rrhh-externo-persona.mapper';

// La consulta versionada es la unica fuente de verdad de lo que se lee del
// sistema de RRHH; se carga del archivo para que codigo y documentacion no
// diverjan.
const CONSULTA_PERSONA = [
  'database',
  'integracion',
  'rrhh-externo',
  'persona-basico.sql',
];

@Injectable()
export class RrhhExternoPersonalAdapter extends FuentePersonalExterna {
  private readonly logger = new Logger(RrhhExternoPersonalAdapter.name);

  constructor(private readonly lector: LectorSqlServerSoloLectura) {
    super();
  }

  async leerPersonas(): Promise<LecturaFuente<PersonaExterna>> {
    const config = leerConfigFuenteSqlServer({
      prefijo: 'RRHH',
      baseDatosPorDefecto: 'RRHH',
    });
    const destino = describirDestino(config);
    const modo = describirModo(config);

    this.logger.log(`Leyendo personal desde ${destino} (conexion ${modo}).`);

    const lectura = await this.lector.leer<FilaPersonaRrhh>(
      config,
      readFileSync(resolveFromProjectRoot(...CONSULTA_PERSONA), 'utf8'),
      'dbo.persona',
    );

    this.logger.log(`Personal: ${lectura.filas.length} filas leidas.`);

    return {
      registros: lectura.filas.map(mapearPersonaRrhh),
      conexion: {
        modo,
        destino,
        permisoEscritura: lectura.permisoEscritura,
        advertencias: config.advertencias,
      },
    };
  }
}
