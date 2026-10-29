import type { ReactNode } from 'react';

import Grid from '@mui/material/Grid';

import OperationalPageTemplate from 'components/system/OperationalPageTemplate';

interface OperationalPageLayoutProps {
  title: string;
  breadcrumb?: string;
  description: string;
  toolbar?: ReactNode;
  feedback?: ReactNode;
  children: ReactNode;
}

export default function OperationalPageLayout({ title, description, toolbar, feedback, children }: OperationalPageLayoutProps) {
  return (
    <OperationalPageTemplate description={description} feedback={feedback} title={title}>
      {toolbar ? <Grid size={12}>{toolbar}</Grid> : null}
      {children}
    </OperationalPageTemplate>
  );
}
