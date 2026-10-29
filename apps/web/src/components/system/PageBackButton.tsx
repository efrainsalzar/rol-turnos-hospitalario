import type { To } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';

import ArrowLeftOutlined from '@ant-design/icons/ArrowLeftOutlined';

import Button from '@mui/material/Button';

interface PageBackButtonProps {
  label: string;
  to?: To | number;
  onClick?: () => void;
  variant?: 'text' | 'outlined' | 'contained';
}

export default function PageBackButton({ label, to, onClick, variant = 'outlined' }: PageBackButtonProps) {
  const navigate = useNavigate();

  return (
    <Button
      onClick={() => {
        if (onClick) {
          onClick();
          return;
        }

        if (typeof to === 'number') {
          navigate(to);
          return;
        }

        if (to) {
          navigate(to);
        }
      }}
      startIcon={<ArrowLeftOutlined />}
      variant={variant}
    >
      {label}
    </Button>
  );
}
