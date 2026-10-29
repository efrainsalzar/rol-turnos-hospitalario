import type { ReactNode } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import type { DialogProps } from '@mui/material/Dialog';

export interface FormDialogProps {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  onSubmit: () => void;
  submitting?: boolean;
  submitDisabled?: boolean;
  submitLabel?: string;
  submitLoadingLabel?: string;
  cancelLabel?: string;
  maxWidth?: DialogProps['maxWidth'];
  /**
   * Accion secundaria del footer (ej. "Desactivar"), alineada a la izquierda,
   * separada de Cancelar/Guardar. Para dialogs que necesitan una tercera
   * accion ademas del par estandar — no usar para casos que ya resuelve
   * Cancelar/Guardar.
   */
  extraAction?: ReactNode;
}

export default function FormDialog({
  open,
  title,
  children,
  onClose,
  onSubmit,
  submitting = false,
  submitDisabled = false,
  submitLabel = 'Guardar',
  submitLoadingLabel = 'Guardando...',
  cancelLabel = 'Cancelar',
  maxWidth = 'sm',
  extraAction
}: FormDialogProps) {
  return (
    <Dialog fullWidth maxWidth={maxWidth} onClose={onClose} open={open}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>{children}</DialogContent>
      <DialogActions>
        {extraAction ? <Box sx={{ mr: 'auto' }}>{extraAction}</Box> : null}
        <Button disabled={submitting} onClick={onClose} variant="outlined">
          {cancelLabel}
        </Button>
        <Button disabled={submitting || submitDisabled} onClick={onSubmit} variant="contained">
          {submitting ? submitLoadingLabel : submitLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
