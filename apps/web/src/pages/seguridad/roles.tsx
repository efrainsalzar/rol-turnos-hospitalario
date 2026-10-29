import { useEffect, useMemo, useState } from 'react';

import Checkbox from '@mui/material/Checkbox';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import ActionButtonGroup from 'components/system/ActionButtonGroup';
import FormDialog from 'components/system/FormDialog';
import OperationalPageTemplate from 'components/system/OperationalPageTemplate';
import OperationalStats from 'components/system/OperationalStats';
import OperationalTableCard from 'components/system/OperationalTableCard';
import StatusChip from 'components/system/StatusChip';
import { useAppToast } from 'components/system/AppToastProvider';
import { useAccessControl } from 'hooks/use-access-control';
import { useApiRequest } from 'hooks/useApiRequest';
import { isBlank, requiredMessage, useFormValidation } from 'hooks/useFormValidation';
import { seguridadApi } from 'services/seguridadApi';
import type { GuardarRolSeguridadInput, RolSeguridad, UsuarioCapacidadesOperativas, UsuarioPermisosOperativos } from 'types/api';
import { obtenerAlcancesOtorgables, puedeOtorgarAlcance } from 'utils/alcance-planificacion';
import { operationalFieldSx } from 'utils/operational-ui';
import { compactSelectMenuProps } from 'utils/select-menu-props';

const ALCANCE_LABELS: Record<GuardarRolSeguridadInput['alcancePlanificacion'], string> = {
  SISTEMA: 'Sistema',
  DEPARTAMENTO: 'Departamento',
  SERVICIO: 'Servicio',
  LECTURA: 'Lectura'
};

const DEFAULT_PERMISOS: UsuarioPermisosOperativos = {
  puedeVerOrganizacion: false,
  puedeVerPersonal: false,
  puedeGestionarPersonal: false,
  puedeVerAsignaciones: false,
  puedeGestionarAsignaciones: false,
  puedeVerSeguridad: false,
  puedeGestionarUsuarios: false,
  puedeVerOperacion: false,
  puedeVerPlanificacion: false,
  puedeEditarPlanificacion: false,
  puedeAprobarPlanificacion: false,
  puedeVerReportes: false
};

const DEFAULT_CAPACIDADES: UsuarioCapacidadesOperativas = {
  verCalendarios: false,
  gestionarCalendarios: false,
  verIncidenciasPersonales: false,
  gestionarIncidenciasPersonales: false,
  gestionarTiposFeriado: false,
  verCargasHorarias: false,
  gestionarCargasHorarias: false,
  verTurnos: false,
  crearPlanificacion: false,
  editarPlanificacion: false,
  enviarRevisionPlanificacion: false,
  volverBorradorPlanificacion: false,
  aprobarPlanificacion: false,
  cerrarPlanificacion: false,
  exportarPlanificacion: false,
  exportarPlanificacionLote: false,
  gestionarCodigosOperativos: false,
  gestionarTurnos: false,
  gestionarServicios: false
};

const DEFAULT_FORM: GuardarRolSeguridadInput = {
  codigo: '',
  nombre: '',
  activo: true,
  alcancePlanificacion: 'LECTURA',
  permisos: DEFAULT_PERMISOS,
  capacidades: DEFAULT_CAPACIDADES
};

interface CampoPermiso {
  tipo: 'permiso';
  key: keyof UsuarioPermisosOperativos;
  label: string;
  helper: string;
}

interface CampoCapacidad {
  tipo: 'capacidad';
  key: keyof UsuarioCapacidadesOperativas;
  label: string;
  helper: string;
}

type CampoAcceso = CampoPermiso | CampoCapacidad;

interface GrupoAcceso {
  titulo: string;
  descripcion: string;
  campos: CampoAcceso[];
}

// Un solo bloque por dominio, con su(s) permiso(s) de menu (acceso a la seccion)
// seguidos de sus capacidades operativas (acciones concretas dentro de esa seccion).
// Antes eran dos listas separadas con los mismos 5 titulos de dominio repetidos,
// lo que obligaba a leer todo el dialogo dos veces para configurar un solo dominio.
const ACCESS_GROUPS: GrupoAcceso[] = [
  {
    titulo: 'Organizacion',
    descripcion: 'Estructura institucional: departamentos y servicios.',
    campos: [
      { tipo: 'permiso', key: 'puedeVerOrganizacion', label: 'Ver organizacion', helper: 'Permite entrar a departamentos y servicios.' },
      {
        tipo: 'capacidad',
        key: 'gestionarServicios',
        label: 'Gestionar organizacion',
        helper: 'Permite CRUD de departamentos y servicios.'
      }
    ]
  },
  {
    titulo: 'Personal',
    descripcion: 'Catalogo institucional de personal, cargos y contratos.',
    campos: [
      {
        tipo: 'permiso',
        key: 'puedeVerPersonal',
        label: 'Ver personal',
        helper: 'Permite consultar personal, catalogos laborales y fichas.'
      },
      {
        tipo: 'permiso',
        key: 'puedeGestionarPersonal',
        label: 'Gestionar personal',
        helper: 'Permite crear, editar, activar o desactivar personal.'
      }
    ]
  },
  {
    titulo: 'Asignaciones',
    descripcion: 'Vinculacion de personal a servicios y departamentos.',
    campos: [
      {
        tipo: 'permiso',
        key: 'puedeVerAsignaciones',
        label: 'Ver asignaciones',
        helper: 'Permite consultar asignaciones vigentes e historicas.'
      },
      {
        tipo: 'permiso',
        key: 'puedeGestionarAsignaciones',
        label: 'Gestionar asignaciones',
        helper: 'Permite mover personal o quitarlo de servicio.'
      }
    ]
  },
  {
    titulo: 'Seguridad',
    descripcion: 'Usuarios y roles del sistema.',
    campos: [
      { tipo: 'permiso', key: 'puedeVerSeguridad', label: 'Ver seguridad', helper: 'Permite entrar a usuarios y roles.' },
      {
        tipo: 'permiso',
        key: 'puedeGestionarUsuarios',
        label: 'Gestionar usuarios y roles',
        helper: 'Permite CRUD de usuarios y roles de seguridad.'
      }
    ]
  },
  {
    titulo: 'Operacion',
    descripcion: 'Calendarios, incidencias, feriados, cargas horarias y horarios reales.',
    campos: [
      {
        tipo: 'permiso',
        key: 'puedeVerOperacion',
        label: 'Ver operacion',
        helper: 'Permite consultar calendarios, horarios y configuracion operativa.'
      },
      { tipo: 'capacidad', key: 'verCalendarios', label: 'Ver calendarios', helper: 'Muestra el calendario operativo mensual.' },
      {
        tipo: 'capacidad',
        key: 'gestionarCalendarios',
        label: 'Gestionar calendarios',
        helper: 'Permite generar calendario y marcar feriados.'
      },
      {
        tipo: 'capacidad',
        key: 'verIncidenciasPersonales',
        label: 'Ver incidencias personales',
        helper: 'Muestra el catalogo de incidencias personales.'
      },
      {
        tipo: 'capacidad',
        key: 'gestionarIncidenciasPersonales',
        label: 'Gestionar incidencias personales',
        helper: 'Permite CRUD del catalogo de incidencias.'
      },
      {
        tipo: 'capacidad',
        key: 'gestionarTiposFeriado',
        label: 'Gestionar catalogo de feriados',
        helper: 'Permite editar el catalogo F/FN/FR/FI.'
      },
      { tipo: 'capacidad', key: 'verCargasHorarias', label: 'Ver cargas horarias', helper: 'Muestra el catalogo de cargas horarias.' },
      {
        tipo: 'capacidad',
        key: 'gestionarCargasHorarias',
        label: 'Gestionar cargas horarias',
        helper: 'Permite CRUD de cargas horarias.'
      },
      {
        tipo: 'capacidad',
        key: 'verTurnos',
        label: 'Ver horarios del servicio',
        helper: 'Permite consultar el catalogo de horarios reales.'
      },
      {
        tipo: 'capacidad',
        key: 'gestionarTurnos',
        label: 'Gestionar horarios del servicio',
        helper: 'Permite CRUD de horarios reales.'
      },
      {
        tipo: 'capacidad',
        key: 'gestionarCodigosOperativos',
        label: 'Gestionar visualizacion operativa',
        helper: 'Permite ajustar etiquetas y codigos visibles por servicio.'
      }
    ]
  },
  {
    titulo: 'Planificacion',
    descripcion: 'Bandeja mensual y matrices de rol de turno.',
    campos: [
      {
        tipo: 'permiso',
        key: 'puedeVerPlanificacion',
        label: 'Ver planificacion',
        helper: 'Permite consultar la bandeja y las matrices de planificacion.'
      },
      {
        tipo: 'permiso',
        key: 'puedeEditarPlanificacion',
        label: 'Editar planificacion',
        helper: 'Permite operar contenido editable de planificaciones.'
      },
      {
        tipo: 'permiso',
        key: 'puedeAprobarPlanificacion',
        label: 'Aprobar planificacion',
        helper: 'Permite aprobar o cerrar planificaciones segun el flujo.'
      },
      { tipo: 'capacidad', key: 'crearPlanificacion', label: 'Crear planificaciones', helper: 'Permite crear nuevas planificaciones.' },
      {
        tipo: 'capacidad',
        key: 'editarPlanificacion',
        label: 'Editar matrices',
        helper: 'Permite editar la matriz cuando el estado lo permite.'
      },
      {
        tipo: 'capacidad',
        key: 'enviarRevisionPlanificacion',
        label: 'Enviar a revision',
        helper: 'Permite mover una planificacion a revision.'
      },
      {
        tipo: 'capacidad',
        key: 'volverBorradorPlanificacion',
        label: 'Volver a borrador',
        helper: 'Permite devolver la planificacion a borrador.'
      },
      {
        tipo: 'capacidad',
        key: 'aprobarPlanificacion',
        label: 'Aprobar planificacion',
        helper: 'Permite aprobar una planificacion en revision.'
      },
      {
        tipo: 'capacidad',
        key: 'cerrarPlanificacion',
        label: 'Cerrar planificacion',
        helper: 'Permite cerrar una planificacion aprobada.'
      },
      {
        tipo: 'capacidad',
        key: 'exportarPlanificacion',
        label: 'Exportar planificacion',
        helper: 'Permite descargar una planificacion individual.'
      },
      {
        tipo: 'capacidad',
        key: 'exportarPlanificacionLote',
        label: 'Exportar por lote',
        helper: 'Permite descarga en lote desde la bandeja.'
      }
    ]
  },
  {
    titulo: 'Reportes',
    descripcion: 'Reportes consolidados de rol de turno por personal.',
    campos: [
      {
        tipo: 'permiso',
        key: 'puedeVerReportes',
        label: 'Ver reportes',
        helper: 'Permite entrar al menu de Reportes y generar el rol de turno por personal.'
      }
    ]
  }
];

export default function RolesPage() {
  const { permissions, session } = useAccessControl();
  const { showSuccess, showError } = useAppToast();
  const [search, setSearch] = useState('');
  const [activoFilter, setActivoFilter] = useState('');
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | null>(null);
  const [selectedRow, setSelectedRow] = useState<RolSeguridad | null>(null);
  const [form, setForm] = useState<GuardarRolSeguridadInput>(DEFAULT_FORM);
  const [refreshKey, setRefreshKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const response = useApiRequest(seguridadApi.getRoles, [refreshKey]);
  const puedeGestionar = permissions.puedeGestionarUsuarios;
  const alcancesOtorgables = useMemo(() => obtenerAlcancesOtorgables(session?.alcancePlanificacion), [session?.alcancePlanificacion]);
  const validation = useFormValidation<GuardarRolSeguridadInput>({
    codigo: (values) => (isBlank(values.codigo) ? requiredMessage('El codigo') : undefined),
    nombre: (values) => (isBlank(values.nombre) ? requiredMessage('El nombre') : undefined)
  });

  const filteredRows = useMemo(() => {
    const source = response.data?.data || [];
    return source.filter((row) => {
      const matchesSearch =
        !search || row.codigo.toLowerCase().includes(search.toLowerCase()) || row.nombre.toLowerCase().includes(search.toLowerCase());
      const matchesActivo = !activoFilter || (activoFilter === 'true' ? row.activo : !row.activo);
      return matchesSearch && matchesActivo;
    });
  }, [activoFilter, response.data, search]);

  const columns = [
    {
      key: 'codigo',
      title: 'Codigo',
      render: (row: RolSeguridad) => <Typography variant="body2">{row.codigo}</Typography>
    },
    {
      key: 'nombre',
      title: 'Rol',
      render: (row: RolSeguridad) => <Typography variant="body2">{row.nombre}</Typography>
    },
    {
      key: 'alcance',
      title: 'Alcance',
      render: (row: RolSeguridad) => <Typography variant="body2">{row.alcancePlanificacion}</Typography>
    },
    {
      key: 'resumen',
      title: 'Permisos clave',
      render: (row: RolSeguridad) => (
        <Stack spacing={0.25}>
          <Typography variant="caption">
            Seguridad: {row.permisos.puedeGestionarUsuarios ? 'Gestiona' : row.permisos.puedeVerSeguridad ? 'Consulta' : 'Sin acceso'}
          </Typography>
          <Typography variant="caption">
            Organizacion: {row.capacidades.gestionarServicios ? 'Gestiona' : row.permisos.puedeVerOrganizacion ? 'Consulta' : 'Sin acceso'}
          </Typography>
          <Typography variant="caption">
            Planificacion:{' '}
            {row.capacidades.aprobarPlanificacion
              ? 'Aprueba'
              : row.capacidades.editarPlanificacion
                ? 'Edita'
                : row.permisos.puedeVerPlanificacion
                  ? 'Consulta'
                  : 'Sin acceso'}
          </Typography>
          <Typography variant="caption">Reportes: {row.permisos.puedeVerReportes ? 'Ve reportes' : 'Sin acceso'}</Typography>
        </Stack>
      )
    },
    {
      key: 'activo',
      title: 'Estado',
      render: (row: RolSeguridad) => <StatusChip active={row.activo} />
    },
    ...(puedeGestionar
      ? [
          {
            key: 'acciones',
            title: 'Acciones',
            render: (row: RolSeguridad) =>
              puedeOtorgarAlcance(session?.alcancePlanificacion, row.alcancePlanificacion) ? (
                <ActionButtonGroup
                  actions={[
                    { label: 'Editar', onClick: () => openEdit(row), tone: 'secondary' },
                    {
                      label:
                        togglingId === row.id ? (row.activo ? 'Desactivando...' : 'Activando...') : row.activo ? 'Desactivar' : 'Activar',
                      disabled: togglingId === row.id,
                      onClick: () => void handleToggleActive(row),
                      tone: row.activo ? 'danger' : 'secondary'
                    }
                  ]}
                />
              ) : (
                <Typography color="text.disabled" variant="caption">
                  Alcance superior al tuyo
                </Typography>
              )
          }
        ]
      : [])
  ];

  useEffect(() => {
    setPage(0);
  }, [activoFilter, search]);

  useEffect(() => {
    if (!dialogMode) {
      setSelectedRow(null);
      setForm(buildDefaultRoleForm());
      validation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogMode]);

  const openEdit = (row: RolSeguridad) => {
    setSelectedRow(row);
    setForm(mapRolToForm(row));
    setDialogMode('edit');
  };

  const submit = async () => {
    if (!validation.validate(form)) {
      return;
    }

    setSubmitting(true);
    try {
      const payload = normalizeRolePayload(form, selectedRow?.activo ?? true);

      if (dialogMode === 'create') {
        await seguridadApi.createRol(payload);
        showSuccess(`Rol "${payload.nombre}" creado correctamente.`);
      } else if (dialogMode === 'edit' && selectedRow) {
        await seguridadApi.updateRol(selectedRow.id, payload);
        showSuccess(`Rol "${payload.nombre}" actualizado correctamente.`);
      }
      setDialogMode(null);
      setRefreshKey((value) => value + 1);
    } catch (error) {
      showError(formatRolError(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (row: RolSeguridad) => {
    setTogglingId(row.id);
    try {
      if (row.activo) {
        await seguridadApi.deleteRol(row.id);
      } else {
        await seguridadApi.activateRol(row.id);
      }
      showSuccess(row.activo ? `Rol "${row.nombre}" desactivado.` : `Rol "${row.nombre}" activado.`);
      setRefreshKey((value) => value + 1);
    } catch (error) {
      showError(formatRolError(error));
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <OperationalPageTemplate
      actions={[
        { label: 'Recargar', onClick: () => setRefreshKey((value) => value + 1), tone: 'secondary' },
        {
          label: 'Limpiar filtros',
          onClick: () => {
            setSearch('');
            setActivoFilter('');
          },
          tone: 'secondary'
        },
        ...(puedeGestionar ? [{ label: 'Nuevo rol', onClick: () => setDialogMode('create'), tone: 'primary' as const }] : [])
      ]}
      description="Catalogo institucional de roles. Cada rol define alcance de planificacion, permisos globales y capacidades operativas persistidas en base de datos."
      // feedback={
      //   <Alert severity="info">
      //     Los nuevos roles administrativos ya no dependen solo del codigo del rolSeguridad. Esta pantalla gobierna lo que el usuario puede ver,
      //     editar y gestionar en el sistema.
      //   </Alert>
      // }
      filters={
        <>
          <TextField
            label="Buscar rol"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Codigo o nombre"
            size="small"
            sx={operationalFieldSx.search}
            value={search}
          />
          <TextField
            label="Estado"
            onChange={(event) => setActivoFilter(event.target.value)}
            select
            SelectProps={compactSelectMenuProps}
            size="small"
            sx={operationalFieldSx.short}
            value={activoFilter}
          >
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="true">Activos</MenuItem>
            <MenuItem value="false">Inactivos</MenuItem>
          </TextField>
        </>
      }
      stats={
        <OperationalStats
          items={[
            { label: 'Roles', value: response.data?.meta.total || 0 },
            { label: 'Visibles', value: filteredRows.length }
          ]}
        />
      }
      // summary={`${filteredRows.length} roles visibles de ${response.data?.meta.total || 0}`}
      title="Roles"
    >
      <Grid size={12}>
        <OperationalTableCard
          columns={columns}
          emptyMessage="No hay roles disponibles en la API."
          error={response.error}
          getRowKey={(row) => row.id}
          loading={response.loading}
          onRetry={response.refetch}
          rows={filteredRows}
          slow={response.slow}
          subtitle="Los permisos y capacidades mostrados aqui son los que el backend usa para construir la sesion del usuario."
          title="Catalogo de roles"
          total={filteredRows.length}
          pagination={{
            page,
            rowsPerPage,
            onPageChange: setPage,
            onRowsPerPageChange: (value) => {
              setRowsPerPage(value);
              setPage(0);
            }
          }}
        />
      </Grid>
      <FormDialog
        maxWidth="md"
        onClose={() => setDialogMode(null)}
        onSubmit={() => void submit()}
        open={dialogMode !== null}
        submitting={submitting}
        title={dialogMode === 'create' ? 'Nuevo rol de seguridad' : 'Editar rol de seguridad'}
      >
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
            <TextField
              label="Codigo"
              required
              {...validation.fieldProps('codigo', 'Identificador corto. Ejemplo: JEFE_SERVICIO, ADMIN.')}
              size="small"
              value={form.codigo}
              onChange={(event) => setForm((current) => ({ ...current, codigo: event.target.value.toUpperCase() }))}
            />
            <TextField
              label="Nombre"
              required
              {...validation.fieldProps('nombre', 'Nombre visible del rol para los usuarios.')}
              size="small"
              sx={{ flex: 1 }}
              value={form.nombre}
              onChange={(event) => setForm((current) => ({ ...current, nombre: event.target.value }))}
            />
            <TextField
              helperText="Que tanto del sistema puede planificar un usuario con este rol."
              label="Alcance"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  alcancePlanificacion: event.target.value as GuardarRolSeguridadInput['alcancePlanificacion']
                }))
              }
              select
              SelectProps={compactSelectMenuProps}
              size="small"
              sx={operationalFieldSx.short}
              value={form.alcancePlanificacion}
            >
              {alcancesOtorgables.map((alcance) => (
                <MenuItem key={alcance} value={alcance}>
                  {ALCANCE_LABELS[alcance]}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <Divider />

          <Stack spacing={2}>
            <Typography variant="subtitle2">Acceso por dominio</Typography>
            <Typography color="text.secondary" variant="caption">
              Cada bloque agrupa el permiso de menu (acceso a la seccion) junto con sus capacidades operativas (acciones dentro de esa
              seccion).
            </Typography>
            {ACCESS_GROUPS.map((grupo) => (
              <Stack key={grupo.titulo} spacing={0.75}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline' }}>
                  <Typography
                    color="text.primary"
                    sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}
                    variant="caption"
                  >
                    {grupo.titulo}
                  </Typography>
                  <Typography color="text.secondary" variant="caption">
                    {grupo.descripcion}
                  </Typography>
                </Stack>
                <Grid container spacing={1.5}>
                  {grupo.campos.map((field) => (
                    <Grid key={field.key} size={{ xs: 12, md: 6 }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={field.tipo === 'permiso' ? form.permisos[field.key] : form.capacidades[field.key]}
                            onChange={(_, checked) =>
                              setForm((current) =>
                                field.tipo === 'permiso'
                                  ? { ...current, permisos: { ...current.permisos, [field.key]: checked } }
                                  : { ...current, capacidades: { ...current.capacidades, [field.key]: checked } }
                              )
                            }
                          />
                        }
                        label={field.label}
                      />
                      <Typography color="text.secondary" sx={{ pl: 4.5 }} variant="caption">
                        {field.helper}
                      </Typography>
                    </Grid>
                  ))}
                </Grid>
              </Stack>
            ))}
          </Stack>
        </Stack>
      </FormDialog>
    </OperationalPageTemplate>
  );
}

function buildDefaultRoleForm(): GuardarRolSeguridadInput {
  return {
    codigo: '',
    nombre: '',
    activo: true,
    alcancePlanificacion: 'LECTURA',
    permisos: { ...DEFAULT_PERMISOS },
    capacidades: { ...DEFAULT_CAPACIDADES }
  };
}

function mapRolToForm(row: RolSeguridad): GuardarRolSeguridadInput {
  return {
    codigo: row.codigo,
    nombre: row.nombre,
    activo: row.activo,
    alcancePlanificacion: row.alcancePlanificacion,
    permisos: { ...row.permisos },
    capacidades: { ...row.capacidades }
  };
}

function normalizeRolePayload(form: GuardarRolSeguridadInput, activo: boolean): GuardarRolSeguridadInput {
  return {
    codigo: form.codigo.toUpperCase().trim(),
    nombre: form.nombre.trim(),
    activo,
    alcancePlanificacion: form.alcancePlanificacion,
    permisos: { ...form.permisos },
    capacidades: { ...form.capacidades }
  };
}

function formatRolError(error: unknown) {
  return error instanceof Error && error.message ? error.message : 'No se pudo completar la operacion sobre el rol de seguridad.';
}
