import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import ActionButtonGroup from 'components/system/ActionButtonGroup';
import OperationalPageTemplate from 'components/system/OperationalPageTemplate';
import OperationalStats from 'components/system/OperationalStats';
import OperationalTableCard from 'components/system/OperationalTableCard';
import StatusChip from 'components/system/StatusChip';
import UsuarioFormDialog from 'components/system/UsuarioFormDialog';
import UsuarioResetPasswordDialog from 'components/system/UsuarioResetPasswordDialog';
import { useAppToast } from 'components/system/AppToastProvider';
import { useAccessControl } from 'hooks/use-access-control';
import { useApiRequest } from 'hooks/useApiRequest';
import { personalApi } from 'services/personalApi';
import { seguridadApi } from 'services/seguridadApi';
import type { RolSeguridad, Usuario } from 'types/api';
import { puedeOtorgarAlcance } from 'utils/alcance-planificacion';
import { operationalFieldSx } from 'utils/operational-ui';
import { compactSelectMenuProps } from 'utils/select-menu-props';

const USER_TYPE_OPTIONS = ['PERSONAL', 'ADMINISTRATIVO', 'INTEGRACION'];

export default function UsuariosPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { permissions, session: activeSession } = useAccessControl();
  const { showSuccess, showError } = useAppToast();
  const [refreshKey, setRefreshKey] = useState(0);
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [formTarget, setFormTarget] = useState<Usuario | null>(null);
  const [createPrefill, setCreatePrefill] = useState<{ idPersonal?: string; username?: string }>({});
  const [resetPasswordTarget, setResetPasswordTarget] = useState<Usuario | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [usernameFilter, setUsernameFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [activoFilter, setActivoFilter] = useState('');
  const [tipoUsuarioFilter, setTipoUsuarioFilter] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const puedeGestionar = permissions.puedeGestionarUsuarios;
  const usuarios = useApiRequest(seguridadApi.getUsuarios, [refreshKey]);
  const roles = useApiRequest(seguridadApi.getRoles);
  const personal = useApiRequest(personalApi.getPersonalVinculablesUsuario, [refreshKey]);

  useEffect(() => {
    const state = location.state as {
      prefillPersonalId?: number;
      prefillUsername?: string;
    } | null;

    if (!state?.prefillPersonalId || !puedeGestionar || personal.loading) {
      return;
    }

    setCreatePrefill({
      idPersonal: String(state.prefillPersonalId),
      username: state.prefillUsername
    });
    setFormMode('create');
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate, personal.loading, puedeGestionar]);

  useEffect(() => {
    setPage(0);
  }, [activoFilter, roleFilter, tipoUsuarioFilter, usernameFilter]);

  const gestionableServicioIds = useMemo(
    () => new Set((activeSession?.serviciosGestionables ?? []).map((item) => item.id)),
    [activeSession]
  );
  const gestionableDepartamentoIds = useMemo(
    () => new Set((activeSession?.departamentosGestionables ?? []).map((item) => item.id)),
    [activeSession]
  );
  // Un admin de alcance departamento/servicio solo deberia elegir personal de su propio
  // ambito al vincular un usuario; un admin de sistema (puedeGestionarTodo) ve a todos.
  const personalOptions = useMemo(() => {
    const source = personal.data?.data || [];

    if (activeSession?.puedeGestionarTodo) {
      return source;
    }

    return source.filter(
      (item) =>
        (item.idServicioPrincipal && gestionableServicioIds.has(item.idServicioPrincipal)) ||
        (item.idDepartamentoPrincipal && gestionableDepartamentoIds.has(item.idDepartamentoPrincipal))
    );
  }, [activeSession, gestionableDepartamentoIds, gestionableServicioIds, personal.data]);
  const usuarioRows = useMemo(() => usuarios.data?.data || [], [usuarios.data]);
  const jefesSinUsuario = useMemo(
    () =>
      personalOptions.filter((item) => {
        if (!item.esJefaturaRolFuncional) return false;
        return !usuarioRows.some((u) => u.activo && u.personal?.id === item.id);
      }),
    [personalOptions, usuarioRows]
  );
  const roleOptions = useMemo(() => roles.data?.data || [], [roles.data]);
  // El filtro de la tabla puede mostrar cualquier rolSeguridad (solo lectura); el selector del
  // formulario solo debe ofrecer los roles que el actor puede otorgar (mismo alcance o inferior).
  const assignableRoleOptions = useMemo(
    () => roleOptions.filter((item) => puedeOtorgarAlcance(activeSession?.alcancePlanificacion, item.alcancePlanificacion)),
    [activeSession?.alcancePlanificacion, roleOptions]
  );
  const filteredRows = useMemo(() => {
    const source = usuarios.data?.data || [];
    return source.filter((row) => {
      const search = usernameFilter.trim().toLowerCase();
      const matchesSearch =
        !search ||
        row.username.toLowerCase().includes(search) ||
        row.personal?.nombreCompleto?.toLowerCase().includes(search) ||
        row.personal?.codigoPersonal?.toLowerCase().includes(search);
      const matchesRole =
        !roleFilter || (roleFilter === 'sin-rolSeguridad' ? !row.rolSeguridad?.id : String(row.rolSeguridad?.id || '') === roleFilter);
      const matchesActivo = !activoFilter || (activoFilter === 'true' ? row.activo : !row.activo);
      const matchesTipo = !tipoUsuarioFilter || row.tipoUsuario === tipoUsuarioFilter;
      return matchesSearch && matchesRole && matchesActivo && matchesTipo;
    });
  }, [activoFilter, roleFilter, tipoUsuarioFilter, usernameFilter, usuarios.data]);

  const columns = [
    {
      key: 'username',
      title: 'Usuario',
      render: (row: Usuario) => (
        <Stack spacing={0.25}>
          <Typography variant="body2">{row.username}</Typography>
          <Typography color="text.secondary" variant="caption">
            {row.tipoUsuario}
          </Typography>
        </Stack>
      )
    },
    {
      key: 'rolSeguridad',
      title: 'Permiso',
      render: (row: Usuario) => <Typography variant="body2">{row.rolSeguridad?.nombre || '-'}</Typography>
    },
    {
      key: 'personal',
      title: 'Personal asociado',
      render: (row: Usuario) => (
        <Stack spacing={0.25}>
          <Typography variant="body2">{row.personal?.nombreCompleto || '-'}</Typography>
          <Typography color="text.secondary" variant="caption">
            {row.personal?.codigoPersonal || 'Sin vinculacion'}
          </Typography>
        </Stack>
      )
    },
    {
      key: 'identidadLocalHabilitada',
      title: 'Identidad local',
      render: (row: Usuario) => <StatusChip active={row.identidadLocalHabilitada} activeLabel="Habilitada" inactiveLabel="Deshabilitada" />
    },
    {
      key: 'activo',
      title: 'Estado',
      render: (row: Usuario) => <StatusChip active={row.activo} />
    },
    ...(puedeGestionar
      ? [
          {
            key: 'acciones',
            title: 'Acciones',
            render: (row: Usuario) => {
              const rolFila = roleOptions.find((item) => item.id === row.rolSeguridad?.id);
              const puedeOperarSobreFila = puedeOtorgarAlcance(
                activeSession?.alcancePlanificacion,
                rolFila?.alcancePlanificacion ?? 'LECTURA'
              );

              if (!puedeOperarSobreFila) {
                return (
                  <Typography color="text.disabled" variant="caption">
                    Rol de alcance superior al tuyo
                  </Typography>
                );
              }

              return (
                <ActionButtonGroup
                  actions={[
                    {
                      label: 'Editar',
                      onClick: () => openEdit(row),
                      tone: 'secondary'
                    },
                    {
                      label: 'Resetear password',
                      onClick: () => setResetPasswordTarget(row),
                      tone: 'secondary'
                    },
                    {
                      label:
                        deletingId === row.id ? (row.activo ? 'Desactivando...' : 'Activando...') : row.activo ? 'Desactivar' : 'Activar',
                      disabled: deletingId === row.id,
                      onClick: () => void handleToggleActive(row),
                      tone: row.activo ? 'danger' : 'secondary'
                    }
                  ]}
                />
              );
            }
          }
        ]
      : [])
  ];

  const openCreate = () => {
    setCreatePrefill({});
    setFormTarget(null);
    setFormMode('create');
  };

  const openEdit = (row: Usuario) => {
    setFormTarget(row);
    setFormMode('edit');
  };

  const handleFormSaved = () => {
    setFormMode(null);
    setFormTarget(null);
    setRefreshKey((value) => value + 1);
  };

  const handleResetPasswordSaved = () => {
    setResetPasswordTarget(null);
    setRefreshKey((value) => value + 1);
  };

  const handleDelete = async (row: Usuario) => {
    setDeletingId(row.id);

    try {
      if (row.activo) {
        await seguridadApi.deleteUsuario(row.id);
      } else {
        await seguridadApi.activateUsuario(row.id);
      }
      showSuccess(row.activo ? `Usuario "${row.username}" dado de baja.` : `Usuario "${row.username}" reactivado.`);
      setRefreshKey((value) => value + 1);
    } catch (error) {
      showError(
        error instanceof Error ? error.message : row.activo ? 'No se pudo dar de baja al usuario.' : 'No se pudo reactivar al usuario.'
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive = async (row: Usuario) => {
    await handleDelete(row);
  };

  return (
    <OperationalPageTemplate
      actions={[
        { label: 'Recargar', onClick: () => setRefreshKey((value) => value + 1), tone: 'secondary' },
        {
          label: 'Limpiar filtros',
          onClick: () => {
            setUsernameFilter('');
            setRoleFilter('');
            setActivoFilter('');
            setTipoUsuarioFilter('');
          },
          tone: 'secondary'
        },
        ...(puedeGestionar ? [{ label: 'Nuevo usuario', onClick: openCreate, tone: 'primary' as const }] : [])
      ]}
      description="Administracion minima de usuarios locales, roles de seguridad y vinculacion con personal institucional."
      filters={
        <>
          <TextField
            autoComplete="off"
            label="Buscar usuario"
            onChange={(event) => setUsernameFilter(event.target.value)}
            placeholder="Username o personal"
            size="small"
            sx={operationalFieldSx.search}
            value={usernameFilter}
          />
          <TextField
            label="Rol"
            onChange={(event) => setRoleFilter(event.target.value)}
            select
            SelectProps={compactSelectMenuProps}
            size="small"
            sx={operationalFieldSx.normal}
            value={roleFilter}
          >
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="sin-rolSeguridad">Sin rol</MenuItem>
            {roleOptions.map((item: RolSeguridad) => (
              <MenuItem key={item.id} value={item.id}>
                {item.nombre} ({item.codigo})
              </MenuItem>
            ))}
          </TextField>
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
          <TextField
            label="Tipo usuario"
            onChange={(event) => setTipoUsuarioFilter(event.target.value)}
            select
            SelectProps={compactSelectMenuProps}
            size="small"
            sx={operationalFieldSx.normal}
            value={tipoUsuarioFilter}
          >
            <MenuItem value="">Todos</MenuItem>
            {USER_TYPE_OPTIONS.map((item) => (
              <MenuItem key={item} value={item}>
                {item}
              </MenuItem>
            ))}
          </TextField>
        </>
      }
      stats={
        <OperationalStats
          items={[
            { label: 'Usuarios', value: usuarios.data?.meta.total || 0 },
            { label: 'Visibles', value: filteredRows.length },
            { label: 'Jefes sin usuario', value: jefesSinUsuario.length },
            { label: 'Roles', value: roleOptions.length }
          ]}
        />
      }
      title="Usuarios"
    >
      <Grid size={12}>
        <OperationalTableCard
          columns={columns}
          emptyMessage="No hay usuarios disponibles en la API."
          error={usuarios.error}
          getRowKey={(row) => row.id}
          loading={usuarios.loading}
          onRetry={usuarios.refetch}
          rows={filteredRows}
          slow={usuarios.slow}
          subtitle="Consulta real a GET /v1/usuarios con alta, edicion y baja logica."
          title="Usuarios operativos"
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

      <UsuarioFormDialog
        mode={formMode || 'create'}
        onClose={() => setFormMode(null)}
        onSaved={handleFormSaved}
        open={formMode !== null}
        personalOptions={personalOptions}
        prefill={createPrefill}
        roleOptions={assignableRoleOptions}
        usuario={formTarget}
        usuarios={usuarioRows}
      />

      <UsuarioResetPasswordDialog
        onClose={() => setResetPasswordTarget(null)}
        onSaved={handleResetPasswordSaved}
        open={resetPasswordTarget !== null}
        usuario={resetPasswordTarget}
      />
    </OperationalPageTemplate>
  );
}
