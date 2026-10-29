import { type DependencyList, useEffect, useRef, useState } from 'react';

// Umbral para avisar que la carga esta tardando mas de lo normal, antes de
// llegar al timeout duro que ya aplica apiClient.ts (ver
// docs/frontend/estrategia-resiliencia-red.md). Es solo una bandera de
// presentacion, no afecta loading/error/data.
const SLOW_THRESHOLD_MS = 7000;

interface ApiRequestState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  slow: boolean;
}

export function useApiRequest<T>(request: () => Promise<T>, deps: DependencyList = []) {
  const [state, setState] = useState<ApiRequestState<T>>({
    data: null,
    error: null,
    loading: true,
    slow: false
  });
  const requestRef = useRef(request);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    requestRef.current = request;
  }, [request]);

  useEffect(() => {
    let active = true;

    const slowTimer = setTimeout(() => {
      if (active) {
        setState((previous) => (previous.loading ? { ...previous, slow: true } : previous));
      }
    }, SLOW_THRESHOLD_MS);

    const load = async () => {
      setState((previous) => ({ ...previous, loading: true, error: null, slow: false }));

      try {
        const response = await requestRef.current();
        if (!active) {
          return;
        }

        setState({
          data: response,
          error: null,
          loading: false,
          slow: false
        });
      } catch (error) {
        if (!active) {
          return;
        }

        setState({
          data: null,
          error: error instanceof Error ? error.message : 'No se pudo completar la solicitud.',
          loading: false,
          slow: false
        });
      }
    };

    void load();

    return () => {
      active = false;
      clearTimeout(slowTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, retryTick]);

  return { ...state, refetch: () => setRetryTick((value) => value + 1) };
}
