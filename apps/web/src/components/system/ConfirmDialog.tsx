import type { ReactNode } from 'react';

import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
  confirmLabel?: string;
  confirmLoadingLabel?: string;
  cancelLabel?: string;
  confirmColor?: 'error' | 'primary' | 'warning';
}

export default function ConfirmDialog({
  open,
  title,
  children,
  onClose,
  onConfirm,
  loading = false,
  confirmLabel = 'Confirmar',
  confirmLoadingLabel = 'Confirmando...',
  cancelLabel = 'Cancelar',
  confirmColor = 'error'
}: ConfirmDialogProps) {
  return (
    <Dialog fullWidth maxWidth="sm" onClose={onClose} open={open}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>{children}</DialogContent>
      <DialogActions>
        <Button disabled={loading} onClick={onClose} variant="outlined">
          {cancelLabel}
        </Button>
        <Button color={confirmColor} disabled={loading} onClick={onConfirm} variant="contained">
          {loading ? confirmLoadingLabel : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
