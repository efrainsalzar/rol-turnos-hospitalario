export const compactSelectMenuProps = {
  MenuProps: {
    PaperProps: {
      sx: {
        maxHeight: 'min(340px, calc(100vh - 120px))',
        mt: 0.5
      }
    },
    MenuListProps: {
      dense: true
    }
  }
} as const;
