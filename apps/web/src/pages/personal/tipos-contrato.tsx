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
import type { TipoContrato } from 'types/api';
import { operationalFieldSx } from 'utils/operational-ui';
import { compactSelectMenuProps } from 'utils/select-menu-props';

type FormState = {
  codigo: string;
  nombre: string;
  descripcion: string;
};

const EMPTY_FORM: FormState = { codigo: '', nombre: '', descripcion: '' };

export default function TiposContratoPage() {
  const { permissions } = useAccessControl();
  const { showSuccess, showError } = useAppToast();
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState('');
  const [activoFilter, setActivoFilter] = useState('');
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | null>(null);
  const [selectedRow, setSelectedRow] = useState<TipoContrato | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const response = useApiRequest(personalApi.getTiposContrato, [refreshKey]);
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
      setForm(EMPTY_FORM);
      validation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogMode]);

  const columns = [
    { key: 'codigo', title: 'Codigo', render: (row: TipoContrato) => <Typography variant="body2">{row.codigo}</Typography> },
    { key: 'nombre', title: 'Nombre', render: (row: TipoContrato) => <Typography variant="body2">{row.nombre}</Typography> },
    {
      key: 'descripcion',
      title: 'Descripcion',
      render: (row: TipoContrato) => (
        <Typography color="text.secondary" variant="body2">
          {row.descripcion || '-'}
        </Typography>
      )
    },
    { key: 'activo', title: 'Estado', render: (row: TipoContrato) => <StatusChip active={row.activo} /> },
    ...(puedeGestionar
      ? [
          {
            key: 'acciones',
            title: 'Acciones',
            render: (row: TipoContrato) => (
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

  function openEdit(row: TipoContrato) {
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
      const nombre = form.nombre.trim();
      const descripcion = form.descripcion.trim() || undefined;
      if (dialogMode === 'create') {
        await personalApi.createTipoContrato({ codigo: form.codigo.toUpperCase().trim(), nombre, descripcion });
        showSuccess(`Tipo de contrato "${nombre}" creado correctamente.`);
      } else if (dialogMode === 'edit' && selectedRow) {
        await personalApi.updateTipoContrato(selectedRow.id, { nombre, descripcion });
        showSuccess(`Tipo de contrato "${nombre}" actualizado correctamente.`);
      }
      setDialogMode(null);
      setRefreshKey((value) => value + 1);
    } catch (error) {
      showError(error instanceof Error ? error.message : 'No se pudo guardar el tipo de contrato.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(row: TipoContrato) {
    setTogglingId(row.id);
    try {
      if (row.activo) {
        await personalApi.deleteTipoContrato(row.id);
      } else {
        await personalApi.activateTipoContrato(row.id);
      }
      showSuccess(`Tipo de contrato "${row.nombre}" ${row.activo ? 'desactivado' : 'activado'} correctamente.`);
      setRefreshKey((value) => value + 1);
    } catch (error) {
      showError(error instanceof Error ? error.message : 'No se pudo cambiar el estado del tipo de contrato.');
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
        ...(puedeGestionar ? [{ label: 'Nuevo tipo de contrato', onClick: () => setDialogMode('create'), tone: 'primary' as const }] : [])
      ]}
      description="Catalogo de fuentes de financiamiento / tipos de contrato para el personal institucional. Un tipo desactivado deja de ofrecerse en altas y asignaciones nuevas; las existentes lo conservan."
      filters={
        <>
          <TextField
            label="Buscar"
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
            { label: 'Catalogo', value: response.data?.meta.total || 0 },
            { label: 'Visibles', value: filteredRows.length }
          ]}
        />
      }
      title="Tipos de contrato"
    >
      <Grid size={12}>
        <OperationalTableCard
          columns={columns}
          emptyMessage="No hay tipos de contrato disponibles."
          error={response.error}
          getRowKey={(row) => row.id}
          loading={response.loading}
          onRetry={response.refetch}
          pagination={{
            page,
            rowsPerPage,
            onPageChange: setPage,
            onRowsPerPageChange: (value) => {
              setRowsPerPage(value);
              setPage(0);
            }
          }}
          rows={filteredRows}
          slow={response.slow}
          subtitle="Fuentes de financiamiento vigentes para asignaciones de personal."
          title="Catalogo de tipos de contrato"
          total={filteredRows.length}
        />
      </Grid>
      <FormDialog
        onClose={() => setDialogMode(null)}
        onSubmit={() => void submit()}
        open={dialogMode !== null}
        submitting={submitting}
        title={dialogMode === 'create' ? 'Nuevo tipo de contrato' : 'Editar tipo de contrato'}
      >
        <Stack spacing={1.5} sx={{ mt: 0.5 }}>
          <TextField
            disabled={dialogMode === 'edit'}
            label="Codigo"
            required
            {...validation.fieldProps(
              'codigo',
              dialogMode === 'edit'
                ? 'El codigo no se puede cambiar: ya figura en planificaciones y exportaciones.'
                : 'Identificador corto, no se podra cambiar despues. Ejemplo: IDH-REDE, HIPIC.'
            )}
            size="small"
            value={form.codigo}
            onChange={(event) => setForm((current) => ({ ...current, codigo: event.target.value.toUpperCase() }))}
          />
          <TextField
            label="Nombre"
            required
            {...validation.fieldProps('nombre', 'Nombre visible en asignaciones, reportes y exportaciones.')}
            size="small"
            value={form.nombre}
            onChange={(event) => setForm((current) => ({ ...current, nombre: event.target.value }))}
          />
          <TextField
            helperText="Opcional. Contexto interno sobre este tipo de contrato."
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
