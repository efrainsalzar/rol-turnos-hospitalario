import { useEffect, useState } from 'react';

import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { useAppToast } from 'components/system/AppToastProvider';
import FormDialog from 'components/system/FormDialog';
import { isBlank, requiredMessage, useFormValidation } from 'hooks/useFormValidation';
import { seguridadApi } from 'services/seguridadApi';
import type { Usuario } from 'types/api';

type ResetPasswordFormState = {
  password: string;
  confirmPassword: string;
};

const EMPTY_FORM: ResetPasswordFormState = { password: '', confirmPassword: '' };
const MIN_PASSWORD_LENGTH = 6;

export interface UsuarioResetPasswordDialogProps {
  open: boolean;
  usuario: Usuario | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function UsuarioResetPasswordDialog({ open, usuario, onClose, onSaved }: UsuarioResetPasswordDialogProps) {
  const { showSuccess, showError } = useAppToast();
  const [form, setForm] = useState<ResetPasswordFormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const validation = useFormValidation<ResetPasswordFormState>({
    password: (values) => {
      if (isBlank(values.password)) return requiredMessage('La password');
      if (values.password.length < MIN_PASSWORD_LENGTH) return `La password debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
      return undefined;
    },
    confirmPassword: (values) => {
      if (isBlank(values.confirmPassword)) return requiredMessage('La confirmacion de password');
      if (values.password !== values.confirmPassword) return 'No coincide.';
      return undefined;
    }
  });

  useEffect(() => {
    if (!open) {
      validation.reset();
      return;
    }
    setForm(EMPTY_FORM);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function submit() {
    if (!usuario) return;
    if (!validation.validate(form)) return;

    setSubmitting(true);

    try {
      await seguridadApi.updateUsuario(usuario.id, {
        idPersonal: usuario.personal?.id ?? undefined,
        idRolSeguridad: usuario.rolSeguridad?.id ?? undefined,
        tipoUsuario: usuario.tipoUsuario,
        username: usuario.username,
        password: form.password
      });
      showSuccess(`Contrasena de "${usuario.username}" restablecida correctamente.`);
      onSaved();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'No se pudo restablecer la contrasena.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormDialog
      maxWidth="xs"
      onClose={onClose}
      onSubmit={() => void submit()}
      open={open}
      submitting={submitting}
      title="Resetear password"
    >
      <TextField autoComplete="off" disabled fullWidth label="Username" size="small" value={usuario?.username || ''} sx={{ mb: 2 }} />
      <PasswordField
        fieldProps={validation.fieldProps('password', 'Se reemplazara la password actual.')}
        label="Nueva password"
        onChange={(value) => setForm((current) => ({ ...current, password: value }))}
        value={form.password}
        valid={form.password.length >= MIN_PASSWORD_LENGTH}
        showStatus={Boolean(form.password)}
        statusText={`Mínimo de ${MIN_PASSWORD_LENGTH} caracteres`}
      />
      <PasswordField
        fieldProps={validation.fieldProps('confirmPassword', 'Debe coincidir.')}
        label="Confirmar nueva password"
        onChange={(value) => setForm((current) => ({ ...current, confirmPassword: value }))}
        value={form.confirmPassword}
        valid={Boolean(form.confirmPassword) && form.password === form.confirmPassword}
        invalid={Boolean(form.confirmPassword) && form.password !== form.confirmPassword}
        showStatus={Boolean(form.confirmPassword)}
        statusText="Las contraseñas coinciden"
      />
    </FormDialog>
  );
}

function PasswordField({
  fieldProps,
  label,
  onChange,
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
  value: string;
  valid: boolean;
  invalid?: boolean;
  showStatus: boolean;
  statusText: string;
}) {
  const statusColor = valid ? 'success.main' : invalid || showStatus ? 'error.main' : 'text.secondary';

  return (
    <Stack spacing={0.25} sx={{ mb: 2 }}>
      <TextField
        autoComplete="new-password"
        fullWidth
        required
        {...fieldProps}
        error={fieldProps.error || (showStatus && !valid)}
        label={label}
        onChange={(event) => onChange(event.target.value)}
        size="small"
        sx={{
          '& .MuiOutlinedInput-notchedOutline': { borderColor: showStatus ? statusColor : undefined },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: showStatus ? statusColor : undefined },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: showStatus ? statusColor : undefined }
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
