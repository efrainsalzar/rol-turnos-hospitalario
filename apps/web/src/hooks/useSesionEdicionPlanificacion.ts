import { useCallback, useEffect, useRef, useState } from 'react';
import { planificacionApi } from 'services/planificacionApi';
import type { SesionEdicionPlanificacion } from 'types/api';

const INTERVALO_LATIDO_MS = 60000;

interface IntentoResultado {
  ok: boolean;
  ocupadaPorEtiquetaRol: string | null;
}

/**
 * Control de edicion exclusiva de la matriz: mientras `activo` es true (modo
 * edicion encendido), mantiene un latido periodico para conservar el
 * control; al pasar a false o desmontar, libera. La expiracion real por
 * inactividad de latido (10 min) la aplica el backend — este hook no
 * depende de detectar el cierre abrupto del navegador para ser correcto.
 */
export function useSesionEdicionPlanificacion(
  idPlanificacion: number,
  activo: boolean,
  onControlPerdido?: (etiquetaRolEditor: string | null) => void
) {
  const [sesion, setSesion] = useState<SesionEdicionPlanificacion | null>(null);
  const [consultando, setConsultando] = useState(true);
  const activoRef = useRef(activo);
  activoRef.current = activo;

  const consultarEstado = useCallback(async () => {
    setConsultando(true);
    try {
      const actual = await planificacionApi.getSesionEdicion(idPlanificacion);
      setSesion(actual);
      return actual;
    } catch {
      return null;
    } finally {
      setConsultando(false);
    }
  }, [idPlanificacion]);

  const intentarAdquirir = useCallback(async (): Promise<IntentoResultado> => {
    try {
      const actual = await planificacionApi.latidoSesionEdicion(idPlanificacion);
      setSesion(actual);
      return { ok: true, ocupadaPorEtiquetaRol: null };
    } catch {
      const actual = await consultarEstado();
      return {
        ok: false,
        ocupadaPorEtiquetaRol: actual?.etiquetaRolEditor ?? null
      };
    }
  }, [idPlanificacion, consultarEstado]);

  const tomarControl = useCallback(async () => {
    const actual = await planificacionApi.tomarControlSesionEdicion(idPlanificacion);
    setSesion(actual);
    return actual;
  }, [idPlanificacion]);

  const liberar = useCallback(async () => {
    try {
      await planificacionApi.liberarSesionEdicion(idPlanificacion);
    } catch {
      // intencional: liberacion best-effort, no debe romper la navegacion.
    }
    setSesion((current) => (current?.esPropia ? null : current));
  }, [idPlanificacion]);

  // Estado inicial al entrar a la pantalla, independiente de si ya se activo el modo edicion.
  useEffect(() => {
    void consultarEstado();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idPlanificacion]);

  // Con edicion activa, el intervalo manda latido (mantiene el control). En
  // solo lectura, el mismo intervalo solo refresca quien tiene el control
  // para que el banner de "ocupado por X" no quede desactualizado.
  useEffect(() => {
    const interval = setInterval(() => {
      if (activoRef.current) {
        void intentarAdquirir().then((resultado) => {
          if (!resultado.ok) {
            onControlPerdido?.(resultado.ocupadaPorEtiquetaRol);
          }
        });
      } else {
        void consultarEstado();
      }
    }, INTERVALO_LATIDO_MS);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intentarAdquirir, consultarEstado]);

  // Libera al pasar a solo lectura o al desmontar (navegacion dentro de la app).
  useEffect(() => {
    if (!activo) {
      return;
    }

    return () => {
      void liberar();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo]);

  return {
    sesion,
    consultando,
    consultarEstado,
    intentarAdquirir,
    tomarControl,
    liberar
  };
}
