import FormHelperText from '@mui/material/FormHelperText';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { compactSelectMenuProps } from 'utils/select-menu-props';

type OperationalTimeFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helperText?: string;
  disabled?: boolean;
  required?: boolean;
  allowEmpty?: boolean;
  minuteStep?: 5 | 10 | 15 | 30;
  error?: boolean;
  inputRef?: (element: HTMLElement | null) => void;
};

export default function OperationalTimeField({
  label,
  value,
  onChange,
  helperText,
  disabled = false,
  required = false,
  allowEmpty = false,
  minuteStep = 15,
  error = false,
  inputRef
}: OperationalTimeFieldProps) {
  const { hour, minute } = parseTimeValue(value);
  const minuteOptions = buildMinuteOptions(minuteStep);

  const handlePartChange = (part: 'hour' | 'minute', nextRaw: string) => {
    if (!nextRaw) {
      if (allowEmpty) {
        onChange('');
      }
      return;
    }

    const nextHour = part === 'hour' ? Number(nextRaw) : (hour ?? 0);
    const nextMinute = part === 'minute' ? Number(nextRaw) : (minute ?? 0);
    onChange(`${String(nextHour).padStart(2, '0')}:${String(nextMinute).padStart(2, '0')}`);
  };

  return (
    <Stack spacing={0.75}>
      <Typography color={error ? 'error' : undefined} sx={{ fontSize: 13, fontWeight: 600 }} variant="body2">
        {label}
        {required ? ' *' : ''}
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <TextField
          disabled={disabled}
          error={error}
          inputRef={inputRef}
          label="Hora"
          onChange={(event) => handlePartChange('hour', event.target.value)}
          select
          SelectProps={compactSelectMenuProps}
          size="small"
          sx={{ minWidth: { xs: '100%', sm: 110 } }}
          value={hour !== null ? String(hour) : ''}
        >
          {allowEmpty ? <MenuItem value="">-</MenuItem> : null}
          {Array.from({ length: 24 }, (_, index) => index).map((item) => (
            <MenuItem key={item} value={String(item)}>
              {item.toString().padStart(2, '0')}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          disabled={disabled}
          error={error}
          label="Min"
          onChange={(event) => handlePartChange('minute', event.target.value)}
          select
          SelectProps={compactSelectMenuProps}
          size="small"
          sx={{ minWidth: { xs: '100%', sm: 110 } }}
          value={minute !== null ? String(minute) : ''}
        >
          {allowEmpty ? <MenuItem value="">-</MenuItem> : null}
          {minuteOptions.map((item) => (
            <MenuItem key={item} value={String(item)}>
              {item.toString().padStart(2, '0')}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
      {helperText ? <FormHelperText error={error}>{helperText}</FormHelperText> : null}
    </Stack>
  );
}

function parseTimeValue(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    return { hour: null, minute: null };
  }

  const [hourRaw, minuteRaw] = normalized.split(':');
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return { hour: null, minute: null };
  }

  return { hour, minute };
}

function buildMinuteOptions(step: number) {
  const options: number[] = [];
  for (let value = 0; value < 60; value += step) {
    options.push(value);
  }
  return options;
}
