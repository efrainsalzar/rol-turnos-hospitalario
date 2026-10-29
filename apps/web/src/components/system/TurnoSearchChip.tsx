import { useMemo, useState } from 'react';

import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import SearchOutlined from '@ant-design/icons/SearchOutlined';

import type { OperationalToolAction } from './planificacion-operativa.types';

// Solo turnos (horarios) — las incidencias de personal quedan siempre
// visibles como chip, nunca detras del buscador (ver decisiones-tecnicas.md
// seccion 109).
// `turno` e `incidenciaPersonal` comparten una sola variante del union con un
// campo `kind` combinado (no son discriminantes separados), asi que
// `Extract<..., { kind: 'turno' }>` por si solo resuelve a `never` — hay que
// tomar esa variante compartida y sobreescribir `kind` a un literal unico.
type ToolConHorario = Extract<OperationalToolAction, { kind: 'turno' | 'incidenciaPersonal' }>;
export type SearchableTool = Omit<ToolConHorario, 'kind'> & { kind: 'turno' };

interface TurnoSearchChipProps {
  tools: SearchableTool[];
  heldTool: SearchableTool | null;
  onSelect: (tool: OperationalToolAction) => void;
}

const filterOptions = createFilterOptions<SearchableTool>({
  stringify: (tool) => `${tool.codigo} ${tool.shortLabel} ${tool.nombre} ${formatHorario(tool) || ''}`
});

function formatHorario(tool: SearchableTool) {
  if (tool.tramos && tool.tramos.length > 0) {
    return tool.tramos.map((tramo) => `${tramo.horaInicio.slice(0, 5)}-${tramo.horaFin.slice(0, 5)}`).join(' / ');
  }

  if (tool.horaInicio && tool.horaFin) {
    return `${tool.horaInicio.slice(0, 5)}-${tool.horaFin.slice(0, 5)}`;
  }

  return null;
}

// Chip de "escape" para catalogos de turnos grandes (ver decisiones-tecnicas.md
// seccion 107): en vez de renderizar los N turnos que no entran en la fila,
// este chip abre un Autocomplete de MUI que busca en todo el catalogo. La
// fila de chips fijos nunca se reordena ni se le inserta nada — este chip es
// el unico que cambia de estado, mostrando el turno elegido cuando la
// herramienta activa no esta entre los chips visibles.
export default function TurnoSearchChip({ tools, heldTool, onSelect }: TurnoSearchChipProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  // Orden cronologico simple para la lista sin agrupar (no hay ninguna
  // clasificacion propia del sistema que aplique aqui — ver seccion 109).
  const sortedTools = useMemo(() => [...tools].sort((a, b) => (a.horaInicio || '').localeCompare(b.horaInicio || '')), [tools]);

  if (!searchOpen) {
    return (
      <Button
        onClick={() => setSearchOpen(true)}
        size="small"
        startIcon={<SearchOutlined style={{ fontSize: 12 }} />}
        sx={{
          minWidth: 72,
          px: 1,
          py: 0.75,
          textTransform: 'none',
          borderRadius: 1.5,
          borderWidth: 1,
          borderStyle: heldTool ? 'solid' : 'dashed',
          borderColor: heldTool ? 'primary.main' : 'divider',
          backgroundColor: heldTool ? 'primary.lighter' : 'background.paper',
          color: heldTool ? 'primary.dark' : 'text.secondary',
          transition: 'background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
          '&:hover': {
            borderColor: 'primary.main',
            borderStyle: 'solid',
            backgroundColor: heldTool ? 'primary.light' : 'action.hover',
            color: heldTool ? 'primary.dark' : 'text.primary'
          }
        }}
        variant="outlined"
      >
        {heldTool ? (
          <Stack spacing={0.15} sx={{ alignItems: 'center', lineHeight: 1 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 900, lineHeight: 1 }}>{heldTool.shortLabel}</Typography>
            {formatHorario(heldTool) ? (
              <Typography sx={{ fontSize: 10, lineHeight: 1.1, opacity: 0.9 }}>{formatHorario(heldTool)}</Typography>
            ) : null}
          </Stack>
        ) : (
          <Typography sx={{ fontSize: 11, lineHeight: 1.1 }}>Buscar turno</Typography>
        )}
      </Button>
    );
  }

  return (
    <Autocomplete
      autoHighlight
      filterOptions={filterOptions}
      getOptionLabel={(tool) => `${tool.shortLabel} ${tool.nombre}`}
      isOptionEqualToValue={(a, b) => a.key === b.key}
      onChange={(_, value) => {
        if (value) {
          onSelect(value);
        }
        setSearchOpen(false);
      }}
      onClose={(_, reason) => {
        if (reason !== 'selectOption') {
          setSearchOpen(false);
        }
      }}
      openOnFocus
      options={sortedTools}
      renderInput={(params) => (
        <TextField {...params} autoFocus placeholder="Codigo, nombre u horario..." size="small" sx={{ minWidth: 220 }} />
      )}
      renderOption={(props, tool) => (
        <Box component="li" {...props} key={tool.key} sx={{ display: 'flex', alignItems: 'baseline', gap: 1.25 }}>
          <Typography sx={{ flexShrink: 0, fontSize: 12.5, fontWeight: 700 }}>{tool.shortLabel}</Typography>
          {tool.nombre && tool.nombre !== formatHorario(tool) ? (
            <Typography color="text.secondary" sx={{ fontSize: 12 }}>
              {tool.nombre}
            </Typography>
          ) : null}
          {formatHorario(tool) ? (
            <Typography color="text.secondary" sx={{ flexShrink: 0, fontSize: 11.5, ml: 'auto' }}>
              {formatHorario(tool)}
            </Typography>
          ) : null}
        </Box>
      )}
      size="small"
      slotProps={{
        paper: { sx: { minWidth: 340 } },
        // El listado se porta al <body> (comportamiento por defecto del
        // Popper de MUI), asi que para el navegador su "padre de scroll" es
        // la pagina entera. Sin esto, al llegar al limite del listado el
        // resto del gesto de scroll se encadena hacia la pagina — se siente
        // como que el scroll "se mezcla" con el de atras.
        listbox: { sx: { overscrollBehavior: 'contain' } }
      }}
      sx={{ minWidth: 220 }}
    />
  );
}
