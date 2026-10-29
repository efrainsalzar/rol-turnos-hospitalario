import { useEffect, useMemo, useState } from 'react';

import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';

import { useAppToast } from 'components/system/AppToastProvider';
import FormDialog from 'components/system/FormDialog';
import { isBlank, requiredMessage, useFormValidation } from 'hooks/useFormValidation';
import { personalApi } from 'services/personalApi';
import type { NivelCargoBase, Personal } from 'types/api';

type PersonalFormState = {
  codigoPersonal: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  documentoIdentidad: string;
  idNivelCargo: string;
};

const cargoFilterOptions = createFilterOptions<NivelCargoBase>({
  stringify: (cargo) => `${cargo.codigo} ${cargo.nombre}`
});

function buildEmptyForm(): PersonalFormState {
  return {
    codigoPersonal: '',
    nombres: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    documentoIdentidad: '',
    idNivelCargo: ''
  };
}

export interface PersonalFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  personal: Personal | null;
  cargos: NivelCargoBase[];
  onClose: () => void;
  onSaved: () => void;
}

export default function PersonalFormDialog({ open, mode, personal, cargos, onClose, onSaved }: PersonalFormDialogProps) {
  const { showSuccess, showError } = useAppToast();
  const [form, setForm] = useState<PersonalFormState>(buildEmptyForm());
  const [submitting, setSubmitting] = useState(false);

  const validation = useFormValidation<PersonalFormState>({
    nombres: (values) => (isBlank(values.nombres) ? requiredMessage('El nombre') : undefined),
    apellidoPaterno: (values) => (isBlank(values.apellidoPaterno) ? requiredMessage('El apellido paterno') : undefined),
    documentoIdentidad: (values) => (isBlank(values.documentoIdentidad) ? requiredMessage('El documento de identidad') : undefined),
    idNivelCargo: (values) => (isBlank(values.idNivelCargo) ? requiredMessage('El cargo base') : undefined)
  });

  const selectedCargo = useMemo(() => cargos.find((item) => String(item.id) === form.idNivelCargo) || null, [cargos, form.idNivelCargo]);

  useEffect(() => {
    if (!open) {
      validation.reset();
      return;
    }

    if (mode === 'edit' && personal) {
      setForm({
        codigoPersonal: personal.codigoPersonal || '',
        nombres: personal.nombres,
        apellidoPaterno: personal.apellidoPaterno,
        apellidoMaterno: personal.apellidoMaterno || '',
        documentoIdentidad: personal.documentoIdentidad,
        idNivelCargo: String(personal.idNivelCargo)
      });
    } else {
      setForm(buildEmptyForm());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function submit() {
    if (!validation.validate(form)) {
      return;
    }

    setSubmitting(true);

    const nombreCompleto = [form.nombres, form.apellidoPaterno, form.apellidoMaterno]
      .map((value) => (value || '').trim())
      .filter(Boolean)
      .join(' ');

    try {
      if (mode === 'create') {
        await personalApi.createPersonal(buildPersonalPayload(form));
        showSuccess(`Personal "${nombreCompleto}" creado correctamente. Usa "Asignacion" desde la tabla para darle un destino.`);
      } else if (personal) {
        await personalApi.updatePersonal(personal.id, buildPersonalPayload(form));
        showSuccess(`Personal "${nombreCompleto}" actualizado correctamente.`);
      }

      onSaved();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'No se pudo guardar el personal.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormDialog
      onClose={onClose}
      onSubmit={() => void submit()}
      open={open}
      submitting={submitting}
      title={mode === 'create' ? 'Nuevo personal' : 'Editar personal'}
    >
      <Grid container columnSpacing={2} rowSpacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            helperText="Opcional. Codigo institucional interno, si ya existe uno asignado."
            label="Codigo personal"
            onChange={(event) => setForm((current) => ({ ...current, codigoPersonal: event.target.value }))}
            size="small"
            value={form.codigoPersonal}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            required
            {...validation.fieldProps('documentoIdentidad', 'Cedula de identidad, sin puntos ni espacios.')}
            label="C.I."
            onChange={(event) => setForm((current) => ({ ...current, documentoIdentidad: event.target.value }))}
            size="small"
            value={form.documentoIdentidad}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            required
            {...validation.fieldProps('nombres')}
            label="Nombres"
            onChange={(event) => setForm((current) => ({ ...current, nombres: event.target.value }))}
            size="small"
            value={form.nombres}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            required
            {...validation.fieldProps('apellidoPaterno')}
            label="Apellido paterno"
            onChange={(event) => setForm((current) => ({ ...current, apellidoPaterno: event.target.value }))}
            size="small"
            value={form.apellidoPaterno}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            label="Apellido materno"
            onChange={(event) => setForm((current) => ({ ...current, apellidoMaterno: event.target.value }))}
            size="small"
            value={form.apellidoMaterno}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Autocomplete
            filterOptions={cargoFilterOptions}
            getOptionLabel={(cargo) => cargo.nombre}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            onChange={(_, value) => setForm((current) => ({ ...current, idNivelCargo: value ? String(value.id) : '' }))}
            options={cargos}
            renderInput={(params) => (
              <TextField
                {...params}
                fullWidth
                required
                {...validation.fieldProps(
                  'idNivelCargo',
                  'Selecciona solo el cargo base de la persona. La jefatura se define despues en la asignacion.'
                )}
                label="Cargo base / nivel"
              />
            )}
            size="small"
            slotProps={{ listbox: { sx: { maxHeight: 320 } } }}
            value={selectedCargo}
          />
        </Grid>
      </Grid>
    </FormDialog>
  );
}

function buildPersonalPayload(form: PersonalFormState) {
  return {
    codigoPersonal: form.codigoPersonal || undefined,
    nombres: form.nombres,
    apellidoPaterno: form.apellidoPaterno,
    apellidoMaterno: form.apellidoMaterno || undefined,
    documentoIdentidad: form.documentoIdentidad,
    idNivelCargo: Number(form.idNivelCargo)
  };
}
