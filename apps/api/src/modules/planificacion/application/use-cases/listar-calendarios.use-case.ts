import { Injectable, Logger } from '@nestjs/common';
import { CalendarioRepository } from '../../domain/repositories/calendario.repository';
import { ListarCalendariosQueryDto } from '../dto/listar-calendarios-query.dto';
import { CalendarioResponseDto } from '../dto/calendario-response.dto';
import { getPeriodosPlanificables } from './helpers/periodo-planificable';

@Injectable()
export class ListarCalendariosUseCase {
  private readonly logger = new Logger(ListarCalendariosUseCase.name);

  constructor(private readonly calendarioRepository: CalendarioRepository) {}

  async execute(
    query: ListarCalendariosQueryDto,
  ): Promise<CalendarioResponseDto[]> {
    const [periodoActual] = getPeriodosPlanificables();
    const anioObjetivo = query.anio ?? periodoActual.anio;

    const fragments: string[] = [];

    if (anioObjetivo) {
      fragments.push(`anio=${anioObjetivo}`);
    }

    if (query.mes) {
      fragments.push(`mes=${query.mes}`);
    }

    this.logger.log(
      `Listando calendarios${fragments.length > 0 ? ` con filtros ${fragments.join(', ')}` : ''}.`,
    );

    // Listar es de solo lectura: no genera el calendario si falta. Generarlo
    // es una accion explicita y exclusiva de SISTEMA via POST /calendarios/generar.
    const calendarios = await this.calendarioRepository.listar({
      anio: anioObjetivo,
      mes: query.mes,
    });

    this.logger.log(`Calendarios encontrados: ${calendarios.length}.`);

    return calendarios.map((calendario) => ({
      id: calendario.id,
      fecha: calendario.fecha.toISOString(),
      anio: calendario.anio,
      mes: calendario.mes,
      diaMes: calendario.diaMes,
      diaSemanaNum: calendario.diaSemanaNum,
      diaSemanaNombre: calendario.diaSemanaNombre,
      semanaMes: calendario.semanaMes,
      esFinSemana: calendario.esFinSemana,
      esFeriado: calendario.esFeriado,
      codigoFeriado: calendario.codigoFeriado,
      nombreFeriado: calendario.nombreFeriado,
    }));
  }
}
