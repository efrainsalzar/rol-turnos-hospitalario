import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import ActionButtonGroup from 'components/system/ActionButtonGroup';
import ConfirmDialog from 'components/system/ConfirmDialog';
import FormDialog from 'components/system/FormDialog';
import OperationalPageTemplate from 'components/system/OperationalPageTemplate';
import OperationalScopeSummary from 'components/system/OperationalScopeSummary';
import OperationalStats from 'components/system/OperationalStats';
import OperationalTableCard from 'components/system/OperationalTableCard';
import StatusChip from 'components/system/StatusChip';
import { useAppToast } from 'components/system/AppToastProvider';
import { useAccessControl } from 'hooks/use-access-control';
import { useApiRequest } from 'hooks/useApiRequest';
import { isBlank, requiredMessage, useFormValidation } from 'hooks/useFormValidation';
import { organizacionApi } from 'services/organizacionApi';
import type { Departamento, GuardarServicioInput, Servicio, TipoServicio } from 'types/api';
import { operationalFieldSx } from 'utils/operational-ui';
import { compactSelectMenuProps } from 'utils/select-menu-props';

type ServicioFormState = {
  idDepartamento: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  tipoServicio: TipoServicio;
};

const EMPTY_FORM: ServicioFormState = {
  idDepartamento: '',
  codigo: '',
  nombre: '',
  descripcion: '',
  tipoServicio: 'SERVICIO'
};

export default function ServiciosPage() {
  const navigate = useNavigate();
  const { permissions, capabilities, session } = useAccessControl();
  const { showSuccess, showError } = useAppToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [activoFilter, setActivoFilter] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | null>(null);
  const [selectedRow, setSelectedRow] = useState<Servicio | null>(null);
  const [form, setForm] = useState<ServicioFormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [rowToConfirmDeactivate, setRowToConfirmDeactivate] = useState<Servicio | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const departamentosGestionables = session?.departamentosGestionables || [];
  const departamentoUnico = departamentosGestionables.length === 1 ? departamentosGestionables[0] : null;
  const selectedDepartmentId = Number(searchParams.get('id_departamento') || '') || departamentoUnico?.id || undefined;
  const puedeGestionar = capabilities.gestionarServicios;
  // El backend (ServicioController.scopeServicios) ya excluye servicios inactivos
  // para cualquier actor sin alcance de sistema (JEFE_DEPARTAMENTO, JEFE_SERVICIO):
  // esas jefaturas solo gestionan operacion vigente. El filtro de Estado no tiene
  // ningun efecto real para ellas, asi que se oculta en vez de ofrecer un control
  // sin resultado posible.
  const tieneAlcanceSistema = Boolean(session?.puedeGestionarTodo || session?.alcancePlanificacion === 'SISTEMA');
  const validation = useFormValidation<ServicioFormState>({
    idDepartamento: (values) => (isBlank(values.idDepartamento) ? requiredMessage('El departamento') : undefined),
    codigo: (values) => (isBlank(values.codigo) ? requiredMessage('El codigo') : undefined),
    nombre: (values) => (isBlank(values.nombre) ? requiredMessage('El nombre') : undefined)
  });

  const departamentos = useApiRequest(organizacionApi.getDepartamentos);
  const departamentosParaFormulario = departamentosGestionables.length > 0 ? departamentosGestionables : departamentos.data?.data || [];
  const servicios = useApiRequest(() => organizacionApi.getServicios(selectedDepartmentId), [selectedDepartmentId, refreshKey]);
  const filteredRows = useMemo(() => {
    const source = servicios.data?.data || [];
    return source.filter((row) => {
      const matchesSearch =
        !search ||
        row.codigo.toLowerCase().includes(search.toLowerCase()) ||
        row.nombre.toLowerCase().includes(search.toLowerCase()) ||
        (row.descripcion || '').toLowerCase().includes(search.toLowerCase());
      const matchesActivo = !activoFilter || (activoFilter === 'true' ? row.activo : !row.activo);
      return matchesSearch && matchesActivo;
    });
  }, [activoFilter, search, servicios.data]);

  useEffect(() => {
    setPage(0);
  }, [activoFilter, search, selectedDepartmentId]);

  useEffect(() => {
    if (!dialogMode) {
      setSelectedRow(null);
      setForm({
        ...EMPTY_FORM,
        idDepartamento: selectedDepartmentId ? String(selectedDepartmentId) : ''
      });
      validation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogMode, selectedDepartmentId]);

  const executeToggle = useCallback(
    async (row: Servicio) => {
      setRowToConfirmDeactivate(null);
      setTogglingId(row.id);
      try {
        if (row.activo) {
          await organizacionApi.deleteServicio(row.id);
        } else {
          await organizacionApi.activateServicio(row.id);
        }
        showSuccess(row.activo ? `Servicio "${row.nombre}" desactivado.` : `Servicio "${row.nombre}" activado.`);
        setRefreshKey((value) => value + 1);
      } catch (error) {
        showError(error instanceof Error ? error.message : 'No se pudo cambiar el estado del servicio.');
      } finally {
        setTogglingId(null);
      }
    },
    [showError, showSuccess]
  );

  const handleToggleActive = useCallback(
    async (row: Servicio) => {
      if (row.activo) {
        setRowToConfirmDeactivate(row);
        return;
      }
      await executeToggle(row);
    },
    [executeToggle]
  );

  const columns = useMemo(
    () => [
      {
        key: 'codigo',
        title: 'Codigo',
        render: (row: Servicio) => <Typography variant="body2">{row.codigo}</Typography>
      },
      {
        key: 'nombre',
        title: 'Servicio',
        render: (row: Servicio) => <Typography variant="body2">{row.nombre}</Typography>
      },
      {
        key: 'tipoServicio',
        title: 'Tipo',
        render: (row: Servicio) => <Chip label={row.tipoServicio === 'UNIDAD' ? 'Unidad' : 'Servicio'} size="small" variant="outlined" />
      },
      {
        key: 'departamento',
        title: 'Departamento',
        render: (row: Servicio) => <Typography variant="body2">{row.nombreDepartamento || '-'}</Typography>
      },
      {
        key: 'descripcion',
        title: 'Descripcion',
        render: (row: Servicio) => <Typography variant="body2">{row.descripcion || '-'}</Typography>
      },
      {
        key: 'cantidadPersonalActivo',
        title: 'Personal',
        render: (row: Servicio) => <Typography variant="body2">{row.cantidadPersonalActivo}</Typography>
      },
      {
        key: 'activo',
        title: 'Estado',
        render: (row: Servicio) => <StatusChip active={row.activo} />
      },
      {
        key: 'acciones',
        title: 'Acciones',
        render: (row: Servicio) => (
          <ActionButtonGroup
            actions={[
              ...(puedeGestionar
                ? [
                    { label: 'Editar', onClick: () => openEdit(row), tone: 'secondary' as const },
                    {
                      label:
                        togglingId === row.id ? (row.activo ? 'Desactivando...' : 'Activando...') : row.activo ? 'Desactivar' : 'Activar',
                      disabled: togglingId === row.id,
                      onClick: () => void handleToggleActive(row),
                      tone: row.activo ? ('danger' as const) : ('secondary' as const)
                    }
                  ]
                : []),
              {
                label: 'Ver detalle',
                onClick: () =>
                  navigate(`/organizacion/servicios/${row.id}`, {
                    state: { backTo: '/organizacion/servicios', backLabel: 'Volver a servicios' }
                  }),
                tone: 'secondary'
              },
              ...(permissions.puedeVerPersonal
                ? [
                    {
                      label: 'Ver personal',
                      onClick: () => navigate(`/personal?id_servicio=${row.id}`),
                      tone: 'secondary' as const
                    }
                  ]
                : []),
              ...(!permissions.puedeVerPersonal && permissions.puedeVerAsignaciones
                ? [
                    {
                      label: 'Ver asignaciones',
                      onClick: () => navigate(`/personal/asignaciones?id_servicio=${row.id}`),
                      tone: 'secondary' as const
                    }
                  ]
                : [])
            ]}
          />
        )
      }
    ],
    [handleToggleActive, navigate, permissions.puedeVerAsignaciones, permissions.puedeVerPersonal, puedeGestionar, togglingId]
  );

  return (
    <OperationalPageTemplate
      actions={[
        { label: 'Recargar', onClick: () => setRefreshKey((value) => value + 1), tone: 'secondary' },
        {
          label: 'Limpiar filtros',
          onClick: () => {
            setSearch('');
            setActivoFilter('');
            setSearchParams(departamentoUnico ? { id_departamento: String(departamentoUnico.id) } : {});
          },
          tone: 'secondary'
        },
        ...(puedeGestionar ? [{ label: 'Nuevo servicio', onClick: () => setDialogMode('create'), tone: 'primary' as const }] : [])
      ]}
      context={
        departamentoUnico ? (
          <OperationalScopeSummary
            code={departamentoUnico.codigo}
            helperText="Estas viendo los servicios habilitados dentro de tu alcance actual."
            label="Departamento actual"
            name={departamentoUnico.nombre}
          />
        ) : null
      }
      description="Consulta operativa de servicios con foco en estructura, dotacion visible y accesos rapidos a detalle o personal."
      filters={
        <>
          {!departamentoUnico ? (
            <TextField
              label="Departamento"
              onChange={(event) => {
                const nextValue = event.target.value;
                if (nextValue) {
                  setSearchParams({ id_departamento: nextValue });
                } else {
                  setSearchParams({});
                }
              }}
              select
              SelectProps={compactSelectMenuProps}
              size="small"
              sx={operationalFieldSx.long}
              value={selectedDepartmentId ? String(selectedDepartmentId) : ''}
            >
              <MenuItem value="">Todos</MenuItem>
              {(departamentos.data?.data || []).map((departamento: Departamento) => (
                <MenuItem key={departamento.id} value={departamento.id}>
                  {departamento.nombre}
                </MenuItem>
              ))}
            </TextField>
          ) : null}
          <TextField
            label="Buscar servicio"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Codigo, nombre o descripcion"
            size="small"
            sx={operationalFieldSx.search}
            value={search}
          />
          {tieneAlcanceSistema ? (
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
          ) : null}
        </>
      }
      stats={
        <OperationalStats
          items={[
            { label: 'Servicios', value: servicios.data?.meta.total || 0 },
            { label: 'Visibles', value: filteredRows.length },
            { label: 'Departamento', value: departamentoUnico ? 1 : 'varios' }
          ]}
        />
      }
      // summary={`${filteredRows.length} servicios visibles de ${servicios.data?.meta.total || 0}`}
      title="Servicios"
    >
      <Grid size={12}>
        <OperationalTableCard
          columns={columns}
          emptyMessage="No hay servicios disponibles con el filtro actual."
          error={servicios.error}
          getRowKey={(row) => row.id}
          loading={servicios.loading || departamentos.loading}
          onRetry={() => {
            servicios.refetch();
            departamentos.refetch();
          }}
          rows={filteredRows}
          slow={servicios.slow || departamentos.slow}
          subtitle="Servicios hospitalarios por departamento, con acceso rapido a detalle, personal y asignaciones."
          title="Servicios hospitalarios"
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
      <ConfirmDialog
        confirmLabel={(rowToConfirmDeactivate?.cantidadPersonalActivo ?? 0) > 0 ? 'Desactivar de todas formas' : 'Desactivar'}
        confirmLoadingLabel="Desactivando..."
        loading={togglingId === rowToConfirmDeactivate?.id}
        onClose={() => setRowToConfirmDeactivate(null)}
        onConfirm={() => rowToConfirmDeactivate && void executeToggle(rowToConfirmDeactivate)}
        open={rowToConfirmDeactivate !== null}
        title="Desactivar servicio"
      >
        <Alert severity="warning">
          {(rowToConfirmDeactivate?.cantidadPersonalActivo ?? 0) > 0
            ? `El servicio "${rowToConfirmDeactivate?.nombre}" tiene ${rowToConfirmDeactivate?.cantidadPersonalActivo} personal activo asignado. Al desactivarlo, el servicio quedara inactivo pero el personal y sus asignaciones no se veran afectados. ¿Deseas continuar?`
            : `¿Estás seguro que deseas desactivar el servicio "${rowToConfirmDeactivate?.nombre}"? Quedara inactivo hasta que lo actives de nuevo.`}
        </Alert>
      </ConfirmDialog>

      <FormDialog
        onClose={() => setDialogMode(null)}
        onSubmit={() => void handleSubmit()}
        open={dialogMode !== null}
        submitting={submitting}
        title={dialogMode === 'create' ? 'Nuevo servicio' : 'Editar servicio'}
      >
        <Stack spacing={1.5} sx={{ mt: 0.5 }}>
          <TextField
            disabled={departamentosParaFormulario.length === 1}
            label="Departamento"
            required
            {...validation.fieldProps('idDepartamento', 'Departamento al que pertenece este servicio.')}
            onChange={(event) => setForm((current) => ({ ...current, idDepartamento: event.target.value }))}
            select
            SelectProps={compactSelectMenuProps}
            size="small"
            value={form.idDepartamento}
          >
            {departamentosParaFormulario.map((departamento) => (
              <MenuItem key={departamento.id} value={String(departamento.id)}>
                {departamento.nombre}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Codigo"
            required
            {...validation.fieldProps('codigo', 'Identificador corto. Ejemplo: NEO-UCI, CIR-A.')}
            onChange={(event) => setForm((current) => ({ ...current, codigo: event.target.value.toUpperCase() }))}
            size="small"
            value={form.codigo}
          />
          <TextField
            label="Nombre"
            required
            {...validation.fieldProps('nombre', 'Nombre visible en filtros, asignaciones y reportes.')}
            onChange={(event) => setForm((current) => ({ ...current, nombre: event.target.value }))}
            size="small"
            value={form.nombre}
          />
          <TextField
            helperText="Define si se muestra como Servicio o como Unidad en el catalogo."
            label="Tipo"
            onChange={(event) => setForm((current) => ({ ...current, tipoServicio: event.target.value as TipoServicio }))}
            select
            SelectProps={compactSelectMenuProps}
            size="small"
            value={form.tipoServicio}
          >
            <MenuItem value="SERVICIO">Servicio</MenuItem>
            <MenuItem value="UNIDAD">Unidad</MenuItem>
          </TextField>
          <TextField
            helperText="Opcional. Contexto interno, no se muestra en la matriz."
            label="Descripcion"
            minRows={3}
            multiline
            onChange={(event) => setForm((current) => ({ ...current, descripcion: event.target.value }))}
            size="small"
            value={form.descripcion}
          />
        </Stack>
      </FormDialog>
    </OperationalPageTemplate>
  );

  function openEdit(row: Servicio) {
    setSelectedRow(row);
    setForm({
      idDepartamento: String(row.idDepartamento),
      codigo: row.codigo,
      nombre: row.nombre,
      descripcion: row.descripcion || '',
      tipoServicio: row.tipoServicio
    });
    setDialogMode('edit');
  }

  async function handleSubmit() {
    if (!validation.validate(form)) {
      return;
    }

    setSubmitting(true);
    try {
      const payload: GuardarServicioInput = {
        idDepartamento: Number(form.idDepartamento),
        codigo: form.codigo.trim().toUpperCase(),
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || undefined,
        tipoServicio: form.tipoServicio,
        activo: selectedRow?.activo ?? true
      };

      if (dialogMode === 'create') {
        await organizacionApi.createServicio(payload);
        showSuccess(`Servicio "${payload.nombre}" creado correctamente.`);
      } else if (dialogMode === 'edit' && selectedRow) {
        await organizacionApi.updateServicio(selectedRow.id, payload);
        showSuccess(`Servicio "${payload.nombre}" actualizado correctamente.`);
      }

      setDialogMode(null);
      setRefreshKey((value) => value + 1);
    } catch (error) {
      showError(error instanceof Error ? error.message : 'No se pudo guardar el servicio.');
    } finally {
      setSubmitting(false);
    }
  }
}
