import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

interface OperationalScopeSummaryProps {
  label: string;
  name: string;
  code?: string | null;
  helperText?: string;
}

export default function OperationalScopeSummary({ label, name, code, helperText }: OperationalScopeSummaryProps) {
  return (
    <Stack spacing={0.25} sx={{ minWidth: 240 }}>
      <Typography color="text.secondary" variant="caption">
        {label}
      </Typography>
      <Typography variant="body2">{name}</Typography>
      {code ? (
        <Typography color="text.secondary" variant="caption">
          {code}
        </Typography>
      ) : null}
      {helperText ? (
        <Typography color="text.secondary" variant="caption">
          {helperText}
        </Typography>
      ) : null}
    </Stack>
  );
}
