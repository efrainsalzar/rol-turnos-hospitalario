import { useEffect, useState } from 'react';

import Alert from '@mui/material/Alert';
import Collapse from '@mui/material/Collapse';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';

import { useAppToast } from 'components/system/AppToastProvider';
import FormDialog from 'components/system/FormDialog';
import { useDepartmentServiceCascade } from 'hooks/use-department-service-cascade';
import { isBlank, requiredMessage, useFormValidation } from 'hooks/useFormValidation';
import { personalApi } from 'services/personalApi';
import type { Asignacion, CargaHoraria, Departamento, RolFuncionalBase, Servicio } from 'types/api';
import { compactSelectMenuProps } from 'utils/select-menu-props';

type SecondaryFormState = {
  idDepartamento: string;
  idServicio: string;
  idRolFuncional: string;
  idCargaHoraria: string;
  motivo: string;
};

function buildEmptyForm(): SecondaryFormState {
  return {
    idDepartamento: '',
    idServicio: '',
    idRolFuncional: '',
    idCargaHoraria: '',
    motivo: ''
  };
}

const readOnlyFieldSx = {
  '& .MuiInputBase-root.Mui-readOnly': {
    backgroundColor: '#f3f4f6',
    color: '#4b5563'
  },
  '& .MuiInputBase-input.Mui-readOnly': {
    WebkitTextFillColor: '#4b5563'
  },
  '& .MuiInputLabel-root': {
    color: '#6b7280'
  }
} as const;

export interface AsignacionAddSecondaryDialogProps {
  open: boolean;
  asignacionPrincipal: Asignacion | null;
  departamentosPermitidos: Departamento[];
  serviciosPermitidosTodos: Servicio[];
  rolesFuncionalesMovimiento: RolFuncionalBase[];
  cargasHorarias: CargaHoraria[];
  onClose: () => void;
  onSaved: () => void;
}

export default function AsignacionAddSecondaryDialog({
  open,
  asignacionPrincipal,
  departamentosPermitidos,
  serviciosPermitidosTodos,
  rolesFuncionalesMovimiento,
  cargasHorarias,
  onClose,
  onSaved
}: AsignacionAddSecondaryDialogProps) {
  const { showSuccess, showError } = useAppToast();
  const [form, setForm] = useState<SecondaryFormState>(buildEmptyForm());
  const [asignarAServicio, setAsignarAServicio] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const validation = useFormValidation<SecondaryFormState>({
    idDepartamento: (values) => (isBlank(values.idDepartamento) ? requiredMessage('El departamento') : undefined),
    idServicio: (values) => (asignarAServicio && isBlank(values.idServicio) ? requiredMessage('El servicio') : undefined),
    idCargaHoraria: (values) => (isBlank(values.idCargaHoraria) ? requiredMessage('La carga horaria') : undefined)
  });

  // Una asignacion secundaria nunca puede tener un rol de jefatura (docs/database/
  // decisiones-tecnicas.md seccion 52) — hoy el unico rol operativo que existe en el
  // catalogo es ASISTENCIAL, asi que no tiene sentido ofrecer un selector: se fija
  // directamente, sin depender de que el usuario elija la unica opcion valida.
  const rolAsistencial = rolesFuncionalesMovimiento.find((item) => item.codigo === 'ASISTENCIAL') ?? rolesFuncionalesMovimiento[0] ?? null;

  const serviciosDelDepartamento = serviciosPermitidosTodos.filter(
    (item) => !form.idDepartamento || item.idDepartamento === Number(form.idDepartamento)
  );

  const { servicePlaceholderLabel, hasDepartments, hasServices } = useDepartmentServiceCascade({
    departments: departamentosPermitidos,
    services: serviciosDelDepartamento,
    selectedDepartmentId: form.idDepartamento,
    selectedServiceId: form.idServicio,
    setSelectedDepartmentId: (value) => setForm((current) => ({ ...current, idDepartamento: value, idServicio: '' })),
    setSelectedServiceId: (value) => setForm((current) => ({ ...current, idServicio: value })),
    autoSelectDepartment: false,
    autoSelectService: false
  });

  useEffect(() => {
    if (!open) {
      validation.reset();
      return;
    }

    setAsignarAServicio(true);
    setForm({
      ...buildEmptyForm(),
      idDepartamento: asignacionPrincipal?.idDepartamento ? String(asignacionPrincipal.idDepartamento) : '',
      // Nunca se hereda el rol de la principal (docs/database/decisiones-tecnicas.md seccion 52):
      // si la principal es jefatura, heredar ese id mandaria una secundaria de jefatura sin que
      // el usuario lo eligiera. Siempre se fija al rol operativo (ASISTENCIAL).
      idRolFuncional: rolAsistencial ? String(rolAsistencial.id) : '',
      idCargaHoraria: asignacionPrincipal?.idCargaHoraria ? String(asignacionPrincipal.idCargaHoraria) : ''
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Mismo patron que AsignacionEditDialog (asignarAServicioEdit): si el departamento
  // elegido no tiene servicios, el switch no puede quedar en "asignar a servicio".
  useEffect(() => {
    if (!hasServices) {
      setAsignarAServicio(false);
      setForm((current) => (current.idServicio ? { ...current, idServicio: '' } : current));
    }
  }, [hasServices]);

  async function submit() {
    if (!asignacionPrincipal) return;
    if (!validation.validate(form)) return;

    if (!asignacionPrincipal.idTipoContrato) {
      showError('La asignacion principal no tiene tipo de contrato. Completa ese dato antes de agregar una secundaria.');
      return;
    }

    setSubmitting(true);

    try {
      await personalApi.createAsignacion({
        idPersonal: asignacionPrincipal.idPersonal,
        idDepartamento: form.idDepartamento ? Number(form.idDepartamento) : undefined,
        idServicio: form.idServicio ? Number(form.idServicio) : undefined,
        idTipoContrato: Number(asignacionPrincipal.idTipoContrato),
        idCargaHoraria: Number(form.idCargaHoraria),
        idRolFuncional: Number(form.idRolFuncional),
        nroItem: asignacionPrincipal.nroItem || undefined,
        tipoAsignacion: 'SECUNDARIA',
        motivo: form.motivo || undefined
      });
      showSuccess(
        `Asignacion secundaria de "${asignacionPrincipal.nombreCompleto}" agregada correctamente. Ahora aparece en la planificacion de ese servicio.`
      );
      onSaved();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'No se pudo completar la operacion.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormDialog
      maxWidth="md"
      onClose={onClose}
      onSubmit={() => void submit()}
      open={open}
      submitting={submitting}
      title="Agregar asignacion secundaria"
    >
      <Grid container columnSpacing={2} rowSpacing={2}>
        <Grid size={12}>
          <Alert severity="info">
            Esta asignacion sera <strong>SECUNDARIA</strong>. La principal de <strong>{asignacionPrincipal?.nombreCompleto}</strong> no
            cambia.
          </Alert>
        </Grid>
        <Grid size={12}>
          <TextField
            fullWidth
            InputProps={{ readOnly: true }}
            label="Personal"
            size="small"
            sx={readOnlyFieldSx}
            value={asignacionPrincipal?.nombreCompleto || ''}
          />
        </Grid>
        <Grid size={12}>
          <TextField
            fullWidth
            required
            {...validation.fieldProps('idDepartamento')}
            label="Departamento"
            onChange={(event) => setForm((current) => ({ ...current, idDepartamento: event.target.value, idServicio: '' }))}
            select
            SelectProps={compactSelectMenuProps}
            size="small"
            value={form.idDepartamento}
          >
            <MenuItem value="">Selecciona un departamento</MenuItem>
            {departamentosPermitidos.map((item) => (
              <MenuItem key={item.id} value={String(item.id)}>
                {item.nombre}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid size={12}>
          <FormControlLabel
            sx={{ width: '100%', m: 0 }}
            control={
              <Switch
                checked={asignarAServicio}
                disabled={!hasServices}
                onChange={(event) => {
                  setAsignarAServicio(event.target.checked);
                  if (!event.target.checked) {
                    setForm((current) => ({ ...current, idServicio: '' }));
                  }
                }}
                size="small"
              />
            }
            label={
              !hasServices
                ? 'Sin servicios en este departamento'
                : asignarAServicio
                  ? 'Asignar tambien a un servicio'
                  : 'Asignar solo al departamento'
            }
          />
        </Grid>
        <Grid size={12}>
          <Collapse in={asignarAServicio && hasServices} sx={{ width: '100%' }} timeout="auto" unmountOnExit>
            <TextField
              fullWidth
              required={asignarAServicio}
              disabled={!hasDepartments || !hasServices}
              {...validation.fieldProps('idServicio', 'Seleccione un servicio.')}
              label="Servicio destino"
              onChange={(event) => setForm((current) => ({ ...current, idServicio: event.target.value }))}
              select
              SelectProps={compactSelectMenuProps}
              size="small"
              value={form.idServicio}
            >
              <MenuItem value="">{servicePlaceholderLabel}</MenuItem>
              {serviciosDelDepartamento.map((item) => (
                <MenuItem key={item.id} value={String(item.id)}>
                  {item.nombre}
                </MenuItem>
              ))}
            </TextField>
          </Collapse>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            InputProps={{ readOnly: true }}
            label="Rol funcional"
            helperText="La secundaria queda operativa."
            size="small"
            sx={readOnlyFieldSx}
            value={rolAsistencial?.nombre || 'Asistencial'}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            InputProps={{ readOnly: true }}
            label="Contrato / item"
            helperText="Se hereda de la principal."
            size="small"
            sx={readOnlyFieldSx}
            value={[
              asignacionPrincipal?.nombreTipoContrato || '-',
              asignacionPrincipal?.codigoTipoContrato || asignacionPrincipal?.nombreTipoContrato || '-',
              asignacionPrincipal?.nroItem || 'Sin nro item'
            ].join(' · ')}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            required
            {...validation.fieldProps('idCargaHoraria')}
            label="Carga horaria"
            onChange={(event) => setForm((current) => ({ ...current, idCargaHoraria: event.target.value }))}
            select
            SelectProps={compactSelectMenuProps}
            size="small"
            value={form.idCargaHoraria}
          >
            {cargasHorarias.map((item) => (
              <MenuItem key={item.id} value={String(item.id)}>
                {item.codigo} - {item.nombre}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid size={12}>
          <TextField
            fullWidth
            label="Motivo"
            helperText="Opcional."
            multiline
            minRows={2}
            onChange={(event) => setForm((current) => ({ ...current, motivo: event.target.value }))}
            size="small"
            value={form.motivo}
          />
        </Grid>
      </Grid>
    </FormDialog>
  );
}
