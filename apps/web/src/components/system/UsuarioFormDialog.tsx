import { useEffect, useMemo, useState } from 'react';

import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { useAppToast } from 'components/system/AppToastProvider';
import FormDialog from 'components/system/FormDialog';
import { isBlank, requiredMessage, useFormValidation } from 'hooks/useFormValidation';
import { seguridadApi } from 'services/seguridadApi';
import type { PersonalVinculableUsuario, RolSeguridad, Usuario } from 'types/api';
import { compactSelectMenuProps } from 'utils/select-menu-props';

type UsuarioFormState = {
  idPersonal: string;
  idRolSeguridad: string;
  tipoUsuario: string;
  username: string;
  password: string;
  confirmPassword: string;
};

const EMPTY_FORM: UsuarioFormState = {
  idPersonal: '',
  idRolSeguridad: '',
  tipoUsuario: 'ADMINISTRATIVO',
  username: '',
  password: '',
  confirmPassword: ''
};

const DEFAULT_PASSWORD_SUFFIX = '!';
const MIN_PASSWORD_LENGTH = 6;

export interface UsuarioFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  usuario: Usuario | null;
  prefill?: { idPersonal?: string; username?: string };
  roleOptions: RolSeguridad[];
  personalOptions: PersonalVinculableUsuario[];
  usuarios: Usuario[];
  onClose: () => void;
  onSaved: () => void;
}

export default function UsuarioFormDialog({
  open,
  mode,
  usuario,
  prefill,
  roleOptions,
  personalOptions,
  usuarios,
  onClose,
  onSaved
}: UsuarioFormDialogProps) {
  const { showSuccess, showError } = useAppToast();
  const [form, setForm] = useState<UsuarioFormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [soloJefesSinUsuario, setSoloJefesSinUsuario] = useState(false);

  const usernameTaken = useMemo(() => {
    const username = form.username.trim().toLowerCase();
    return Boolean(username) && usuarios.some((item) => item.id !== usuario?.id && item.username.trim().toLowerCase() === username);
  }, [form.username, usuario?.id, usuarios]);

  const validation = useFormValidation<UsuarioFormState>({
    username: (values) => {
      if (isBlank(values.username)) return requiredMessage('El username');
      if (usuarios.some((item) => item.id !== usuario?.id && item.username.trim().toLowerCase() === values.username.trim().toLowerCase())) {
        return 'Este username ya está registrado.';
      }
      return undefined;
    },
    password: (values) => {
      if (mode === 'edit' && isBlank(values.password)) return undefined;
      if (isBlank(values.password)) return requiredMessage('La password');
      if (values.password.length < MIN_PASSWORD_LENGTH) return `La password debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
      return undefined;
    },
    confirmPassword: (values) => {
      // En editar, dejar la password en blanco significa "no cambiarla" — no hay nada que confirmar.
      if (isBlank(values.password)) {
        return mode === 'create' ? requiredMessage('La confirmacion de password') : undefined;
      }
      if (isBlank(values.confirmPassword)) return requiredMessage('La confirmacion de password');
      if (values.password !== values.confirmPassword) return 'No coincide.';
      return undefined;
    }
  });

  useEffect(() => {
    if (!open) {
      validation.reset();
      setSoloJefesSinUsuario(false);
      return;
    }

    if (mode === 'edit' && usuario) {
      setForm({
        idPersonal: usuario.personal?.id ? String(usuario.personal.id) : '',
        idRolSeguridad: usuario.rolSeguridad?.id ? String(usuario.rolSeguridad.id) : '',
        tipoUsuario: usuario.tipoUsuario,
        username: usuario.username,
        password: '',
        confirmPassword: ''
      });
    } else {
      setForm({
        ...EMPTY_FORM,
        idPersonal: prefill?.idPersonal || '',
        username: prefill?.username || ''
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (mode !== 'create') return;
    setForm((current) => ({
      ...current,
      tipoUsuario: current.idPersonal ? 'PERSONAL' : 'ADMINISTRATIVO'
    }));
  }, [mode, form.idPersonal]);

  const selectedRole = useMemo(
    () => roleOptions.find((item) => String(item.id) === form.idRolSeguridad) || null,
    [form.idRolSeguridad, roleOptions]
  );
  const selectedPersonal = useMemo(
    () => personalOptions.find((item) => String(item.id) === form.idPersonal) || null,
    [form.idPersonal, personalOptions]
  );

  useEffect(() => {
    if (!open || mode !== 'create' || !selectedPersonal) return;

    const suggestedScope = !selectedPersonal.esJefaturaRolFuncional
      ? 'LECTURA'
      : selectedPersonal.idServicioPrincipal
        ? 'SERVICIO'
        : selectedPersonal.idDepartamentoPrincipal
          ? 'DEPARTAMENTO'
          : 'LECTURA';
    const suggestedRole = roleOptions.find((role) => role.alcancePlanificacion === suggestedScope);

    if (suggestedRole) {
      setForm((current) => ({ ...current, idRolSeguridad: String(suggestedRole.id) }));
    }
  }, [mode, open, roleOptions, selectedPersonal]);
  const selectedRoleRequiresPersonal =
    selectedRole?.alcancePlanificacion === 'DEPARTAMENTO' || selectedRole?.alcancePlanificacion === 'SERVICIO';
  const selectedRoleRequiresDepartmentHead = selectedRole?.alcancePlanificacion === 'DEPARTAMENTO';
  const selectedRoleRequiresServiceHead = selectedRole?.alcancePlanificacion === 'SERVICIO';
  const linkedPersonalLooksIncompatible =
    !!selectedPersonal &&
    selectedRoleRequiresPersonal &&
    (!selectedPersonal.esJefaturaRolFuncional ||
      (selectedRoleRequiresDepartmentHead && !selectedPersonal.idDepartamentoPrincipal) ||
      (selectedRoleRequiresServiceHead && !selectedPersonal.idServicioPrincipal));
  const selectedPersonalHasActiveUser = useMemo(
    () =>
      !!selectedPersonal && usuarios.some((item) => item.activo && item.personal?.id === selectedPersonal.id && item.id !== usuario?.id),
    [selectedPersonal, usuario?.id, usuarios]
  );
  const jefesSinUsuario = useMemo(
    () =>
      personalOptions.filter((item) => {
        if (!item.esJefaturaRolFuncional) return false;
        return !usuarios.some((u) => u.activo && u.personal?.id === item.id);
      }),
    [personalOptions, usuarios]
  );
  const personalOptionsFiltered = useMemo(
    () => (soloJefesSinUsuario ? jefesSinUsuario : personalOptions),
    [soloJefesSinUsuario, jefesSinUsuario, personalOptions]
  );
  const generatedCredentials = useMemo(() => {
    if (!selectedPersonal?.codigoPersonal) {
      return null;
    }

    const baseUsername = selectedPersonal.codigoPersonal.trim();

    if (!baseUsername) {
      return null;
    }

    const reservedUsernames = new Set(
      usuarios
        .filter((item) => item.id !== usuario?.id)
        .map((item) => item.username.trim().toLowerCase())
        .filter(Boolean)
    );

    let username = baseUsername;
    let sequence = 2;

    while (reservedUsernames.has(username.toLowerCase())) {
      username = `${baseUsername}.${sequence}`;
      sequence += 1;
    }

    return {
      username,
      password: `${baseUsername}${DEFAULT_PASSWORD_SUFFIX}`,
      wasAdjusted: username !== baseUsername
    };
  }, [selectedPersonal, usuario?.id, usuarios]);

  const saveBlockedReason = useMemo(() => {
    if (!form.username.trim()) {
      return 'Falta username.';
    }
    if (mode === 'create' && !form.password.trim()) {
      return 'Falta password inicial.';
    }
    if (usernameTaken) {
      return 'El username ya está registrado.';
    }
    if ((mode === 'create' || form.password) && form.password.length < MIN_PASSWORD_LENGTH) {
      return `La password debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
    }
    if (!form.idRolSeguridad) {
      return 'Falta rol.';
    }
    if (selectedRoleRequiresPersonal && !form.idPersonal) {
      return 'El rol requiere personal vinculado.';
    }
    if (mode === 'create' && selectedPersonalHasActiveUser) {
      return 'Ese personal ya tiene usuario activo.';
    }
    if (form.password && form.password !== form.confirmPassword) {
      return 'La confirmacion no coincide.';
    }
    return null;
  }, [
    form.confirmPassword,
    form.idPersonal,
    form.idRolSeguridad,
    form.password,
    form.username,
    mode,
    selectedPersonalHasActiveUser,
    selectedRoleRequiresPersonal,
    usernameTaken
  ]);

  const formAlerts = useMemo(() => {
    const alerts: Array<{ severity: 'info' | 'warning' | 'error'; text: string }> = [];

    if (selectedRoleRequiresPersonal && !form.idPersonal) {
      alerts.push({
        severity: 'error',
        text: 'Este rol requiere personal vinculado.'
      });
    }

    if (selectedPersonalHasActiveUser) {
      alerts.push({
        severity: 'warning',
        text: `El personal ${selectedPersonal?.nombreCompleto} ya tiene usuario activo.`
      });
    }

    if (!form.idRolSeguridad) {
      alerts.push({
        severity: 'error',
        text: 'Asigna un rol antes de guardar.'
      });
    }

    if (selectedPersonal && selectedRoleRequiresDepartmentHead) {
      if (!selectedPersonal.esJefaturaRolFuncional) {
        alerts.push({
          severity: 'warning',
          text: `El personal ${selectedPersonal.nombreCompleto} no figura como jefatura.`
        });
      } else if (!selectedPersonal.idDepartamentoPrincipal) {
        alerts.push({
          severity: 'warning',
          text: `El personal ${selectedPersonal.nombreCompleto} no tiene departamento principal visible.`
        });
      }
    }

    if (selectedPersonal && selectedRoleRequiresServiceHead) {
      if (!selectedPersonal.esJefaturaRolFuncional) {
        alerts.push({
          severity: 'warning',
          text: `El personal ${selectedPersonal.nombreCompleto} no figura como jefatura.`
        });
      } else if (!selectedPersonal.idServicioPrincipal) {
        alerts.push({
          severity: 'warning',
          text: `El personal ${selectedPersonal.nombreCompleto} no tiene servicio principal visible.`
        });
      }
    }

    if (selectedPersonal && !selectedRoleRequiresPersonal && selectedPersonal.esJefaturaRolFuncional) {
      alerts.push({
        severity: 'info',
        text: `El personal ${selectedPersonal.nombreCompleto} tiene jefatura activa.`
      });
    }

    if (linkedPersonalLooksIncompatible) {
      alerts.push({
        severity: 'info',
        text: 'El backend volvera a validar la compatibilidad.'
      });
    }

    return alerts;
  }, [
    form.idPersonal,
    form.idRolSeguridad,
    linkedPersonalLooksIncompatible,
    selectedPersonal,
    selectedPersonalHasActiveUser,
    selectedRoleRequiresDepartmentHead,
    selectedRoleRequiresPersonal,
    selectedRoleRequiresServiceHead
  ]);

  const usernameFieldProps = validation.fieldProps('username', 'Identificador unico de acceso.');
  const passwordFieldProps = validation.fieldProps('password', mode === 'create' ? 'Obligatoria para crear el acceso.' : 'Opcional.');
  const confirmPasswordFieldProps = validation.fieldProps('confirmPassword', 'Debe coincidir.');
  const passwordHasValue = Boolean(form.password);
  const passwordLengthValid = form.password.length >= MIN_PASSWORD_LENGTH;
  const passwordMatchValid = Boolean(form.confirmPassword) && form.password === form.confirmPassword;
  const passwordMatchInvalid = Boolean(form.confirmPassword) && form.password !== form.confirmPassword;

  const applyGeneratedCredentials = () => {
    if (!generatedCredentials) {
      return;
    }

    setForm((current) => ({
      ...current,
      username: generatedCredentials.username,
      password: generatedCredentials.password,
      confirmPassword: generatedCredentials.password
    }));
  };

  async function submit() {
    if (!validation.validate(form)) {
      return;
    }

    setSubmitting(true);

    try {
      if (mode === 'create') {
        await seguridadApi.createUsuario(buildCreatePayload(form));
        showSuccess(`Usuario "${form.username.trim()}" creado correctamente.`);
      } else if (usuario) {
        await seguridadApi.updateUsuario(usuario.id, buildUpdatePayload(form));
        showSuccess(`Usuario "${form.username.trim()}" actualizado correctamente.`);
      }

      onSaved();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'No se pudo guardar el usuario.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormDialog
      maxWidth="sm"
      onClose={onClose}
      onSubmit={() => void submit()}
      open={open}
      submitDisabled={Boolean(saveBlockedReason)}
      submitting={submitting}
      title={mode === 'create' ? 'Nuevo usuario' : 'Editar usuario'}
    >
      <Grid container columnSpacing={2} rowSpacing={2}>
        {formAlerts.length > 0 ? (
          <Grid size={12}>
            <Stack spacing={1}>
              {formAlerts.map((alert, index) => (
                <Alert key={`${alert.severity}-${index}`} severity={alert.severity}>
                  {alert.text}
                </Alert>
              ))}
            </Stack>
          </Grid>
        ) : null}
        {mode === 'create' && generatedCredentials ? (
          <Grid size={12}>
            <Alert severity="info">
              <strong>Credenciales sugeridas:</strong> <strong>{generatedCredentials.username}</strong> /{' '}
              <strong>{generatedCredentials.password}</strong>
              {generatedCredentials.wasAdjusted ? ' El username base se ajusto.' : ''}
            </Alert>
          </Grid>
        ) : null}
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            autoComplete="off"
            fullWidth
            required
            {...usernameFieldProps}
            error={usernameFieldProps.error || usernameTaken}
            helperText={usernameTaken ? 'Este username ya está registrado.' : usernameFieldProps.helperText}
            label="Username"
            onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
            size="small"
            value={form.username}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <PasswordField
            fieldProps={passwordFieldProps}
            label={mode === 'create' ? 'Password' : 'Nueva password'}
            onChange={(value) => setForm((current) => ({ ...current, password: value }))}
            required={mode === 'create'}
            value={form.password}
            valid={passwordLengthValid}
            showStatus={passwordHasValue}
            statusText={`Mínimo de ${MIN_PASSWORD_LENGTH} caracteres`}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <PasswordField
            fieldProps={confirmPasswordFieldProps}
            label="Confirmar nueva password"
            onChange={(value) => setForm((current) => ({ ...current, confirmPassword: value }))}
            required={mode === 'create'}
            value={form.confirmPassword}
            valid={passwordMatchValid}
            invalid={passwordMatchInvalid}
            showStatus={Boolean(form.confirmPassword)}
            statusText="Las contraseñas coinciden"
          />
        </Grid>
        {mode === 'create' ? (
          <Grid size={{ xs: 12, md: 6 }}>
            <Button
              disabled={!generatedCredentials || selectedPersonalHasActiveUser}
              fullWidth
              onClick={applyGeneratedCredentials}
              variant="outlined"
            >
              {generatedCredentials ? 'Usar credenciales sugeridas' : 'Selecciona personal con codigo'}
            </Button>
          </Grid>
        ) : null}
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            helperText={selectedRoleRequiresPersonal ? 'Este rol requiere personal vinculado.' : 'Define alcance y permisos.'}
            label="Rol / permiso"
            onChange={(event) => setForm((current) => ({ ...current, idRolSeguridad: event.target.value }))}
            select
            SelectProps={compactSelectMenuProps}
            size="small"
            value={form.idRolSeguridad}
          >
            <MenuItem value="">Sin rol</MenuItem>
            {roleOptions.map((item) => (
              <MenuItem key={item.id} value={item.id}>
                {item.nombre}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        {!form.idPersonal ? (
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              helperText="ADMINISTRATIVO para cuentas tecnicas. PERSONAL cuando hay vinculo institucional."
              label="Tipo de usuario"
              onChange={(event) => setForm((current) => ({ ...current, tipoUsuario: event.target.value }))}
              select
              SelectProps={compactSelectMenuProps}
              size="small"
              value={form.tipoUsuario}
            >
              <MenuItem value="ADMINISTRATIVO">ADMINISTRATIVO</MenuItem>
              <MenuItem value="INTEGRACION">INTEGRACION</MenuItem>
            </TextField>
          </Grid>
        ) : null}
        <Grid size={12}>
          <Autocomplete
            autoHighlight
            fullWidth
            getOptionLabel={(item) => item.nombreCompleto}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            onChange={(_, value) => setForm((current) => ({ ...current, idPersonal: value ? String(value.id) : '' }))}
            options={personalOptionsFiltered}
            value={selectedPersonal}
            renderInput={(params) => (
              <TextField
                {...params}
                helperText={
                  soloJefesSinUsuario
                    ? `Mostrando ${jefesSinUsuario.length} jefes sin usuario.`
                    : selectedRoleRequiresPersonal
                      ? 'Obligatorio para jefaturas.'
                      : 'Opcional segun el rol.'
                }
                label={soloJefesSinUsuario ? 'Personal - solo jefes' : 'Personal asociado'}
                size="small"
              />
            )}
            renderOption={(props, item) => (
              <li {...props} key={item.id}>
                <Stack spacing={0.15}>
                  <Typography variant="body2">{item.nombreCompleto}</Typography>
                  {item.esJefaturaRolFuncional ? (
                    <Typography color="text.secondary" variant="caption">
                      {item.nombreServicioPrincipal
                        ? `Jefe de servicio: ${item.nombreServicioPrincipal}`
                        : item.nombreDepartamentoPrincipal
                          ? `Jefe de departamento: ${item.nombreDepartamentoPrincipal}`
                          : 'Jefe sin ámbito visible'}
                    </Typography>
                  ) : null}
                </Stack>
              </li>
            )}
          />
        </Grid>
        {mode === 'create' && jefesSinUsuario.length > 0 ? (
          <Grid size={12}>
            <Button
              color={soloJefesSinUsuario ? 'primary' : 'inherit'}
              fullWidth
              onClick={() => setSoloJefesSinUsuario((v) => !v)}
              size="small"
              variant="outlined"
            >
              {soloJefesSinUsuario ? 'Ver todo el personal' : `Solo jefes sin usuario (${jefesSinUsuario.length})`}
            </Button>
          </Grid>
        ) : null}
      </Grid>
    </FormDialog>
  );
}

function buildCreatePayload(form: UsuarioFormState) {
  return {
    idPersonal: form.idPersonal ? Number(form.idPersonal) : undefined,
    idRolSeguridad: form.idRolSeguridad ? Number(form.idRolSeguridad) : undefined,
    tipoUsuario: form.tipoUsuario,
    username: form.username,
    password: form.password
  };
}

function buildUpdatePayload(form: UsuarioFormState) {
  return {
    idPersonal: form.idPersonal ? Number(form.idPersonal) : undefined,
    idRolSeguridad: form.idRolSeguridad ? Number(form.idRolSeguridad) : undefined,
    tipoUsuario: form.tipoUsuario,
    username: form.username,
    ...(form.password ? { password: form.password } : {})
  };
}

function PasswordField({
  fieldProps,
  label,
  onChange,
  required,
  value,
  valid,
  invalid = false,
  showStatus,
  statusText
}: {
  fieldProps: {
    error: boolean;
    helperText: string | undefined;
    onBlur: () => void;
    inputRef: (element: HTMLElement | null) => void;
  };
  label: string;
  onChange: (value: string) => void;
  required: boolean;
  value: string;
  valid: boolean;
  invalid?: boolean;
  showStatus: boolean;
  statusText: string;
}) {
  const statusColor = valid ? 'success.main' : invalid || showStatus ? 'error.main' : 'text.secondary';

  return (
    <Stack spacing={0.25}>
      <TextField
        autoComplete="new-password"
        fullWidth
        required={required}
        {...fieldProps}
        error={fieldProps.error || (showStatus && !valid)}
        label={label}
        onChange={(event) => onChange(event.target.value)}
        size="small"
        sx={{
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: showStatus ? statusColor : undefined
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: showStatus ? statusColor : undefined
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: showStatus ? statusColor : undefined
          }
        }}
        type="password"
        value={value}
      />
      <Typography color={statusColor} variant="caption">
        {showStatus ? `${valid ? '✓' : '✕'} ${statusText}` : statusText}
      </Typography>
    </Stack>
  );
}
