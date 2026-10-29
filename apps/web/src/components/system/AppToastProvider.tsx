import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';

import { CheckCircleOutlined, CloseCircleOutlined, CloseOutlined, ExclamationCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';

type ToastSeverity = 'success' | 'error' | 'info' | 'warning';

type ToastItem = {
  id: number;
  message: string;
  severity: ToastSeverity;
  closing: boolean;
  dedupeKey?: string;
  count: number;
  refreshedAt: number;
};

type AppToastContextValue = {
  showToast: (message: string, severity?: ToastSeverity, dedupeKey?: string) => void;
  showSuccess: (message: string, dedupeKey?: string) => void;
  showError: (message: string, dedupeKey?: string) => void;
  showInfo: (message: string, dedupeKey?: string) => void;
  showWarning: (message: string, dedupeKey?: string) => void;
};

const AppToastContext = createContext<AppToastContextValue | null>(null);

// Un toast visible por mas de esta cantidad satura la esquina de la pantalla; el resto espera su turno en cola.
const MAX_VISIBLE_TOASTS = 4;
const AUTO_HIDE_MS = 5500;

const SEVERITY_ICON: Record<ToastSeverity, typeof CheckCircleOutlined> = {
  success: CheckCircleOutlined,
  error: CloseCircleOutlined,
  warning: ExclamationCircleOutlined,
  info: InfoCircleOutlined
};

export function AppToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const requestClose = useCallback((id: number) => {
    setToasts((current) => current.map((toast) => (toast.id === id ? { ...toast, closing: true } : toast)));
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  // dedupeKey agrupa ocurrencias repetidas del mismo tipo de error (ej. guardado de
  // celda de matriz sin conexion) en un unico toast con contador, en vez de apilar una
  // notificacion por intento — sin esto, pintar muchas celdas sin conexion satura la
  // pantalla con decenas de toasts identicos en la practica (docs/database/decisiones-
  // tecnicas.md).
  const showToast = useCallback((message: string, severity: ToastSeverity = 'info', dedupeKey?: string) => {
    setToasts((current) => {
      if (dedupeKey) {
        const existingIndex = current.findIndex((toast) => toast.dedupeKey === dedupeKey && !toast.closing);
        if (existingIndex !== -1) {
          const next = [...current];
          const existing = next[existingIndex];
          next[existingIndex] = { ...existing, message, severity, count: existing.count + 1, refreshedAt: Date.now() };
          return next;
        }
      }

      return [
        ...current,
        {
          id: Date.now() + Math.floor(Math.random() * 1000),
          message,
          severity,
          closing: false,
          dedupeKey,
          count: 1,
          refreshedAt: Date.now()
        }
      ];
    });
  }, []);

  const value = useMemo<AppToastContextValue>(
    () => ({
      showToast,
      showSuccess: (message: string, dedupeKey?: string) => showToast(message, 'success', dedupeKey),
      showError: (message: string, dedupeKey?: string) => showToast(message, 'error', dedupeKey),
      showInfo: (message: string, dedupeKey?: string) => showToast(message, 'info', dedupeKey),
      showWarning: (message: string, dedupeKey?: string) => showToast(message, 'warning', dedupeKey)
    }),
    [showToast]
  );

  const visibleToasts = toasts.slice(0, MAX_VISIBLE_TOASTS);
  const queuedCount = toasts.length - visibleToasts.length;

  return (
    <AppToastContext.Provider value={value}>
      {children}
      <Box
        sx={{
          position: 'fixed',
          top: { xs: 12, sm: 20 },
          right: { xs: 12, sm: 20 },
          zIndex: (theme) => theme.zIndex.snackbar,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.25,
          width: { xs: 'calc(100vw - 24px)', sm: 380 },
          maxWidth: '100%',
          pointerEvents: 'none'
        }}
      >
        {visibleToasts.map((toast) => (
          <Collapse key={toast.id} in={!toast.closing} timeout={220} onExited={() => removeToast(toast.id)}>
            <ToastCard toast={toast} onRequestClose={() => requestClose(toast.id)} />
          </Collapse>
        ))}
        {queuedCount > 0 && (
          <Typography
            variant="caption"
            sx={{
              alignSelf: 'flex-end',
              color: 'text.secondary',
              bgcolor: 'background.paper',
              borderRadius: 1,
              px: 1,
              py: 0.25,
              boxShadow: 1
            }}
          >
            +{queuedCount} notificacion{queuedCount === 1 ? '' : 'es'} en espera
          </Typography>
        )}
      </Box>
    </AppToastContext.Provider>
  );
}

function ToastCard({ toast, onRequestClose }: { toast: ToastItem; onRequestClose: () => void }) {
  const theme = useTheme();
  const [entered, setEntered] = useState(false);
  const [paused, setPaused] = useState(false);
  const remainingRef = useRef(AUTO_HIDE_MS);
  const startedAtRef = useRef(Date.now());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Cada vez que un toast agrupado (dedupeKey) recibe una ocurrencia nueva, refreshedAt
  // cambia y el tiempo restante vuelve al maximo — el toast no se cierra hasta 5.5s
  // despues del ultimo error, no del primero.
  useEffect(() => {
    remainingRef.current = AUTO_HIDE_MS;
  }, [toast.refreshedAt]);

  useEffect(() => {
    if (paused || toast.closing) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (!paused) return;
      remainingRef.current -= Date.now() - startedAtRef.current;
      return;
    }

    startedAtRef.current = Date.now();
    timerRef.current = setTimeout(onRequestClose, Math.max(remainingRef.current, 0));

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, toast.closing, toast.refreshedAt]);

  const palette = theme.palette[toast.severity];
  const Icon = SEVERITY_ICON[toast.severity];

  return (
    <Box
      role="alert"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      sx={{
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.5,
        p: 1.75,
        borderRadius: 2,
        border: '1px solid',
        borderColor: palette.main,
        bgcolor: theme.palette.background.paper,
        boxShadow: theme.shadows[8],
        position: 'relative',
        transform: entered && !toast.closing ? 'translateX(0)' : 'translateX(16px)',
        opacity: entered && !toast.closing ? 1 : 0,
        transition: 'transform 200ms ease, opacity 200ms ease'
      }}
    >
      <Avatar sx={{ color: palette.main, bgcolor: palette.lighter, width: 34, height: 34 }}>
        <Icon style={{ fontSize: 17 }} />
      </Avatar>

      <Typography
        variant="body2"
        sx={{
          flexGrow: 1,
          color: 'text.primary',
          userSelect: 'text',
          cursor: 'text',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          pt: 0.25
        }}
      >
        {toast.message}
        {toast.count > 1 ? (
          <Typography component="span" sx={{ color: palette.dark, fontWeight: 700, ml: 0.5 }} variant="body2">
            (×{toast.count})
          </Typography>
        ) : null}
      </Typography>

      <IconButton size="small" onClick={onRequestClose} sx={{ flexShrink: 0, color: 'text.secondary', mt: -0.5, mr: -0.75 }}>
        <CloseOutlined style={{ fontSize: 15 }} />
      </IconButton>
    </Box>
  );
}

export function useAppToast() {
  const context = useContext(AppToastContext);

  if (!context) {
    throw new Error('useAppToast debe usarse dentro de AppToastProvider.');
  }

  return context;
}
