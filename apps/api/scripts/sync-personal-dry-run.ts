import { EjecutarSincronizacionUseCase } from '../src/modules/integracion/application/use-cases/ejecutar-sincronizacion.use-case';
import { CONECTOR_PERSONAL_RRHH } from '../src/modules/integracion/integracion.module';
import { conModuloIntegracion, imprimirResumen } from './lib/integracion-cli';

const SCRIPT = 'sync-personal-dry-run';

void conModuloIntegracion(SCRIPT, async (contexto) => {
  const resumen = await contexto.get(EjecutarSincronizacionUseCase).execute({
    conector: CONECTOR_PERSONAL_RRHH,
    tipo: 'DRY_RUN',
    origen: 'CONSOLA',
    idUsuario: null,
  });

  imprimirResumen(SCRIPT, `Lote ${resumen.ejecucionId}: ${resumen.mensaje}`, {
    lote: resumen.ejecucionId,
    ...resumen.detalle,
  });
  for (const advertencia of resumen.advertencias) {
    console.warn(`[${SCRIPT}] ADVERTENCIA: ${advertencia}`);
  }
  console.log(
    `[${SCRIPT}] Finalizado: staging actualizado; personal local no fue modificado. Use sync:personal:conflicts para el detalle.`,
  );
});
