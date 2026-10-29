import { DataSource, ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { readDatabaseEnv } from '../../config/database-env';

interface PaginationInput {
  page?: number;
  pageSize?: number;
}

/**
 * Ejecuta consultas raw paginadas sin acoplar los repositorios a una version
 * concreta de SQL Server.
 *
 * SQL Server moderno usa el OFFSET/FETCH que genera TypeORM. SQL Server 2008
 * R2 usa ROW_NUMBER() sobre la consulta base, porque OFFSET/FETCH no existe
 * en esa version.
 */
export async function getPaginatedRawMany<T>(
  dataSource: DataSource,
  queryBuilder: SelectQueryBuilder<ObjectLiteral>,
  pagination: PaginationInput,
  orderByProjectedColumns: string,
): Promise<T[]> {
  const { page, pageSize } = pagination;

  if (!page || !pageSize) {
    return queryBuilder.getRawMany<T>();
  }

  const offset = (page - 1) * pageSize;
  const profile = readDatabaseEnv().profile;

  if (profile.capabilities.supportsOffsetFetch) {
    return queryBuilder.offset(offset).limit(pageSize).getRawMany<T>();
  }

  const baseQueryBuilder = queryBuilder.clone();
  baseQueryBuilder.orderBy();

  const [baseSql, baseParameters] = baseQueryBuilder.getQueryAndParameters();
  const safeBaseParameters = baseParameters as unknown[];
  const firstParameterIndex = safeBaseParameters.length;
  const lastParameterIndex = firstParameterIndex + 1;

  const sql = `
    SELECT *
    FROM
    (
      SELECT
        base_query.*,
        ROW_NUMBER() OVER (ORDER BY ${orderByProjectedColumns}) AS __row_number
      FROM (${baseSql}) AS base_query
    ) AS paged_query
    WHERE __row_number > @${firstParameterIndex}
      AND __row_number <= @${lastParameterIndex}
    ORDER BY __row_number
  `;

  return dataSource.query(sql, [
    ...safeBaseParameters,
    offset,
    offset + pageSize,
  ]);
}
