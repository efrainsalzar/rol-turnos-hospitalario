import { ListarObservadosUltimaValidacionUseCase } from '../src/modules/integracion/application/use-cases/listar-observados-ultima-validacion.use-case';
import { CONECTOR_PERSONAL_RRHH } from '../src/modules/integracion/integracion.module';
import { conModuloIntegracion } from './lib/integracion-cli';

const SCRIPT = 'report-personal-conflicts';

void conModuloIntegracion(SCRIPT, async (contexto) => {
  const resultado = await contexto
    .get(ListarObservadosUltimaValidacionUseCase)
    .execute(CONECTOR_PERSONAL_RRHH);

  if (resultado.ejecucionValidacionId == null) {
    console.log(`[${SCRIPT}] Todavia no hay validaciones para esta fuente.`);
    return;
  }

  console.log(
    `[${SCRIPT}] Lote de validacion ${resultado.ejecucionValidacionId}: ${resultado.registros.length} registros observados.`,
  );
  console.log(JSON.stringify(resultado.registros, null, 2));
});
