import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Alert from '@mui/material/Alert';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import ActionButtonGroup from 'components/system/ActionButtonGroup';
import ConfirmDialog from 'components/system/ConfirmDialog';
import FormDialog from 'components/system/FormDialog';
import OperationalPageTemplate from 'components/system/OperationalPageTemplate';
import OperationalStats from 'components/system/OperationalStats';
import OperationalTableCard from 'components/system/OperationalTableCard';
import StatusChip from 'components/system/StatusChip';
import { useAppToast } from 'components/system/AppToastProvider';
import { useAccessControl } from 'hooks/use-access-control';
import { useApiRequest } from 'hooks/useApiRequest';
import { isBlank, requiredMessage, useFormValidation } from 'hooks/useFormValidation';
import { organizacionApi } from 'services/organizacionApi';
import type { Departamento, GuardarDepartamentoInput } from 'types/api';
import { operationalFieldSx } from 'utils/operational-ui';
import { compactSelectMenuProps } from 'utils/select-menu-props';

const EMPTY_FORM: GuardarDepartamentoInput = {
  codigo: '',
  nombre: '',
  descripcion: '',
  activo: true
};

export default function DepartamentosPage() {
  const navigate = useNavigate();
  const { permissions, capabilities } = useAccessControl();
  const { showSuccess, showError } = useAppToast();
  const [refreshKey, setRefreshKey] = useState(0);
  const response = useApiRequest(organizacionApi.getDepartamentos, [refreshKey]);
  const [search, setSearch] = useState('');
  const [activoFilter, setActivoFilter] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | null>(null);
  const [selectedRow, setSelectedRow] = useState<Departamento | null>(null);
  const [form, setForm] = useState<GuardarDepartamentoInput>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [rowToConfirmDeactivate, setRowToConfirmDeactivate] = useState<Departamento | null>(null);
  const puedeGestionar = capabilities.gestionarServicios;
  const validation = useFormValidation<GuardarDepartamentoInput>({
    codigo: (values) => (isBlank(values.codigo) ? requiredMessage('El codigo') : undefined),
    nombre: (values) => (isBlank(values.nombre) ? requiredMessage('El nombre') : undefined)
  });

  const filteredRows = useMemo(() => {
    const source = response.data?.data || [];
    return source.filter((row) => {
      const matchesSearch =
        !search ||
        row.codigo.toLowerCase().includes(search.toLowerCase()) ||
        row.nombre.toLowerCase().includes(search.toLowerCase()) ||
        (row.descripcion || '').toLowerCase().includes(search.toLowerCase());
      const matchesActivo = !activoFilter || (activoFilter === 'true' ? row.activo : !row.activo);
      return matchesSearch && matchesActivo;
    });
  }, [activoFilter, response.data, search]);

  useEffect(() => {
    setPage(0);
  }, [activoFilter, search]);

  useEffect(() => {
    if (!dialogMode) {
      setSelectedRow(null);
      setForm(EMPTY_FORM);
      validation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogMode]);

  const columns = [
    {
      key: 'codigo',
      title: 'Codigo',
      render: (row: Departamento) => <Typography variant="body2">{row.codigo}</Typography>
    },
    {
      key: 'nombre',
      title: 'Departamento',
      render: (row: Departamento) => <Typography variant="body2">{row.nombre}</Typography>
    },
    {
      key: 'descripcion',
      title: 'Descripcion',
      render: (row: Departamento) => <Typography variant="body2">{row.descripcion || '-'}</Typography>
    },
    {
      key: 'activo',
      title: 'Estado',
      render: (row: Departamento) => <StatusChip active={row.activo} />
    },
    {
      key: 'acciones',
      title: 'Acciones',
      render: (row: Departamento) => (
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
              label: 'Ver servicios',
              onClick: () => navigate(`/organizacion/servicios?id_departamento=${row.id}`),
              tone: 'secondary'
            },
            ...(permissions.puedeVerPersonal
              ? [
                  {
                    label: 'Ver personal',
                    onClick: () => navigate(`/personal?id_departamento=${row.id}`),
                    tone: 'secondary' as const
                  }
                ]
              : [])
          ]}
        />
      )
    }
  ];

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
        ...(puedeGestionar ? [{ label: 'Nuevo departamento', onClick: () => setDialogMode('create'), tone: 'primary' as const }] : [])
      ]}
      description="Vista institucional de departamentos para administrar estructura base, navegar servicios y revisar dotacion."
      filters={
        <>
          <TextField
            label="Buscar departamento"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Codigo, nombre o descripcion"
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
            { label: 'Departamentos', value: response.data?.meta.total || 0 },
            { label: 'Visibles', value: filteredRows.length }
          ]}
        />
      }
      // summary={`${filteredRows.length} departamentos visibles de ${response.data?.meta.total || 0}`}
      title="Departamentos"
    >
      <Grid size={12}>
        <OperationalTableCard
          columns={columns}
          emptyMessage="No hay departamentos disponibles en la API."
          error={response.error}
          getRowKey={(row) => row.id}
          loading={response.loading}
          onRetry={response.refetch}
          rows={filteredRows}
          slow={response.slow}
          subtitle="Consulta base para administrar departamentos y navegar servicios o personal por alcance."
          title="Departamentos institucionales"
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
        title="Desactivar departamento"
      >
        <Alert severity="warning">
          {(rowToConfirmDeactivate?.cantidadPersonalActivo ?? 0) > 0
            ? `El departamento "${rowToConfirmDeactivate?.nombre}" tiene ${rowToConfirmDeactivate?.cantidadPersonalActivo} personal activo asignado. Al desactivarlo, el departamento quedara inactivo pero el personal y sus asignaciones no se veran afectados. ¿Deseas continuar?`
            : `¿Estás seguro que deseas desactivar el departamento "${rowToConfirmDeactivate?.nombre}"? Quedara inactivo hasta que lo actives de nuevo.`}
        </Alert>
      </ConfirmDialog>

      <FormDialog
        onClose={() => setDialogMode(null)}
        onSubmit={() => void handleSubmit()}
        open={dialogMode !== null}
        submitting={submitting}
        title={dialogMode === 'create' ? 'Nuevo departamento' : 'Editar departamento'}
      >
        <Stack spacing={1.5} sx={{ mt: 0.5 }}>
          <TextField
            label="Codigo"
            required
            {...validation.fieldProps('codigo', 'Identificador corto. Ejemplo: NEO, UCI, CIR.')}
            onChange={(event) => setForm((current) => ({ ...current, codigo: event.target.value.toUpperCase() }))}
            size="small"
            value={form.codigo}
          />
          <TextField
            label="Nombre"
            required
            {...validation.fieldProps('nombre', 'Nombre visible en organigrama, filtros y reportes.')}
            onChange={(event) => setForm((current) => ({ ...current, nombre: event.target.value }))}
            size="small"
            value={form.nombre}
          />
          <TextField
            helperText="Opcional. Contexto interno, no se muestra en la matriz."
            label="Descripcion"
            minRows={3}
            multiline
            onChange={(event) => setForm((current) => ({ ...current, descripcion: event.target.value }))}
            size="small"
            value={form.descripcion || ''}
          />
        </Stack>
      </FormDialog>
    </OperationalPageTemplate>
  );

  function openEdit(row: Departamento) {
    setSelectedRow(row);
    setForm({
      codigo: row.codigo,
      nombre: row.nombre,
      descripcion: row.descripcion || '',
      activo: row.activo
    });
    setDialogMode('edit');
  }

  async function handleSubmit() {
    if (!validation.validate(form)) {
      return;
    }

    setSubmitting(true);
    try {
      const payload: GuardarDepartamentoInput = {
        codigo: form.codigo.trim().toUpperCase(),
        nombre: form.nombre.trim(),
        descripcion: form.descripcion?.trim() || undefined,
        activo: selectedRow?.activo ?? true
      };

      if (dialogMode === 'create') {
        await organizacionApi.createDepartamento(payload);
        showSuccess(`Departamento "${payload.nombre}" creado correctamente.`);
      } else if (dialogMode === 'edit' && selectedRow) {
        await organizacionApi.updateDepartamento(selectedRow.id, payload);
        showSuccess(`Departamento "${payload.nombre}" actualizado correctamente.`);
      }

      setDialogMode(null);
      setRefreshKey((value) => value + 1);
    } catch (error) {
      showError(error instanceof Error ? error.message : 'No se pudo guardar el departamento.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(row: Departamento) {
    if (row.activo) {
      setRowToConfirmDeactivate(row);
      return;
    }
    await executeToggle(row);
  }

  async function executeToggle(row: Departamento) {
    setRowToConfirmDeactivate(null);
    setTogglingId(row.id);
    try {
      if (row.activo) {
        await organizacionApi.deleteDepartamento(row.id);
      } else {
        await organizacionApi.activateDepartamento(row.id);
      }
      showSuccess(row.activo ? `Departamento "${row.nombre}" desactivado.` : `Departamento "${row.nombre}" activado.`);
      setRefreshKey((value) => value + 1);
    } catch (error) {
      showError(error instanceof Error ? error.message : 'No se pudo cambiar el estado del departamento.');
    } finally {
      setTogglingId(null);
    }
  }
}
