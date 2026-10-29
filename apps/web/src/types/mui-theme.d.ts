// Mantis extiende cada PaletteColor con variantes `lighter`/`darker` en tiempo de ejecucion
// (ver src/themes/theme/index.js). Los tipos de MUI no las declaran, asi que se amplian aqui
// para que el codigo TypeScript pueda usarlas sin recurrir a `any`.
import '@mui/material/styles';

declare module '@mui/material/styles' {
  interface PaletteColor {
    lighter?: string;
    darker?: string;
  }

  interface SimplePaletteColorOptions {
    lighter?: string;
    darker?: string;
  }
}
