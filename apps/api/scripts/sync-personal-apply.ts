import { EjecutarSincronizacionUseCase } from '../src/modules/integracion/application/use-cases/ejecutar-sincronizacion.use-case';
import { CONECTOR_PERSONAL_RRHH } from '../src/modules/integracion/integracion.module';
import { conModuloIntegracion, imprimirResumen } from './lib/integracion-cli';

const SCRIPT = 'sync-personal-apply';

if (!process.argv.includes('--only-approved')) {
  console.error(
    `[${SCRIPT}] Error: la aplicacion requiere confirmacion explicita: use --only-approved.`,
  );
  process.exit(1);
}

if (process.argv.some((argumento) => argumento.startsWith('--batch-size='))) {
  console.warn(
    `[${SCRIPT}] --batch-size ya no se usa: el tamano de lote lo fija el modulo integracion.`,
  );
}

void conModuloIntegracion(SCRIPT, async (contexto) => {
  const resumen = await contexto.get(EjecutarSincronizacionUseCase).execute({
    conector: CONECTOR_PERSONAL_RRHH,
    tipo: 'APPLY',
    origen: 'CONSOLA',
    idUsuario: null,
  });

  imprimirResumen(SCRIPT, 'Reporte final:', {
    loteAplicacion: resumen.ejecucionId,
    estado: resumen.estado,
    ...resumen.detalle,
  });
});
