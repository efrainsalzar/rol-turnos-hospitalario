import { useEffect, useMemo, useState } from 'react';

import Alert from '@mui/material/Alert';
import Checkbox from '@mui/material/Checkbox';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { useAppToast } from 'components/system/AppToastProvider';
import FormDialog from 'components/system/FormDialog';
import { isBlank, requiredMessage, useFormValidation } from 'hooks/useFormValidation';
import { useApiRequest } from 'hooks/useApiRequest';
import { organizacionApi } from 'services/organizacionApi';
import { personalApi } from 'services/personalApi';
import type {
  Asignacion,
  CargaHoraria,
  ConflictoPlanificacionAsignacion,
  Departamento,
  JefaturaActiva,
  RolFuncionalBase,
  TipoContrato
} from 'types/api';
import { compactSelectMenuProps } from 'utils/select-menu-props';

type EditFormState = {
  idPersonal: string;
  idDepartamento: string;
  idServicio: string;
  idTipoContrato: string;
  idCargaHoraria: string;
  idRolFuncional: string;
  nroItem: string;
  codigoFuenteItem: string;
  tipoAsignacion: 'PRINCIPAL' | 'SECUNDARIA';
  motivo: string;
  regularizarPlanificacionesAbiertas: boolean;
};

const EMPTY_FORM: EditFormState = {
  idPersonal: '',
  idDepartamento: '',
  idServicio: '',
  idTipoContrato: '',
  idCargaHoraria: '',
  idRolFuncional: '',
  nroItem: '',
  codigoFuenteItem: '',
  tipoAsignacion: 'PRINCIPAL',
  motivo: '',
  regularizarPlanificacionesAbiertas: false
};

function buildFormFromRow(row: Asignacion): EditFormState {
  return {
    idPersonal: String(row.idPersonal),
    idDepartamento: row.idDepartamento ? String(row.idDepartamento) : '',
    idServicio: row.idServicio ? String(row.idServicio) : '',
    idTipoContrato: String(row.idTipoContrato),
    idCargaHoraria: row.idCargaHoraria ? String(row.idCargaHoraria) : '',
    idRolFuncional: row.idRolFuncional ? String(row.idRolFuncional) : '',
    nroItem: row.nroItem || '',
    codigoFuenteItem: row.codigoFuenteItem || '',
    tipoAsignacion: row.tipoAsignacion,
    motivo: '',
    regularizarPlanificacionesAbiertas: false
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

export interface AsignacionEditDialogProps {
  open: boolean;
  asignacion: Asignacion | null;
  departamentosPermitidos: Departamento[];
  esGestorGlobalAsignaciones: boolean;
  serviciosGestionablesIds: number[];
  // Lista ya filtrada por permiso del actor (asignaciones.tsx): Admin/RRHH ven las 3
  // opciones de rol funcional, jefe de departamento ve ASISTENCIAL + JEFE_SERVICIO, y
  // cualquier otro actor sin gestion de jefaturas ve solo ASISTENCIAL. Es la unica
  // lista que usa este dialogo — no hay una segunda lista "de movimiento" separada.
  rolesFuncionalesJefatura: RolFuncionalBase[];
  cargasHorarias: CargaHoraria[];
  tiposContrato: TipoContrato[];
  puedeEditarDepartamento: boolean;
  mostrarControlRegularizacion: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function AsignacionEditDialog({
  open,
  asignacion,
  departamentosPermitidos,
  esGestorGlobalAsignaciones,
  serviciosGestionablesIds,
  rolesFuncionalesJefatura,
  cargasHorarias,
  tiposContrato,
  puedeEditarDepartamento,
  mostrarControlRegularizacion,
  onClose,
  onSaved
}: AsignacionEditDialogProps) {
  const { showSuccess, showError } = useAppToast();
  const [form, setForm] = useState<EditFormState>(EMPTY_FORM);
  const [asignarAServicioEdit, setAsignarAServicioEdit] = useState(false);
  // Apagado por defecto: carga horaria, fuente/item y nro. item ya vienen precargados
  // con el valor actual (buildFormFromRow) y se reenvian tal cual si el usuario no
  // decide cambiarlos — este switch solo revela los controles, no altera que se
  // guarda cuando esta apagado (docs/database/decisiones-tecnicas.md seccion 83).
  const [cambiaDatosAdministrativos, setCambiaDatosAdministrativos] = useState(false);
  const [jefeActualEnUnidad, setJefeActualEnUnidad] = useState<JefaturaActiva | null>(null);
  const [conflicto, setConflicto] = useState<ConflictoPlanificacionAsignacion | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Cambiar o mover una asignacion es una accion delicada (docs/database/decisiones-
  // tecnicas.md seccion 81): el motivo es obligatorio siempre, no solo cuando se
  // activa la limpieza de actividad abierta.
  const validation = useFormValidation<EditFormState>({
    idRolFuncional: (values) => (isBlank(values.idRolFuncional) ? requiredMessage('El rol funcional') : undefined),
    idCargaHoraria: (values) => (isBlank(values.idCargaHoraria) ? requiredMessage('La carga horaria') : undefined),
    idTipoContrato: (values) => (isBlank(values.idTipoContrato) ? requiredMessage('La fuente / item') : undefined),
    idServicio: (values) => (requiereServicioDestinoObligatorio && isBlank(values.idServicio) ? requiredMessage('El servicio') : undefined),
    motivo: (values) => (isBlank(values.motivo) ? requiredMessage('El motivo') : undefined)
  });

  useEffect(() => {
    if (!open) {
      validation.reset();
      setAsignarAServicioEdit(false);
      setCambiaDatosAdministrativos(false);
      setJefeActualEnUnidad(null);
      setConflicto(null);
      return;
    }

    if (asignacion) {
      setForm(buildFormFromRow(asignacion));
      setAsignarAServicioEdit(!!asignacion.idServicio);
      // Se consulta el conflicto real de planificacion (mismo endpoint y mismo criterio
      // que AsignacionCloseDialog.tsx, docs/database/decisiones-tecnicas.md seccion 50)
      // apenas se abre el dialogo, para avisar antes de intentar guardar en vez de que el
      // usuario se entere recien con el 409 del backend al enviar el formulario.
      personalApi
        .getConflictoPlanificacion(asignacion.id)
        .then((res) => setConflicto(res))
        .catch(() => setConflicto(null));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Una asignacion SECUNDARIA nunca puede tener rol de jefatura (docs/database/
  // decisiones-tecnicas.md seccion 52) — se filtra aqui en vez de depender solo de
  // que el boton de fila este deshabilitado, para que el backend nunca reciba un
  // intento que ya sabemos que va a rechazar.
  const rolesFuncionalesPermitidos =
    asignacion?.tipoAsignacion === 'SECUNDARIA' ? rolesFuncionalesJefatura.filter((item) => !item.esJefatura) : rolesFuncionalesJefatura;
  const rolFuncionalSeleccionado = useMemo(
    () => rolesFuncionalesPermitidos.find((item) => String(item.id) === form.idRolFuncional) || null,
    [form.idRolFuncional, rolesFuncionalesPermitidos]
  );
  const esRolJefaturaDepartamento = rolFuncionalSeleccionado?.codigo === 'JEFE_DEPARTAMENTO';
  const esRolJefaturaServicio = rolFuncionalSeleccionado?.codigo === 'JEFE_SERVICIO';
  const esRolJefatura = esRolJefaturaServicio || esRolJefaturaDepartamento;
  // Cubre tanto "eligiendo un rol de jefatura ahora" como "esta fila ya es jefatura y
  // se esta retirando" (destino ASISTENCIAL): en ambos casos el flujo es de gestion de
  // jefatura para textos/alertas, aunque el rol elegido termine siendo ASISTENCIAL.
  const esGestionandoJefatura = esRolJefatura || Boolean(asignacion?.esJefaturaRolFuncional);
  // Cualquier cambio de id_servicio/id_departamento respecto a la asignacion actual dispara
  // "mover" (POST /:id/mover) en vez de "editar" (PUT), sin importar el rol — operativo o
  // jefatura, en cualquier direccion (docs/database/decisiones-tecnicas.md seccion 56). El
  // backend cierra la fila actual y crea una fila nueva con fecha propia, en una transaccion
  // atomica; nunca reescribe la unidad de una fila existente en el sitio.
  const idServicioDestinoNumero = form.idServicio ? Number(form.idServicio) : undefined;
  const idDepartamentoDestinoNumero = form.idDepartamento ? Number(form.idDepartamento) : undefined;
  const cambiaUnidad =
    !!asignacion &&
    (idServicioDestinoNumero !== (asignacion.idServicio ?? undefined) ||
      idDepartamentoDestinoNumero !== (asignacion.idDepartamento ?? undefined));
  const requiereServicioDestino = !esRolJefaturaDepartamento;
  // Igual patron que idRolFuncional/idCargaHoraria: el campo obligatorio se marca en rojo con
  // useFormValidation en vez de depender de un Alert aparte que solo repite el mismo mensaje.
  const requiereServicioDestinoObligatorio = esRolJefaturaServicio || (!esRolJefatura && asignarAServicioEdit);

  // Se consulta contra el endpoint dedicado (fuente de verdad en base de datos) en vez de
  // buscar en la lista de asignaciones ya paginada de la pagina: esa lista solo trae la
  // pagina actual, asi que un jefe activo fuera de esa pagina antes se pasaba por alto en
  // silencio y podia terminar con dos jefaturas activas en la misma unidad.
  // Corre siempre que el rol destino sea jefatura, misma unidad o distinta: "mover" tambien
  // rechaza nombrar jefatura en una unidad ya ocupada (mismo 409 que "editar"/"crear"), asi
  // que hay que advertirlo antes de intentar guardar, sin importar si cambia de unidad o no.
  useEffect(() => {
    if (!open || !esRolJefatura) {
      setJefeActualEnUnidad(null);
      return;
    }
    const idServicioDestino = esRolJefaturaServicio && form.idServicio ? Number(form.idServicio) : undefined;
    const idDepartamentoDestino = esRolJefaturaDepartamento && form.idDepartamento ? Number(form.idDepartamento) : undefined;
    if (!idServicioDestino && !idDepartamentoDestino) {
      setJefeActualEnUnidad(null);
      return;
    }
    personalApi
      .getJefaturaActiva({ idServicio: idServicioDestino, idDepartamento: idDepartamentoDestino })
      .then((res) => setJefeActualEnUnidad(res && res.idAsignacion !== asignacion?.id ? res : null))
      .catch(() => setJefeActualEnUnidad(null));
  }, [open, esRolJefatura, esRolJefaturaServicio, esRolJefaturaDepartamento, form.idServicio, form.idDepartamento, asignacion?.id]);

  // Solo importa cuando el origen ya tiene planificacion aprobada (si no, el
  // traslado no genera ningun ajuste y el destino no necesita nada especial) y el
  // usuario realmente esta cambiando de unidad. Vuelve a consultar el mismo
  // endpoint, esta vez con la unidad destino, para que el backend resuelva
  // tambien ese lado (docs/integracion/estrategia-integracion-asistencia-y-
  // cambios-planificacion.md seccion 12).
  useEffect(() => {
    if (!open || !asignacion || !cambiaUnidad || !conflicto?.tienePlanificacionAprobada) {
      return;
    }
    personalApi
      .getConflictoPlanificacion(asignacion.id, {
        idServicioDestino: idServicioDestinoNumero,
        idDepartamentoDestino: idDepartamentoDestinoNumero
      })
      .then((res) => setConflicto(res))
      .catch(() => undefined);
  }, [open, asignacion, cambiaUnidad, conflicto?.tienePlanificacionAprobada, idServicioDestinoNumero, idDepartamentoDestinoNumero]);

  // Consulta propia, escalada por el departamento elegido dentro del dialog — no por el
  // filtro de departamento activo en la tabla de la pagina. Si dependiera del filtro de la
  // pagina, mover a alguien a un departamento distinto al filtrado dejaria la lista de
  // servicios vacia aunque ese departamento si tenga servicios.
  const serviciosFetch = useApiRequest(
    () => organizacionApi.getServicios(form.idDepartamento ? Number(form.idDepartamento) : undefined),
    [form.idDepartamento]
  );
  const destinoServicioFiltrado = useMemo(() => {
    const all = serviciosFetch.data?.data || [];
    if (esGestorGlobalAsignaciones) return all;
    const allowedIds = new Set(serviciosGestionablesIds);
    return all.filter((item) => allowedIds.has(item.id));
  }, [esGestorGlobalAsignaciones, serviciosFetch.data, serviciosGestionablesIds]);
  const editDepartmentHasServices = destinoServicioFiltrado.length > 0;

  useEffect(() => {
    if (!esRolJefaturaServicio && !editDepartmentHasServices) {
      setAsignarAServicioEdit(false);
      setForm((current) => (current.idServicio ? { ...current, idServicio: '' } : current));
    }
  }, [esRolJefaturaServicio, editDepartmentHasServices]);

  const servicioActualLabel = asignacion?.nombreServicio || asignacion?.nombreDepartamento || 'Sin asignacion activa';
  const regularizacionActiva = form.regularizarPlanificacionesAbiertas;
  // Bloqueo proactivo del boton (no solo error tras intentar guardar): el usuario pidio
  // que una accion delicada como esta no deje ni intentar el submit con motivo vacio.
  const motivoVacio = isBlank(form.motivo);
  // Nombrar jefatura en una unidad que ya tiene jefe activo siempre se bloquea aqui, sin
  // excepcion por actor: no existe atajo de reemplazo automatico para nadie, ni siquiera
  // Administracion del sistema (docs/database/decisiones-tecnicas.md secciones 55/56).
  const bloqueadoPorJefaturaExistente = esRolJefatura && !!jefeActualEnUnidad;
  // Mismo criterio que AsignacionCloseDialog.tsx: si la asignacion tiene actividad
  // pendiente en una planificacion abierta, la limpieza deja de ser opcional — se avisa
  // antes de intentar guardar, no despues del 409 del backend.
  const debeRegularizar = Boolean(conflicto?.tieneConflicto && !conflicto.tienePlanificacionAprobada);
  const bloqueadoPorConflictoSinRegularizar = debeRegularizar && !regularizacionActiva;
  // Primera condicion del ajuste por traslado: si el origen ya tiene planificacion
  // aprobada, el destino tambien debe tenerla aprobada para el mismo periodo antes
  // de habilitar el boton. Mientras no se confirme (incluido el instante en que la
  // consulta a destino todavia esta en vuelo), se bloquea por defecto.
  const requiereDestinoAprobado = cambiaUnidad && Boolean(conflicto?.tienePlanificacionAprobada);
  const bloqueadoPorDestinoSinAprobar = requiereDestinoAprobado && conflicto?.destino?.tienePlanificacionAprobada !== true;

  async function submit() {
    if (!asignacion) return;
    if (!validation.validate(form)) return;
    if (bloqueadoPorJefaturaExistente) return;
    if (bloqueadoPorConflictoSinRegularizar) return;
    if (bloqueadoPorDestinoSinAprobar) return;

    setSubmitting(true);

    try {
      if (cambiaUnidad) {
        await personalApi.moverAsignacion(asignacion.id, {
          idServicio: idServicioDestinoNumero,
          idDepartamento: idDepartamentoDestinoNumero,
          idRolFuncional: resolveRequiredPositiveInt(form.idRolFuncional, asignacion.idRolFuncional, 'rol funcional'),
          idTipoContrato: resolveRequiredPositiveInt(form.idTipoContrato, asignacion.idTipoContrato, 'tipo de contrato'),
          idCargaHoraria: Number(form.idCargaHoraria),
          nroItem: form.nroItem || undefined,
          codigoFuenteItem: form.codigoFuenteItem || undefined,
          motivo: form.motivo || undefined,
          regularizarPlanificacionesAbiertas: form.regularizarPlanificacionesAbiertas || undefined
        });
      } else {
        const formParaGuardar = !esRolJefatura && !asignarAServicioEdit ? { ...form, idServicio: '' } : form;
        await personalApi.updateAsignacion(asignacion.id, buildCreateOrUpdatePayload(formParaGuardar, asignacion));
      }

      const retiraJefatura = asignacion.esJefaturaRolFuncional && !esRolJefaturaServicio && !esRolJefaturaDepartamento;
      const persona = `"${asignacion.nombreCompleto}"`;
      showSuccess(
        esGestionandoJefatura
          ? retiraJefatura
            ? `Jefatura de ${persona} retirada correctamente.`
            : asignacion.tieneUsuario
              ? cambiaUnidad
                ? `Jefatura de ${persona} movida correctamente.`
                : `Jefatura de ${persona} guardada correctamente.`
              : `Jefatura de ${persona} guardada correctamente. Crea su usuario si aun no lo tiene.`
          : cambiaUnidad
            ? `Personal ${persona} movido correctamente.`
            : `Asignacion de ${persona} guardada correctamente.`
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
      submitDisabled={motivoVacio || bloqueadoPorJefaturaExistente || bloqueadoPorConflictoSinRegularizar || bloqueadoPorDestinoSinAprobar}
      submitting={submitting}
      submitLabel={
        regularizacionActiva
          ? esGestionandoJefatura
            ? 'Regularizar y guardar jefatura'
            : 'Regularizar y mover'
          : esGestionandoJefatura
            ? 'Guardar jefatura'
            : 'Guardar asignacion'
      }
      title={esGestionandoJefatura ? 'Gestionar jefatura' : 'Editar asignacion operativa'}
    >
      <Grid container columnSpacing={2} rowSpacing={2}>
        {!esGestionandoJefatura ? (
          <Grid size={12}>
            <Alert severity="info">Edita solo la asignacion. Los datos base del personal son de solo lectura.</Alert>
          </Grid>
        ) : null}
        {esGestionandoJefatura && asignacion && !asignacion.tieneUsuario ? (
          <Grid size={12}>
            <Alert severity="info">Este personal aun no tiene usuario. Si guardas la jefatura, crea su usuario despues.</Alert>
          </Grid>
        ) : null}

        {/* Situacion actual: todo de solo lectura, agrupado arriba para que se lea
            "donde esta hoy" antes de "a donde lo mando" (pedido explicito del usuario). */}
        <Grid size={12}>
          <Typography color="text.secondary" variant="overline">
            Situacion actual
          </Typography>
        </Grid>
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
            label="Cargo base"
            size="small"
            sx={readOnlyFieldSx}
            value={asignacion?.nombreNivelCargo || ''}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            InputProps={{ readOnly: true }}
            label="Servicio / departamento actual"
            size="small"
            sx={readOnlyFieldSx}
            value={servicioActualLabel}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            InputProps={{ readOnly: true }}
            label="Rol funcional actual"
            size="small"
            sx={readOnlyFieldSx}
            value={asignacion?.nombreRolFuncional || '-'}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            InputProps={{ readOnly: true }}
            label="Item, fuente y carga horaria actual"
            size="small"
            sx={readOnlyFieldSx}
            value={formatItemCargaLabel(asignacion)}
          />
        </Grid>

        <Grid size={12}>
          <Divider />
        </Grid>
        <Grid size={12}>
          <Typography color="text.secondary" variant="overline">
            Cambios a aplicar
          </Typography>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            InputProps={puedeEditarDepartamento ? undefined : { readOnly: true }}
            label="Departamento operativo"
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                idDepartamento: event.target.value,
                idServicio: esRolJefaturaDepartamento ? '' : current.idServicio
              }))
            }
            select={puedeEditarDepartamento}
            SelectProps={puedeEditarDepartamento ? compactSelectMenuProps : undefined}
            size="small"
            sx={puedeEditarDepartamento ? undefined : readOnlyFieldSx}
            value={puedeEditarDepartamento ? form.idDepartamento : asignacion?.nombreDepartamento || '-'}
          >
            {puedeEditarDepartamento
              ? departamentosPermitidos.map((item) => (
                  <MenuItem key={item.id} value={String(item.id)}>
                    {item.nombre}
                  </MenuItem>
                ))
              : null}
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            {...validation.fieldProps('idRolFuncional', 'Rol vigente para esta asignacion.')}
            label="Rol funcional"
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                idRolFuncional: event.target.value,
                idServicio:
                  resolveRolCodeById(rolesFuncionalesPermitidos, event.target.value) === 'JEFE_DEPARTAMENTO' ? '' : current.idServicio
              }))
            }
            select
            SelectProps={compactSelectMenuProps}
            size="small"
            value={form.idRolFuncional}
          >
            {rolesFuncionalesPermitidos.map((item) => (
              <MenuItem key={item.id} value={String(item.id)}>
                {item.nombre}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        {!esRolJefatura ? (
          <Grid size={12}>
            <FormControlLabel
              sx={{ width: '100%', m: 0 }}
              control={
                <Switch
                  checked={asignarAServicioEdit}
                  disabled={!editDepartmentHasServices}
                  onChange={(event) => {
                    setAsignarAServicioEdit(event.target.checked);
                    if (!event.target.checked) {
                      setForm((current) => ({ ...current, idServicio: '' }));
                    }
                  }}
                  size="small"
                />
              }
              label={
                !editDepartmentHasServices
                  ? 'Sin servicios en este departamento'
                  : asignarAServicioEdit
                    ? 'Mover a un servicio'
                    : 'Mantener solo departamento'
              }
            />
          </Grid>
        ) : null}
        <Grid size={12}>
          <Collapse in={esRolJefatura || asignarAServicioEdit} sx={{ width: '100%' }} timeout="auto" unmountOnExit>
            <TextField
              fullWidth
              {...validation.fieldProps(
                'idServicio',
                esRolJefaturaDepartamento
                  ? 'No aplica.'
                  : esRolJefaturaServicio
                    ? 'Selecciona el servicio destino.'
                    : 'Selecciona el servicio.'
              )}
              label="Servicio destino"
              onChange={(event) => setForm((current) => ({ ...current, idServicio: event.target.value }))}
              select
              SelectProps={compactSelectMenuProps}
              size="small"
              disabled={!requiereServicioDestino}
              value={requiereServicioDestino ? form.idServicio : ''}
            >
              <MenuItem value="">{requiereServicioDestino ? 'Selecciona un servicio' : 'No aplica'}</MenuItem>
              {destinoServicioFiltrado.map((item) => (
                <MenuItem key={item.id} value={String(item.id)}>
                  {item.nombre}
                </MenuItem>
              ))}
            </TextField>
          </Collapse>
        </Grid>
        {bloqueadoPorJefaturaExistente ? (
          <Grid size={12}>
            <Alert severity="error">
              Ya existe un jefe activo en esta unidad: <strong>{jefeActualEnUnidad?.nombreCompleto}</strong>.
            </Alert>
          </Grid>
        ) : null}
        {conflicto?.tienePlanificacionAprobada ? (
          <Grid size={12}>
            <Alert severity="warning">
              Esta persona tiene una planificación aprobada en <strong>{conflicto.planificacionAprobada?.unidadNombre}</strong> para{' '}
              <strong>{conflicto.planificacionAprobada?.periodo}</strong>. Al confirmar el traslado se conservará la planificación original
              y se generará el impacto en la vista efectiva desde la fecha del movimiento.
            </Alert>
          </Grid>
        ) : null}
        {requiereDestinoAprobado ? (
          <Grid size={12}>
            {bloqueadoPorDestinoSinAprobar ? (
              <Alert severity="error">
                El servicio/departamento destino no tiene una planificación aprobada vigente para el período actual. Debe aprobarse esa
                planificación antes de poder completar este traslado.
              </Alert>
            ) : (
              <Alert severity="success">
                El destino también tiene planificación aprobada en{' '}
                <strong>{conflicto?.destino?.planificacionAprobada?.unidadNombre}</strong> para{' '}
                <strong>{conflicto?.destino?.planificacionAprobada?.periodo}</strong>. El traslado puede continuar.
              </Alert>
            )}
          </Grid>
        ) : null}
        {debeRegularizar ? (
          <Grid size={12}>
            <Alert severity="error">
              Hay actividad pendiente en <strong>{conflicto?.periodo}</strong> de <strong>{conflicto?.unidadNombre}</strong>. Activa la
              limpieza para continuar.
            </Alert>
          </Grid>
        ) : null}

        {/* Revelado progresivo: carga horaria/fuente/item quedan ocultos por defecto
            porque casi siempre no cambian junto con el rol o la unidad — pedido
            explicito del usuario (docs/database/decisiones-tecnicas.md seccion 83).
            Los 3 campos ya vienen precargados con el valor actual (buildFormFromRow),
            asi que si el switch queda apagado se guarda el dato actual sin cambios,
            sin logica adicional. */}
        <Grid size={12}>
          <FormControlLabel
            sx={{ width: '100%', m: 0 }}
            control={
              <Switch
                checked={cambiaDatosAdministrativos}
                onChange={(event) => setCambiaDatosAdministrativos(event.target.checked)}
                size="small"
              />
            }
            label="Tambien actualiza carga horaria / item"
          />
        </Grid>
        <Grid size={12}>
          <Collapse in={cambiaDatosAdministrativos} sx={{ width: '100%' }} timeout="auto" unmountOnExit>
            <Grid container columnSpacing={2} rowSpacing={2}>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  {...validation.fieldProps('idTipoContrato', 'Fuente administrativa del item.')}
                  label="Fuente / item"
                  onChange={(event) => setForm((current) => ({ ...current, idTipoContrato: event.target.value }))}
                  select
                  SelectProps={compactSelectMenuProps}
                  size="small"
                  value={form.idTipoContrato}
                >
                  {/* Un tipo inactivo no se ofrece, salvo el que la asignacion ya tiene. */}
                  {tiposContrato
                    .filter((item) => item.activo || String(item.id) === form.idTipoContrato)
                    .map((item) => (
                      <MenuItem key={item.id} value={String(item.id)}>
                        {item.codigo} - {item.nombre}
                        {item.activo ? '' : ' (inactivo)'}
                      </MenuItem>
                    ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  helperText="Opcional."
                  label="Nro. ITEM"
                  onChange={(event) => setForm((current) => ({ ...current, nroItem: event.target.value }))}
                  size="small"
                  value={form.nroItem}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
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
            </Grid>
          </Collapse>
        </Grid>
        <Grid size={12}>
          <TextField
            fullWidth
            required
            {...validation.fieldProps('motivo', 'Requerido para continuar.')}
            label="Motivo"
            multiline
            minRows={2}
            onChange={(event) => setForm((current) => ({ ...current, motivo: event.target.value }))}
            size="small"
            value={form.motivo}
          />
        </Grid>
        {mostrarControlRegularizacion && debeRegularizar ? (
          <Grid size={12}>
            <FormControlLabel
              sx={{ width: '100%', m: 0, alignItems: 'flex-start' }}
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
              label="Limpiar planificaciones abiertas antes de guardar."
            />
          </Grid>
        ) : null}
        {regularizacionActiva ? (
          <Grid size={12}>
            <Alert severity="error">La limpieza borra datos operativos abiertos. Registra un motivo antes de guardar.</Alert>
          </Grid>
        ) : null}
      </Grid>
    </FormDialog>
  );
}

function buildCreateOrUpdatePayload(form: EditFormState, base: Asignacion) {
  return {
    idPersonal: resolveRequiredPositiveInt(form.idPersonal, base.idPersonal, 'personal'),
    idDepartamento: form.idDepartamento ? Number(form.idDepartamento) : undefined,
    idServicio: form.idServicio ? Number(form.idServicio) : undefined,
    idTipoContrato: resolveRequiredPositiveInt(form.idTipoContrato, base.idTipoContrato, 'tipo de contrato'),
    idCargaHoraria: Number(form.idCargaHoraria),
    idRolFuncional: resolveRequiredPositiveInt(form.idRolFuncional, base.idRolFuncional, 'rol funcional'),
    nroItem: form.nroItem || undefined,
    codigoFuenteItem: form.codigoFuenteItem || undefined,
    tipoAsignacion: form.tipoAsignacion,
    motivo: form.motivo || undefined,
    regularizarPlanificacionesAbiertas: form.regularizarPlanificacionesAbiertas || undefined
  };
}

function formatItemCargaLabel(asignacion: Asignacion | null) {
  if (!asignacion) {
    return '-';
  }

  return [
    asignacion.nroItem || 'Sin item',
    asignacion.codigoTipoContrato || asignacion.codigoFuenteItem || 'Sin tipo contrato',
    asignacion.codigoCargaHoraria || 'Sin carga horaria'
  ].join(' · ');
}

function resolveRolCodeById(roles: Array<{ id: number; codigo: string }>, selectedId: string) {
  return roles.find((item) => String(item.id) === selectedId)?.codigo || null;
}

function resolveRequiredPositiveInt(formValue: string, fallbackValue: number | null | undefined, label: string) {
  const parsedFormValue = parsePositiveInteger(formValue);
  if (parsedFormValue !== undefined) {
    return parsedFormValue;
  }

  if (isPositiveInteger(fallbackValue)) {
    return fallbackValue;
  }

  throw new Error(
    `No se puede guardar la reasignacion porque falta el dato base de ${label}. Administracion debe completar ese dato primero.`
  );
}

function parsePositiveInteger(value: string) {
  const parsedValue = Number(value);
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : undefined;
}

function isPositiveInteger(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}
