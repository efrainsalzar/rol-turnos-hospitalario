import type { ReactNode } from 'react';

import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import MainCard from 'components/MainCard';
import ActionButtonGroup, { type ActionButtonGroupItem } from 'components/system/ActionButtonGroup';
import OperationalFiltersBar from 'components/system/OperationalFiltersBar';

type OperationalPageVariant = 'list' | 'config' | 'detail';

interface OperationalPageTemplateProps {
  title: string;
  description?: ReactNode;
  context?: ReactNode;
  filters?: ReactNode;
  stats?: ReactNode;
  actions?: ActionButtonGroupItem[] | ReactNode;
  summary?: ReactNode;
  feedback?: ReactNode;
  variant?: OperationalPageVariant;
  children: ReactNode;
}

export default function OperationalPageTemplate({
  title,
  description,
  context,
  filters,
  stats,
  actions,
  summary,
  feedback,
  variant = 'list',
  children
}: OperationalPageTemplateProps) {
  const actionsNode = Array.isArray(actions) ? <ActionButtonGroup actions={actions} /> : actions;
  const hasTopSection = Boolean(context || filters || stats || actionsNode || summary);
  const contextSpacing = variant === 'detail' ? 1 : 1.25;

  return (
    <Grid container columnSpacing={2.75} rowSpacing={1}>
      <Grid size={12}>
        <Stack spacing={0}>
          {description ? (
            <Typography color="text" variant="body2">
              {description}
            </Typography>
          ) : null}
        </Stack>
      </Grid>

      {feedback ? <Grid size={12}>{feedback}</Grid> : null}

      {hasTopSection ? (
        <Grid size={12}>
          <MainCard contentSX={{ p: 2 }} title={null}>
            <Stack spacing={context || stats ? contextSpacing : 0}>
              {filters || actionsNode || summary ? (
                <OperationalFiltersBar actions={Array.isArray(actions) ? actions : []} filters={filters} summary={summary} />
              ) : null}

              {!Array.isArray(actions) && actionsNode ? actionsNode : null}
            </Stack>
          </MainCard>
        </Grid>
      ) : null}

      {children}
    </Grid>
  );
}
