import { useEffect, useMemo, useState } from 'react';

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
import { personalApi } from 'services/personalApi';
import type { NivelCargoBase } from 'types/api';
import { operationalFieldSx } from 'utils/operational-ui';

type FormState = {
  codigo: string;
  nombre: string;
  descripcion: string;
};

export default function CargosPage() {
  const { permissions } = useAccessControl();
  const { showSuccess, showError } = useAppToast();
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState('');
  const [activoFilter, setActivoFilter] = useState('');
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | null>(null);
  const [selectedRow, setSelectedRow] = useState<NivelCargoBase | null>(null);
  const [form, setForm] = useState<FormState>({ codigo: '', nombre: '', descripcion: '' });
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const response = useApiRequest(personalApi.getNivelesCargo, [refreshKey]);
  const puedeGestionar = permissions.puedeGestionarPersonal;
  const validation = useFormValidation<FormState>({
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
      setForm({ codigo: '', nombre: '', descripcion: '' });
      validation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogMode]);

  const columns = [
    { key: 'codigo', title: 'Codigo', render: (row: NivelCargoBase) => <Typography variant="body2">{row.codigo}</Typography> },
    { key: 'nombre', title: 'Cargo', render: (row: NivelCargoBase) => <Typography variant="body2">{row.nombre}</Typography> },
    {
      key: 'descripcion',
      title: 'Descripcion',
      render: (row: NivelCargoBase) => <Typography variant="body2">{row.descripcion || '-'}</Typography>
    },
    { key: 'activo', title: 'Estado', render: (row: NivelCargoBase) => <StatusChip active={row.activo} /> },
    ...(puedeGestionar
      ? [
          {
            key: 'acciones',
            title: 'Acciones',
            render: (row: NivelCargoBase) => (
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
            )
          }
        ]
      : [])
  ];

  function openEdit(row: NivelCargoBase) {
    setSelectedRow(row);
    setForm({
      codigo: row.codigo,
      nombre: row.nombre,
      descripcion: row.descripcion || ''
    });
    setDialogMode('edit');
  }

  async function submit() {
    if (!validation.validate(form)) {
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        codigo: form.codigo.toUpperCase().trim(),
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || undefined,
        activo: selectedRow?.activo ?? true
      };
      if (dialogMode === 'create') {
        await personalApi.createNivelCargo(payload);
        showSuccess(`Cargo "${payload.nombre}" creado correctamente.`);
      } else if (dialogMode === 'edit' && selectedRow) {
        await personalApi.updateNivelCargo(selectedRow.id, payload);
        showSuccess(`Cargo "${payload.nombre}" actualizado correctamente.`);
      }
      setDialogMode(null);
      setRefreshKey((value) => value + 1);
    } catch (error) {
      showError(error instanceof Error ? error.message : 'No se pudo guardar el cargo.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(row: NivelCargoBase) {
    setTogglingId(row.id);
    try {
      if (row.activo) {
        await personalApi.deleteNivelCargo(row.id);
      } else {
        await personalApi.activateNivelCargo(row.id);
      }
      showSuccess(`Cargo "${row.nombre}" ${row.activo ? 'desactivado' : 'activado'} correctamente.`);
      setRefreshKey((value) => value + 1);
    } catch (error) {
      showError(error instanceof Error ? error.message : 'No se pudo cambiar el estado del cargo.');
    } finally {
      setTogglingId(null);
    }
  }

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
        ...(puedeGestionar ? [{ label: 'Nuevo cargo', onClick: () => setDialogMode('create'), tone: 'primary' as const }] : [])
      ]}
      description="Catalogo institucional de cargos base usados para alta de personal y clasificacion funcional."
      filters={
        <>
          <TextField
            label="Buscar"
            size="small"
            sx={operationalFieldSx.search}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Codigo, cargo o descripcion"
          />
          <TextField
            label="Estado"
            size="small"
            select
            sx={operationalFieldSx.short}
            value={activoFilter}
            onChange={(event) => setActivoFilter(event.target.value)}
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
            { label: 'Catalogo', value: response.data?.meta.total || 0 },
            { label: 'Visibles', value: filteredRows.length }
          ]}
        />
      }
      // summary={`${filteredRows.length} cargos visibles de ${response.data?.meta.total || 0}`}
      title="Cargos"
    >
      <Grid size={12}>
        <OperationalTableCard
          columns={columns}
          emptyMessage="No hay cargos disponibles."
          error={response.error}
          loading={response.loading}
          onRetry={response.refetch}
          rows={filteredRows}
          slow={response.slow}
          getRowKey={(row) => row.id}
          title="Catalogo de cargos"
          subtitle="Cargos base para clasificacion funcional del personal."
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
        onClose={() => setDialogMode(null)}
        onSubmit={() => void submit()}
        open={dialogMode !== null}
        submitting={submitting}
        title={dialogMode === 'create' ? 'Nuevo cargo' : 'Editar cargo'}
      >
        <Stack spacing={1.5} sx={{ mt: 0.5 }}>
          <TextField
            label="Codigo"
            required
            {...validation.fieldProps('codigo', 'Identificador corto. Ejemplo: MED, ENF, TEC.')}
            size="small"
            value={form.codigo}
            onChange={(event) => setForm((current) => ({ ...current, codigo: event.target.value.toUpperCase() }))}
          />
          <TextField
            label="Nombre"
            required
            {...validation.fieldProps('nombre', 'Nombre visible en el registro de personal y reportes de dotacion.')}
            size="small"
            value={form.nombre}
            onChange={(event) => setForm((current) => ({ ...current, nombre: event.target.value }))}
          />
          <TextField
            helperText="Opcional. Contexto interno sobre este cargo."
            label="Descripcion"
            size="small"
            multiline
            minRows={3}
            value={form.descripcion}
            onChange={(event) => setForm((current) => ({ ...current, descripcion: event.target.value }))}
          />
        </Stack>
      </FormDialog>
    </OperationalPageTemplate>
  );
}
