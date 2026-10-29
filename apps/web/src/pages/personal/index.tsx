import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import ActionButtonGroup from 'components/system/ActionButtonGroup';
import ConfirmDialog from 'components/system/ConfirmDialog';
import OperationalPageTemplate from 'components/system/OperationalPageTemplate';
import OperationalStats from 'components/system/OperationalStats';
import OperationalTableCard from 'components/system/OperationalTableCard';
import PersonalAltaDialog from 'components/system/PersonalAltaDialog';
import PersonalFormDialog from 'components/system/PersonalFormDialog';
import StatusChip from 'components/system/StatusChip';
import { useAppToast } from 'components/system/AppToastProvider';
import { useAccessControl } from 'hooks/use-access-control';
import { canAccessGlobalCatalogs } from 'hooks/use-access-control';
import { useApiRequest } from 'hooks/useApiRequest';
import { organizacionApi } from 'services/organizacionApi';
import { personalApi } from 'services/personalApi';
import type { NivelCargoBase, Personal, RolFuncionalBase } from 'types/api';
import { operationalFieldSx } from 'utils/operational-ui';
import { compactSelectMenuProps } from 'utils/select-menu-props';

export default function PersonalPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { permissions, session } = useAccessControl();
  const { showSuccess, showError } = useAppToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [refreshKey, setRefreshKey] = useState(0);
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [formTarget, setFormTarget] = useState<Personal | null>(null);
  const [altaTarget, setAltaTarget] = useState<Personal | null>(null);
  const [soloSinAsignacion, setSoloSinAsignacion] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [rowToConfirmBaja, setRowToConfirmBaja] = useState<Personal | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const filters = {
    idNivelCargo: Number(searchParams.get('id_nivel_cargo') || '') || undefined,
    rolFuncional: searchParams.get('rol_funcional') || undefined,
    nombre: searchParams.get('nombre') || undefined,
    activo: searchParams.get('activo') === 'true' ? true : searchParams.get('activo') === 'false' ? false : undefined
  };

  const puedeGestionar = permissions.puedeGestionarPersonal;
  const esGestorGlobal = canAccessGlobalCatalogs(session);
  const esJefeServicio = session?.alcancePlanificacion === 'SERVICIO';

  const departamentos = useApiRequest(organizacionApi.getDepartamentos);
  const cargos = useApiRequest(personalApi.getNivelesCargo);
  const tiposContrato = useApiRequest(personalApi.getTiposContrato);
  const cargasHorarias = useApiRequest(personalApi.getCargasHorarias);
  const rolesFuncionales = useApiRequest(personalApi.getRolesFuncionales);
  const response = useApiRequest(
    () => personalApi.getPersonal({ ...filters }),
    [filters.activo, filters.idNivelCargo, filters.nombre, filters.rolFuncional, refreshKey]
  );

  useEffect(() => {
    setPage(0);
  }, [filters.activo, filters.idNivelCargo, filters.nombre, filters.rolFuncional, refreshKey]);

  useEffect(() => {
    const state = location.state as { editPersonalId?: number } | null;
    if (!state?.editPersonalId || response.loading) {
      return;
    }

    const row = (response.data?.data || []).find((item) => item.id === state.editPersonalId);
    if (!row) {
      return;
    }

    openEdit(row);
    navigate(location.pathname + location.search, { replace: true, state: null });
  }, [location.pathname, location.search, location.state, navigate, response.data, response.loading]);

  const departamentosPermitidos = useMemo(() => {
    const all = departamentos.data?.data || [];

    if (esGestorGlobal || !session) {
      return all;
    }

    const allowedIds = new Set(session.departamentosGestionables.map((item) => item.id));
    return all.filter((item) => allowedIds.has(item.id));
  }, [departamentos.data, esGestorGlobal, session]);

  // Mismo criterio que asignaciones.tsx: un jefe de servicio no gestiona nada
  // fuera de su servicio, asi que filtrar por JEFE_DEPARTAMENTO en esta pantalla
  // nunca tendria resultados posibles para su alcance.
  const roleOptions = useMemo(() => {
    const all = (rolesFuncionales.data?.data || []).map((item: RolFuncionalBase) => item.codigo);
    if (esJefeServicio) {
      return all.filter((codigo) => codigo !== 'JEFE_DEPARTAMENTO');
    }
    return all;
  }, [esJefeServicio, rolesFuncionales.data]);

  const filteredRows = useMemo(() => {
    const source = response.data?.data || [];
    return source.filter((row) => {
      const matchesCargo = !filters.idNivelCargo || row.idNivelCargo === filters.idNivelCargo;
      const search = (filters.nombre || '').trim().toLowerCase();
      const matchesSearch =
        !search ||
        row.nombreCompleto.toLowerCase().includes(search) ||
        (row.codigoPersonal || '').toLowerCase().includes(search) ||
        row.documentoIdentidad.toLowerCase().includes(search);
      const matchesActivo = typeof filters.activo !== 'boolean' || row.activo === filters.activo;
      const matchesSinAsignacion = !soloSinAsignacion || !row.tieneAsignacionActiva;

      // El filtro por rol funcional ya lo resuelve el backend (query rol_funcional
      // contra la asignacion PRINCIPAL) — este listado ya no trae codigoRolFuncional
      // para no duplicar detalle de asignacion (docs/database/decisiones-tecnicas.md
      // seccion 78), asi que no hace falta re-filtrar por rol en el cliente.
      return matchesCargo && matchesSearch && matchesActivo && matchesSinAsignacion;
    });
  }, [filters.activo, filters.idNivelCargo, filters.nombre, response.data, soloSinAsignacion]);
  const paginatedRows = useMemo(
    () => filteredRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filteredRows, page, rowsPerPage]
  );

  const handleDelete = useCallback(
    async (row: Personal) => {
      setRowToConfirmBaja(null);
      setDeletingId(row.id);

      try {
        if (row.activo) {
          await personalApi.deletePersonal(row.id);
        } else {
          await personalApi.activatePersonal(row.id);
        }
        showSuccess(`Personal "${row.nombreCompleto}" ${row.activo ? 'dado de baja' : 'reactivado'} correctamente.`);
        setRefreshKey((value) => value + 1);
      } catch (error) {
        showError(
          error instanceof Error ? error.message : row.activo ? 'No se pudo dar de baja al personal.' : 'No se pudo reactivar al personal.'
        );
      } finally {
        setDeletingId(null);
      }
    },
    [showError, showSuccess]
  );

  const handleToggleActive = useCallback(
    async (row: Personal) => {
      if (row.activo) {
        setRowToConfirmBaja(row);
        return;
      }
      await handleDelete(row);
    },
    [handleDelete]
  );

  const columns = useMemo(
    () => [
      {
        key: 'codigoPersonal',
        title: 'Codigo',
        render: (row: Personal) => <Typography variant="body2">{row.codigoPersonal || '-'}</Typography>
      },
      {
        key: 'nombreCompleto',
        title: 'Personal',
        render: (row: Personal) => (
          <Stack spacing={0.25}>
            <Typography variant="body2">{row.nombreCompleto}</Typography>
            <Typography color="text.secondary" variant="caption">
              CI {row.documentoIdentidad}
            </Typography>
          </Stack>
        )
      },
      {
        key: 'cargo',
        title: 'Cargo',
        render: (row: Personal) => <Typography variant="body2">{row.nombreNivelCargo || '-'}</Typography>
      },
      {
        key: 'asignacion',
        title: 'Asignacion',
        render: (row: Personal) =>
          row.activo && !row.tieneAsignacionActiva ? (
            <Chip color="warning" label="Sin asignacion" size="small" variant="outlined" />
          ) : (
            <Typography color="text.secondary" variant="body2">
              {row.tieneAsignacionActiva ? 'Asignado' : '-'}
            </Typography>
          )
      },
      {
        key: 'activo',
        title: 'Estado',
        render: (row: Personal) => <StatusChip active={row.activo} />
      },
      {
        key: 'acciones',
        title: 'Acciones',
        render: (row: Personal) => (
          <ActionButtonGroup
            actions={[
              ...(puedeGestionar
                ? [
                    {
                      label: 'Asignacion',
                      disabled: !row.activo || row.tieneAsignacionActiva,
                      onClick: () => setAltaTarget(row),
                      tone: row.activo && !row.tieneAsignacionActiva ? ('primary' as const) : ('secondary' as const)
                    }
                  ]
                : []),
              {
                label: 'Detalle',
                onClick: () =>
                  navigate(`/personal/${row.id}`, {
                    state: {
                      backTo: `/personal${searchParams.toString() ? `?${searchParams.toString()}` : ''}`,
                      backLabel: 'Volver a personal'
                    }
                  }),
                tone: 'secondary'
              },
              ...(puedeGestionar
                ? [
                    {
                      label: 'Editar',
                      onClick: () => openEdit(row),
                      tone: 'secondary' as const
                    },
                    {
                      label: deletingId === row.id ? (row.activo ? 'Dando de baja...' : 'Activando...') : row.activo ? 'Baja' : 'Activar',
                      disabled: deletingId === row.id,
                      onClick: () => void handleToggleActive(row),
                      tone: row.activo ? ('danger' as const) : ('secondary' as const)
                    }
                  ]
                : [])
            ]}
          />
        )
      }
    ],
    [deletingId, handleToggleActive, navigate, puedeGestionar, searchParams]
  );

  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next);
  }

  const openCreate = () => {
    setFormTarget(null);
    setFormMode('create');
  };

  const openEdit = (row: Personal) => {
    setFormTarget(row);
    setFormMode('edit');
  };

  const handleFormSaved = () => {
    setFormMode(null);
    setFormTarget(null);
    setRefreshKey((value) => value + 1);
  };

  const handleAltaSaved = () => {
    setAltaTarget(null);
    setRefreshKey((value) => value + 1);
  };

  return (
    <>
      <OperationalPageTemplate
        actions={[
          { label: 'Recargar', onClick: () => setRefreshKey((value) => value + 1), tone: 'secondary' },
          {
            label: 'Limpiar filtros',
            onClick: () => setSearchParams(new URLSearchParams()),
            tone: 'secondary'
          },
          ...(puedeGestionar ? [{ label: 'Nuevo personal', onClick: openCreate, tone: 'primary' as const }] : [])
        ]}
        description="Base operativa institucional de personas con cargo base, asignacion principal y estado de actividad."
        filters={
          <>
            <TextField
              label="Buscar personal"
              onChange={(event) => setFilter('nombre', event.target.value)}
              placeholder="Nombre, codigo o C.I."
              size="small"
              sx={operationalFieldSx.search}
              value={filters.nombre || ''}
            />
            <TextField
              label="Estado"
              onChange={(event) => setFilter('activo', event.target.value)}
              select
              SelectProps={compactSelectMenuProps}
              size="small"
              sx={operationalFieldSx.short}
              value={typeof filters.activo === 'boolean' ? String(filters.activo) : ''}
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="true">Activos</MenuItem>
              <MenuItem value="false">Inactivos</MenuItem>
            </TextField>
            <TextField
              label="Cargo"
              onChange={(event) => setFilter('id_nivel_cargo', event.target.value)}
              select
              SelectProps={compactSelectMenuProps}
              size="small"
              sx={operationalFieldSx.normal}
              value={filters.idNivelCargo ? String(filters.idNivelCargo) : ''}
            >
              <MenuItem value="">Todos</MenuItem>
              {(cargos.data?.data || []).map((item: NivelCargoBase) => (
                <MenuItem key={item.id} value={String(item.id)}>
                  {item.nombre}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Rol funcional"
              onChange={(event) => setFilter('rol_funcional', event.target.value)}
              select
              SelectProps={compactSelectMenuProps}
              size="small"
              sx={operationalFieldSx.normal}
              value={filters.rolFuncional || ''}
            >
              <MenuItem value="">Todos</MenuItem>
              {roleOptions.map((item) => (
                <MenuItem key={item} value={item}>
                  {item}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Asignacion"
              onChange={(event) => setSoloSinAsignacion(event.target.value === 'sin')}
              select
              SelectProps={compactSelectMenuProps}
              size="small"
              sx={operationalFieldSx.normal}
              value={soloSinAsignacion ? 'sin' : ''}
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="sin">Sin asignacion activa</MenuItem>
            </TextField>
          </>
        }
        stats={
          <OperationalStats
            items={[
              { label: 'Total', value: response.data?.meta.total || 0 },
              { label: 'Visibles', value: filteredRows.length },
              {
                label: 'Sin asignacion',
                value: (response.data?.data || []).filter((r) => !r.tieneAsignacionActiva && r.activo).length
              }
            ]}
          />
        }
        title="Personal"
      >
        <Grid size={12}>
          <OperationalTableCard
            columns={columns}
            emptyMessage="No hay personal disponible con el filtro actual."
            error={response.error}
            getRowKey={(row) => row.id}
            loading={response.loading}
            onRetry={response.refetch}
            rows={paginatedRows}
            slow={response.slow}
            subtitle="Consulta real a GET /v1/personal con alta, edicion y baja logica controlada."
            title="Dotacion base"
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
      </OperationalPageTemplate>

      <ConfirmDialog
        confirmLabel="Dar de baja"
        confirmLoadingLabel="Dando de baja..."
        loading={deletingId === rowToConfirmBaja?.id}
        onClose={() => setRowToConfirmBaja(null)}
        onConfirm={() => rowToConfirmBaja && void handleDelete(rowToConfirmBaja)}
        open={rowToConfirmBaja !== null}
        title="Dar de baja a personal"
      >
        <Alert severity="warning">
          {`¿Estás seguro que deseas dar de baja a "${rowToConfirmBaja?.nombreCompleto}"? Quedará inactivo y podrás reactivarlo luego.`}
        </Alert>
      </ConfirmDialog>

      <PersonalFormDialog
        cargos={cargos.data?.data || []}
        mode={formMode || 'create'}
        onClose={() => setFormMode(null)}
        onSaved={handleFormSaved}
        open={formMode !== null}
        personal={formTarget}
      />

      <PersonalAltaDialog
        cargasHorarias={cargasHorarias.data?.data || []}
        departamentosPermitidos={departamentosPermitidos}
        onClose={() => setAltaTarget(null)}
        onSaved={handleAltaSaved}
        open={altaTarget !== null}
        personal={altaTarget}
        rolesFuncionales={rolesFuncionales.data?.data || []}
        tiposContrato={tiposContrato.data?.data || []}
      />
    </>
  );
}
