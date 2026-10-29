import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import ActionButtonGroup from 'components/system/ActionButtonGroup';
import AsignacionAddSecondaryDialog from 'components/system/AsignacionAddSecondaryDialog';
import AsignacionCloseDialog from 'components/system/AsignacionCloseDialog';
import AsignacionEditDialog from 'components/system/AsignacionEditDialog';
import OperationalPageTemplate from 'components/system/OperationalPageTemplate';
import OperationalScopeSummary from 'components/system/OperationalScopeSummary';
import OperationalStats from 'components/system/OperationalStats';
import OperationalTableCard from 'components/system/OperationalTableCard';
import { useAppToast } from 'components/system/AppToastProvider';
import { canAccessGlobalCatalogs, useAccessControl } from 'hooks/use-access-control';
import { useDepartmentServiceCascade } from 'hooks/use-department-service-cascade';
import { useApiRequest } from 'hooks/useApiRequest';
import { organizacionApi } from 'services/organizacionApi';
import { personalApi } from 'services/personalApi';
import type { Asignacion } from 'types/api';
import { operationalFieldSx } from 'utils/operational-ui';
import { compactSelectMenuProps } from 'utils/select-menu-props';

export default function AsignacionesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { permissions, session: activeSession } = useAccessControl();
  const { showError } = useAppToast();
  const [refreshKey, setRefreshKey] = useState(0);
  const [editDialog, setEditDialog] = useState<Asignacion | null>(null);
  const [closeTarget, setCloseTarget] = useState<Asignacion | null>(null);
  const [addSecondaryTarget, setAddSecondaryTarget] = useState<Asignacion | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const esGestorGlobalAsignaciones = canAccessGlobalCatalogs(activeSession);
  const esJefaDepartamento = activeSession?.alcancePlanificacion === 'DEPARTAMENTO';
  const esJefeServicio = activeSession?.alcancePlanificacion === 'SERVICIO';

  // Esta pantalla es exclusivamente operativa: quien esta asignado ahora mismo. El
  // historico (asignaciones cerradas) se consulta desde la Ficha de personal, que ya
  // tiene su propio log de eventos por persona (docs/database/decisiones-tecnicas.md
  // seccion 80) — decision consciente, no una funcionalidad pendiente de agregar aqui.
  const filters = {
    idDepartamento: Number(searchParams.get('id_departamento') || '') || undefined,
    idServicio: Number(searchParams.get('id_servicio') || '') || undefined,
    idPersonal: Number(searchParams.get('id_personal') || '') || undefined,
    rolFuncional: searchParams.get('rol_funcional') || undefined,
    nombre: searchParams.get('nombre') || undefined,
    activo: true
  };

  const puedeModificar = permissions.puedeGestionarAsignaciones || esGestorGlobalAsignaciones;
  const puedeGestionarJefaturas = esGestorGlobalAsignaciones || esJefaDepartamento;
  // Quitar una asignacion es una decision administrativa reservada a Administracion del
  // sistema. Jefatura de departamento puede mover/editar dentro de su alcance, pero no retirar
  // a alguien del servicio (ver AsignacionAccessPolicyService.assertPuedeCerrar en backend).
  const puedeCerrarAsignaciones = esGestorGlobalAsignaciones;
  const puedeRegularizarAsignaciones = esGestorGlobalAsignaciones || esJefaDepartamento;
  const puedeEditarDepartamento = esGestorGlobalAsignaciones;
  // Sin ninguna capacidad de gestion sobre esta pantalla, el usuario es solo lector
  // (ej. JEFE_SERVICIO con puedeVerAsignaciones): no debe ver la columna de acciones.
  const esSoloLecturaAsignaciones = !puedeModificar && !puedeGestionarJefaturas && !puedeCerrarAsignaciones;

  const departamentos = useApiRequest(organizacionApi.getDepartamentos);
  const servicios = useApiRequest(() => organizacionApi.getServicios(filters.idDepartamento), [filters.idDepartamento]);
  // Todos los servicios sin filtro de departamento — necesario para el modal de asignacion secundaria,
  // donde el usuario elige cualquier departamento independientemente del filtro activo en la tabla.
  const serviciosTodos = useApiRequest(organizacionApi.getServicios);
  const asignaciones = useApiRequest(
    () => personalApi.getAsignaciones({ ...filters, page: page + 1, pageSize: rowsPerPage }),
    [
      filters.activo,
      filters.idDepartamento,
      filters.idPersonal,
      filters.idServicio,
      filters.rolFuncional,
      filters.nombre,
      page,
      refreshKey,
      rowsPerPage
    ]
  );
  const rolesFuncionales = useApiRequest(personalApi.getRolesFuncionales);
  const cargasHorarias = useApiRequest(personalApi.getCargasHorarias);
  const tiposContrato = useApiRequest(personalApi.getTiposContrato);
  const roleOptions = useMemo(() => {
    const all = (rolesFuncionales.data?.data || []).map((item) => item.codigo);
    // El jefe de servicio no gestiona nada fuera de su servicio: filtrar por
    // JEFE_DEPARTAMENTO no tendria ningun resultado posible en su vista.
    if (esJefeServicio) {
      return all.filter((codigo) => codigo !== 'JEFE_DEPARTAMENTO');
    }
    return all;
  }, [esJefeServicio, rolesFuncionales.data]);
  const rolesFuncionalesMovimiento = useMemo(() => {
    const all = rolesFuncionales.data?.data || [];
    return all.filter((item) => !item.esJefatura);
  }, [rolesFuncionales.data]);
  const rolesFuncionalesJefatura = useMemo(() => {
    const all = rolesFuncionales.data?.data || [];

    if (esGestorGlobalAsignaciones) {
      return all;
    }

    if (esJefaDepartamento) {
      return all.filter((item) => item.codigo !== 'JEFE_DEPARTAMENTO');
    }

    return all.filter((item) => !item.esJefatura);
  }, [esGestorGlobalAsignaciones, esJefaDepartamento, rolesFuncionales.data]);

  const departamentosPermitidos = useMemo(() => {
    const all = departamentos.data?.data || [];

    if (!activeSession || esGestorGlobalAsignaciones) {
      return all;
    }

    const allowedIds = new Set(activeSession.departamentosGestionables.map((item) => item.id));
    return all.filter((item) => allowedIds.has(item.id));
  }, [activeSession, departamentos.data, esGestorGlobalAsignaciones]);
  const departamentoUnico = departamentosPermitidos.length === 1 ? departamentosPermitidos[0] : null;

  const serviciosGestionablesIds = useMemo(() => (activeSession?.serviciosGestionables ?? []).map((item) => item.id), [activeSession]);

  const serviciosPermitidos = useMemo(() => {
    const all = servicios.data?.data || [];

    if (!activeSession || esGestorGlobalAsignaciones) {
      return all;
    }

    const allowedIds = new Set(serviciosGestionablesIds);
    return all.filter((item) => allowedIds.has(item.id));
  }, [activeSession, esGestorGlobalAsignaciones, servicios.data, serviciosGestionablesIds]);
  // El jefe de servicio siempre gestiona un unico servicio propio (a diferencia de un
  // jefe de departamento, que puede sumar servicios nuevos a su departamento): se oculta
  // el filtro de Servicio y se muestra como contexto fijo en vez de un dropdown de 1 opcion.
  const servicioUnicoPropio = esJefeServicio ? serviciosPermitidos[0] || null : null;

  const serviciosTodosPermitidos = useMemo(() => {
    const all = serviciosTodos.data?.data || [];
    if (esGestorGlobalAsignaciones) return all;
    const allowedIds = new Set(serviciosGestionablesIds);
    return all.filter((item) => allowedIds.has(item.id));
  }, [esGestorGlobalAsignaciones, serviciosGestionablesIds, serviciosTodos.data]);

  const { servicePlaceholderLabel, hasDepartments, hasServices } = useDepartmentServiceCascade({
    departments: departamentosPermitidos,
    services: serviciosPermitidos,
    selectedDepartmentId: filters.idDepartamento ? String(filters.idDepartamento) : '',
    selectedServiceId: filters.idServicio ? String(filters.idServicio) : '',
    setSelectedDepartmentId: (value) =>
      setFilters({
        id_departamento: value,
        id_servicio: ''
      }),
    setSelectedServiceId: (value) => setFilter('id_servicio', value),
    // Mismo criterio que turnos.tsx/planificaciones.tsx: el auto-select de
    // departamento solo se activa cuando el select esta oculto porque el
    // actor gestiona un unico departamento (necesita completarse solo). Con
    // mas de uno (SISTEMA) el select queda visible y debe poder sostener
    // "Todos" (string vacio) sin que el hook lo reinterprete como "todavia
    // sin elegir" y lo pise con el primer departamento de la lista.
    autoSelectDepartment: Boolean(departamentoUnico),
    autoSelectService: false
  });

  useEffect(() => {
    setPage(0);
  }, [filters.activo, filters.idDepartamento, filters.idPersonal, filters.idServicio, filters.rolFuncional, filters.nombre]);

  // El backend ya aplica todos estos filtros (incluida la exclusion de asignaciones activas
  // sin destino) y ahora pagina en SQL — no hace falta re-filtrar ni re-cortar en el cliente.
  const rows = asignaciones.data?.data || [];
  const totalRows = asignaciones.data?.meta.total || 0;
  const totalPages = asignaciones.data?.meta.totalPages || 1;

  useEffect(() => {
    if (page > 0 && totalRows === 0) {
      setPage(0);
      return;
    }

    if (page > 0 && page >= totalPages) {
      setPage(Math.max(0, totalPages - 1));
    }
  }, [page, totalPages, totalRows]);

  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next);
  }

  function setFilters(entries: Record<string, string>) {
    const next = new URLSearchParams(searchParams);
    Object.entries(entries).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    setSearchParams(next);
  }

  const openAssignmentDialog = (row: Asignacion) => {
    if (row.esJefaturaRolFuncional) {
      if (!puedeGestionarJefaturas) {
        showError('No tienes permisos para gestionar jefaturas.');
        return;
      }
      if (esJefaDepartamento && row.codigoRolFuncional === 'JEFE_DEPARTAMENTO') {
        showError('La jefatura departamental solo puede ser gestionada por administracion del sistema.');
        return;
      }
    } else if (!puedeModificar && !puedeGestionarJefaturas) {
      showError('No tienes permisos para cambiar esta asignacion.');
      return;
    }
    if (!canMoveAsignacion(row)) {
      showError(
        'No se puede cambiar esta asignacion porque le faltan datos administrativos base. Administracion debe completar tipo de contrato, tipo de item y rol funcional antes de reasignarla.'
      );
      return;
    }
    setEditDialog(row);
  };

  const handleEditSaved = () => {
    setEditDialog(null);
    setRefreshKey((value) => value + 1);
  };

  const canOpenAssignmentDialog = (row: Asignacion) =>
    row.esJefaturaRolFuncional
      ? puedeGestionarJefaturas && !(esJefaDepartamento && row.codigoRolFuncional === 'JEFE_DEPARTAMENTO')
      : puedeModificar || puedeGestionarJefaturas;

  const handleCloseSaved = () => {
    setCloseTarget(null);
    setRefreshKey((value) => value + 1);
  };

  const handleAddSecondarySaved = () => {
    setAddSecondaryTarget(null);
    setRefreshKey((value) => value + 1);
  };

  const columns = [
    {
      key: 'persona',
      title: 'Persona',
      render: (row: Asignacion) => (
        <Stack spacing={0.25}>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Typography variant="body2">{row.nombreCompleto}</Typography>
            <Chip
              label={row.tipoAsignacion === 'PRINCIPAL' ? 'Principal' : 'Secundaria'}
              size="small"
              color={row.tipoAsignacion === 'PRINCIPAL' ? 'primary' : 'default'}
              variant="outlined"
              sx={{ height: 16, fontSize: '0.65rem', '& .MuiChip-label': { px: 0.75 } }}
            />
          </Stack>
          <Typography color="text.secondary" variant="caption">
            {row.codigoPersonal || '-'}
          </Typography>
        </Stack>
      )
    },
    {
      key: 'ambito',
      title: 'Ambito',
      render: (row: Asignacion) => {
        const caption = resolveAmbitoCaption(row);
        return (
          <Stack spacing={0.25}>
            <Typography variant="body2">{resolveAmbitoLabel(row)}</Typography>
            {caption ? (
              <Typography color="text.secondary" variant="caption">
                {caption}
              </Typography>
            ) : null}
          </Stack>
        );
      }
    },
    {
      key: 'rolFuncional',
      title: 'Rol Funcional',
      render: (row: Asignacion) => (
        <Stack alignItems="flex-start" spacing={0.5}>
          <Chip
            color={row.esJefaturaRolFuncional ? 'warning' : 'default'}
            label={row.nombreRolFuncional || row.codigoRolFuncional || '-'}
            size="small"
            variant={row.esJefaturaRolFuncional ? 'filled' : 'outlined'}
          />
          {row.esJefaturaRolFuncional && !row.tieneUsuario ? (
            <Chip
              color="error"
              label="Sin usuario"
              size="small"
              variant="outlined"
              sx={{ height: 16, fontSize: '0.65rem', '& .MuiChip-label': { px: 0.75 } }}
            />
          ) : null}
        </Stack>
      )
    },
    {
      key: 'item',
      title: 'Item',
      render: (row: Asignacion) => (
        <Stack spacing={0.25}>
          <Typography variant="body2">{row.nroItem || '-'}</Typography>
          <Typography color="text.secondary" variant="caption">
            {row.codigoTipoContrato || row.codigoFuenteItem || '-'}
          </Typography>
        </Stack>
      )
    },
    {
      key: 'cargaHoraria',
      title: 'Carga horaria',
      render: (row: Asignacion) => (
        <Stack spacing={0.25}>
          <Typography variant="body2">{row.codigoCargaHoraria || '-'}</Typography>
          <Typography color="text.secondary" variant="caption">
            {row.nombreCargaHoraria || '-'}
          </Typography>
        </Stack>
      )
    },
    {
      key: 'vigencia',
      title: 'Vigencia',
      render: (row: Asignacion) => (
        <Stack spacing={0.25}>
          <Typography variant="body2">{row.fechaInicio.slice(0, 10)}</Typography>
          <Typography color="text.secondary" variant="caption">
            {row.fechaFin ? row.fechaFin.slice(0, 10) : 'Indefinido'}
          </Typography>
        </Stack>
      )
    },
    ...(esSoloLecturaAsignaciones
      ? []
      : [
          {
            key: 'acciones',
            title: 'Acciones',
            render: (row: Asignacion) => (
              <ActionButtonGroup
                actions={[
                  {
                    label: 'Detalle',
                    onClick: () =>
                      navigate(`/personal/${row.idPersonal}`, {
                        state: {
                          backTo: `/personal/asignaciones${searchParams.toString() ? `?${searchParams.toString()}` : ''}`,
                          backLabel: 'Volver a asignaciones'
                        }
                      }),
                    tone: 'secondary'
                  },
                  ...(puedeModificar || puedeGestionarJefaturas
                    ? [
                        {
                          label: row.esJefaturaRolFuncional ? 'Gestionar jefatura' : 'Cambiar asignacion',
                          disabled: !row.activo || !canMoveAsignacion(row) || !canOpenAssignmentDialog(row),
                          onClick: () => openAssignmentDialog(row),
                          tone: 'secondary' as const
                        }
                      ]
                    : []),
                  ...(puedeModificar
                    ? [
                        {
                          label: '+ Asig. secundaria',
                          disabled: !row.activo || row.tipoAsignacion !== 'PRINCIPAL',
                          onClick: () => setAddSecondaryTarget(row),
                          tone: 'secondary' as const
                        }
                      ]
                    : []),
                  ...(puedeCerrarAsignaciones
                    ? [
                        {
                          label: 'Quitar asignacion',
                          // Retirar una jefatura esta permitido (con advertencia propia en
                          // AsignacionCloseDialog): el backend ya desactiva el usuario vinculado
                          // y registra el rol funcional de origen en el historial.
                          disabled: !row.activo,
                          onClick: () => setCloseTarget(row),
                          tone: 'danger' as const
                        }
                      ]
                    : [])
                ]}
              />
            )
          }
        ])
  ];

  return (
    <>
      <OperationalPageTemplate
        actions={[
          { label: 'Recargar', onClick: () => setRefreshKey((value) => value + 1), tone: 'secondary' },
          {
            label: 'Limpiar filtros',
            onClick: () => setSearchParams(new URLSearchParams()),
            tone: 'secondary'
          }
        ]}
        context={
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} useFlexGap flexWrap="wrap" sx={{ alignItems: { md: 'center' } }}>
            {departamentoUnico && !esJefeServicio ? (
              <OperationalScopeSummary
                code={departamentoUnico.codigo}
                helperText="Estas gestionando movimientos internos del personal de tu departamento."
                label="Departamento actual"
                name={departamentoUnico.nombre}
              />
            ) : null}
            {servicioUnicoPropio ? (
              <OperationalScopeSummary
                code={servicioUnicoPropio.codigo}
                helperText="Solo ves el personal asignado a tu servicio."
                label="Servicio actual"
                name={servicioUnicoPropio.nombre}
              />
            ) : null}
            {filters.idPersonal ? (
              <Chip
                color="info"
                label={`Filtro por personal: ${rows[0]?.nombreCompleto || 'persona seleccionada'}`}
                size="small"
                variant="outlined"
              />
            ) : null}
          </Stack>
        }
        description="Reasignacion operativa entre servicios y gestion de jefaturas. El personal sin destino activo se gestiona desde el menu de Personal."
        filters={
          <>
            {!departamentoUnico ? (
              <TextField
                disabled={!hasDepartments}
                label="Departamento"
                onChange={(event) =>
                  setFilters({
                    id_departamento: event.target.value,
                    id_servicio: ''
                  })
                }
                select
                SelectProps={compactSelectMenuProps}
                size="small"
                sx={operationalFieldSx.normal}
                value={filters.idDepartamento ? String(filters.idDepartamento) : ''}
              >
                {!hasDepartments ? <MenuItem value="">Sin departamentos</MenuItem> : <MenuItem value="">Todos</MenuItem>}
                {departamentosPermitidos.map((item) => (
                  <MenuItem key={item.id} value={String(item.id)}>
                    {item.nombre}
                  </MenuItem>
                ))}
              </TextField>
            ) : null}
            {!servicioUnicoPropio ? (
              <TextField
                disabled={!hasDepartments || !hasServices}
                label="Servicio"
                onChange={(event) => setFilter('id_servicio', event.target.value)}
                select
                SelectProps={compactSelectMenuProps}
                size="small"
                sx={operationalFieldSx.normal}
                value={filters.idServicio ? String(filters.idServicio) : ''}
              >
                <MenuItem value="">{servicePlaceholderLabel}</MenuItem>
                {serviciosPermitidos.map((item) => (
                  <MenuItem key={item.id} value={String(item.id)}>
                    {item.nombre}
                  </MenuItem>
                ))}
              </TextField>
            ) : null}
            <TextField
              label="Rol Funcional"
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
              label="Buscar persona"
              onChange={(event) => setFilter('nombre', event.target.value)}
              placeholder="Nombre o C.I."
              size="small"
              sx={operationalFieldSx.search}
              value={filters.nombre || ''}
            />
          </>
        }
        stats={
          <OperationalStats
            items={[
              { label: 'Asignaciones', value: totalRows },
              { label: 'Servicios visibles', value: serviciosPermitidos.length }
            ]}
          />
        }
        title="Asignaciones"
      >
        <Grid size={12}>
          <OperationalTableCard
            columns={columns}
            emptyMessage="No hay asignaciones activas con el filtro actual."
            error={asignaciones.error}
            getRowKey={(row) => row.id}
            loading={asignaciones.loading}
            onRetry={asignaciones.refetch}
            rows={rows}
            slow={asignaciones.slow}
            subtitle={
              <Typography color="text.secondary" variant="body2">
                Vista operativa para mover personal entre servicios y gestionar jefaturas. Personal sin destino activo: usa el menu de
                Personal.
              </Typography>
            }
            title="Asignaciones vigentes"
            total={totalRows}
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

      <AsignacionEditDialog
        asignacion={editDialog}
        cargasHorarias={cargasHorarias.data?.data || []}
        departamentosPermitidos={departamentosPermitidos}
        esGestorGlobalAsignaciones={esGestorGlobalAsignaciones}
        mostrarControlRegularizacion={puedeRegularizarAsignaciones}
        onClose={() => setEditDialog(null)}
        onSaved={handleEditSaved}
        open={editDialog !== null}
        puedeEditarDepartamento={puedeEditarDepartamento}
        rolesFuncionalesJefatura={rolesFuncionalesJefatura}
        serviciosGestionablesIds={serviciosGestionablesIds}
        tiposContrato={tiposContrato.data?.data || []}
      />

      <AsignacionCloseDialog
        asignacion={closeTarget}
        mostrarControlRegularizacion={puedeRegularizarAsignaciones}
        onClose={() => setCloseTarget(null)}
        onSaved={handleCloseSaved}
        open={closeTarget !== null}
      />

      <AsignacionAddSecondaryDialog
        asignacionPrincipal={addSecondaryTarget}
        cargasHorarias={cargasHorarias.data?.data || []}
        departamentosPermitidos={departamentosPermitidos}
        onClose={() => setAddSecondaryTarget(null)}
        onSaved={handleAddSecondarySaved}
        open={addSecondaryTarget !== null}
        rolesFuncionalesMovimiento={rolesFuncionalesMovimiento}
        serviciosPermitidosTodos={serviciosTodosPermitidos}
      />
    </>
  );
}

function canMoveAsignacion(asignacion: Asignacion) {
  return (
    isPositiveInteger(asignacion.idPersonal) && isPositiveInteger(asignacion.idTipoContrato) && isPositiveInteger(asignacion.idRolFuncional)
  );
}

function isPositiveInteger(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function resolveAmbitoLabel(row: Asignacion): string {
  if (row.idServicio) {
    return row.nombreServicio || 'Sin nombre de servicio';
  }
  if (row.idDepartamento) {
    return row.nombreDepartamento || 'Sin nombre de departamento';
  }
  return 'Sin ambito asignado';
}

// El rol (jefatura departamental, asistencial, etc.) ya se muestra en su propia
// columna — esta linea secundaria solo aporta dato nuevo cuando el ambito es un
// servicio: el departamento al que pertenece ese servicio. Cuando el ambito ya ES
// el departamento, no hay nada mas que agregar.
function resolveAmbitoCaption(row: Asignacion): string | null {
  if (row.idServicio) {
    return row.nombreDepartamento || null;
  }
  return null;
}
