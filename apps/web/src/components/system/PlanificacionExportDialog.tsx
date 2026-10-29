import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import ReloadOutlined from '@ant-design/icons/ReloadOutlined';

import FormDialog from 'components/system/FormDialog';
import type { EstiloExportacionRolTurnos, FormatoExportacionRolTurnos, ModoExportacionRolTurnos } from 'types/api';

type SelectableItem = {
  id: number;
  label: string;
};

interface PlanificacionExportDialogProps {
  open: boolean;
  onClose: () => void;
  exportMode: ModoExportacionRolTurnos;
  onExportModeChange: (value: ModoExportacionRolTurnos) => void;
  exportStyle: EstiloExportacionRolTurnos;
  onExportStyleChange: (value: EstiloExportacionRolTurnos) => void;
  exportFormat: FormatoExportacionRolTurnos;
  onExportFormatChange: (value: FormatoExportacionRolTurnos) => void;
  previewLoading: boolean;
  previewError: string | null;
  previewHtml: string;
  canPreview: boolean;
  onReloadPreview: () => void;
  onExport: () => void;
  exportLoading: 'excel' | 'pdf' | null;
  selectableItems?: SelectableItem[];
  selectedIds?: number[];
  onToggleItem?: (id: number, checked: boolean) => void;
  onToggleAll?: (checked: boolean) => void;
}

export default function PlanificacionExportDialog({
  open,
  onClose,
  exportMode,
  onExportModeChange,
  exportStyle,
  onExportStyleChange,
  exportFormat,
  onExportFormatChange,
  previewLoading,
  previewError,
  previewHtml,
  canPreview,
  onReloadPreview,
  onExport,
  exportLoading,
  selectableItems,
  selectedIds,
  onToggleItem,
  onToggleAll
}: PlanificacionExportDialogProps) {
  const items = selectableItems || [];
  const selected = selectedIds || [];
  const allSelected = items.length > 0 && selected.length === items.length;
  const partiallySelected = selected.length > 0 && selected.length < items.length;
  const exportDisabled = (items.length > 0 && !selected.length) || exportLoading !== null;
  const exportLabel = exportLoading === 'excel' ? 'Generando Excel...' : 'Procesando...';

  return (
    <FormDialog
      cancelLabel="Cerrar"
      maxWidth="xl"
      onClose={onClose}
      onSubmit={onExport}
      open={open}
      submitDisabled={exportDisabled}
      submitLabel="Descargar Excel"
      submitLoadingLabel={exportLabel}
      submitting={exportLoading !== null}
      title="Vista previa y descarga"
    >
      <Stack spacing={1.5}>
        <Alert severity="info">Revisa una planificacion o descarga varias en lote. Con una sola seleccion aparece la vista previa.</Alert>

        {items.length ? (
          <>
            <FormControlLabel
              control={
                <Checkbox
                  checked={allSelected}
                  indeterminate={partiallySelected}
                  onChange={(event) => onToggleAll?.(event.target.checked)}
                />
              }
              label="Seleccionar todas"
            />
            <Stack spacing={0.5}>
              {items.map((item) => (
                <FormControlLabel
                  key={item.id}
                  control={
                    <Checkbox checked={selected.includes(item.id)} onChange={(event) => onToggleItem?.(item.id, event.target.checked)} />
                  }
                  label={item.label}
                />
              ))}
            </Stack>
            <Typography color="text.secondary" variant="body2">
              Seleccionadas: {selected.length} de {items.length}
            </Typography>
          </>
        ) : null}

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
          <TextField
            fullWidth
            label="Modo"
            onChange={(event) => onExportModeChange(event.target.value as ModoExportacionRolTurnos)}
            select
            size="small"
            value={exportMode}
          >
            <MenuItem value="numerico">Numerico</MenuItem>
            <MenuItem value="etiquetas">Codigos</MenuItem>
          </TextField>
          <TextField
            fullWidth
            label="Estilo"
            onChange={(event) => onExportStyleChange(event.target.value as EstiloExportacionRolTurnos)}
            select
            size="small"
            value={exportStyle}
          >
            <MenuItem value="color">Color</MenuItem>
            <MenuItem value="texto">Blanco/Negro</MenuItem>
          </TextField>
          <TextField
            fullWidth
            label="Formato"
            onChange={(event) => onExportFormatChange(event.target.value as FormatoExportacionRolTurnos)}
            select
            size="small"
            value={exportFormat}
          >
            <MenuItem value="una-fila">Una fila</MenuItem>
            <MenuItem value="multi-horario">Varias filas</MenuItem>
          </TextField>
        </Stack>

        <Button disabled={previewLoading} onClick={onReloadPreview} startIcon={<ReloadOutlined />} variant="outlined">
          Recargar vista previa
        </Button>

        {previewLoading ? <LinearProgress /> : null}

        <Box sx={{ minHeight: '72vh' }}>
          {canPreview ? (
            previewError ? (
              <Alert severity="error">{previewError}</Alert>
            ) : previewHtml ? (
              <Box
                component="iframe"
                sandbox=""
                srcDoc={previewHtml}
                sx={{
                  width: '100%',
                  height: '72vh',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  backgroundColor: '#fff'
                }}
                title="Vista previa del reporte institucional"
              />
            ) : (
              <Alert severity="info">No hay vista previa cargada.</Alert>
            )
          ) : (
            <Alert severity="info">La vista previa aparece con una sola planificacion.</Alert>
          )}
        </Box>
      </Stack>
    </FormDialog>
  );
}
