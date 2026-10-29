declare module 'components/MainCard' {
  import type { ReactNode } from 'react';

  interface MainCardProps {
    border?: boolean;
    boxShadow?: boolean;
    children?: ReactNode;
    subheader?: ReactNode;
    content?: boolean;
    contentSX?: Record<string, unknown>;
    darkTitle?: boolean;
    divider?: boolean;
    elevation?: number;
    secondary?: ReactNode;
    shadow?: string;
    sx?: Record<string, unknown> | ((theme: unknown) => Record<string, unknown>);
    title?: ReactNode;
    codeHighlight?: boolean;
    codeString?: string;
    modal?: boolean;
    ref?: unknown;
    [key: string]: unknown;
  }

  export default function MainCard(props: MainCardProps): ReactNode;
}
