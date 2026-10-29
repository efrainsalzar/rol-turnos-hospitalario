import type { ReactNode } from 'react';

import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';

type ActionTone = 'primary' | 'secondary' | 'danger' | 'ghost';

export interface ActionButtonGroupItem {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: ActionTone;
  startIcon?: ReactNode;
}

interface ActionButtonGroupProps {
  actions: ActionButtonGroupItem[];
  direction?: 'row' | 'column';
}

function resolveVariant(tone: ActionTone) {
  if (tone === 'primary') {
    return 'contained';
  }

  if (tone === 'ghost') {
    return 'text';
  }

  return 'outlined';
}

function resolveColor(tone: ActionTone) {
  if (tone === 'danger') {
    return 'error';
  }

  if (tone === 'ghost') {
    return 'inherit';
  }

  if (tone === 'primary') {
    return 'primary';
  }

  return 'inherit';
}

export default function ActionButtonGroup({ actions, direction = 'row' }: ActionButtonGroupProps) {
  if (!actions.length) {
    return null;
  }

  return (
    <Stack direction={direction} flexWrap="wrap" spacing={1} useFlexGap>
      {actions.map((action) => {
        const tone = action.tone || 'secondary';

        return (
          <Button
            color={resolveColor(tone)}
            disabled={action.disabled}
            key={action.label}
            onClick={action.onClick}
            size="small"
            startIcon={action.startIcon}
            variant={resolveVariant(tone)}
          >
            {action.label}
          </Button>
        );
      })}
    </Stack>
  );
}
