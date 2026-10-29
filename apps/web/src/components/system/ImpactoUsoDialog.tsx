import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

import type { ImpactoUsoCatalogo } from 'types/api';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export interface ImpactoUsoDialogProps {
  open: boolean;
  impacto: ImpactoUsoCatalogo | null;
  entidadLabel: string;
  /** Concuerda "este/esta" y "el/la" con `entidadLabel`. */
  entidadGenero?: 'm' | 'f';
  accionLabel: string;
  saving?: boolean;
  onClose: () => void;
  onPropagar?: () => void;
  onLimpiar: () => void;
}

export default function ImpactoUsoDialog({
  open,
  impacto,
  entidadLabel,
  entidadGenero = 'm',
  accionLabel,
  saving = false,
  onClose,
  onPropagar,
  onLimpiar
}: ImpactoUsoDialogProps) {
  const demostrativo = entidadGenero === 'f' ? 'esta' : 'este';
  const articulo = entidadGenero === 'f' ? 'la' : 'el';
  const titulo = `${entidadLabel.charAt(0).toUpperCase()}${entidadLabel.slice(1)} en uso`;

  return (
    <Dialog fullWidth maxWidth="sm" onClose={onClose} open={open}>
      <DialogTitle>{titulo}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          <Typography variant="body2">
            {impacto?.totalCeldas ?? 0} celda(s) en {impacto?.totalPlanificaciones ?? 0} planificacion(es) usan {demostrativo}{' '}
            {entidadLabel}. Elige como continuar antes de {accionLabel}.
          </Typography>

          {onPropagar ? (
            <Typography color="text.secondary" variant="body2">
              <strong>Propagar</strong> actualiza las celdas. <strong>Limpiar</strong> las borra.
            </Typography>
          ) : (
            <Typography color="text.secondary" variant="body2">
              Al confirmar, las celdas se eliminaran antes de {accionLabel} {articulo} {entidadLabel}.
            </Typography>
          )}

          {impacto && impacto.planificaciones.length > 0 ? (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Periodo</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell align="right">Celdas</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {impacto.planificaciones.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        {MESES[p.mes - 1] || p.mes} {p.anio}
                      </TableCell>
                      <TableCell>{p.estado}</TableCell>
                      <TableCell align="right">{p.totalCeldas}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button disabled={saving} onClick={onClose} variant="outlined">
          Cancelar
        </Button>
        {onPropagar ? (
          <Button disabled={saving} onClick={onPropagar} startIcon={saving ? <CircularProgress size={14} /> : null} variant="outlined">
            Propagar
          </Button>
        ) : null}
        <Button
          color="error"
          disabled={saving}
          onClick={onLimpiar}
          startIcon={saving ? <CircularProgress size={14} /> : null}
          variant="contained"
        >
          Limpiar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
