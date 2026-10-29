import { Navigate } from 'react-router-dom';

// material-ui
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

// project imports
import AuthWrapper from 'sections/auth/AuthWrapper';
import AuthLogin from 'sections/auth/AuthLogin';
import { getStoredActiveSession } from 'services/sessionStorage';

// ================================|| JWT - LOGIN ||================================ //

export default function Login() {
  if (getStoredActiveSession()) {
    return <Navigate replace to="/planificacion/planificaciones" />;
  }

  return (
    <AuthWrapper>
      <Grid container spacing={3}>
        <Grid size={12}>
          <Typography variant="h3" sx={{ mb: { xs: -0.5, sm: 0.5 } }}>
            Ingreso al sistema
          </Typography>
        </Grid>
        <Grid size={12}>
          <AuthLogin />
        </Grid>
      </Grid>
    </AuthWrapper>
  );
}
