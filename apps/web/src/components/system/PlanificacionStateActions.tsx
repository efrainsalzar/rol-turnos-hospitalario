import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';

import type { EstadoPlanificacion } from 'types/api';

interface PlanificacionStateActionsProps {
  estado: EstadoPlanificacion | undefined;
  disabled?: boolean;
  puedeEnviarRevision?: boolean;
  puedeVolverBorrador?: boolean;
  puedeAprobar?: boolean;
  puedeCerrar?: boolean;
  onChangeEstado: (estado: EstadoPlanificacion) => void;
  labels?: Partial<Record<'revision' | 'volver' | 'aprobar' | 'cerrar', string>>;
}

// Una planificacion APROBADA ya no puede volver a REVISION, para nadie — no
// hay boton para eso (docs/database/decisiones-tecnicas.md seccion 147).
export default function PlanificacionStateActions({
  estado,
  disabled = false,
  puedeEnviarRevision = false,
  puedeVolverBorrador = false,
  puedeAprobar = false,
  puedeCerrar = false,
  onChangeEstado,
  labels
}: PlanificacionStateActionsProps) {
  return (
    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
      {estado === 'BORRADOR' && puedeEnviarRevision ? (
        <Button disabled={disabled} onClick={() => onChangeEstado('REVISION')} variant="contained">
          {labels?.revision || 'Enviar a revision'}
        </Button>
      ) : null}
      {estado === 'REVISION' && puedeVolverBorrador ? (
        <Button disabled={disabled} onClick={() => onChangeEstado('BORRADOR')} variant="outlined">
          {labels?.volver || 'Volver a borrador'}
        </Button>
      ) : null}
      {estado === 'REVISION' && puedeAprobar ? (
        <Button disabled={disabled} onClick={() => onChangeEstado('APROBADA')} variant="contained">
          {labels?.aprobar || 'Aprobar'}
        </Button>
      ) : null}
      {estado === 'APROBADA' && puedeCerrar ? (
        <Button disabled={disabled} onClick={() => onChangeEstado('CERRADA')} variant="outlined">
          {labels?.cerrar || 'Cerrar'}
        </Button>
      ) : null}
    </Stack>
  );
}
