import { useEffect, useState } from 'react';

import Alert from '@mui/material/Alert';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';

import { useAppToast } from 'components/system/AppToastProvider';
import FormDialog from 'components/system/FormDialog';
import { isBlank, requiredMessage, useFormValidation } from 'hooks/useFormValidation';
import { personalApi } from 'services/personalApi';
import type { Asignacion, ConflictoPlanificacionAsignacion } from 'types/api';

type ConflictoSecundaria = {
  asignacion: Asignacion;
  conflicto: ConflictoPlanificacionAsignacion;
};

type CloseFormState = {
  motivo: string;
  regularizarPlanificacionesAbiertas: boolean;
  cerrarSecundariasActivas: boolean;
};

function buildEmptyForm(): CloseFormState {
  return {
    motivo: '',
    regularizarPlanificacionesAbiertas: false,
    cerrarSecundariasActivas: false
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

export interface AsignacionCloseDialogProps {
  open: boolean;
  asignacion: Asignacion | null;
  mostrarControlRegularizacion: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function AsignacionCloseDialog({
  open,
  asignacion,
  mostrarControlRegularizacion,
  onClose,
  onSaved
}: AsignacionCloseDialogProps) {
  const { showSuccess, showError } = useAppToast();
  const [form, setForm] = useState<CloseFormState>(buildEmptyForm());
  const [secundariasActivas, setSecundariasActivas] = useState<Asignacion[]>([]);
  const [conflictoPropio, setConflictoPropio] = useState<ConflictoPlanificacionAsignacion | null>(null);
  const [conflictosSecundarias, setConflictosSecundarias] = useState<ConflictoSecundaria[]>([]);
  const [cargandoConflictos, setCargandoConflictos] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Quitar una asignacion es una accion delicada (docs/database/decisiones-tecnicas.md
  // seccion 81): el motivo es obligatorio siempre, no solo cuando se activa la limpieza
  // de actividad abierta.
  const validation = useFormValidation<CloseFormState>({
    motivo: (values) => (isBlank(values.motivo) ? requiredMessage('El motivo') : undefined)
  });

  useEffect(() => {
    if (!open || !asignacion) {
      validation.reset();
      setSecundariasActivas([]);
      setConflictoPropio(null);
      setConflictosSecundarias([]);
      return;
    }

    setForm(buildEmptyForm());
    setCargandoConflictos(true);

    // Se consulta el conflicto real de planificacion (docs/database/decisiones-tecnicas.md
    // seccion 50) para la propia asignacion y, si es PRINCIPAL, tambien para cada
    // secundaria activa — antes de este cambio el modal no avisaba si una secundaria
    // tenia turnos cargados, aunque la principal no tuviera ninguno.
    async function cargarConflictos(asignacionActual: Asignacion) {
      const propio = await personalApi.getConflictoPlanificacion(asignacionActual.id).catch(() => null);
      setConflictoPropio(propio);

      if (asignacionActual.tipoAsignacion !== 'PRINCIPAL') {
        setSecundariasActivas([]);
        setConflictosSecundarias([]);
        setCargandoConflictos(false);
        return;
      }

      // Cargar todas las asignaciones activas de esta persona para detectar secundarias,
      // independientemente del filtro de servicio activo en la tabla.
      const respuesta = await personalApi.getAsignaciones({ idPersonal: asignacionActual.idPersonal, activo: true }).catch(() => null);
      const secundarias = (respuesta?.data || []).filter((row) => row.tipoAsignacion === 'SECUNDARIA' && row.id !== asignacionActual.id);
      setSecundariasActivas(secundarias);

      const conflictos = await Promise.all(
        secundarias.map(async (sec) => ({
          asignacion: sec,
          conflicto: await personalApi.getConflictoPlanificacion(sec.id).catch(() => null)
        }))
      );
      setConflictosSecundarias(conflictos.filter((item): item is ConflictoSecundaria => item.conflicto !== null));
      setCargandoConflictos(false);
    }

    void cargarConflictos(asignacion);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const servicioActualLabel = asignacion?.nombreServicio || asignacion?.nombreDepartamento || 'Sin asignacion activa';
  // Si hay secundarias activas, la principal no se cierra sola.
  const debeCerrarSecundarias = asignacion?.tipoAsignacion === 'PRINCIPAL' && secundariasActivas.length > 0;
  const bloqueadoPorSecundariasSinDecidir = debeCerrarSecundarias && !form.cerrarSecundariasActivas;

  const secundariasConConflicto = conflictosSecundarias.filter((item) => item.conflicto.tieneConflicto);
  // Si la principal o alguna secundaria tiene actividad abierta, la limpieza pasa a ser obligatoria.
  const debeRegularizar = Boolean(conflictoPropio?.tieneConflicto) || secundariasConConflicto.length > 0;
  const bloqueadoPorConflictoSinRegularizar = debeRegularizar && !form.regularizarPlanificacionesAbiertas;
  // Bloqueo proactivo del boton (no solo error tras intentar guardar): el usuario pidio
  // que una accion delicada como esta no deje ni intentar el submit con motivo vacio.
  const motivoVacio = isBlank(form.motivo);

  async function submit() {
    if (!asignacion) return;
    if (!validation.validate(form)) return;
    if (bloqueadoPorSecundariasSinDecidir) return;
    if (bloqueadoPorConflictoSinRegularizar) return;

    setSubmitting(true);

    try {
      await personalApi.closeAsignacion(asignacion.id, {
        motivo: form.motivo || undefined,
        regularizarPlanificacionesAbiertas: form.regularizarPlanificacionesAbiertas || undefined,
        cerrarSecundariasActivas: form.cerrarSecundariasActivas || undefined
      });
      const msgSecundarias =
        form.cerrarSecundariasActivas && secundariasActivas.length > 0
          ? ` Tambien se cerraron ${secundariasActivas.length} secundaria(s).`
          : '';
      const msgBase =
        asignacion.tipoAsignacion === 'PRINCIPAL'
          ? `Asignacion principal de "${asignacion.nombreCompleto}" quitada correctamente.${msgSecundarias}`
          : `Asignacion secundaria de "${asignacion.nombreCompleto}" quitada correctamente.`;
      showSuccess(msgBase);
      onSaved();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'No se pudo completar la operacion.');
    } finally {
      setSubmitting(false);
    }
  }

  const regularizacionActiva = form.regularizarPlanificacionesAbiertas;

  return (
    <FormDialog
      maxWidth="md"
      onClose={onClose}
      onSubmit={() => void submit()}
      open={open}
      submitDisabled={motivoVacio || bloqueadoPorSecundariasSinDecidir || bloqueadoPorConflictoSinRegularizar || cargandoConflictos}
      submitting={submitting}
      submitLabel={
        regularizacionActiva
          ? 'Regularizar y quitar'
          : form.cerrarSecundariasActivas
            ? 'Quitar principal y secundarias'
            : 'Quitar asignacion'
      }
      title="Quitar personal del servicio"
    >
      <Grid container columnSpacing={2} rowSpacing={2}>
        <Grid size={12}>
          <Alert severity="warning">
            {asignacion?.tipoAsignacion === 'PRINCIPAL'
              ? 'Vas a quitar la asignacion principal.'
              : 'Vas a quitar una asignacion secundaria.'}
          </Alert>
        </Grid>
        {asignacion?.esJefaturaRolFuncional ? (
          <Grid size={12}>
            <Alert severity="error">
              <strong>{asignacion.nombreCompleto}</strong> es jefatura de{' '}
              <strong>{asignacion.nombreServicio || asignacion.nombreDepartamento}</strong>. Al quitar esta asignacion, la unidad queda sin
              jefe activo y el usuario del sistema asociado se desactiva automaticamente.
            </Alert>
          </Grid>
        ) : null}
        {debeCerrarSecundarias ? (
          <Grid size={12}>
            <Alert severity="error">
              <strong>{asignacion?.nombreCompleto}</strong> tiene {secundariasActivas.length} secundaria(s) activa(s). Cierra tambien esas
              asignaciones para continuar.
            </Alert>
          </Grid>
        ) : null}
        {debeCerrarSecundarias ? (
          <Grid size={12}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.cerrarSecundariasActivas}
                  onChange={(event) => setForm((current) => ({ ...current, cerrarSecundariasActivas: event.target.checked }))}
                />
              }
              label={`Cerrar tambien las ${secundariasActivas.length} secundaria(s).`}
            />
          </Grid>
        ) : null}
        {debeRegularizar ? (
          <Grid size={12}>
            <Alert severity="error">
              {conflictoPropio?.tieneConflicto ? (
                <div>
                  Hay actividad pendiente en <strong>{conflictoPropio.periodo}</strong> de <strong>{conflictoPropio.unidadNombre}</strong>.
                </div>
              ) : null}
              {secundariasConConflicto.length > 0 ? (
                <div>
                  {conflictoPropio?.tieneConflicto ? 'Ademas, estas' : 'Estas'} secundaria(s) tambien tienen actividad pendiente:{' '}
                  {secundariasConConflicto
                    .map(
                      (item) =>
                        `${item.asignacion.nombreServicio || item.asignacion.nombreDepartamento || 'Unidad sin nombre'} (${item.conflicto.periodo})`
                    )
                    .join(', ')}
                </div>
              ) : null}
              <div>Activa la limpieza para continuar.</div>
            </Alert>
          </Grid>
        ) : null}
        <Grid size={12}>
          <TextField
            fullWidth
            InputProps={{ readOnly: true }}
            label="Personal"
            size="small"
            sx={readOnlyFieldSx}
            value={asignacion?.nombreCompleto || ''}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            InputProps={{ readOnly: true }}
            label="Servicio actual"
            size="small"
            sx={readOnlyFieldSx}
            value={servicioActualLabel}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            InputProps={{ readOnly: true }}
            label="Resultado"
            size="small"
            sx={readOnlyFieldSx}
            value={
              asignacion?.tipoAsignacion === 'PRINCIPAL'
                ? form.cerrarSecundariasActivas
                  ? 'Sin ninguna asignacion activa (solo visible en Personal)'
                  : secundariasActivas.length > 0
                    ? 'Sin PRINCIPAL activa (secundarias siguen activas)'
                    : 'Sin asignacion activa (solo visible en Personal)'
                : 'La asignacion principal sigue activa'
            }
          />
        </Grid>
        <Grid size={12}>
          <TextField
            fullWidth
            required
            {...validation.fieldProps('motivo', 'Requerido para continuar.')}
            label="Motivo"
            multiline
            minRows={3}
            onChange={(event) => setForm((current) => ({ ...current, motivo: event.target.value }))}
            size="small"
            value={form.motivo}
          />
        </Grid>
        {mostrarControlRegularizacion && debeRegularizar ? (
          <Grid size={12}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={regularizacionActiva}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      regularizarPlanificacionesAbiertas: event.target.checked
                    }))
                  }
                />
              }
              label="Limpiar actividad abierta antes de quitar."
            />
          </Grid>
        ) : null}
        {regularizacionActiva ? (
          <Grid size={12}>
            <Alert severity="error">La limpieza borra actividad abierta. Registra un motivo para continuar.</Alert>
          </Grid>
        ) : null}
      </Grid>
    </FormDialog>
  );
}
