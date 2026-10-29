import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import * as Yup from 'yup';
import { Formik } from 'formik';

import IconButton from 'components/@extended/IconButton';
import AnimateButton from 'components/@extended/AnimateButton';
import { useAppToast } from 'components/system/AppToastProvider';
import { authApi } from 'services/authApi';
import { setStoredActiveSession } from 'services/sessionStorage';

import EyeOutlined from '@ant-design/icons/EyeOutlined';
import EyeInvisibleOutlined from '@ant-design/icons/EyeInvisibleOutlined';

export default function AuthLogin() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const { showError } = useAppToast();

  return (
    <>
      <Stack spacing={1} sx={{ mb: 3 }}>
        <Typography color="text.secondary" variant="body2">
          Ingresa con tu usuario y contraseña local del entorno activo.
        </Typography>
      </Stack>

      <Formik
        initialValues={{
          username: '',
          password: '',
          submit: null
        }}
        validationSchema={Yup.object().shape({
          username: Yup.string().max(80).required('El usuario es obligatorio'),
          password: Yup.string().max(120).required('El password es obligatorio')
        })}
        onSubmit={async (values, { setSubmitting, setStatus, setErrors }) => {
          try {
            const autenticacion = await authApi.login(values.username.trim(), values.password);
            setStoredActiveSession(autenticacion.sesion, autenticacion.tokenSesion);
            setStatus({ success: true });
            navigate('/planificacion/planificaciones', { replace: true });
          } catch (error) {
            const message = error instanceof Error ? error.message : 'No se pudo iniciar sesion.';
            setStatus({ success: false });
            setErrors({ submit: message });
            showError(message);
          } finally {
            setSubmitting(false);
          }
        }}
      >
        {({ errors, handleBlur, handleChange, handleSubmit, isSubmitting, touched, values }) => (
          <form noValidate onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid size={12}>
                <Stack sx={{ gap: 1 }}>
                  <InputLabel htmlFor="username-login">Usuario</InputLabel>
                  <TextField
                    fullWidth
                    id="username-login"
                    name="username"
                    onBlur={handleBlur}
                    onChange={handleChange}
                    placeholder="Ingresa tu usuario"
                    size="small"
                    value={values.username}
                  />
                </Stack>
                {touched.username && errors.username ? (
                  <Typography color="error" sx={{ mt: 0.5 }} variant="caption">
                    {errors.username}
                  </Typography>
                ) : null}
              </Grid>

              <Grid size={12}>
                <Stack sx={{ gap: 1 }}>
                  <InputLabel htmlFor="password-login">Password</InputLabel>
                  <OutlinedInput
                    id="password-login"
                    type={showPassword ? 'text' : 'password'}
                    value={values.password}
                    name="password"
                    onBlur={handleBlur}
                    onChange={handleChange}
                    placeholder="Ingresa tu contraseña"
                    fullWidth
                    error={Boolean(touched.password && errors.password)}
                    endAdornment={
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={() => setShowPassword((value) => !value)}
                          edge="end"
                          color="secondary"
                        >
                          {showPassword ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                        </IconButton>
                      </InputAdornment>
                    }
                  />
                </Stack>
                {touched.password && errors.password ? (
                  <Typography color="error" sx={{ mt: 0.5 }} variant="caption">
                    {errors.password}
                  </Typography>
                ) : null}
              </Grid>

              <Grid size={12}>
                <AnimateButton>
                  <Button disabled={isSubmitting} fullWidth size="large" type="submit" variant="contained" color="primary">
                    {isSubmitting ? 'Ingresando...' : 'Ingresar'}
                  </Button>
                </AnimateButton>
              </Grid>
            </Grid>
          </form>
        )}
      </Formik>
    </>
  );
}
