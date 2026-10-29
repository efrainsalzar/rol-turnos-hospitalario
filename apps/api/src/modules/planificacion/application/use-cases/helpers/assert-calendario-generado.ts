import { BadRequestException } from '@nestjs/common';
import { CalendarioRepository } from '../../../domain/repositories/calendario.repository';
import { nombrePeriodo } from './planificacion-mensajes';

/**
 * El calendario de un periodo solo lo genera SISTEMA (via POST /calendarios/generar).
 * Las jefaturas no deben poder generarlo ni siquiera de forma indirecta al crear,
 * actualizar o duplicar una planificacion: si el mes objetivo aun no fue generado,
 * la operacion se rechaza en vez de generarlo al vuelo.
 */
export async function assertCalendarioMesGenerado(
  calendarioRepository: CalendarioRepository,
  anio: number,
  mes: number,
): Promise<void> {
  const existe = await calendarioRepository.existeMes(anio, mes);

  if (!existe) {
    throw new BadRequestException(
      `El calendario de ${nombrePeriodo(anio, mes)} aun no fue generado. Solicita a un administrador de sistema que lo genere antes de continuar.`,
    );
  }
}
