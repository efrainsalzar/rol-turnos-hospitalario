import Alert from '@mui/material/Alert';

interface StandardEmptyStateProps {
  message: string;
}

export default function StandardEmptyState({ message }: StandardEmptyStateProps) {
  return <Alert severity="info">{message}</Alert>;
}
