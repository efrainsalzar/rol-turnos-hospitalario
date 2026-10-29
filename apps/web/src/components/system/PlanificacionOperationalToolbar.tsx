import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import EditOutlined from '@ant-design/icons/EditOutlined';
import PlusOutlined from '@ant-design/icons/PlusOutlined';

import TurnoSearchChip, { type SearchableTool } from './TurnoSearchChip';
import type { OperationalToolAction } from './planificacion-operativa.types';

function isTurnoTool(tool: OperationalToolAction): tool is SearchableTool {
  return tool.kind === 'turno';
}

interface PlanificacionOperationalToolbarProps {
  activeToolKey: string;
  canManageTurnos: boolean;
  description: string;
  editMode: boolean;
  onEditModeChange: (active: boolean) => void;
  onToggle: (tool: OperationalToolAction) => void;
  onEditToolVisual: (tool: OperationalToolAction) => void;
  onCreateTurno: () => void;
  tools: OperationalToolAction[];
}

export default function PlanificacionOperationalToolbar({
  activeToolKey,
  canManageTurnos,
  description,
  editMode,
  onEditModeChange,
  onToggle,
  onEditToolVisual,
  onCreateTurno,
  tools
}: PlanificacionOperationalToolbarProps) {
  // Solo los turnos (horarios) pueden quedar detras del buscador — son los
  // unicos que en la practica llegan a catalogos grandes. Incidencias de
  // personal y las herramientas de sistema (Navegar/Limpiar) son pocas y
  // unicas: siempre van visibles, nunca al buscador (ver decisiones-tecnicas.md
  // seccion 109).
  const turnoTools = tools.filter(isTurnoTool);
  const incidenciaTools = tools.filter((t) => t.kind === 'incidenciaPersonal');
  const systemTools = tools.filter((t) => t.kind === 'navigate' || t.kind === 'clear');

  // Tope fijo (decision explicita del usuario 2026-07-17, reemplaza el
  // umbral por breakpoint de la seccion 107): como la fila ahora nunca se
  // envuelve (seccion 120) y el buscador cubre el resto, un numero fijo es
  // mas simple y predecible que escalar por ancho de pantalla.
  const maxVisibleTurnoTools = 5;

  // El subconjunto visible se calcula en el orden del catalogo (tal como
  // llega en `tools`) y no se reordena nunca por uso — la fila de chips
  // fijos debe mantenerse estable mientras el usuario pinta la matriz.
  const { visibleTurnoTools, overflowTurnoTools } = useMemo(() => {
    if (turnoTools.length <= maxVisibleTurnoTools) {
      return { visibleTurnoTools: turnoTools, overflowTurnoTools: [] as SearchableTool[] };
    }

    return {
      visibleTurnoTools: turnoTools.slice(0, maxVisibleTurnoTools),
      overflowTurnoTools: turnoTools.slice(maxVisibleTurnoTools)
    };
  }, [turnoTools, maxVisibleTurnoTools]);

  // Derivado, no es estado propio: si la herramienta activa esta entre las
  // que quedaron fuera de la fila visible, el chip de busqueda la "sostiene"
  // y se resalta; si esta entre las visibles, vuelve solo a estado neutral.
  const heldTool = useMemo(
    () => overflowTurnoTools.find((tool) => tool.key === activeToolKey) ?? null,
    [overflowTurnoTools, activeToolKey]
  );

  return (
    <Stack spacing={1.25}>
      <Typography color="text.secondary" variant="body2">
        {editMode
          ? 'Modo edicion activo. Haz click en un horario para editar su codigo visual y etiqueta. Las incidencias de personal no son configurables desde aqui.'
          : description}
      </Typography>

      {/* La fila exterior si puede partirse en dos lineas: es lo unico que
          debe poder bajar de linea es el bloque de Configurar (a la
          derecha), nunca las herramientas operativas. */}
      <Stack alignItems="center" direction="row" spacing={0} useFlexGap flexWrap="wrap">
        {/* Chips de herramientas operativas: navegar/limpiar, incidencias y
            el buscador de turnos nunca se envuelven a una segunda linea —
            solo los turnos visibles pueden reducirse (tope fijo de 5, el
            resto se cubre con el chip de busqueda). `minWidth: 0` es
            necesario para que este item flex pueda encogerse por debajo de
            su ancho de contenido dentro de la fila. */}
        <Stack direction="row" spacing={1} useFlexGap flexWrap="nowrap" sx={{ flex: '1 1 auto', minWidth: 0, overflow: 'hidden' }}>
          {/* Orden fijo (decision explicita del usuario 2026-07-17):
              navegar/limpiar, incidencias, hasta 5 turnos, buscador al
              final. Con el tope fijo de turnos ya acotando el ancho de este
              grupo, el buscador al final sigue quedando protegido del
              recorte por `overflow: hidden` en la practica. */}
          {systemTools.map((tool) => (
            <ToolChip
              key={tool.key}
              editMode={editMode}
              isSelected={activeToolKey === tool.key && !editMode}
              onEditToolVisual={onEditToolVisual}
              onToggle={onToggle}
              tool={tool}
            />
          ))}

          {incidenciaTools.map((tool) => (
            <ToolChip
              key={tool.key}
              editMode={editMode}
              isSelected={activeToolKey === tool.key && !editMode}
              onEditToolVisual={onEditToolVisual}
              onToggle={onToggle}
              tool={tool}
            />
          ))}

          {visibleTurnoTools.map((tool) => (
            <ToolChip
              key={tool.key}
              editMode={editMode}
              isSelected={activeToolKey === tool.key && !editMode}
              onEditToolVisual={onEditToolVisual}
              onToggle={onToggle}
              tool={tool}
            />
          ))}

          {overflowTurnoTools.length > 0 ? (
            <TurnoSearchChip heldTool={heldTool} onSelect={editMode ? onEditToolVisual : onToggle} tools={turnoTools} />
          ) : null}
        </Stack>

        {/* Separador y controles de edicion a la derecha */}
        {canManageTurnos ? (
          <Stack alignItems="center" direction="row" spacing={1} sx={{ ml: 2, flexShrink: 0 }}>
            <Divider flexItem orientation="vertical" sx={{ height: 32, alignSelf: 'center' }} />

            {editMode ? (
              <Tooltip title="Crear nuevo horario para este servicio">
                <Button
                  onClick={onCreateTurno}
                  size="small"
                  startIcon={<PlusOutlined style={{ fontSize: 12 }} />}
                  sx={{
                    minWidth: 96,
                    px: 1,
                    py: 0.75,
                    textTransform: 'none',
                    borderRadius: 1.5,
                    borderWidth: 1,
                    borderStyle: 'solid',
                    borderColor: 'divider',
                    backgroundColor: 'background.paper',
                    color: 'text.primary',
                    transition: 'background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
                    '&:hover': {
                      borderColor: 'primary.main',
                      backgroundColor: 'action.hover',
                      color: 'text.primary',
                      boxShadow: '0 0 0 1px rgba(25, 118, 210, 0.18), inset 0 0 0 1px rgba(25, 118, 210, 0.08)'
                    }
                  }}
                  variant="outlined"
                >
                  Nuevo Horario
                </Button>
              </Tooltip>
            ) : null}

            <Tooltip title={editMode ? 'Salir del modo edicion y volver a pintar' : 'Activar modo edicion para configurar los horarios'}>
              <Button
                onClick={() => onEditModeChange(!editMode)}
                size="small"
                startIcon={<EditOutlined style={{ fontSize: 12 }} />}
                sx={{
                  minWidth: 110,
                  px: 1,
                  py: 0.75,
                  textTransform: 'none',
                  borderRadius: 1.5,
                  borderWidth: 1,
                  borderStyle: 'solid',
                  borderColor: editMode ? 'warning.main' : 'divider',
                  backgroundColor: editMode ? 'warning.lighter' : 'background.paper',
                  color: editMode ? 'warning.dark' : 'text.primary',
                  transition: 'background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
                  '&:hover': {
                    borderColor: editMode ? 'warning.dark' : 'primary.main',
                    backgroundColor: editMode ? 'warning.light' : 'action.hover',
                    color: editMode ? 'warning.dark' : 'text.primary',
                    boxShadow: editMode
                      ? '0 0 0 1px rgba(237, 108, 2, 0.18), inset 0 0 0 1px rgba(237, 108, 2, 0.12)'
                      : '0 0 0 1px rgba(25, 118, 210, 0.18), inset 0 0 0 1px rgba(25, 118, 210, 0.08)'
                  }
                }}
                variant="outlined"
              >
                {editMode ? 'Volver' : 'Configurar'}
              </Button>
            </Tooltip>
          </Stack>
        ) : null}
      </Stack>
    </Stack>
  );
}

interface ToolChipProps {
  tool: OperationalToolAction;
  isSelected: boolean;
  editMode: boolean;
  onToggle: (tool: OperationalToolAction) => void;
  onEditToolVisual: (tool: OperationalToolAction) => void;
}

// Color por categoria de herramienta cuando esta seleccionada/activa
// (decision explicita del usuario 2026-07-17): navegar y turnos quedan en
// azul (paleta `primary`, sin cambios), incidencias de personal ("dias
// especiales") en verde (`success`), y Limpiar en rojo suave (`error`).
const SELECTED_PALETTE_BY_KIND: Record<OperationalToolAction['kind'], 'primary' | 'success' | 'error'> = {
  navigate: 'primary',
  turno: 'primary',
  incidenciaPersonal: 'success',
  clear: 'error'
};

const SELECTED_GLOW_RGB_BY_PALETTE: Record<'primary' | 'success' | 'error', string> = {
  primary: '25, 118, 210',
  success: '46, 125, 50',
  error: '211, 47, 47'
};

function ToolChip({ tool, isSelected, editMode, onToggle, onEditToolVisual }: ToolChipProps) {
  const isSystemTool = tool.kind === 'navigate' || tool.kind === 'clear';
  const isEditableTurno = editMode && tool.kind === 'turno';
  const isDisabledInEditMode = editMode && isSystemTool;
  const isIncidenciaPersonalInEditMode = editMode && tool.kind === 'incidenciaPersonal';
  const selectedPalette = SELECTED_PALETTE_BY_KIND[tool.kind];
  const selectedGlowRgb = SELECTED_GLOW_RGB_BY_PALETTE[selectedPalette];

  function handleClick() {
    if (isDisabledInEditMode || isIncidenciaPersonalInEditMode) return;

    if (editMode) {
      onEditToolVisual(tool);
    } else {
      onToggle(tool);
    }
  }

  const chipButton = (
    <Box sx={{ position: 'relative', display: 'inline-flex', ...(isIncidenciaPersonalInEditMode ? { cursor: 'not-allowed' } : {}) }}>
      <Button
        disabled={isDisabledInEditMode}
        onClick={handleClick}
        size="small"
        sx={{
          minWidth: 72,
          px: 1,
          py: 0.75,
          textTransform: 'none',
          borderRadius: 1.5,
          borderWidth: 1,
          borderStyle: 'solid',
          transition: 'background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
          ...(isIncidenciaPersonalInEditMode ? { pointerEvents: 'none' } : {}),

          ...(isDisabledInEditMode
            ? {
                opacity: 0.35,
                borderColor: 'divider',
                color: 'text.disabled',
                backgroundColor: 'background.paper',
                cursor: 'not-allowed'
              }
            : isIncidenciaPersonalInEditMode
              ? {
                  opacity: 0.4,
                  borderColor: 'divider',
                  color: 'text.disabled',
                  backgroundColor: 'background.paper'
                }
              : isEditableTurno
                ? {
                    borderColor: 'warning.light',
                    backgroundColor: 'background.paper',
                    color: 'text.primary',
                    cursor: 'pointer',
                    '&:hover': {
                      borderColor: 'warning.main',
                      backgroundColor: 'warning.lighter',
                      color: 'warning.dark',
                      boxShadow: '0 0 0 2px rgba(237, 108, 2, 0.18)'
                    }
                  }
                : {
                    borderColor: isSelected ? `${selectedPalette}.main` : 'divider',
                    backgroundColor: isSelected ? `${selectedPalette}.lighter` : 'background.paper',
                    color: isSelected ? `${selectedPalette}.dark` : 'text.primary',
                    boxShadow: isSelected
                      ? `0 0 0 1px rgba(${selectedGlowRgb}, 0.18), inset 0 0 0 1px rgba(${selectedGlowRgb}, 0.08)`
                      : 'none',
                    '&:hover': {
                      borderColor: `${selectedPalette}.main`,
                      backgroundColor: isSelected ? `${selectedPalette}.light` : 'action.hover',
                      color: isSelected ? `${selectedPalette}.dark` : 'text.primary',
                      boxShadow: `0 0 0 1px rgba(${selectedGlowRgb}, 0.18), inset 0 0 0 1px rgba(${selectedGlowRgb}, 0.08)`
                    }
                  })
        }}
        variant="outlined"
      >
        <Stack spacing={0.15} sx={{ alignItems: 'center', lineHeight: 1 }}>
          <Typography sx={{ fontSize: 14, fontWeight: isSelected ? 900 : 800, lineHeight: 1 }}>{tool.shortLabel}</Typography>
          {tool.kind === 'navigate' || tool.kind === 'clear' ? (
            <Typography sx={{ fontSize: 12, lineHeight: 1.1, opacity: isSelected ? 0.9 : 0.68 }}>{tool.label}</Typography>
          ) : null}
          {tool.kind === 'turno' && tool.nombre ? (
            <Typography sx={{ fontSize: 11, lineHeight: 1.1, opacity: isSelected ? 0.9 : 0.68 }}>{tool.nombre}</Typography>
          ) : null}
          {tool.kind === 'incidenciaPersonal' && tool.label ? (
            <Typography sx={{ fontSize: 12, lineHeight: 1.1, opacity: isSelected ? 0.9 : 0.68 }}>{tool.label}</Typography>
          ) : null}
          {tool.kind === 'turno'
            ? buildTimeDisplayLines(tool).map((line, index) => (
                <Typography key={index} sx={{ fontSize: 10, lineHeight: 1.1, opacity: isSelected ? 0.96 : 0.72 }}>
                  {line}
                </Typography>
              ))
            : null}
        </Stack>
      </Button>
    </Box>
  );

  if (isIncidenciaPersonalInEditMode) {
    return <Tooltip title="Las incidencias de personal no tienen configuracion visual editable">{chipButton}</Tooltip>;
  }

  if (tool.kind === 'turno' && tool.nombre) {
    return <Tooltip title={tool.nombre}>{chipButton}</Tooltip>;
  }

  return chipButton;
}

function buildTimeDisplayLines(tool: OperationalToolAction): string[] {
  if (tool.kind !== 'turno') return [];

  if (tool.tramos && tool.tramos.length > 0) {
    return tool.tramos.map((t) => `${t.horaInicio.slice(0, 5)}-${t.horaFin.slice(0, 5)}`);
  }

  if (tool.horaInicio && tool.horaFin) {
    return [`${tool.horaInicio.slice(0, 5)}-${tool.horaFin.slice(0, 5)}`];
  }

  return [];
}
