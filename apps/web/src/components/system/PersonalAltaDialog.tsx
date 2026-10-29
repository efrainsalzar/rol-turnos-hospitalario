import { useEffect, useMemo, useState } from 'react';

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
import { useApiRequest } from 'hooks/useApiRequest';
import { organizacionApi } from 'services/organizacionApi';
import { personalApi } from 'services/personalApi';
import type { CargaHoraria, Departamento, JefaturaActiva, Personal, RolFuncionalBase, TipoContrato } from 'types/api';

const CODIGOS_ROLES_DEPARTAMENTO = ['ASISTENCIAL', 'JEFE_DEPARTAMENTO'];
const CODIGOS_ROLES_SERVICIO = ['ASISTENCIAL', 'JEFE_SERVICIO'];

type AltaFormState = {
  idDepartamentoAsignacion: string;
  idServicioAsignacion: string;
  idTipoContratoAsignacion: string;
  idCargaHorariaAsignacion: string;
  idRolFuncionalAsignacion: string;
  nroItemAsignacion: string;
  motivoAsignacion: string;
};

function buildEmptyForm(departamentoUnicoId?: number): AltaFormState {
  return {
    idDepartamentoAsignacion: departamentoUnicoId ? String(departamentoUnicoId) : '',
    idServicioAsignacion: '',
    idTipoContratoAsignacion: '',
    idCargaHorariaAsignacion: '',
    idRolFuncionalAsignacion: '',
    nroItemAsignacion: '',
    motivoAsignacion: ''
  };
}

export interface PersonalAltaDialogProps {
  open: boolean;
  personal: Personal | null;
  departamentosPermitidos: Departamento[];
  tiposContrato: TipoContrato[];
  cargasHorarias: CargaHoraria[];
  rolesFuncionales: RolFuncionalBase[];
  onClose: () => void;
  onSaved: () => void;
}

export default function PersonalAltaDialog({
  open,
  personal,
  departamentosPermitidos,
  tiposContrato,
  cargasHorarias,
  rolesFuncionales,
  onClose,
  onSaved
}: PersonalAltaDialogProps) {
  const { showSuccess, showError } = useAppToast();
  const departamentoUnico = departamentosPermitidos.length === 1 ? departamentosPermitidos[0] : null;
  const [form, setForm] = useState<AltaFormState>(buildEmptyForm(departamentoUnico?.id));
  const [asignarAServicio, setAsignarAServicio] = useState(false);
  const [jefaturaActiva, setJefaturaActiva] = useState<JefaturaActiva | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const validation = useFormValidation<AltaFormState>({
    idDepartamentoAsignacion: (values) =>
      isBlank(values.idDepartamentoAsignacion) ? requiredMessage('El departamento operativo') : undefined,
    idServicioAsignacion: (values) =>
      asignarAServicio && isBlank(values.idServicioAsignacion) ? requiredMessage('El servicio') : undefined,
    idTipoContratoAsignacion: (values) => (isBlank(values.idTipoContratoAsignacion) ? requiredMessage('La fuente / item') : undefined),
    idRolFuncionalAsignacion: (values) => (isBlank(values.idRolFuncionalAsignacion) ? requiredMessage('El rol funcional') : undefined),
    idCargaHorariaAsignacion: (values) => (isBlank(values.idCargaHorariaAsignacion) ? requiredMessage('La carga horaria') : undefined)
  });

  const serviciosAsignacion = useApiRequest(
    () => organizacionApi.getServicios(form.idDepartamentoAsignacion ? Number(form.idDepartamentoAsignacion) : undefined),
    [form.idDepartamentoAsignacion]
  );

  const {
    departmentHelperText: assignmentDepartmentHelperText,
    servicePlaceholderLabel: assignmentServicePlaceholderLabel,
    hasDepartments: assignmentHasDepartments,
    hasServices: assignmentHasServices
  } = useDepartmentServiceCascade({
    departments: departamentosPermitidos,
    services: serviciosAsignacion.data?.data || [],
    selectedDepartmentId: form.idDepartamentoAsignacion,
    selectedServiceId: form.idServicioAsignacion,
    setSelectedDepartmentId: (value) => {
      setAsignarAServicio(false);
      setForm((current) => ({ ...current, idDepartamentoAsignacion: value, idServicioAsignacion: '', idRolFuncionalAsignacion: '' }));
    },
    setSelectedServiceId: (value) => setForm((current) => ({ ...current, idServicioAsignacion: value })),
    autoSelectService: false
  });

  const todosLosRoles = rolesFuncionales;
  const rolSeleccionado = useMemo(
    () => todosLosRoles.find((item) => String(item.id) === form.idRolFuncionalAsignacion) || null,
    [form.idRolFuncionalAsignacion, todosLosRoles]
  );
  const rolesFiltrados = useMemo(() => {
    const codigos = asignarAServicio ? CODIGOS_ROLES_SERVICIO : CODIGOS_ROLES_DEPARTAMENTO;
    return todosLosRoles.filter((r) => codigos.includes(r.codigo));
  }, [todosLosRoles, asignarAServicio]);

  const handleToggleAsignarAServicio = (checked: boolean) => {
    setAsignarAServicio(checked);
    if (!checked) {
      setForm((current) => ({ ...current, idServicioAsignacion: '' }));
    }
    const codigosValidos = checked ? CODIGOS_ROLES_SERVICIO : CODIGOS_ROLES_DEPARTAMENTO;
    if (rolSeleccionado && !codigosValidos.includes(rolSeleccionado.codigo)) {
      setForm((current) => ({ ...current, idRolFuncionalAsignacion: '' }));
    }
  };

  // Si el departamento no tiene servicios, forzar switch a OFF para evitar bloqueos en el submit.
  useEffect(() => {
    if (!assignmentHasServices) {
      setAsignarAServicio(false);
      setForm((current) => (current.idServicioAsignacion ? { ...current, idServicioAsignacion: '' } : current));
    }
  }, [assignmentHasServices]);

  // Verificar jefatura activa en la unidad seleccionada cuando se elige un rolSeguridad de jefatura.
  useEffect(() => {
    if (!open || !rolSeleccionado?.esJefatura) {
      setJefaturaActiva(null);
      return;
    }
    const idServicio = asignarAServicio && form.idServicioAsignacion ? Number(form.idServicioAsignacion) : undefined;
    const idDepartamento = !asignarAServicio && form.idDepartamentoAsignacion ? Number(form.idDepartamentoAsignacion) : undefined;
    if (!idServicio && !idDepartamento) {
      setJefaturaActiva(null);
      return;
    }
    personalApi
      .getJefaturaActiva({ idServicio, idDepartamento })
      .then((res) => setJefaturaActiva(res))
      .catch(() => setJefaturaActiva(null));
  }, [open, rolSeleccionado?.esJefatura, asignarAServicio, form.idServicioAsignacion, form.idDepartamentoAsignacion]);

  useEffect(() => {
    if (!open) {
      validation.reset();
      return;
    }

    setForm(buildEmptyForm(departamentoUnico?.id));
    setAsignarAServicio(false);

    if (!personal) {
      return;
    }

    // Pre-cargar datos de la asignacion mas reciente (activa o cerrada).
    personalApi
      .getAsignaciones({ idPersonal: personal.id })
      .then((res) => {
        const historial = res.data || [];
        if (historial.length === 0) return;
        const masReciente = [...historial].sort((a, b) => new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime())[0];
        const teniaPrevioServicio = !!masReciente.idServicio;
        setAsignarAServicio(teniaPrevioServicio);
        setForm((current) => ({
          ...current,
          idTipoContratoAsignacion: masReciente.idTipoContrato ? String(masReciente.idTipoContrato) : current.idTipoContratoAsignacion,
          idCargaHorariaAsignacion: masReciente.idCargaHoraria ? String(masReciente.idCargaHoraria) : current.idCargaHorariaAsignacion,
          idRolFuncionalAsignacion: masReciente.idRolFuncional ? String(masReciente.idRolFuncional) : current.idRolFuncionalAsignacion,
          nroItemAsignacion: masReciente.nroItem || current.nroItemAsignacion,
          idDepartamentoAsignacion: masReciente.idDepartamento ? String(masReciente.idDepartamento) : current.idDepartamentoAsignacion,
          idServicioAsignacion: teniaPrevioServicio ? String(masReciente.idServicio) : ''
        }));
      })
      .catch(() => {
        // Si falla la pre-carga, el form queda con valores vacios — no es bloqueante.
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function submit() {
    if (!personal) return;
    if (!validation.validate(form)) return;

    setSubmitting(true);

    try {
      // Cerrar solo asignaciones activas sin ningun destino (sin servicio Y sin departamento) antes de crear la nueva.
      const asignacionesActivas = await personalApi.getAsignaciones({ idPersonal: personal.id, activo: true });
      const disponibles = (asignacionesActivas.data || []).filter((a) => !a.idServicio && !a.idDepartamento && !a.esJefaturaRolFuncional);
      for (const d of disponibles) {
        await personalApi.closeAsignacion(d.id, {});
      }

      if (jefaturaActiva) {
        throw new Error(`Ya existe un jefe activo en este ${asignarAServicio ? 'servicio' : 'departamento'}.`);
      }

      await personalApi.createAsignacion(buildAltaPayload(form, personal.id, asignarAServicio));
      const deptNombre = departamentosPermitidos.find((d) => String(d.id) === form.idDepartamentoAsignacion)?.nombre ?? 'departamento';
      const srvNombre = (serviciosAsignacion.data?.data || []).find((s) => String(s.id) === form.idServicioAsignacion)?.nombre;
      const rolNombre = rolSeleccionado?.nombre ?? 'rol funcional';
      const destino = asignarAServicio && srvNombre ? `servicio ${srvNombre}` : `departamento ${deptNombre}`;
      showSuccess(`${personal.nombreCompleto} asignado como ${rolNombre} en ${destino}.`);

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
      submitDisabled={!!(rolSeleccionado?.esJefatura && jefaturaActiva)}
      submitting={submitting}
      title={`Dar de alta en Asignaciones: ${personal?.nombreCompleto || ''}`}
    >
      <Grid container columnSpacing={2} rowSpacing={2}>
        <Grid size={12}>
          <Alert severity="info">Completa el departamento y decide si el alta va al servicio o solo al departamento.</Alert>
        </Grid>

        <Grid size={12}>
          <TextField
            fullWidth
            required
            {...validation.fieldProps('idDepartamentoAsignacion', assignmentDepartmentHelperText)}
            label="Departamento operativo"
            onChange={(event) =>
              setForm((current) => ({ ...current, idDepartamentoAsignacion: event.target.value, idServicioAsignacion: '' }))
            }
            select
            disabled={!assignmentHasDepartments}
            size="small"
            value={form.idDepartamentoAsignacion}
          >
            {!assignmentHasDepartments ? <MenuItem value="">Sin departamentos</MenuItem> : null}
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
                disabled={!form.idDepartamentoAsignacion || !assignmentHasServices}
                onChange={(event) => handleToggleAsignarAServicio(event.target.checked)}
                size="small"
              />
            }
            label={
              !form.idDepartamentoAsignacion
                ? 'Primero selecciona un departamento'
                : !assignmentHasServices
                  ? 'Sin servicios en este departamento'
                  : asignarAServicio
                    ? 'Asignar tambien a un servicio'
                    : 'Asignar solo al departamento'
            }
          />
        </Grid>

        <Grid size={12}>
          <Collapse in={asignarAServicio && assignmentHasServices} sx={{ width: '100%' }} timeout="auto" unmountOnExit>
            <TextField
              fullWidth
              required
              {...validation.fieldProps('idServicioAsignacion', 'Seleccione un servicio.')}
              label="Servicio"
              onChange={(event) => setForm((current) => ({ ...current, idServicioAsignacion: event.target.value }))}
              select
              disabled={!form.idDepartamentoAsignacion || !assignmentHasServices}
              size="small"
              value={form.idServicioAsignacion}
            >
              <MenuItem value="">{assignmentServicePlaceholderLabel}</MenuItem>
              {(serviciosAsignacion.data?.data || []).map((item) => (
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
            required
            {...validation.fieldProps(
              'idRolFuncionalAsignacion',
              asignarAServicio ? 'ASISTENCIAL o jefe de servicio.' : 'ASISTENCIAL o jefe de departamento.'
            )}
            label="Rol funcional"
            onChange={(event) => setForm((current) => ({ ...current, idRolFuncionalAsignacion: event.target.value }))}
            select
            size="small"
            value={form.idRolFuncionalAsignacion}
          >
            <MenuItem value="">Selecciona un rol</MenuItem>
            {rolesFiltrados.map((item) => (
              <MenuItem key={item.id} value={String(item.id)}>
                {item.nombre}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        {rolSeleccionado?.esJefatura && jefaturaActiva ? (
          <Grid size={12}>
            <Alert severity="error">
              Ya existe un jefe activo en este {asignarAServicio ? 'servicio' : 'departamento'}:{' '}
              <strong>{jefaturaActiva.nombreCompleto}</strong>.
            </Alert>
          </Grid>
        ) : null}

        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            required
            {...validation.fieldProps('idTipoContratoAsignacion', 'Fuente administrativa del alta.')}
            label="Fuente / item"
            onChange={(event) => setForm((current) => ({ ...current, idTipoContratoAsignacion: event.target.value }))}
            select
            size="small"
            value={form.idTipoContratoAsignacion}
          >
            <MenuItem value="">Sin fuente</MenuItem>
            {tiposContrato
              .filter((item) => item.activo)
              .map((item) => (
                <MenuItem key={item.id} value={String(item.id)}>
                  {item.codigo} - {item.nombre}
                </MenuItem>
              ))}
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            label="Nro. ITEM"
            helperText="Opcional."
            onChange={(event) => setForm((current) => ({ ...current, nroItemAsignacion: event.target.value }))}
            size="small"
            value={form.nroItemAsignacion}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            required
            {...validation.fieldProps('idCargaHorariaAsignacion')}
            label="C/H"
            onChange={(event) => setForm((current) => ({ ...current, idCargaHorariaAsignacion: event.target.value }))}
            select
            size="small"
            value={form.idCargaHorariaAsignacion}
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
            helperText="Opcional."
            label="Motivo"
            onChange={(event) => setForm((current) => ({ ...current, motivoAsignacion: event.target.value }))}
            size="small"
            value={form.motivoAsignacion}
          />
        </Grid>
      </Grid>
    </FormDialog>
  );
}

function buildAltaPayload(form: AltaFormState, idPersonal: number, asignarAServicio: boolean) {
  return {
    idPersonal,
    idDepartamento: Number(form.idDepartamentoAsignacion),
    idServicio: asignarAServicio && form.idServicioAsignacion ? Number(form.idServicioAsignacion) : undefined,
    idTipoContrato: Number(form.idTipoContratoAsignacion),
    idCargaHoraria: Number(form.idCargaHorariaAsignacion),
    idRolFuncional: Number(form.idRolFuncionalAsignacion),
    nroItem: form.nroItemAsignacion || undefined,
    tipoAsignacion: 'PRINCIPAL' as const,
    motivo: form.motivoAsignacion || 'Alta operativa'
  };
}
