import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { noEncontrado } from '../../../../common/errors/mensajes-usuario';
import { TYPEORM_DATA_SOURCE } from '../../../../infrastructure/persistence/typeorm/typeorm.constants';
import { obtenerRestriccionUnicaViolada } from '../../../../infrastructure/persistence/typeorm/violacion-unica';
import type { GuardarDepartamentoDto } from '../../application/dto/guardar-departamento.dto';
import { Departamento } from '../../domain/entities/departamento';
import { DepartamentoRepository } from '../../domain/repositories/departamento.repository';
import { DepartamentoOrmEntity } from './entities/departamento.orm-entity';

@Injectable()
export class TypeOrmDepartamentoRepository implements DepartamentoRepository {
  private readonly repository: Repository<DepartamentoOrmEntity>;
  private readonly dataSource: DataSource;

  constructor(@Inject(TYPEORM_DATA_SOURCE) dataSource: DataSource) {
    this.repository = dataSource.getRepository(DepartamentoOrmEntity);
    this.dataSource = dataSource;
  }

  async listar(idsPermitidos?: number[]): Promise<Departamento[]> {
    if (idsPermitidos && idsPermitidos.length === 0) {
      return [];
    }

    const whereClause = idsPermitidos
      ? `WHERE d.id IN (${idsPermitidos.map((_, index) => `@${index}`).join(', ')})`
      : '';

    const rows = await this.dataSource.query<
      {
        id: number;
        codigo: string;
        nombre: string;
        descripcion: string | null;
        activo: boolean;
        cantidadPersonalActivo: number;
      }[]
    >(
      `
      SELECT
        d.id,
        d.codigo,
        d.nombre,
        d.descripcion,
        d.activo,
        (
          SELECT COUNT(*)
          FROM dbo.asignacion_personal ap
          WHERE ap.activo = 1
            AND (
              ap.id_departamento = d.id
              OR ap.id_servicio IN (
                SELECT s.id FROM dbo.servicio s WHERE s.id_departamento = d.id
              )
            )
        ) AS cantidadPersonalActivo
      FROM dbo.departamento d
      ${whereClause}
      ORDER BY d.nombre ASC
    `,
      idsPermitidos,
    );

    return rows.map((row) => ({
      id: Number(row.id),
      codigo: row.codigo,
      nombre: row.nombre,
      descripcion: row.descripcion,
      activo: Boolean(row.activo),
      cantidadPersonalActivo: Number(row.cantidadPersonalActivo),
    }));
  }

  async obtenerPorId(id: number): Promise<Departamento | null> {
    const row = await this.repository
      .createQueryBuilder('departamento')
      .where('departamento.id = :id', { id })
      .getOne();

    if (!row) {
      return null;
    }

    return {
      id: Number(row.id),
      codigo: row.codigo,
      nombre: row.nombre,
      descripcion: row.descripcion,
      activo: row.activo,
      cantidadPersonalActivo: 0,
    };
  }

  async crear(input: GuardarDepartamentoDto): Promise<Departamento> {
    const entity = this.repository.create({
      codigo: input.codigo.trim().toUpperCase(),
      nombre: input.nombre.trim(),
      descripcion: input.descripcion?.trim() || null,
      activo: input.activo ?? true,
    });

    const saved = await this.repository.save(entity).catch((error: unknown) => {
      throw traducirDuplicadoDepartamento(error, input);
    });

    return {
      id: Number(saved.id),
      codigo: saved.codigo,
      nombre: saved.nombre,
      descripcion: saved.descripcion,
      activo: saved.activo,
      cantidadPersonalActivo: 0,
    };
  }

  async actualizar(
    id: number,
    input: GuardarDepartamentoDto,
  ): Promise<Departamento> {
    await this.repository
      .update(id, {
        codigo: input.codigo.trim().toUpperCase(),
        nombre: input.nombre.trim(),
        descripcion: input.descripcion?.trim() || null,
        activo: input.activo ?? true,
      })
      .catch((error: unknown) => {
        throw traducirDuplicadoDepartamento(error, input);
      });

    // UPDATE sobre un id inexistente no falla: afecta 0 filas.
    const updated = await this.obtenerPorId(id);
    if (!updated) {
      throw noEncontrado(
        'departamento',
        id,
        TypeOrmDepartamentoRepository.name,
      );
    }

    return updated;
  }

  async activar(id: number): Promise<void> {
    await this.repository.update(id, { activo: true });
  }

  async desactivar(id: number): Promise<void> {
    await this.repository.update(id, { activo: false });
  }
}

function traducirDuplicadoDepartamento(
  error: unknown,
  input: GuardarDepartamentoDto,
): unknown {
  const restriccion = obtenerRestriccionUnicaViolada(error);

  if (restriccion === 'uq_departamento_codigo') {
    return new ConflictException(
      `Ya existe un departamento con el codigo ${input.codigo.trim().toUpperCase()}. Usa otro codigo.`,
    );
  }

  if (restriccion === 'uq_departamento_nombre') {
    return new ConflictException(
      `Ya existe un departamento llamado "${input.nombre.trim()}". Usa otro nombre.`,
    );
  }

  if (restriccion !== null) {
    return new ConflictException(
      'Ya existe un departamento con esos datos. Revisa el codigo y el nombre.',
    );
  }

  return error;
}
