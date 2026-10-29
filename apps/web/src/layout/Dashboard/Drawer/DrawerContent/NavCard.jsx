// material-ui
import Button from '@mui/material/Button';
import CardMedia from '@mui/material/CardMedia';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// project import
import MainCard from 'components/MainCard';

// assets
import avatar from 'assets/images/users/avatar-group.png';
import AnimateButton from 'components/@extended/AnimateButton';

// ==============================|| DRAWER CONTENT - NAVIGATION CARD ||============================== //

export default function NavCard() {
  return (
    <MainCard sx={{ bgcolor: 'grey.50', m: 3 }}>
      <Stack alignItems="center" spacing={2.5}>
        <CardMedia component="img" image={avatar} sx={{ width: 112 }} />
        <Stack alignItems="center">
          <Typography variant="h5">Roles y Turnos</Typography>
          <Typography variant="h6" color="secondary">
            Operativa institucional
          </Typography>
        </Stack>
        <AnimateButton>
          <Button variant="contained" color="success" size="small" disableElevation>
            Roles y Turnos
          </Button>
        </AnimateButton>
      </Stack>
    </MainCard>
  );
}
