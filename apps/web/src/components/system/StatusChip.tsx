import Chip from '@mui/material/Chip';

type StatusTone = 'default' | 'success' | 'warning' | 'error' | 'info';

const STATUS_MAP: Record<string, { label: string; color: StatusTone; variant: 'filled' | 'outlined' }> = {
  BORRADOR: { label: 'Borrador', color: 'warning', variant: 'filled' },
  REVISION: { label: 'Revision', color: 'info', variant: 'filled' },
  APROBADA: { label: 'Aprobada', color: 'success', variant: 'filled' },
  CERRADA: { label: 'Cerrada', color: 'default', variant: 'outlined' },
  ACTIVO: { label: 'Activo', color: 'success', variant: 'filled' },
  INACTIVO: { label: 'Inactivo', color: 'default', variant: 'outlined' },
  'SIN ASIGNACION': { label: 'Sin asignacion', color: 'warning', variant: 'outlined' }
};

interface StatusChipProps {
  active?: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
  status?: string;
}

export default function StatusChip({ active, activeLabel = 'Activo', inactiveLabel = 'Inactivo', status }: StatusChipProps) {
  if (status !== undefined) {
    const normalized = status.trim().toUpperCase();
    const config = STATUS_MAP[normalized] ?? { label: status, color: 'default' as const, variant: 'outlined' as const };
    return <Chip color={config.color} label={config.label} size="small" variant={config.variant} />;
  }

  return (
    <Chip
      color={active ? 'success' : 'default'}
      label={active ? activeLabel : inactiveLabel}
      size="small"
      variant={active ? 'filled' : 'outlined'}
    />
  );
}
