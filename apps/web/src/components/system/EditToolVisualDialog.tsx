import { useEffect, useState } from 'react';

import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { operacionApi } from 'services/operacionApi';
import { useAppToast } from 'components/system/AppToastProvider';
import FormDialog from 'components/system/FormDialog';
import { isBlank, useFormValidation } from 'hooks/useFormValidation';
import { CODIGO_VISUAL_PATTERN, sanitizarCodigoVisual, validarParCodigoEtiqueta } from 'utils/codigo-visual-etiqueta';

interface CodigoVisualEtiquetaForm {
  codigoVisual: string;
  etiqueta: string;
}

export interface EditToolVisualTarget {
  idCodigo: number;
  idTurno: number | null;
  idServicio: number | null;
  idDepartamento: number | null;
  codigoVisual: string;
  etiqueta: string;
  displayName: string;
  origen: 'TURNO' | 'TIPO_DIA';
}

interface EditToolVisualDialogProps {
  target: EditToolVisualTarget | null;
  onClose: () => void;
  onSaved: () => void;
  onEditarHorarioCompleto?: (idTurno: number) => void;
  onDesactivarHorario?: (idTurno: number) => void;
}

export default function EditToolVisualDialog({
  target,
  onClose,
  onSaved,
  onEditarHorarioCompleto,
  onDesactivarHorario
}: EditToolVisualDialogProps) {
  const { showSuccess, showError } = useAppToast();
  const [codigoVisual, setCodigoVisual] = useState('');
  const [etiqueta, setEtiqueta] = useState('');
  const [saving, setSaving] = useState(false);
  const validation = useFormValidation<CodigoVisualEtiquetaForm>({
    codigoVisual: (values) => {
      const parError = validarParCodigoEtiqueta(values.codigoVisual, values.etiqueta);
      if (!parError) return undefined;
      return isBlank(values.codigoVisual) || !CODIGO_VISUAL_PATTERN.test(values.codigoVisual.trim()) ? parError : undefined;
    },
    etiqueta: (values) => {
      const parError = validarParCodigoEtiqueta(values.codigoVisual, values.etiqueta);
      if (!parError) return undefined;
      return isBlank(values.etiqueta) ? parError : undefined;
    }
  });

  useEffect(() => {
    if (target) {
      setCodigoVisual(target.codigoVisual);
      setEtiqueta(target.etiqueta);
      validation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  async function handleSave() {
    if (!target) return;

    if (target.idServicio === null && target.idDepartamento === null) {
      showError('No se puede identificar el servicio o departamento del horario.');
      return;
    }

    if (!validation.validate({ codigoVisual, etiqueta })) {
      return;
    }

    setSaving(true);

    try {
      if (target.idServicio !== null) {
        await operacionApi.patchCodigoVisual(target.idServicio, target.idCodigo, {
          codigoVisual: codigoVisual.trim(),
          etiqueta: etiqueta.trim()
        });
      } else if (target.idDepartamento !== null) {
        await operacionApi.patchCodigoVisualDepartamento(target.idDepartamento, target.idCodigo, {
          codigoVisual: codigoVisual.trim(),
          etiqueta: etiqueta.trim()
        });
      }

      showSuccess(`Visualización de "${etiqueta.trim()}" actualizada correctamente.`);
      onSaved();
      onClose();
    } catch {
      showError('No se pudo guardar la visualizacion.');
    } finally {
      setSaving(false);
    }
  }

  const tipoLabel = target?.origen === 'TURNO' ? 'horario' : 'tipo de dia';

  const extraAction =
    target?.origen === 'TURNO' && target.idTurno !== null && onDesactivarHorario ? (
      <Button color="error" disabled={saving} onClick={() => onDesactivarHorario(target.idTurno as number)} variant="outlined">
        Desactivar horario
      </Button>
    ) : undefined;

  return (
    <FormDialog
      extraAction={extraAction}
      maxWidth="xs"
      onClose={onClose}
      onSubmit={() => void handleSave()}
      open={Boolean(target)}
      submitting={saving}
      title={`Editar visualizacion del ${tipoLabel}`}
    >
      <Stack spacing={1.75}>
        {target ? (
          <Stack
            sx={{
              bgcolor: 'action.hover',
              borderRadius: 1,
              px: 1.5,
              py: 1,
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            <Typography color="text.secondary" variant="caption">
              {target.origen === 'TURNO' ? 'Horario' : 'Tipo de dia'}
            </Typography>
            <Typography variant="body2">{target.displayName}</Typography>
          </Stack>
        ) : null}

        {target?.origen === 'TURNO' && target.idTurno !== null && onEditarHorarioCompleto ? (
          <Button
            disabled={saving}
            onClick={() => onEditarHorarioCompleto(target.idTurno as number)}
            size="small"
            sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
            variant="text"
          >
            Editar horario completo (horas, vigencia, tramos)
          </Button>
        ) : null}

        <TextField
          autoFocus
          fullWidth
          inputProps={{ maxLength: 4 }}
          label="Codigo visible"
          {...validation.fieldProps(
            'codigoVisual',
            '1 a 4 letras mayusculas. Vacio en ambos campos quita el apodo visual (se usa el horario real).'
          )}
          onChange={(e) => setCodigoVisual(sanitizarCodigoVisual(e.target.value))}
          placeholder="Ej: M, DIS"
          size="small"
          value={codigoVisual}
        />
        <TextField
          fullWidth
          inputProps={{ maxLength: 120 }}
          label="Etiqueta"
          {...validation.fieldProps(
            'etiqueta',
            'Nombre descriptivo del horario para este servicio. Obligatorio si defines codigo visible.'
          )}
          onChange={(e) => setEtiqueta(e.target.value)}
          placeholder="Ej: Turno Manana"
          size="small"
          value={etiqueta}
        />
      </Stack>
    </FormDialog>
  );
}
