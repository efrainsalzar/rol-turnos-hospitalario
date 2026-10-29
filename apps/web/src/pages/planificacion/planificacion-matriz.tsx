import { memo, startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction, UIEvent } from 'react';
import { useParams } from 'react-router-dom';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Popover from '@mui/material/Popover';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import DownloadOutlined from '@ant-design/icons/DownloadOutlined';
import EditOutlined from '@ant-design/icons/EditOutlined';
import ReloadOutlined from '@ant-design/icons/ReloadOutlined';
import TableOutlined from '@ant-design/icons/TableOutlined';

import MainCard from 'components/MainCard';
import { useAppToast } from 'components/system/AppToastProvider';
import EditToolVisualDialog from 'components/system/EditToolVisualDialog';
import type { EditToolVisualTarget } from 'components/system/EditToolVisualDialog';
import ImpactoUsoDialog from 'components/system/ImpactoUsoDialog';
import TurnoFormDialog, { mapTurnoToForm } from 'components/system/TurnoFormDialog';
import PageBackButton from 'components/system/PageBackButton';
import PlanificacionExportDialog from 'components/system/PlanificacionExportDialog';
import PlanificacionOperationalLegend from 'components/system/PlanificacionOperationalLegend';
import PlanificacionOperationalToolbar from 'components/system/PlanificacionOperationalToolbar';
import PlanificacionStateActions from 'components/system/PlanificacionStateActions';
import PlanificacionStatusChip from 'components/system/PlanificacionStatusChip';
import type { OperationalToolAction } from 'components/system/planificacion-operativa.types';
import { hasSystemScope, useAccessControl } from 'hooks/use-access-control';
import { useApiRequest } from 'hooks/useApiRequest';
import { useSesionEdicionPlanificacion } from 'hooks/useSesionEdicionPlanificacion';
import { ApiClientError } from 'services/apiClient';
import { operacionApi } from 'services/operacionApi';
import { planificacionApi } from 'services/planificacionApi';
import type {
  CeldaMatrizPlanificacionPersistida,
  ConfiguracionOperativaPlanificacion,
  EstadoPlanificacion,
  EstiloExportacionRolTurnos,
  FormatoExportacionRolTurnos,
  GuardarTurnoInput,
  ImpactoUsoCatalogo,
  MatrizMensualPlanificacion,
  ModoExportacionRolTurnos
} from 'types/api';
import {
  canApprovePlanificacion,
  canClosePlanificacion,
  canEditPlanificacion,
  canExportPlanificacion,
  canManageTurnos,
  canReturnPlanificacionToDraft,
  canSendRevisionPlanificacion
} from 'utils/planificacion-capabilities';
import { buildPlanificacionExcelFilename } from 'utils/planificacion-export-filename';
import { mensajeCambioEstadoPlanificacion } from 'utils/planificacion-mensajes';

const DEFAULT_TURNO_FORM: GuardarTurnoInput = {
  idServicio: undefined,
  idDepartamento: undefined,
  codigo: '',
  nombre: '',
  tipoHorario: 'CONTINUO',
  horaInicio: '08:00',
  horaFin: '14:00',
  tramos: [],
  activo: true
};

// `toggleable`: la columna puede ocultarse desde el boton "Columnas".
// `defaultVisible: false`: nace oculta la primera vez (antes de que el
// usuario tenga una preferencia guardada) — hoy solo aplica a `nroItem`/`ci`,
// agregadas porque ya viajaban en el payload de la matriz pero no tenian
// columna propia (existian en la exportacion, no en esta pantalla). El orden
// de este array es el orden visual real de columnas (se reordeno para
// coincidir con el orden de la exportacion) — `MatrixRowView` busca cada
// columna por `key` (`findLeftColumn`/`findRightColumn`), nunca por indice,
// para que reordenar este array no rompa silenciosamente el ancho/estilo
// aplicado a otra celda (ver decisiones-tecnicas.md seccion 114).
const LEFT_COLUMNS = [
  { key: 'numeroFila', label: 'No', minWidth: 42, maxWidth: 56 },
  { key: 'nroItem', label: 'Nro. ITEM', minWidth: 60, maxWidth: 80, toggleable: true, defaultVisible: false },
  { key: 'cargaHorariaCodigo', label: 'C/H', minWidth: 44, maxWidth: 56, toggleable: true },
  { key: 'ci', label: 'C.I.', minWidth: 80, maxWidth: 110, toggleable: true, defaultVisible: false },
  { key: 'tipoContratoCodigo', label: 'ITEM', minWidth: 52, maxWidth: 70, toggleable: true },
  { key: 'personal', label: 'PERSONAL', minWidth: 170, maxWidth: 260 },
  { key: 'cargoActual', label: 'Cargo', minWidth: 110, maxWidth: 170, toggleable: true }
] as const;

const RIGHT_COLUMNS = [
  { key: 'horarioResumen', label: 'Horario', minWidth: 95, maxWidth: 135, toggleable: true },
  { key: 'totalHorasMes', label: 'Total Hrs', minWidth: 64, maxWidth: 76, toggleable: true },
  { key: 'observacionMensual', label: 'Observaciones', minWidth: 150, maxWidth: 240, toggleable: true }
] as const;

const TOGGLEABLE_COLUMNS = [...LEFT_COLUMNS, ...RIGHT_COLUMNS].filter(
  (column): column is typeof column & { toggleable: true } => 'toggleable' in column && column.toggleable
);

// Busqueda por `key`, nunca por indice — `LEFT_COLUMNS`/`RIGHT_COLUMNS` se
// reordenan para reflejar el orden visual real (ver comentario arriba de
// `LEFT_COLUMNS`), asi que `MatrixRowView` no puede asumir una posicion fija.
function findLeftColumn(key: (typeof LEFT_COLUMNS)[number]['key']) {
  return LEFT_COLUMNS.find((column) => column.key === key)!;
}

function findRightColumn(key: (typeof RIGHT_COLUMNS)[number]['key']) {
  return RIGHT_COLUMNS.find((column) => column.key === key)!;
}
const DEFAULT_HIDDEN_COLUMN_KEYS = TOGGLEABLE_COLUMNS.filter((column) => 'defaultVisible' in column && column.defaultVisible === false).map(
  (column) => column.key
);

const HIDDEN_COLUMNS_STORAGE_KEY = 'roles-turnos:matriz:columnas-ocultas';

function loadHiddenColumnKeys(): Set<string> {
  if (typeof window === 'undefined') {
    return new Set(DEFAULT_HIDDEN_COLUMN_KEYS);
  }

  try {
    const raw = window.localStorage.getItem(HIDDEN_COLUMNS_STORAGE_KEY);
    if (!raw) {
      return new Set(DEFAULT_HIDDEN_COLUMN_KEYS);
    }

    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return new Set(parsed.filter((key): key is string => typeof key === 'string'));
    }
  } catch {
    // localStorage no disponible o valor corrupto; se usa el default.
  }

  return new Set(DEFAULT_HIDDEN_COLUMN_KEYS);
}

function saveHiddenColumnKeys(keys: Set<string>) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(HIDDEN_COLUMNS_STORAGE_KEY, JSON.stringify([...keys]));
  } catch {
    // localStorage no disponible (modo privado, etc.); se pierde la persistencia pero no rompe la app.
  }
}

const DAY_COLUMN_WIDTH = 36;
const WEEKLY_DAY_COLUMN_WIDTH = 88;
const MATRIX_COLOR_TOKENS = {
  headerNormal: '#EDF4FB',
  headerWeekend: '#EEF1F4',
  headerHoliday: '#FDF1C7',
  bodyWeekend: '#F4F6F8',
  bodyHoliday: '#FFF7CC',
  incidenciaBackground: '#E6FBF5',
  incidenciaText: '#0F766E',
  holidayText: '#846400',
  defaultText: '#111827',
  // Celda anterior a la fecha efectiva de un traslado: la persona aun no
  // estaba en esta planificacion, nunca puede tener turno (ver ajustePorTraslado).
  bloqueadaTrasladoBackground: '#FEE2E2',
  bloqueadaTrasladoText: '#7F1D1D'
} as const;

type MatrixRow = MatrizMensualPlanificacion['filas'][number];
type MatrixDay = MatrizMensualPlanificacion['dias'][number];
type MatrixCell = MatrixRow['dias'][number];
type MatrixRegistro = MatrixCell['registros'][number];

type ToolAction = OperationalToolAction;
type VistaPlanificacion = 'mensual' | 'semanal';

type WeeklyDay = {
  diaSemanaNum: number;
  label: string;
  abreviatura: string;
  esFinSemana: boolean;
};

const WEEKLY_DAYS: WeeklyDay[] = [
  { diaSemanaNum: 1, label: 'Lunes', abreviatura: 'L', esFinSemana: false },
  { diaSemanaNum: 2, label: 'Martes', abreviatura: 'M', esFinSemana: false },
  { diaSemanaNum: 3, label: 'Miércoles', abreviatura: 'X', esFinSemana: false },
  { diaSemanaNum: 4, label: 'Jueves', abreviatura: 'J', esFinSemana: false },
  { diaSemanaNum: 5, label: 'Viernes', abreviatura: 'V', esFinSemana: false },
  { diaSemanaNum: 6, label: 'Sábado', abreviatura: 'S', esFinSemana: true },
  { diaSemanaNum: 7, label: 'Domingo', abreviatura: 'D', esFinSemana: true }
];

type WeeklyDraftCell = {
  registros: MatrixRegistro[];
  // applyToolToWeeklyCell no guarda celdas con la herramienta "Navegar".
  activeTool: Exclude<ToolAction, { kind: 'navigate' }>;
};

type WeeklyDraft = Record<number, Record<number, WeeklyDraftCell>>;
type WeeklyApplyMode = 'llenar-vacios' | 'reemplazar';

type WeeklyApplyItem = {
  row: MatrixRow;
  day: MatrixDay;
  weeklyCell: WeeklyDraftCell;
  input: Parameters<typeof planificacionApi.applyMatrizCeldaLote>[1][number];
  action: 'crear' | 'reemplazar' | 'limpiar';
};

type WeeklyApplyPlan = {
  items: WeeklyApplyItem[];
  crear: number;
  reemplazar: number;
  limpiar: number;
  sinCambios: number;
};

export default function PlanificacionMatrizPage() {
  const params = useParams();
  const idPlanificacion = Number(params.id);
  const { capabilities, session: activeSession } = useAccessControl();
  const { showSuccess, showError, showInfo } = useAppToast();

  const [refreshKey, setRefreshKey] = useState(0);
  const [configRefreshKey, setConfigRefreshKey] = useState(0);
  // Modo lectura/edicion: por defecto arranca en lectura (mas seguro contra
  // clicks accidentales al solo navegar la matriz). Distinto de `editMode`,
  // que es la edicion del codigo visual de un turno, no de la matriz.
  const [modoInteraccion, setModoInteraccion] = useState<'lectura' | 'edicion'>('lectura');
  const [editMode, setEditMode] = useState(false);
  // Columnas ocultables (ver decisiones-tecnicas.md seccion 112): preferencia
  // por navegador, no por planificacion — se inicializa una sola vez desde
  // localStorage.
  const [hiddenColumnKeys, setHiddenColumnKeys] = useState<Set<string>>(() => loadHiddenColumnKeys());
  const [columnsMenuAnchor, setColumnsMenuAnchor] = useState<HTMLElement | null>(null);
  const [editVisualTarget, setEditVisualTarget] = useState<EditToolVisualTarget | null>(null);
  const [editorTurno, setEditorTurno] = useState<{ id: number | null; data: GuardarTurnoInput } | null>(null);
  const [impactoEliminarTurno, setImpactoEliminarTurno] = useState<{ id: number; nombre: string; impacto: ImpactoUsoCatalogo } | null>(
    null
  );
  const [confirmandoLimpiezaTurno, setConfirmandoLimpiezaTurno] = useState(false);
  const [matrixDraft, setMatrixDraft] = useState<MatrizMensualPlanificacion | null>(null);
  const [vistaPlanificacion, setVistaPlanificacion] = useState<VistaPlanificacion>('mensual');
  // Vista ORIGINAL/EFECTIVA de la resolucion de traslados (docs/integracion/
  // estrategia-integracion-asistencia-y-cambios-planificacion.md seccion 12):
  // el backend ya rechaza ORIGINAL con 403 para quien no sea hasSystemScope,
  // asi que el toggle solo se ofrece a esos actores; todos ven igual el chip
  // indicador.
  const [vistaMatrizDatos, setVistaMatrizDatos] = useState<'ORIGINAL' | 'EFECTIVA'>('EFECTIVA');
  // Modo acotado para completar el horario de alguien trasladado a esta
  // planificacion aprobada (row.ajustePorTraslado): a diferencia del toggle
  // general "Activar edicion" (que sigue oculto para APROBADA, ver
  // canEditPlanificacion), este modo separado solo habilita las celdas de esa
  // fila desde su fecha efectiva — el resto de la matriz permanece inerte.
  // Reservado a quien tenga alcance sistema (docs/database/decisiones-tecnicas.md
  // seccion 151).
  const [modoAjusteTraslado, setModoAjusteTraslado] = useState(false);
  // El patron semanal es deliberadamente local en esta primera iteracion:
  // comienza vacio aunque la matriz mensual tenga datos y no escribe en API.
  const [weeklyDraft, setWeeklyDraft] = useState<WeeklyDraft>({});
  const [weeklyApplyMode, setWeeklyApplyMode] = useState<WeeklyApplyMode | null>(null);
  const [weeklyApplyLoading, setWeeklyApplyLoading] = useState(false);
  const [activeToolKey, setActiveToolKey] = useState<string>('navigate');
  const [cellDisplayMode, setCellDisplayMode] = useState<'codigo' | 'horas'>('horas');
  const [selectedCellKey, setSelectedCellKey] = useState<string | null>(null);
  const [observacionSaving, setObservacionSaving] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportMode, setExportMode] = useState<ModoExportacionRolTurnos>('numerico');
  const [exportStyle, setExportStyle] = useState<EstiloExportacionRolTurnos>('color');
  const [exportFormat, setExportFormat] = useState<FormatoExportacionRolTurnos>('una-fila');
  const [exportPreviewHtml, setExportPreviewHtml] = useState('');
  const [exportPreviewError, setExportPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState<'excel' | 'pdf' | null>(null);
  const [observacionEditor, setObservacionEditor] = useState<{
    row: MatrixRow;
    value: string;
  } | null>(null);
  const setFeedback = useCallback(
    (next: { type: 'success' | 'error' | 'info'; message: string; dedupeKey?: string } | null) => {
      if (!next) {
        return;
      }

      if (next.type === 'success') {
        showSuccess(next.message, next.dedupeKey);
        return;
      }

      if (next.type === 'info') {
        showInfo(next.message, next.dedupeKey);
        return;
      }

      showError(next.message, next.dedupeKey);
    },
    [showError, showInfo, showSuccess]
  );

  const sesionEdicion = useSesionEdicionPlanificacion(idPlanificacion, modoInteraccion === 'edicion', (ocupadaPorEtiquetaRol) => {
    setModoInteraccion('lectura');
    setActiveToolKey('navigate');
    setEditMode(false);
    setFeedback({
      type: 'error',
      message: ocupadaPorEtiquetaRol
        ? `Perdiste el control de edicion: ahora lo tiene ${ocupadaPorEtiquetaRol}.`
        : 'Perdiste el control de edicion de esta planificacion.',
      dedupeKey: 'sesion-edicion-perdida'
    });
  });

  const dragStateRef = useRef<{ active: boolean; visited: Set<string> }>({
    active: false,
    visited: new Set<string>()
  });
  const weeklyDragStateRef = useRef<{ active: boolean; visited: Set<string> }>({
    active: false,
    visited: new Set<string>()
  });
  const savingCellKeysRef = useRef<Set<string>>(new Set());
  // Celdas pintadas (por click o arrastre) se acumulan aca en vez de mandar un
  // POST por celda: el flush real se dispara por debounce corto o al soltar
  // el mouse, uniendo todo el gesto en un solo request al endpoint de lote
  // (ver decisiones-tecnicas.md, estrategia de escalabilidad de la matriz).
  const pendingCellsRef = useRef<Map<string, PendingCellEntry>>(new Map());
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushPendingCells = useCallback(async () => {
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }

    const entries = Array.from(pendingCellsRef.current.values());
    pendingCellsRef.current.clear();

    if (entries.length === 0) {
      return;
    }

    try {
      const persistedList = await planificacionApi.applyMatrizCeldaLote(
        idPlanificacion,
        entries.map((entry) => entry.input)
      );

      startTransition(() => {
        setMatrixDraft((matrix) =>
          entries.reduce((acc, entry, index) => {
            const nextRegistros = mapPersistedCellToMatrixRegistros(persistedList[index], entry.activeTool);
            return applyCellMutationToMatrix(acc, entry.row.idAsignacionPersonal, entry.day.idCalendario, nextRegistros);
          }, matrix)
        );
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo guardar la matriz.';
      startTransition(() => {
        setMatrixDraft((matrix) =>
          entries.reduce(
            (acc, entry) => applyCellMutationToMatrix(acc, entry.row.idAsignacionPersonal, entry.day.idCalendario, entry.previousRegistros),
            matrix
          )
        );
      });
      setFeedback({
        type: 'error',
        message:
          entries.length === 1
            ? buildCellApplyErrorMessage(entries[0].activeTool, entries[0].row, entries[0].day, message)
            : `No se pudieron guardar ${entries.length} celdas: ${message}`,
        dedupeKey: 'matriz-celda-guardado'
      });
    } finally {
      entries.forEach((entry) => savingCellKeysRef.current.delete(entry.cellKey));
    }
  }, [idPlanificacion, setFeedback]);

  const scheduleFlush = useCallback(() => {
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
    }
    flushTimerRef.current = setTimeout(() => {
      flushTimerRef.current = null;
      void flushPendingCells();
    }, 150);
  }, [flushPendingCells]);
  // Encabezado "partido": una mini-tabla solo con el header vive dentro del
  // Box sticky (siempre visible), separada de la tabla real que tiene el
  // scroll horizontal. Se sincroniza el scroll de la real hacia la mini via
  // JS en vez de usar `position: sticky` sobre celdas de una tabla con
  // `table-layout: auto` + scroll horizontal — esa combinacion rompio el
  // layout en uso real (ver decisiones-tecnicas.md secciones 103-104).
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);
  const handleBodyScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    if (headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = event.currentTarget.scrollLeft;
    }
  }, []);

  const detalle = useApiRequest(() => planificacionApi.getPlanificacion(idPlanificacion), [idPlanificacion, refreshKey]);
  const matriz = useApiRequest(
    () => planificacionApi.getMatrizMensual(idPlanificacion, vistaMatrizDatos),
    [idPlanificacion, refreshKey, vistaMatrizDatos]
  );
  const configuracionOperativa = useApiRequest(
    () => planificacionApi.getConfiguracionOperativa(idPlanificacion),
    [idPlanificacion, refreshKey, configRefreshKey]
  );

  const tools = useMemo(() => buildToolActions(configuracionOperativa.data), [configuracionOperativa.data]);
  const operationalColorMap = useMemo(() => buildOperationalColorMap(configuracionOperativa.data), [configuracionOperativa.data]);

  const visibleLeftColumns = useMemo(() => LEFT_COLUMNS.filter((column) => !hiddenColumnKeys.has(column.key)), [hiddenColumnKeys]);
  const visibleRightColumns = useMemo(() => RIGHT_COLUMNS.filter((column) => !hiddenColumnKeys.has(column.key)), [hiddenColumnKeys]);

  const toggleColumnVisibility = useCallback((key: string) => {
    setHiddenColumnKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      saveHiddenColumnKeys(next);
      return next;
    });
  }, []);

  const activeTool = useMemo(() => tools.find((item) => item.key === activeToolKey) || tools[0], [activeToolKey, tools]);
  const loadExportPreview = useCallback(
    async (modo: ModoExportacionRolTurnos, estilo: EstiloExportacionRolTurnos, formato: FormatoExportacionRolTurnos) => {
      setPreviewLoading(true);
      setExportPreviewError(null);

      try {
        const html = await planificacionApi.getExportPreviewHtml(idPlanificacion, modo, estilo, formato);
        setExportPreviewHtml(html);
      } catch (error) {
        setExportPreviewError(error instanceof Error ? error.message : 'No se pudo cargar la vista previa.');
      } finally {
        setPreviewLoading(false);
      }
    },
    [idPlanificacion]
  );
  const canOperate = Boolean(canEditPlanificacion(capabilities, detalle.data?.estado));
  const puedeEnviarRevision = canSendRevisionPlanificacion(capabilities, detalle.data?.estado);
  const puedeVolverBorrador = canReturnPlanificacionToDraft(capabilities, detalle.data?.estado);
  const puedeAprobar = canApprovePlanificacion(capabilities, detalle.data?.estado);
  const puedeCerrar = canClosePlanificacion(capabilities, detalle.data?.estado);
  const canManageState = Boolean(puedeEnviarRevision || puedeVolverBorrador || puedeAprobar || puedeCerrar);
  const puedeGestionarTurnos = canManageTurnos(capabilities);
  const matrixData = matrixDraft;
  const filasVisibles = matrixData?.filas ?? [];

  // Filas destino de un traslado activo en esta planificacion: solo sirve
  // para habilitar el boton "Completar horario de traslado" (nunca se
  // muestra como lista ni como alerta — el usuario descarto esa idea, ver
  // docs/database/decisiones-tecnicas.md seccion 151).
  const filasConAjusteTraslado = useMemo(
    () => (matrixData ? matrixData.filas.filter((fila) => fila.ajustePorTraslado !== null) : []),
    [matrixData]
  );
  const puedeAjustarTraslados = detalle.data?.estado === 'APROBADA' && hasSystemScope(activeSession) && filasConAjusteTraslado.length > 0;

  useEffect(() => {
    if (matriz.data) {
      setMatrixDraft(matriz.data);
    }
  }, [matriz.data]);

  // Si deja de haber traslados por completar, o la sesion pierde el alcance
  // (ej. se re-logueo con otro rol en otra pestana), se sale del modo acotado.
  useEffect(() => {
    if (!puedeAjustarTraslados && modoAjusteTraslado) {
      setModoAjusteTraslado(false);
    }
  }, [modoAjusteTraslado, puedeAjustarTraslados]);

  // Si la sesion pierde la capacidad de editar mientras estaba en modo
  // edicion (ej. la planificacion se cerro o se aprobo en otra pestana y
  // este refresco trajo el nuevo estado), se fuerza de vuelta a lectura.
  useEffect(() => {
    if (!canOperate && modoInteraccion === 'edicion') {
      setModoInteraccion('lectura');
      setActiveToolKey('navigate');
      setEditMode(false);
    }
  }, [canOperate, modoInteraccion]);

  useEffect(() => {
    if (!exportDialogOpen) {
      return;
    }

    void loadExportPreview(exportMode, exportStyle, exportFormat);
  }, [exportDialogOpen, exportMode, exportStyle, exportFormat, loadExportPreview]);

  useEffect(() => {
    const stopDragging = () => {
      dragStateRef.current.active = false;
      dragStateRef.current.visited.clear();
      weeklyDragStateRef.current.active = false;
      weeklyDragStateRef.current.visited.clear();
      void flushPendingCells();
    };

    window.addEventListener('mouseup', stopDragging);
    return () => window.removeEventListener('mouseup', stopDragging);
  }, [flushPendingCells]);

  const handleToolToggle = useCallback(
    (tool: ToolAction) => {
      setFeedback(null);
      dragStateRef.current.active = false;
      dragStateRef.current.visited.clear();
      void flushPendingCells();
      setActiveToolKey((current) => (current === tool.key ? 'navigate' : tool.key));
    },
    [flushPendingCells, setFeedback]
  );

  const handleModoInteraccionChange = useCallback(
    async (next: 'lectura' | 'edicion') => {
      if (next === 'lectura') {
        setModoInteraccion('lectura');
        setActiveToolKey('navigate');
        setEditMode(false);
        return;
      }

      const resultado = await sesionEdicion.intentarAdquirir();
      if (!resultado.ok) {
        setFeedback({
          type: 'error',
          message: resultado.ocupadaPorEtiquetaRol
            ? `No se puede activar edicion: ${resultado.ocupadaPorEtiquetaRol} esta editando esta planificacion en este momento.`
            : 'No se puede activar edicion: otro usuario esta editando esta planificacion en este momento.',
          dedupeKey: 'sesion-edicion-ocupada'
        });
        return;
      }

      setModoInteraccion('edicion');
      setActiveToolKey('navigate');
    },
    [sesionEdicion, setFeedback]
  );

  // Selector unico de modo para el HUD (en vez de dos botones sueltos sin
  // relacion visual entre si): "edicion" y "ajuste" nunca coinciden a la vez
  // (canOperate es siempre falso para APROBADA, que es la unica condicion de
  // puedeAjustarTraslados), asi que alcanza con un solo valor exclusivo.
  const modoActual: 'lectura' | 'edicion' | 'ajuste' = modoAjusteTraslado
    ? 'ajuste'
    : modoInteraccion === 'edicion'
      ? 'edicion'
      : 'lectura';

  const handleModoActualChange = useCallback(
    (_event: unknown, next: 'lectura' | 'edicion' | 'ajuste' | null) => {
      // ToggleButtonGroup exclusive manda null al re-apretar la opcion ya
      // seleccionada -- no hay nada que hacer en ese caso.
      if (!next || next === modoActual) {
        return;
      }

      if (next === 'ajuste') {
        setModoAjusteTraslado(true);
        setVistaPlanificacion('mensual');
        setActiveToolKey('navigate');
        setSelectedCellKey(null);
        return;
      }

      if (modoAjusteTraslado) {
        setModoAjusteTraslado(false);
        setActiveToolKey('navigate');
        setSelectedCellKey(null);
      }

      if (next === 'lectura' || next === 'edicion') {
        void handleModoInteraccionChange(next);
      }
    },
    [handleModoInteraccionChange, modoActual, modoAjusteTraslado]
  );

  const handleEditToolVisual = useCallback(
    (tool: ToolAction) => {
      if (tool.kind !== 'turno') return;
      if (!detalle.data?.idServicio && !detalle.data?.idDepartamento) return;

      const hours = tool.horasProgramadas;
      const schedule = tool.horaInicio && tool.horaFin ? ` | ${tool.horaInicio.slice(0, 5)}-${tool.horaFin.slice(0, 5)}` : '';
      const displayName = `${formatNumberToken(hours)} h${schedule}${tool.label ? ` — ${tool.label}` : ''}`;

      setEditVisualTarget({
        idCodigo: tool.id,
        idTurno: tool.kind === 'turno' ? tool.idTurno : null,
        idServicio: detalle.data.idServicio ?? null,
        idDepartamento: detalle.data.idDepartamento ?? null,
        codigoVisual: tool.codigo || '',
        etiqueta: tool.nombre || '',
        displayName,
        origen: tool.kind === 'turno' ? 'TURNO' : 'TIPO_DIA'
      });
    },
    [detalle.data?.idServicio, detalle.data?.idDepartamento]
  );

  const handleOpenCrearTurno = useCallback(async () => {
    setEditorTurno({ id: null, data: DEFAULT_TURNO_FORM });
  }, []);

  const handleTurnoDialogSaved = useCallback(() => {
    setConfigRefreshKey((k) => k + 1);
    setRefreshKey((k) => k + 1);
    setActiveToolKey('navigate');
  }, []);

  const handleEditarHorarioCompleto = useCallback(
    async (idTurno: number) => {
      setEditVisualTarget(null);
      try {
        const turno = await operacionApi.getTurnoById(idTurno);
        setEditorTurno({
          id: turno.id,
          data: {
            ...mapTurnoToForm(turno),
            codigoVisual: turno.codigoVisual || undefined,
            etiqueta: turno.etiquetaVisual || undefined
          }
        });
      } catch {
        showError('No se pudo cargar el horario para editarlo.');
      }
    },
    [showError]
  );

  const handleDesactivarTurno = useCallback(
    async (idTurno: number, nombre: string, confirmarLimpieza = false) => {
      setConfirmandoLimpiezaTurno(true);
      try {
        await operacionApi.deleteTurno(idTurno, confirmarLimpieza);
        showSuccess(nombre ? `Horario "${nombre}" desactivado correctamente.` : 'Horario desactivado correctamente.');
        setEditVisualTarget(null);
        setImpactoEliminarTurno(null);
        setConfigRefreshKey((k) => k + 1);
        setRefreshKey((k) => k + 1);
        setActiveToolKey('navigate');
      } catch (error) {
        const impacto = error instanceof ApiClientError ? (error.body?.impacto as ImpactoUsoCatalogo | undefined) : undefined;

        if (error instanceof ApiClientError && error.status === 409 && impacto) {
          setImpactoEliminarTurno({ id: idTurno, nombre, impacto });
          return;
        }

        showError(error instanceof Error ? error.message : 'No se pudo desactivar el horario.');
      } finally {
        setConfirmandoLimpiezaTurno(false);
      }
    },
    [showError, showSuccess]
  );

  // Fuera del modo acotado, la edicion normal decide celda por celda
  // (canOperate+modoInteraccion). Dentro del modo acotado, solo responden las
  // celdas de una fila con traslado activo, desde su fecha efectiva — el
  // backend vuelve a exigir exactamente esto mismo por su cuenta
  // (PlanificacionAccessPolicyService.assertPuedeEditarCeldaMatriz), asi que
  // esta funcion es una conveniencia de interfaz, no la unica barrera.
  const puedeEditarCeldaPorModo = useCallback(
    (row: MatrixRow, day: MatrixDay) => {
      if (modoAjusteTraslado) {
        return Boolean(row.ajustePorTraslado) && new Date(day.fecha) >= new Date(row.ajustePorTraslado!.fechaEfectiva);
      }

      return canOperate && modoInteraccion === 'edicion';
    },
    [canOperate, modoAjusteTraslado, modoInteraccion]
  );

  const handleCellClick = useCallback(
    async (row: MatrixRow, day: MatrixDay, source: 'navigate' | 'paint' = 'navigate') => {
      const cellKey = buildCellKey(row.idAsignacionPersonal, day.idCalendario);

      if (source === 'navigate' || activeTool.kind === 'navigate') {
        setSelectedCellKey(cellKey);
      }

      if (!puedeEditarCeldaPorModo(row, day) || !activeSession || activeTool.kind === 'navigate') {
        return;
      }

      if (savingCellKeysRef.current.has(cellKey)) {
        return;
      }

      setFeedback(null);
      applyToolToCell({
        activeTool,
        cellKey,
        currentMatrix: matrixData,
        onMatrixChange: setMatrixDraft,
        pendingCellsRef,
        savingCellKeysRef,
        scheduleFlush,
        row,
        day
      });
    },
    [activeSession, activeTool, matrixData, puedeEditarCeldaPorModo, scheduleFlush, setFeedback]
  );

  const handleCellMouseDown = useCallback(
    async (row: MatrixRow, day: MatrixDay) => {
      const cellKey = buildCellKey(row.idAsignacionPersonal, day.idCalendario);

      if (!puedeEditarCeldaPorModo(row, day) || !activeSession || activeTool.kind === 'navigate') {
        setSelectedCellKey(cellKey);
        return;
      }

      dragStateRef.current.active = true;
      dragStateRef.current.visited = new Set<string>([cellKey]);
      await handleCellClick(row, day, 'paint');
    },
    [activeSession, activeTool.kind, handleCellClick, puedeEditarCeldaPorModo]
  );

  const handleCellMouseEnter = useCallback(
    async (row: MatrixRow, day: MatrixDay) => {
      if (!dragStateRef.current.active || !puedeEditarCeldaPorModo(row, day) || !activeSession || activeTool.kind === 'navigate') {
        return;
      }

      const cellKey = buildCellKey(row.idAsignacionPersonal, day.idCalendario);
      if (dragStateRef.current.visited.has(cellKey)) {
        return;
      }

      dragStateRef.current.visited.add(cellKey);
      await handleCellClick(row, day, 'paint');
    },
    [activeSession, activeTool.kind, handleCellClick, puedeEditarCeldaPorModo]
  );

  const applyToolToWeeklyCell = useCallback(
    (row: MatrixRow, day: WeeklyDay) => {
      if (!canOperate || modoInteraccion !== 'edicion' || !activeSession || activeTool.kind === 'navigate') {
        setSelectedCellKey(`${row.idAsignacionPersonal}:weekly:${day.diaSemanaNum}`);
        return;
      }

      const cellKey = `${row.idAsignacionPersonal}:weekly:${day.diaSemanaNum}`;
      setSelectedCellKey(cellKey);
      setWeeklyDraft((current) => {
        const rowDraft = current[row.idAsignacionPersonal] || {};
        const currentCell = rowDraft[day.diaSemanaNum];
        const currentRegistros = currentCell?.registros || [];
        const registros = buildOptimisticRegistros(activeTool, currentRegistros);

        return {
          ...current,
          [row.idAsignacionPersonal]: {
            ...rowDraft,
            [day.diaSemanaNum]: { registros, activeTool }
          }
        };
      });
    },
    [activeSession, activeTool, canOperate, modoInteraccion]
  );

  const handleWeeklyCellMouseDown = useCallback(
    (row: MatrixRow, day: WeeklyDay) => {
      const cellKey = `${row.idAsignacionPersonal}:weekly:${day.diaSemanaNum}`;

      if (!canOperate || modoInteraccion !== 'edicion' || !activeSession || activeTool.kind === 'navigate') {
        setSelectedCellKey(cellKey);
        return;
      }

      weeklyDragStateRef.current.active = true;
      weeklyDragStateRef.current.visited = new Set<string>([cellKey]);
      applyToolToWeeklyCell(row, day);
    },
    [activeSession, activeTool.kind, applyToolToWeeklyCell, canOperate, modoInteraccion]
  );

  const handleWeeklyCellMouseEnter = useCallback(
    (row: MatrixRow, day: WeeklyDay) => {
      if (
        !weeklyDragStateRef.current.active ||
        !canOperate ||
        modoInteraccion !== 'edicion' ||
        !activeSession ||
        activeTool.kind === 'navigate'
      ) {
        return;
      }

      const cellKey = `${row.idAsignacionPersonal}:weekly:${day.diaSemanaNum}`;
      if (weeklyDragStateRef.current.visited.has(cellKey)) {
        return;
      }

      weeklyDragStateRef.current.visited.add(cellKey);
      applyToolToWeeklyCell(row, day);
    },
    [activeSession, activeTool.kind, applyToolToWeeklyCell, canOperate, modoInteraccion]
  );

  const weeklyHasPattern = useMemo(() => Object.values(weeklyDraft).some((rowDraft) => Object.keys(rowDraft).length > 0), [weeklyDraft]);

  const weeklyApplyPlan = useMemo(
    () => (matrixData && weeklyApplyMode ? buildWeeklyApplyPlan(matrixData, weeklyDraft, weeklyApplyMode) : emptyWeeklyApplyPlan()),
    [matrixData, weeklyApplyMode, weeklyDraft]
  );

  const handleApplyWeeklyPattern = async () => {
    if (!weeklyApplyMode || !matrixData || !activeSession || !canOperate || modoInteraccion !== 'edicion' || !weeklyHasPattern) {
      return;
    }

    const pending = weeklyApplyPlan.items;

    if (pending.length === 0) {
      setWeeklyApplyMode(null);
      setFeedback({
        type: 'info',
        message:
          weeklyApplyMode === 'llenar-vacios'
            ? 'No hay celdas mensuales vacias compatibles con el patron semanal.'
            : 'No hay celdas semanales configuradas para reemplazar en el mes.'
      });
      return;
    }

    setWeeklyApplyLoading(true);
    setFeedback(null);

    try {
      const persistedList = await planificacionApi.applyMatrizCeldaLote(
        idPlanificacion,
        pending.map((item) => item.input)
      );

      startTransition(() => {
        setMatrixDraft((matrix) =>
          pending.reduce((currentMatrix, item, index) => {
            const persisted = persistedList[index];
            const registros = mapPersistedCellToMatrixRegistros(persisted, item.weeklyCell.activeTool);
            return applyCellMutationToMatrix(currentMatrix, item.row.idAsignacionPersonal, item.day.idCalendario, registros);
          }, matrix)
        );
      });

      setWeeklyApplyMode(null);
      setFeedback({
        type: 'success',
        message:
          weeklyApplyMode === 'llenar-vacios'
            ? `Se completaron ${pending.length} celdas mensuales vacias con el patron semanal.`
            : `Se reemplazaron ${pending.length} celdas mensuales con el patron semanal.`
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'No se pudo aplicar el patron semanal.'
      });
    } finally {
      setWeeklyApplyLoading(false);
    }
  };

  const handleOpenObservacionEditor = useCallback((row: MatrixRow) => {
    setObservacionEditor({ row, value: row.observacionMensual || '' });
  }, []);

  const handleSaveObservacion = async () => {
    if (!observacionEditor || !activeSession) {
      return;
    }

    setObservacionSaving(true);
    setFeedback(null);

    try {
      const response = await planificacionApi.updateObservacionMensual(idPlanificacion, observacionEditor.row.idAsignacionPersonal, {
        descripcion: observacionEditor.value
      });

      setFeedback({
        type: 'success',
        message: response
          ? `Se guardo la observacion mensual de ${observacionEditor.row.nombreCompleto}.`
          : `Se elimino la observacion mensual de ${observacionEditor.row.nombreCompleto}.`
      });
      setObservacionEditor(null);
      // Un recargo completo (setRefreshKey) traia de vuelta toda la matriz por
      // el texto de una sola fila -- igual que en applyCellMutationToMatrix,
      // alcanza con reemplazar esa fila puntual (ver pedido de rendimiento,
      // docs/database/decisiones-tecnicas.md seccion 155).
      startTransition(() => {
        setMatrixDraft((matrix) =>
          applyObservacionMensualToMatrix(matrix, observacionEditor.row.idAsignacionPersonal, response?.descripcion ?? null)
        );
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'No se pudo guardar la observacion.'
      });
    } finally {
      setObservacionSaving(false);
    }
  };

  const handleEstadoChange = async (estado: EstadoPlanificacion) => {
    if (!detalle.data) {
      return;
    }

    setFeedback(null);

    try {
      const response = await planificacionApi.changePlanificacionEstado(idPlanificacion, { estado });
      setFeedback({
        type: 'success',
        message: mensajeCambioEstadoPlanificacion(response, response.estado)
      });
      setRefreshKey((value) => value + 1);
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'No se pudo cambiar el estado.'
      });
    }
  };

  const handleExport = async () => {
    setExportLoading('excel');
    setFeedback(null);

    try {
      const blob = await planificacionApi.exportPlanificacionExcel(idPlanificacion, exportMode, exportStyle, exportFormat);
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = detalle.data
        ? buildPlanificacionExcelFilename(detalle.data, exportMode, exportStyle, exportFormat)
        : `rol-turnos_planificacion_${idPlanificacion}_${exportMode}_${exportStyle}.xlsx`;
      anchor.click();

      window.setTimeout(() => window.URL.revokeObjectURL(url), 10_000);
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'No se pudo exportar el archivo.'
      });
    } finally {
      setExportLoading(null);
    }
  };

  return (
    <Grid container columnSpacing={2.75} rowSpacing={3}>
      <Grid size={12}>
        <MainCard>
          <Stack direction={{ xs: 'column', lg: 'row' }} divider={<Divider flexItem orientation="vertical" />} spacing={2}>
            <Stack spacing={0.75} sx={{ minWidth: 280 }}>
              <Typography variant="subtitle2">Planificacion</Typography>
              {detalle.data?.idServicio !== null ? (
                <Typography variant="body2">Servicio: {detalle.data?.nombreServicio || '-'}</Typography>
              ) : (
                <Typography variant="body2">
                  Departamento: {detalle.data?.nombreDepartamento || detalle.data?.codigoDepartamento || '-'}
                </Typography>
              )}
              <Typography variant="body2">
                Periodo: {detalle.data ? `${getMonthName(detalle.data.mes)} ${detalle.data.anio}` : '-'}
              </Typography>
              <Stack direction="row" spacing={1}>
                {detalle.data ? <PlanificacionStatusChip estado={detalle.data.estado} /> : null}
                {activeSession ? <Chip label={activeSession.username} size="small" variant="outlined" /> : null}
              </Stack>
            </Stack>

            <Stack spacing={0.75} sx={{ minWidth: 260 }}>
              <Typography variant="subtitle2">Resumen</Typography>
              <Typography variant="body2">
                Personas: {matrixData?.resumen.totalPersonas ?? '-'} | Dias: {matrixData?.resumen.totalDias ?? '-'}
              </Typography>
              <Typography variant="body2">
                Registros: {matrixData?.resumen.totalRegistros ?? '-'} | Horas: {matrixData?.resumen.totalHorasMes ?? '-'}
              </Typography>
              {!activeSession ? (
                <Alert severity="warning">No hay sesion activa. Debes ingresar por /login.</Alert>
              ) : !canOperate ? (
                <Alert severity="info">La planificacion no esta editable para esta sesion o su estado actual ya no permite cambios.</Alert>
              ) : (
                <Alert severity="success">Modo herramienta activo para pruebas rapidas tipo Excel.</Alert>
              )}
            </Stack>

            <Stack spacing={0.75} sx={{ minWidth: 300 }}>
              <Typography variant="subtitle2">Flujo operativo</Typography>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                <PageBackButton label="Volver a planificaciones" to="/planificacion/planificaciones" />
                <PlanificacionStateActions
                  disabled={!canManageState}
                  estado={detalle.data?.estado}
                  onChangeEstado={(estado) => void handleEstadoChange(estado)}
                  puedeAprobar={puedeAprobar}
                  puedeCerrar={puedeCerrar}
                  puedeEnviarRevision={puedeEnviarRevision}
                  puedeVolverBorrador={puedeVolverBorrador}
                />
              </Stack>
            </Stack>
          </Stack>
        </MainCard>
      </Grid>

      <Grid size={12}>
        <MainCard
          secondary={
            <Stack direction="row" divider={<Divider flexItem orientation="vertical" />} spacing={1.25} sx={{ alignItems: 'center' }}>
              {/* Grupo 1: de donde vienen los datos */}
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Chip
                  color={vistaMatrizDatos === 'ORIGINAL' ? 'warning' : 'default'}
                  label={vistaMatrizDatos === 'ORIGINAL' ? 'Vista original' : 'Vista efectiva'}
                  size="small"
                  variant={vistaMatrizDatos === 'ORIGINAL' ? 'filled' : 'outlined'}
                />
                {hasSystemScope(activeSession) ? (
                  <Tooltip title="La vista original conserva la planificacion tal como fue aprobada, sin aplicar traslados posteriores.">
                    <Button
                      onClick={() => {
                        setVistaMatrizDatos((current) => (current === 'ORIGINAL' ? 'EFECTIVA' : 'ORIGINAL'));
                        setSelectedCellKey(null);
                      }}
                      size="small"
                      variant="outlined"
                    >
                      {vistaMatrizDatos === 'ORIGINAL' ? 'Ver vista efectiva' : 'Ver vista original'}
                    </Button>
                  </Tooltip>
                ) : null}
              </Stack>

              {/* Grupo 2: como se muestra cada celda (no requiere edicion) */}
              <ToggleButtonGroup
                exclusive
                onChange={(_event, next: 'horas' | 'codigo' | null) => {
                  if (next) {
                    setCellDisplayMode(next);
                  }
                }}
                size="small"
                value={cellDisplayMode}
              >
                <ToggleButton value="horas">Horas</ToggleButton>
                <ToggleButton value="codigo">Etiquetas</ToggleButton>
              </ToggleButtonGroup>

              {/* Grupo 3: utilidades generales de la tarjeta */}
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Tooltip title="Mostrar u ocultar columnas">
                  <IconButton onClick={(event) => setColumnsMenuAnchor(event.currentTarget)} size="small">
                    <TableOutlined style={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
                <Popover
                  anchorEl={columnsMenuAnchor}
                  anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                  onClose={() => setColumnsMenuAnchor(null)}
                  open={Boolean(columnsMenuAnchor)}
                  transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                >
                  <FormGroup sx={{ p: 1.5, minWidth: 200 }}>
                    <Typography color="text.secondary" sx={{ mb: 0.5, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                      Columnas visibles
                    </Typography>
                    {TOGGLEABLE_COLUMNS.map((column) => (
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={!hiddenColumnKeys.has(column.key)}
                            onChange={() => toggleColumnVisibility(column.key)}
                            size="small"
                          />
                        }
                        key={column.key}
                        label={<Typography variant="body2">{column.label}</Typography>}
                      />
                    ))}
                  </FormGroup>
                </Popover>
                <Tooltip title="Recargar matriz">
                  <IconButton onClick={() => setRefreshKey((value) => value + 1)} size="small">
                    <ReloadOutlined style={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
                {canExportPlanificacion(capabilities) ? (
                  <Button
                    onClick={() => setExportDialogOpen(true)}
                    size="small"
                    startIcon={<DownloadOutlined style={{ fontSize: 14 }} />}
                    variant="contained"
                  >
                    Exportar a Excel
                  </Button>
                ) : null}
              </Stack>
            </Stack>
          }
          // MUI Card tiene `overflow: hidden` por defecto, lo que rompe el
          // `position: sticky` de la barra de herramientas de mas abajo (que
          // necesita "escaparse" del recorte del Card para poder pegarse al
          // viewport al scrollear una matriz con muchas filas).
          sx={{ overflow: 'visible' }}
          title={vistaPlanificacion === 'mensual' ? 'Matriz mensual' : 'Matriz semanal'}
        >
          <Box
            sx={{
              position: 'sticky',
              top: 0,
              zIndex: 2,
              backgroundColor: '#fff',
              borderBottom: '1px solid',
              borderColor: 'divider',
              pb: 0,
              mb: 0
            }}
          >
            <Box sx={{ mb: 1.25 }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <ToggleButtonGroup exclusive onChange={handleModoActualChange} size="small" value={modoActual}>
                  <ToggleButton value="lectura">Lectura</ToggleButton>
                  {canOperate ? <ToggleButton value="edicion">Edicion</ToggleButton> : null}
                  {puedeAjustarTraslados ? <ToggleButton value="ajuste">Completar traslado</ToggleButton> : null}
                </ToggleButtonGroup>

                {modoInteraccion === 'edicion' ? (
                  <ToggleButtonGroup
                    exclusive
                    onChange={(_event, next: VistaPlanificacion | null) => {
                      if (next) {
                        setVistaPlanificacion(next);
                        setSelectedCellKey(null);
                      }
                    }}
                    size="small"
                    value={vistaPlanificacion}
                  >
                    <ToggleButton value="mensual">Vista mensual</ToggleButton>
                    <ToggleButton value="semanal">Vista semanal</ToggleButton>
                  </ToggleButtonGroup>
                ) : null}

                {modoAjusteTraslado ? (
                  <Typography color="text.secondary" variant="caption">
                    Solo se pueden editar las celdas de personas trasladadas, desde su fecha efectiva. El resto de la matriz queda
                    bloqueado.
                  </Typography>
                ) : null}
              </Stack>
            </Box>

            {modoInteraccion === 'edicion' || modoAjusteTraslado ? (
              <PlanificacionOperationalToolbar
                activeToolKey={activeTool.key}
                canManageTurnos={puedeGestionarTurnos}
                description="Todos los servicios usan la misma matriz. Lo que cambia es la configuracion operativa que define codigos visibles, horarios y colores."
                editMode={editMode}
                onEditModeChange={(active) => {
                  setEditMode(active);
                  if (active) {
                    setActiveToolKey('navigate');
                  }
                }}
                onToggle={handleToolToggle}
                onEditToolVisual={handleEditToolVisual}
                onCreateTurno={() => void handleOpenCrearTurno()}
                tools={tools}
              />
            ) : sesionEdicion.sesion?.ocupada && !sesionEdicion.sesion.esPropia ? (
              <Alert
                action={
                  sesionEdicion.sesion.puedeTomarControl ? (
                    <Button
                      color="inherit"
                      onClick={() => {
                        void sesionEdicion.tomarControl().then(() => {
                          setModoInteraccion('edicion');
                          setActiveToolKey('navigate');
                          setFeedback({ type: 'success', message: 'Tomaste el control de edicion de esta planificacion.' });
                        });
                      }}
                      size="small"
                    >
                      Tomar control
                    </Button>
                  ) : undefined
                }
                severity="warning"
                sx={{ mb: 0 }}
              >
                {capitalizarPrimeraLetra(sesionEdicion.sesion.etiquetaRolEditor)} esta editando esta planificacion en este momento
                {sesionEdicion.sesion.adquiridoEn ? ` (desde las ${formatHoraCorta(sesionEdicion.sesion.adquiridoEn)})` : ''}. Modo solo
                lectura mientras tanto.
              </Alert>
            ) : (
              <Alert severity="info" sx={{ mb: 0 }}>
                Modo lectura: solo se puede navegar y consultar la matriz.
                {canOperate ? ' Selecciona "Edicion" arriba para pintar turnos o incidencias.' : ''}
              </Alert>
            )}

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25} sx={{ mt: 1.25 }}>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                {vistaPlanificacion === 'semanal' && modoInteraccion === 'edicion' ? (
                  <>
                    <Button
                      color="warning"
                      disabled={!weeklyHasPattern || weeklyApplyLoading}
                      onClick={() => setWeeklyApplyMode('llenar-vacios')}
                      size="small"
                      variant="outlined"
                    >
                      Completar vacíos
                    </Button>
                    <Button
                      color="warning"
                      disabled={!weeklyHasPattern || weeklyApplyLoading}
                      onClick={() => setWeeklyApplyMode('reemplazar')}
                      size="small"
                      variant="outlined"
                    >
                      Reemplazar mes
                    </Button>
                  </>
                ) : null}
              </Stack>
              {modoInteraccion === 'edicion' || modoAjusteTraslado ? (
                <Alert
                  severity={activeTool.kind === 'navigate' ? 'info' : activeTool.kind === 'clear' ? 'warning' : 'success'}
                  sx={{ flex: 1, mb: 0 }}
                >
                  {describeActiveTool(activeTool)}
                </Alert>
              ) : null}
            </Stack>

            {matrixData && vistaPlanificacion === 'mensual' ? (
              <Box ref={headerScrollRef} sx={{ overflow: 'hidden', mt: 1.25 }}>
                <Table
                  size="small"
                  sx={{
                    width: 'max-content',
                    minWidth: '100%',
                    tableLayout: 'fixed'
                  }}
                >
                  <TableHead>
                    <TableRow>
                      {visibleLeftColumns.map((column) => (
                        <TableCell key={column.key} sx={adaptiveHeaderCell(column)}>
                          {column.label}
                        </TableCell>
                      ))}

                      {matrixData.dias.map((dia) => {
                        const holidayHeaderCode = resolveHolidayHeaderCode(dia.esFeriado, dia.codigoFeriado);
                        const holidayHeaderTitle = buildHolidayHeaderTitle(
                          dia.esFeriado,
                          dia.codigoFeriado,
                          dia.nombreFeriado,
                          holidayHeaderCode
                        );

                        return (
                          <TableCell
                            align="center"
                            key={dia.idCalendario}
                            sx={dayHeaderCellStyle(dia.esFinSemana, dia.esFeriado)}
                            title={holidayHeaderTitle}
                          >
                            <Stack spacing={0} sx={{ alignItems: 'center', minHeight: 30 }}>
                              <Typography fontWeight={700} sx={{ fontSize: 11, lineHeight: 1.1 }} variant="caption">
                                {dia.diaMes}
                              </Typography>
                              {holidayHeaderCode ? (
                                <Typography
                                  sx={{
                                    color: '#8a5c00',
                                    fontSize: 9,
                                    fontWeight: 800,
                                    letterSpacing: 0.1,
                                    lineHeight: 0.95
                                  }}
                                  variant="caption"
                                >
                                  {holidayHeaderCode}
                                </Typography>
                              ) : null}
                              <Typography color="text.secondary" sx={{ lineHeight: 1.05 }} variant="caption">
                                {dia.abreviaturaDiaSemana}
                              </Typography>
                            </Stack>
                          </TableCell>
                        );
                      })}

                      {visibleRightColumns.map((column) => (
                        <TableCell key={column.key} sx={adaptiveHeaderCell(column)}>
                          {column.label}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                </Table>
              </Box>
            ) : null}
            {matrixData && vistaPlanificacion === 'semanal' ? (
              <Box ref={headerScrollRef} sx={{ overflow: 'hidden', mt: 1.25 }}>
                <Table
                  size="small"
                  sx={{
                    width: 'max-content',
                    minWidth: 'max-content',
                    tableLayout: 'fixed'
                  }}
                >
                  <TableHead>
                    <TableRow>
                      {visibleLeftColumns.map((column) => (
                        <TableCell key={column.key} sx={adaptiveHeaderCell(column)}>
                          {column.label}
                        </TableCell>
                      ))}
                      {WEEKLY_DAYS.map((day) => (
                        <TableCell
                          align="center"
                          key={day.diaSemanaNum}
                          sx={dayHeaderCellStyle(day.esFinSemana, false, WEEKLY_DAY_COLUMN_WIDTH)}
                        >
                          <Stack spacing={0} sx={{ alignItems: 'center', minHeight: 30 }}>
                            <Typography fontWeight={700} sx={{ fontSize: 11, lineHeight: 1.1 }} variant="caption">
                              {day.label}
                            </Typography>
                            <Typography color="text.secondary" sx={{ lineHeight: 1.05 }} variant="caption">
                              {day.abreviatura}
                            </Typography>
                          </Stack>
                        </TableCell>
                      ))}
                      {!hiddenColumnKeys.has('horarioResumen') ? (
                        <TableCell sx={adaptiveHeaderCell(findRightColumn('horarioResumen'))}>
                          {findRightColumn('horarioResumen').label}
                        </TableCell>
                      ) : null}
                    </TableRow>
                  </TableHead>
                </Table>
              </Box>
            ) : null}
          </Box>

          {(matriz.loading || detalle.loading || configuracionOperativa.loading) && !matrixData ? (
            <Stack spacing={1.5} sx={{ alignItems: 'center', justifyContent: 'center', py: 6, minHeight: 320 }}>
              <CircularProgress size={28} />
              <Typography variant="body2">Cargando matriz mensual...</Typography>
              {matriz.slow || detalle.slow || configuracionOperativa.slow ? (
                <Typography color="text.secondary" variant="caption">
                  Esto esta tardando mas de lo normal...
                </Typography>
              ) : null}
            </Stack>
          ) : null}
          {(matriz.loading || detalle.loading || configuracionOperativa.loading) && matrixData ? (
            // Ya hay datos para mostrar (ej. se esta cambiando de vista
            // original/efectiva): no se vuelve a tapar la tabla con el
            // bloque grande de arriba, que hacia parecer que "se recarga
            // todo" aunque la tabla vieja seguia ahi debajo sin actualizar
            // (ver docs/database/decisiones-tecnicas.md seccion 156). Solo
            // una barra fina, la tabla sigue visible mientras llega lo nuevo.
            <LinearProgress sx={{ mb: 1 }} />
          ) : null}
          {!matriz.loading &&
          !detalle.loading &&
          !configuracionOperativa.loading &&
          (matriz.error || detalle.error || configuracionOperativa.error) ? (
            <Alert
              action={
                <Button
                  color="inherit"
                  onClick={() => {
                    matriz.refetch();
                    detalle.refetch();
                    configuracionOperativa.refetch();
                  }}
                  size="small"
                >
                  Reintentar
                </Button>
              }
              severity="error"
            >
              {matriz.error || detalle.error || configuracionOperativa.error}
            </Alert>
          ) : null}

          {matrixData ? (
            <TableContainer
              onScroll={handleBodyScroll}
              ref={bodyScrollRef}
              sx={{
                overflowX: 'auto',
                overflowY: 'visible',
                width: '100%',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                position: 'relative',
                '&::-webkit-scrollbar': {
                  height: 15
                },
                '&::-webkit-scrollbar-track': {
                  backgroundColor: '#f1f5f9'
                },
                '&::-webkit-scrollbar-thumb': {
                  backgroundColor: '#94a3b8',
                  borderRadius: 8,
                  border: '3px solid #f1f5f9'
                },
                cursor: activeTool.kind === 'navigate' ? 'default' : 'cell',
                // Con una herramienta de pintado activa, un arrastre no debe
                // seleccionar texto de ninguna columna de la fila (nombre,
                // cargo, observaciones, etc.) — solo la celda de dia interna
                // tenia esta proteccion, el resto de la fila la disparaba.
                userSelect: activeTool.kind === 'navigate' ? 'auto' : 'none'
              }}
            >
              <Table
                size="small"
                sx={{
                  width: 'max-content',
                  minWidth: vistaPlanificacion === 'semanal' ? 'max-content' : '100%',
                  tableLayout: 'fixed'
                }}
              >
                <TableBody>
                  {vistaPlanificacion === 'mensual'
                    ? filasVisibles.map((fila) => (
                        <MatrixRowView
                          activeToolKey={activeTool.key}
                          activeToolKind={activeTool.kind}
                          canOperate={canOperate && modoInteraccion === 'edicion'}
                          cellDisplayMode={cellDisplayMode}
                          days={matrixData.dias}
                          hiddenColumnKeys={hiddenColumnKeys}
                          key={fila.idAsignacionPersonal}
                          modoAjusteTraslado={modoAjusteTraslado}
                          onCellMouseDown={handleCellMouseDown}
                          onCellMouseEnter={handleCellMouseEnter}
                          onCellNavigate={handleCellClick}
                          onEditObservation={handleOpenObservacionEditor}
                          operationalColorMap={operationalColorMap}
                          row={fila}
                          selectedCellKey={selectedCellKey}
                        />
                      ))
                    : filasVisibles.map((fila) => (
                        <WeeklyRowView
                          activeToolKey={activeTool.key}
                          activeToolKind={activeTool.kind}
                          cellDisplayMode={cellDisplayMode}
                          hiddenColumnKeys={hiddenColumnKeys}
                          key={fila.idAsignacionPersonal}
                          onCellMouseDown={handleWeeklyCellMouseDown}
                          onCellMouseEnter={handleWeeklyCellMouseEnter}
                          onCellNavigate={applyToolToWeeklyCell}
                          operationalColorMap={operationalColorMap}
                          row={fila}
                          weeklyDays={WEEKLY_DAYS}
                          weeklyDraft={weeklyDraft[fila.idAsignacionPersonal] || {}}
                        />
                      ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : null}

          <Box sx={{ mt: 2.25 }}>
            <PlanificacionOperationalLegend configuracion={configuracionOperativa.data || null} matriz={matrixData} />
          </Box>
        </MainCard>
      </Grid>

      <PlanificacionExportDialog
        canPreview
        exportLoading={exportLoading}
        exportMode={exportMode}
        exportStyle={exportStyle}
        exportFormat={exportFormat}
        onClose={() => setExportDialogOpen(false)}
        onExport={() => void handleExport()}
        onExportModeChange={setExportMode}
        onExportStyleChange={setExportStyle}
        onExportFormatChange={setExportFormat}
        onReloadPreview={() => void loadExportPreview(exportMode, exportStyle, exportFormat)}
        open={exportDialogOpen}
        previewError={exportPreviewError}
        previewHtml={exportPreviewHtml}
        previewLoading={previewLoading}
      />

      <Dialog
        fullWidth
        maxWidth="sm"
        onClose={() => (weeklyApplyLoading ? undefined : setWeeklyApplyMode(null))}
        open={Boolean(weeklyApplyMode)}
      >
        <DialogTitle>{weeklyApplyMode === 'llenar-vacios' ? 'Completar vacíos del mes' : 'Reemplazar planificación mensual'}</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2">
            {weeklyApplyMode === 'llenar-vacios'
              ? 'Se aplicará el patrón semanal únicamente en las celdas mensuales que estén vacías. Los turnos existentes no se modificarán.'
              : 'Se aplicará el patrón semanal sobre todas las celdas mensuales correspondientes que hayas configurado en la vista semanal. Las celdas semanales sin configuración no modificarán el mes.'}
          </Typography>
          <Stack spacing={0.35} sx={{ mt: 1.5 }}>
            <Typography variant="body2">Nuevas: {weeklyApplyPlan.crear}</Typography>
            {weeklyApplyMode === 'reemplazar' ? <Typography variant="body2">Reemplazos: {weeklyApplyPlan.reemplazar}</Typography> : null}
            {weeklyApplyMode === 'reemplazar' ? <Typography variant="body2">Limpiezas: {weeklyApplyPlan.limpiar}</Typography> : null}
            <Typography variant="body2">Sin cambios: {weeklyApplyPlan.sinCambios}</Typography>
          </Stack>
          {weeklyApplyMode === 'reemplazar' ? (
            <Alert severity="warning" sx={{ mt: 1.5 }}>
              Esta acción sobrescribirá los turnos o incidencias existentes en las celdas cubiertas por el patrón semanal.
            </Alert>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button disabled={weeklyApplyLoading} onClick={() => setWeeklyApplyMode(null)} variant="outlined">
            Cancelar
          </Button>
          <Button disabled={weeklyApplyLoading} onClick={() => void handleApplyWeeklyPattern()} variant="contained">
            {weeklyApplyLoading ? 'Aplicando...' : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog fullWidth maxWidth="sm" onClose={() => setObservacionEditor(null)} open={Boolean(observacionEditor)}>
        <DialogTitle>
          {observacionEditor ? `Observacion mensual / ${observacionEditor.row.nombreCompleto}` : 'Observacion mensual'}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5}>
            <Typography color="text.secondary" variant="body2">
              Esta observacion se refleja en la columna final del rol de turnos mensual.
            </Typography>
            <TextField
              minRows={4}
              multiline
              onChange={(event) => setObservacionEditor((current) => (current ? { ...current, value: event.target.value } : current))}
              value={observacionEditor?.value || ''}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setObservacionEditor(null)} variant="outlined">
            Cancelar
          </Button>
          <Button disabled={observacionSaving || !canOperate} onClick={() => void handleSaveObservacion()} variant="contained">
            {observacionSaving ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      <EditToolVisualDialog
        onClose={() => setEditVisualTarget(null)}
        onSaved={() => setConfigRefreshKey((k) => k + 1)}
        onEditarHorarioCompleto={puedeGestionarTurnos ? (idTurno) => void handleEditarHorarioCompleto(idTurno) : undefined}
        onDesactivarHorario={
          puedeGestionarTurnos ? (idTurno) => void handleDesactivarTurno(idTurno, editVisualTarget?.etiqueta ?? '') : undefined
        }
        target={editVisualTarget}
      />

      <TurnoFormDialog
        editTurno={editorTurno}
        onClose={() => setEditorTurno(null)}
        onSaved={handleTurnoDialogSaved}
        open={Boolean(editorTurno)}
        servicios={
          detalle.data?.idServicio !== null && detalle.data?.idServicio !== undefined
            ? [{ id: detalle.data.idServicio, nombre: detalle.data.nombreServicio || '' }]
            : []
        }
        departamentos={
          // Una planificacion de servicio tambien carga su idDepartamento padre (solo para
          // mostrar "Departamento: X" en pantalla) — no es un scope alternativo valido para
          // crear un horario. Departamentos solo debe poblarse cuando la planificacion misma
          // es de alcance departamental, para que el toggle de scope nunca aparezca aqui.
          detalle.data?.idServicio === null && detalle.data?.idDepartamento !== null && detalle.data?.idDepartamento !== undefined
            ? [{ id: detalle.data.idDepartamento, nombre: detalle.data.nombreDepartamento || '' }]
            : []
        }
        defaultScope={detalle.data?.idServicio !== null && detalle.data?.idServicio !== undefined ? 'servicio' : 'departamento'}
        creationHint="Ya está disponible en la barra de herramientas."
      />

      <ImpactoUsoDialog
        accionLabel="desactivar"
        entidadLabel="horario"
        impacto={impactoEliminarTurno?.impacto ?? null}
        onClose={() => setImpactoEliminarTurno(null)}
        onLimpiar={() => impactoEliminarTurno && void handleDesactivarTurno(impactoEliminarTurno.id, impactoEliminarTurno.nombre, true)}
        open={Boolean(impactoEliminarTurno)}
        saving={confirmandoLimpiezaTurno}
      />
    </Grid>
  );
}

type PendingCellEntry = {
  cellKey: string;
  row: MatrixRow;
  day: MatrixDay;
  activeTool: ToolAction;
  input: {
    idAsignacionPersonal: number;
    idCalendario: number;
    secuenciaDia?: number;
    idCodigoOperativoServicio?: number | null;
    idTurno?: number | null;
    idIncidenciaPersonal?: number | null;
    horasProgramadas?: number;
    limpiar?: boolean;
  };
  previousRegistros: MatrixRegistro[];
};

// Aplica el cambio en pantalla al instante (optimista) y encola la celda para
// un flush en lote (ver flushPendingCells/scheduleFlush en el componente) en
// vez de disparar un POST por celda — el request real se agrupa con el resto
// del gesto de arrastre.
function applyToolToCell({
  activeTool,
  cellKey,
  currentMatrix,
  onMatrixChange,
  pendingCellsRef,
  savingCellKeysRef,
  scheduleFlush,
  row,
  day
}: {
  activeTool: ToolAction;
  cellKey: string;
  currentMatrix: MatrizMensualPlanificacion | null;
  onMatrixChange: Dispatch<SetStateAction<MatrizMensualPlanificacion | null>>;
  pendingCellsRef: { current: Map<string, PendingCellEntry> };
  savingCellKeysRef: { current: Set<string> };
  scheduleFlush: () => void;
  row: MatrixRow;
  day: MatrixDay;
}) {
  if (!currentMatrix || activeTool.kind === 'navigate') {
    return;
  }

  const freshRow = currentMatrix.filas.find((item) => item.idAsignacionPersonal === row.idAsignacionPersonal);
  const freshCell = freshRow?.dias.find((item) => item.idCalendario === day.idCalendario);
  const registros = (freshCell?.registros || []).slice().sort((left, right) => left.secuenciaDia - right.secuenciaDia);

  const previousRegistros = registros;
  const optimisticRegistros = buildOptimisticRegistros(activeTool, previousRegistros);
  savingCellKeysRef.current.add(cellKey);

  startTransition(() => {
    onMatrixChange((matrix) => applyCellMutationToMatrix(matrix, row.idAsignacionPersonal, day.idCalendario, optimisticRegistros));
  });

  pendingCellsRef.current.set(cellKey, {
    cellKey,
    row,
    day,
    activeTool,
    previousRegistros,
    input: {
      idAsignacionPersonal: row.idAsignacionPersonal,
      idCalendario: day.idCalendario,
      secuenciaDia: registros[0]?.secuenciaDia || 1,
      idCodigoOperativoServicio:
        activeTool.kind === 'turno' || activeTool.kind === 'incidenciaPersonal' ? (activeTool.id > 0 ? activeTool.id : null) : null,
      idTurno: activeTool.kind === 'turno' ? activeTool.idTurno : undefined,
      idIncidenciaPersonal: activeTool.kind === 'incidenciaPersonal' ? activeTool.idIncidenciaPersonal : undefined,
      horasProgramadas: activeTool.kind === 'turno' || activeTool.kind === 'incidenciaPersonal' ? activeTool.horasProgramadas : undefined,
      limpiar: activeTool.kind === 'clear'
    }
  });

  scheduleFlush();
}

function applyCellMutationToMatrix(
  matrix: MatrizMensualPlanificacion | null,
  idAsignacionPersonal: number,
  idCalendario: number,
  registros: MatrixRegistro[]
) {
  if (!matrix) {
    return matrix;
  }

  const filas = matrix.filas.map((fila) => {
    if (fila.idAsignacionPersonal !== idAsignacionPersonal) {
      return fila;
    }

    const dias = fila.dias.map((dia) =>
      dia.idCalendario === idCalendario
        ? {
            ...dia,
            registros,
            valorVisual: formatCellDisplayValue({ ...dia, registros }, 'codigo')
          }
        : dia
    );

    return {
      ...fila,
      dias,
      totalHorasMes: dias.reduce((sum, dia) => sum + dia.registros.reduce((daySum, registro) => daySum + registro.horasProgramadas, 0), 0),
      horarioResumen: computeHorarioResumen(dias)
    };
  });

  return {
    ...matrix,
    filas,
    resumen: {
      ...matrix.resumen,
      totalRegistros: filas.reduce((sum, fila) => sum + fila.dias.reduce((daySum, dia) => daySum + dia.registros.length, 0), 0),
      totalHorasMes: filas.reduce((sum, fila) => sum + fila.totalHorasMes, 0)
    }
  };
}

function applyObservacionMensualToMatrix(
  matrix: MatrizMensualPlanificacion | null,
  idAsignacionPersonal: number,
  descripcion: string | null
) {
  if (!matrix) {
    return matrix;
  }

  const filas = matrix.filas.map((fila) =>
    fila.idAsignacionPersonal === idAsignacionPersonal ? { ...fila, observacionMensual: descripcion } : fila
  );

  return { ...matrix, filas };
}

function mapPersistedCellToMatrixRegistros(persisted: CeldaMatrizPlanificacionPersistida, activeTool?: ToolAction): MatrixRegistro[] {
  if (!persisted.idRolTurno || !persisted.secuenciaDia || persisted.horasProgramadas === null) {
    return [];
  }

  return [
    {
      idRolTurno: persisted.idRolTurno,
      secuenciaDia: persisted.secuenciaDia,
      tipo: persisted.idTurno ? 'TURNO' : 'TIPO_DIA',
      codigo:
        activeTool?.kind === 'turno' || activeTool?.kind === 'incidenciaPersonal'
          ? activeTool.codigo || persisted.codigoTurno || persisted.codigoIncidenciaPersonal || activeTool.shortLabel || null
          : persisted.codigoTurno || persisted.codigoIncidenciaPersonal || null,
      nombre:
        activeTool?.kind === 'turno' || activeTool?.kind === 'incidenciaPersonal'
          ? activeTool.nombre || persisted.nombreTurno || persisted.nombreIncidenciaPersonal || null
          : persisted.nombreTurno || persisted.nombreIncidenciaPersonal || null,
      horasProgramadas: persisted.horasProgramadas,
      horaInicio: persisted.horaInicio,
      horaFin: persisted.horaFin,
      cruzaMedianoche: persisted.cruzaMedianoche,
      tramos: activeTool?.kind === 'turno' ? activeTool.tramos : []
    }
  ];
}

function buildWeeklyApplyInput(row: MatrixRow, day: MatrixDay, monthlyCell: MatrixCell | undefined, weeklyCell: WeeklyDraftCell) {
  const activeTool = weeklyCell.activeTool;
  const base = {
    idAsignacionPersonal: row.idAsignacionPersonal,
    idCalendario: day.idCalendario,
    secuenciaDia: monthlyCell?.registros[0]?.secuenciaDia || weeklyCell.registros[0]?.secuenciaDia || 1
  };

  if (activeTool.kind === 'clear') {
    return { ...base, limpiar: true };
  }

  return {
    ...base,
    idCodigoOperativoServicio: activeTool.id > 0 ? activeTool.id : null,
    idTurno: activeTool.kind === 'turno' ? activeTool.idTurno : undefined,
    idIncidenciaPersonal: activeTool.kind === 'incidenciaPersonal' ? activeTool.idIncidenciaPersonal : undefined,
    horasProgramadas: activeTool.kind === 'turno' || activeTool.kind === 'incidenciaPersonal' ? activeTool.horasProgramadas : undefined
  };
}

function emptyWeeklyApplyPlan(): WeeklyApplyPlan {
  return { items: [], crear: 0, reemplazar: 0, limpiar: 0, sinCambios: 0 };
}

function buildWeeklyApplyPlan(matrix: MatrizMensualPlanificacion, weeklyDraft: WeeklyDraft, mode: WeeklyApplyMode): WeeklyApplyPlan {
  const plan = emptyWeeklyApplyPlan();

  matrix.filas.forEach((row) => {
    const rowDraft = weeklyDraft[row.idAsignacionPersonal] || {};

    matrix.dias.forEach((day) => {
      const weeklyCell = rowDraft[getDiaSemanaNum(day.fecha)];
      if (!weeklyCell) {
        return;
      }

      const monthlyCell = row.dias.find((item) => item.idCalendario === day.idCalendario);
      const monthlyHasData = Boolean(monthlyCell?.registros.length);

      if (mode === 'llenar-vacios') {
        if (monthlyHasData || weeklyCell.activeTool.kind === 'clear') {
          plan.sinCambios += 1;
          return;
        }

        plan.crear += 1;
        plan.items.push({
          row,
          day,
          weeklyCell,
          input: buildWeeklyApplyInput(row, day, monthlyCell, weeklyCell),
          action: 'crear'
        });
        return;
      }

      if (weeklyCell.activeTool.kind === 'clear') {
        if (!monthlyHasData) {
          plan.sinCambios += 1;
          return;
        }

        plan.limpiar += 1;
        plan.items.push({
          row,
          day,
          weeklyCell,
          input: buildWeeklyApplyInput(row, day, monthlyCell, weeklyCell),
          action: 'limpiar'
        });
        return;
      }

      if (weeklyCellMatchesMonthlyCell(monthlyCell, weeklyCell)) {
        plan.sinCambios += 1;
        return;
      }

      const action = monthlyHasData ? 'reemplazar' : 'crear';
      plan[action] += 1;
      plan.items.push({
        row,
        day,
        weeklyCell,
        input: buildWeeklyApplyInput(row, day, monthlyCell, weeklyCell),
        action
      });
    });
  });

  return plan;
}

function weeklyCellMatchesMonthlyCell(monthlyCell: MatrixCell | undefined, weeklyCell: WeeklyDraftCell) {
  if (!monthlyCell || monthlyCell.registros.length !== weeklyCell.registros.length) {
    return false;
  }

  return weeklyCell.registros.every((expected, index) => {
    const actual = monthlyCell.registros[index];
    if (!actual) {
      return false;
    }

    return (
      actual.tipo === expected.tipo &&
      actual.codigo === expected.codigo &&
      actual.horasProgramadas === expected.horasProgramadas &&
      actual.horaInicio === expected.horaInicio &&
      actual.horaFin === expected.horaFin &&
      JSON.stringify(actual.tramos || []) === JSON.stringify(expected.tramos || [])
    );
  });
}

function getDiaSemanaNum(fecha: string) {
  const [anio, mes, dia] = fecha.slice(0, 10).split('-').map(Number);
  const day = new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay();
  return day === 0 ? 7 : day;
}

function computeHorarioResumen(dias: MatrixRow['dias']) {
  return computeHorarioResumenFromGroups(dias.map((dia) => dia.registros));
}

function computeHorarioResumenFromGroups(groups: MatrixRegistro[][]) {
  const ranges = new Map<string, number>();

  groups.forEach((registros) => {
    registros.forEach((registro) => {
      if (registro.tipo !== 'TURNO') {
        return;
      }

      const tramos = registro.tramos ?? [];
      if (tramos.length > 0) {
        tramos.forEach((tramo) => {
          const range = formatTimeRange(tramo.horaInicio, tramo.horaFin);
          if (range && !ranges.has(range)) {
            const sortToken = parseHourToken(tramo.horaInicio);
            ranges.set(range, sortToken);
          }
        });
      } else {
        const range = formatTimeRange(registro.horaInicio, registro.horaFin);
        if (range && !ranges.has(range)) {
          const sortToken = parseHourToken(registro.horaInicio);
          ranges.set(range, sortToken);
        }
      }
    });
  });

  return [...ranges.entries()]
    .sort((left, right) => left[1] - right[1])
    .map(([range]) => range)
    .join(',');
}

function buildToolActions(configuracion: ConfiguracionOperativaPlanificacion | null): ToolAction[] {
  const base = (configuracion?.codigosPermitidos ?? []).map((item) => ({
    key: `${item.origen.toLowerCase()}-${item.id}`,
    label: buildToolLabel(item),
    shortLabel: resolveToolDisplayLabel(item),
    kind: item.origen === 'TURNO' ? ('turno' as const) : ('incidenciaPersonal' as const),
    id: item.id,
    idTurno: item.idTurno,
    idIncidenciaPersonal: item.idIncidenciaPersonal,
    codigo: item.codigo,
    nombre: item.etiqueta,
    horasProgramadas: item.horas,
    color: item.color,
    categoria: item.categoria,
    displayLabel: buildToolLabel(item),
    horaInicio: item.horaInicio,
    horaFin: item.horaFin,
    tramos: item.tramos || []
  }));

  return [
    { key: 'navigate', label: 'Navegar', shortLabel: 'NAV', kind: 'navigate' },
    ...base,
    { key: 'clear', label: 'Limpiar', shortLabel: 'CLR', kind: 'clear' }
  ];
}

function describeActiveTool(tool: ToolAction) {
  if (tool.kind === 'navigate') {
    return 'Modo navegacion: hacer click solo selecciona la celda y no modifica datos.';
  }

  if (tool.kind === 'clear') {
    return 'Modo limpiar: cada click elimina los registros de la celda seleccionada.';
  }

  if (tool.kind === 'turno') {
    return `Herramienta activa: ${tool.shortLabel}. Cada click aplica ${formatNumberToken(tool.horasProgramadas)} horas programadas; la etiqueta ${tool.shortLabel} es solo ayuda visual del servicio.`;
  }

  return `Herramienta activa: ${tool.shortLabel}. Cada click registra ${tool.label}.`;
}

function resolveToolDisplayLabel(item: ConfiguracionOperativaPlanificacion['codigosPermitidos'][number]) {
  const codigo = item.codigo.trim();

  if (codigo) {
    return codigo;
  }

  if (item.origen === 'TURNO') {
    return `${formatNumberToken(item.horas)} h`;
  }

  return item.etiqueta.trim() || '-';
}

function buildToolLabel(item: ConfiguracionOperativaPlanificacion['codigosPermitidos'][number]) {
  const codigo = item.codigo.trim();
  const etiqueta = item.etiqueta.trim();

  if (item.origen === 'TURNO') {
    if (!codigo && !etiqueta) {
      return '';
    }

    if (etiqueta) {
      return etiqueta;
    }

    return `${formatNumberToken(item.horas)} h`;
  }

  return etiqueta || codigo;
}

function buildCellKey(idAsignacionPersonal: number, idCalendario: number) {
  return `${idAsignacionPersonal}:${idCalendario}`;
}

function formatPersonalLabel(row: MatrixRow) {
  const apellidos = [row.apellidoPaterno, row.apellidoMaterno].filter(Boolean).join(' ').trim();
  const nombres = (row.nombres || '').trim();

  if (apellidos && nombres) {
    return `${apellidos}, ${nombres}`;
  }

  return apellidos || nombres || row.nombreCompleto || '-';
}

function formatCellTooltip(registros: MatrixRegistro[]) {
  return registros
    .map((registro) => {
      const base = `${registro.codigo || ''} ${registro.nombre || ''}`.trim();
      const tramos = registro.tramos ?? [];
      if (tramos.length > 0) {
        const horariosStr = tramos
          .map((t) => formatTimeRange(t.horaInicio, t.horaFin))
          .filter(Boolean)
          .join(', ');
        return horariosStr ? `${base} (${horariosStr})` : base;
      }
      const range = formatTimeRange(registro.horaInicio, registro.horaFin);
      return range ? `${base} ${range}`.trim() : base;
    })
    .join(' | ');
}

function buildGroupedCellState(cell: MatrixCell | null, mode: 'codigo' | 'horas') {
  const displayValue = formatCellDisplayValue(cell, mode);

  return {
    displayValue,
    mergeLeft: false,
    mergeRight: false,
    tooltip: cell ? formatCellTooltip(cell.registros) || displayValue : displayValue
  };
}

function formatCellDisplayValue(cell: Pick<MatrixCell, 'registros'> | null, mode: 'codigo' | 'horas') {
  if (!cell || !cell.registros.length) {
    return '';
  }

  if (mode === 'horas' && cell.registros.every((registro) => registro.tipo === 'TURNO')) {
    return cell.registros.map((registro) => formatNumberToken(registro.horasProgramadas)).join('/');
  }

  return cell.registros.map((registro) => formatRegistroCodigo(registro)).join('/');
}

function formatRegistroCodigo(registro: MatrixRegistro) {
  const codigo = registro.codigo || '';

  if (codigo && !(registro.tipo === 'TURNO' && isHorarioVisualCode(codigo))) {
    return codigo;
  }

  if (registro.tipo === 'TURNO') {
    return `${formatNumberToken(registro.horasProgramadas)}h`;
  }

  return '';
}

function isHorarioVisualCode(value: string) {
  const normalized = value.trim();
  return /^\d{1,2}(?::?\d{2}|\.\d{2})-\d{1,2}(?::?\d{2}|\.\d{2})$/.test(normalized);
}

function formatNumberToken(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function buildOptimisticRegistros(activeTool: ToolAction, currentRegistros: MatrixRegistro[]) {
  if (activeTool.kind === 'clear') {
    return [];
  }

  if (activeTool.kind !== 'turno' && activeTool.kind !== 'incidenciaPersonal') {
    return currentRegistros;
  }

  const baseRegistro = currentRegistros[0];

  return [
    {
      idRolTurno: baseRegistro?.idRolTurno || -Date.now(),
      secuenciaDia: baseRegistro?.secuenciaDia || 1,
      tipo: activeTool.kind === 'turno' ? 'TURNO' : 'TIPO_DIA',
      codigo: activeTool.codigo || activeTool.shortLabel || null,
      nombre: activeTool.nombre || activeTool.label || null,
      horasProgramadas: activeTool.horasProgramadas,
      horaInicio: activeTool.kind === 'turno' ? activeTool.horaInicio || null : null,
      horaFin: activeTool.kind === 'turno' ? activeTool.horaFin || null : null,
      cruzaMedianoche: null,
      tramos: activeTool.kind === 'turno' ? activeTool.tramos : []
    } satisfies MatrixRegistro
  ];
}

function capitalizarPrimeraLetra(texto: string | null) {
  if (!texto) {
    return 'Otro usuario';
  }
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function formatHoraCorta(fechaIso: string) {
  const fecha = new Date(fechaIso);
  if (Number.isNaN(fecha.getTime())) {
    return '';
  }
  return fecha.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function formatTimeRange(horaInicio: string | null, horaFin: string | null) {
  if (!horaInicio || !horaFin) {
    return '';
  }

  return `${horaInicio.slice(0, 5)}-${horaFin.slice(0, 5)}`;
}

function renderHorarioResumen(horarioResumen: string) {
  if (!horarioResumen) {
    return (
      <Typography sx={multilineCellText} variant="body2">
        -
      </Typography>
    );
  }

  const lineas = horarioResumen
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return (
    <Stack spacing={0.15}>
      {lineas.map((linea) => (
        <Typography key={linea} sx={{ ...multilineCellText, lineHeight: 1.1 }} variant="body2">
          {linea}
        </Typography>
      ))}
    </Stack>
  );
}

function resolveHorarioResumen(fila: MatrixRow) {
  const calculado = computeHorarioResumen(fila.dias);
  return calculado || fila.horarioResumen || '';
}

function resolveWeeklyHorarioResumen(draft: Record<number, WeeklyDraftCell>) {
  return computeHorarioResumenFromGroups(Object.values(draft).map((cell) => cell.registros));
}

type MatrixRowViewProps = {
  activeToolKey: string;
  activeToolKind: ToolAction['kind'];
  canOperate: boolean;
  cellDisplayMode: 'codigo' | 'horas';
  days: MatrixDay[];
  hiddenColumnKeys: Set<string>;
  modoAjusteTraslado: boolean;
  onCellMouseDown: (row: MatrixRow, day: MatrixDay) => Promise<void>;
  onCellMouseEnter: (row: MatrixRow, day: MatrixDay) => Promise<void>;
  onCellNavigate: (row: MatrixRow, day: MatrixDay, source?: 'navigate' | 'paint') => Promise<void>;
  onEditObservation: (row: MatrixRow) => void;
  operationalColorMap: Map<string, string>;
  row: MatrixRow;
  selectedCellKey: string | null;
};

const MatrixRowView = memo(function MatrixRowView({
  activeToolKind,
  canOperate,
  cellDisplayMode,
  days,
  hiddenColumnKeys,
  modoAjusteTraslado,
  onCellMouseDown,
  onCellMouseEnter,
  onCellNavigate,
  onEditObservation,
  operationalColorMap,
  row
}: MatrixRowViewProps) {
  return (
    <TableRow
      hover
      sx={
        row.rolFuncionalCodigo === 'JEFE_SERVICIO'
          ? {
              backgroundColor: 'rgba(33, 150, 243, 0.05)'
            }
          : undefined
      }
    >
      <TableCell sx={adaptiveBodyCell(findLeftColumn('numeroFila'), false)}>{row.numeroFila}</TableCell>
      {!hiddenColumnKeys.has('nroItem') ? (
        <TableCell sx={adaptiveBodyCell(findLeftColumn('nroItem'), false)}>{row.nroItem || '-'}</TableCell>
      ) : null}
      {!hiddenColumnKeys.has('cargaHorariaCodigo') ? (
        <TableCell sx={adaptiveBodyCell(findLeftColumn('cargaHorariaCodigo'), false)}>{row.cargaHorariaCodigo || '-'}</TableCell>
      ) : null}
      {!hiddenColumnKeys.has('ci') ? <TableCell sx={adaptiveBodyCell(findLeftColumn('ci'), false)}>{row.ci || '-'}</TableCell> : null}
      {!hiddenColumnKeys.has('tipoContratoCodigo') ? (
        <TableCell sx={adaptiveBodyCell(findLeftColumn('tipoContratoCodigo'), false)}>
          {row.codigoFuenteItem || row.tipoContratoCodigo || '-'}
        </TableCell>
      ) : null}
      <TableCell sx={adaptiveBodyCell(findLeftColumn('personal'), true)}>
        <Stack spacing={0.4}>
          <Typography sx={multilineCellText} title={formatPersonalLabel(row)} variant="body2">
            {formatPersonalLabel(row)}
          </Typography>
          {row.rolFuncionalCodigo === 'JEFE_SERVICIO' ? (
            <Chip
              color="secondary"
              label="Jefe de Servicio"
              size="small"
              sx={{ alignSelf: 'flex-start', height: 20, '& .MuiChip-label': { px: 0.75, fontSize: 10 } }}
              variant="outlined"
            />
          ) : null}
        </Stack>
      </TableCell>
      {!hiddenColumnKeys.has('cargoActual') ? (
        <TableCell sx={adaptiveBodyCell(findLeftColumn('cargoActual'), true)}>
          <Typography sx={multilineCellText} title={row.cargoActual || ''} variant="body2">
            {row.cargoActual || '-'}
          </Typography>
        </TableCell>
      ) : null}

      {days.map((dia, dayIndex) => {
        const celda = row.dias[dayIndex] || null;
        const palette = resolveCellPalette(celda, operationalColorMap, dia.esFinSemana, dia.esFeriado);
        const groupedCell = buildGroupedCellState(celda, cellDisplayMode);
        // Antes de la fecha efectiva, la celda queda bloqueada siempre (la
        // persona nunca estuvo aqui ese dia, sin importar el modo). Dentro
        // del modo acotado, ademas se bloquea cualquier celda que no sea la
        // de esa fila desde su fecha efectiva — ninguna otra persona ni
        // ningun otro dia responde mientras el modo este activo, aunque el
        // backend ya rechazaria igual cualquier intento
        // (assertPuedeEditarCeldaMatriz/obtenerCambioDestinoParaCelda).
        const esCeldaAjusteElegible = Boolean(
          row.ajustePorTraslado && new Date(dia.fecha) >= new Date(row.ajustePorTraslado.fechaEfectiva)
        );
        const bloqueadaPorTraslado = Boolean(row.ajustePorTraslado) && !esCeldaAjusteElegible;
        const bloqueadaPorModoAjuste = modoAjusteTraslado && !esCeldaAjusteElegible;
        const celdaBloqueada = bloqueadaPorTraslado || bloqueadaPorModoAjuste;

        return (
          <TableCell
            align="center"
            key={dia.idCalendario}
            onMouseEnter={() => void onCellMouseEnter(row, dia)}
            sx={dayBodyCellStyle(
              palette,
              Boolean(groupedCell.displayValue),
              groupedCell.mergeLeft,
              groupedCell.mergeRight,
              dia.esFinSemana,
              dia.esFeriado,
              activeToolKind,
              undefined,
              celdaBloqueada
            )}
          >
            <Tooltip
              arrow
              enterDelay={650}
              enterNextDelay={500}
              placement="top"
              title={
                bloqueadaPorTraslado
                  ? 'Antes del traslado: la persona aun no estaba en esta planificacion en esta fecha.'
                  : bloqueadaPorModoAjuste
                    ? 'Modo acotado: solo se puede completar el horario de la persona trasladada, desde su fecha efectiva.'
                    : groupedCell.tooltip || 'Sin registro'
              }
            >
              <Box
                aria-label={`celda-${row.idAsignacionPersonal}-${dia.idCalendario}`}
                onClick={() => {
                  if (celdaBloqueada) {
                    return;
                  }
                  if (activeToolKind === 'navigate') {
                    void onCellNavigate(row, dia, 'navigate');
                  }
                }}
                onMouseDown={(event) => {
                  event.preventDefault();
                  if (celdaBloqueada) {
                    return;
                  }
                  if (activeToolKind !== 'navigate') {
                    void onCellMouseDown(row, dia);
                  }
                }}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  minHeight: 24,
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: palette.textColor,
                  cursor: celdaBloqueada ? 'not-allowed' : activeToolKind === 'navigate' ? 'pointer' : 'cell',
                  userSelect: 'none',
                  pointerEvents: 'auto'
                }}
              >
                {groupedCell.displayValue || (celdaBloqueada ? '—' : '')}
              </Box>
            </Tooltip>
          </TableCell>
        );
      })}

      {!hiddenColumnKeys.has('horarioResumen') ? (
        <TableCell sx={adaptiveBodyCell(findRightColumn('horarioResumen'), true)}>
          {renderHorarioResumen(resolveHorarioResumen(row))}
        </TableCell>
      ) : null}
      {!hiddenColumnKeys.has('totalHorasMes') ? (
        <TableCell sx={adaptiveBodyCell(findRightColumn('totalHorasMes'), false)}>{row.totalHorasMes}</TableCell>
      ) : null}
      {!hiddenColumnKeys.has('observacionMensual') ? (
        <TableCell sx={adaptiveBodyCell(findRightColumn('observacionMensual'), true)}>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <Typography sx={{ ...multilineCellText, maxWidth: 180 }} title={row.observacionMensual || ''} variant="body2">
              {row.observacionMensual || '-'}
            </Typography>
            {canOperate ? (
              <Tooltip title="Editar observacion mensual">
                <IconButton color="secondary" onClick={() => onEditObservation(row)} size="small">
                  <EditOutlined />
                </IconButton>
              </Tooltip>
            ) : null}
          </Stack>
        </TableCell>
      ) : null}
    </TableRow>
  );
}, areMatrixRowPropsEqual);

type WeeklyRowViewProps = {
  activeToolKey: string;
  activeToolKind: ToolAction['kind'];
  cellDisplayMode: 'codigo' | 'horas';
  hiddenColumnKeys: Set<string>;
  onCellMouseDown: (row: MatrixRow, day: WeeklyDay) => void;
  onCellMouseEnter: (row: MatrixRow, day: WeeklyDay) => void;
  onCellNavigate: (row: MatrixRow, day: WeeklyDay) => void;
  operationalColorMap: Map<string, string>;
  row: MatrixRow;
  weeklyDays: WeeklyDay[];
  weeklyDraft: Record<number, WeeklyDraftCell>;
};

const WeeklyRowView = memo(function WeeklyRowView({
  activeToolKey,
  activeToolKind,
  cellDisplayMode,
  hiddenColumnKeys,
  onCellMouseDown,
  onCellMouseEnter,
  onCellNavigate,
  operationalColorMap,
  row,
  weeklyDays,
  weeklyDraft
}: WeeklyRowViewProps) {
  return (
    <TableRow
      hover
      sx={
        row.rolFuncionalCodigo === 'JEFE_SERVICIO'
          ? {
              backgroundColor: 'rgba(33, 150, 243, 0.05)'
            }
          : undefined
      }
    >
      <TableCell sx={adaptiveBodyCell(findLeftColumn('numeroFila'), false)}>{row.numeroFila}</TableCell>
      {!hiddenColumnKeys.has('nroItem') ? (
        <TableCell sx={adaptiveBodyCell(findLeftColumn('nroItem'), false)}>{row.nroItem || '-'}</TableCell>
      ) : null}
      {!hiddenColumnKeys.has('cargaHorariaCodigo') ? (
        <TableCell sx={adaptiveBodyCell(findLeftColumn('cargaHorariaCodigo'), false)}>{row.cargaHorariaCodigo || '-'}</TableCell>
      ) : null}
      {!hiddenColumnKeys.has('ci') ? <TableCell sx={adaptiveBodyCell(findLeftColumn('ci'), false)}>{row.ci || '-'}</TableCell> : null}
      {!hiddenColumnKeys.has('tipoContratoCodigo') ? (
        <TableCell sx={adaptiveBodyCell(findLeftColumn('tipoContratoCodigo'), false)}>
          {row.codigoFuenteItem || row.tipoContratoCodigo || '-'}
        </TableCell>
      ) : null}
      <TableCell sx={adaptiveBodyCell(findLeftColumn('personal'), true)}>
        <Stack spacing={0.4}>
          <Typography sx={multilineCellText} title={formatPersonalLabel(row)} variant="body2">
            {formatPersonalLabel(row)}
          </Typography>
          {row.rolFuncionalCodigo === 'JEFE_SERVICIO' ? (
            <Chip
              color="secondary"
              label="Jefe de Servicio"
              size="small"
              sx={{ alignSelf: 'flex-start', height: 20, '& .MuiChip-label': { px: 0.75, fontSize: 10 } }}
              variant="outlined"
            />
          ) : null}
        </Stack>
      </TableCell>
      {!hiddenColumnKeys.has('cargoActual') ? (
        <TableCell sx={adaptiveBodyCell(findLeftColumn('cargoActual'), true)}>
          <Typography sx={multilineCellText} title={row.cargoActual || ''} variant="body2">
            {row.cargoActual || '-'}
          </Typography>
        </TableCell>
      ) : null}

      {weeklyDays.map((day) => {
        const registros = weeklyDraft[day.diaSemanaNum]?.registros || [];
        const celda = registros.length > 0 ? { registros } : null;
        const palette = resolveCellPalette(celda, operationalColorMap, day.esFinSemana, false);
        const displayValue = formatCellDisplayValue(celda, cellDisplayMode);
        return (
          <TableCell
            align="center"
            key={day.diaSemanaNum}
            onMouseEnter={() => onCellMouseEnter(row, day)}
            sx={dayBodyCellStyle(
              palette,
              Boolean(displayValue),
              false,
              false,
              day.esFinSemana,
              false,
              activeToolKind,
              WEEKLY_DAY_COLUMN_WIDTH
            )}
          >
            <Box
              aria-label={`celda-semanal-${row.idAsignacionPersonal}-${day.diaSemanaNum}`}
              onClick={() => {
                if (activeToolKind === 'navigate') {
                  onCellNavigate(row, day);
                }
              }}
              onMouseDown={(event) => {
                event.preventDefault();
                if (activeToolKind !== 'navigate') {
                  onCellMouseDown(row, day);
                }
              }}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                minHeight: 24,
                fontSize: 10.5,
                fontWeight: 700,
                color: palette.textColor,
                cursor: activeToolKind === 'navigate' ? 'pointer' : 'cell',
                userSelect: 'none',
                pointerEvents: 'auto'
              }}
            >
              {displayValue}
            </Box>
          </TableCell>
        );
      })}
      {!hiddenColumnKeys.has('horarioResumen') ? (
        <TableCell sx={adaptiveBodyCell(findRightColumn('horarioResumen'), true)}>
          {renderHorarioResumen(resolveWeeklyHorarioResumen(weeklyDraft))}
        </TableCell>
      ) : null}
    </TableRow>
  );
});

function areMatrixRowPropsEqual(previous: MatrixRowViewProps, next: MatrixRowViewProps) {
  if (previous.activeToolKey !== next.activeToolKey) {
    return false;
  }

  if (previous.row !== next.row) {
    return false;
  }

  if (previous.days !== next.days) {
    return false;
  }

  if (previous.cellDisplayMode !== next.cellDisplayMode) {
    return false;
  }

  if (previous.activeToolKind !== next.activeToolKind) {
    return false;
  }

  if (previous.canOperate !== next.canOperate) {
    return false;
  }

  if (previous.operationalColorMap !== next.operationalColorMap) {
    return false;
  }

  if (previous.hiddenColumnKeys !== next.hiddenColumnKeys) {
    return false;
  }

  if (previous.modoAjusteTraslado !== next.modoAjusteTraslado) {
    return false;
  }

  return (
    isSelectedInRow(previous.selectedCellKey, previous.row.idAsignacionPersonal) ===
    isSelectedInRow(next.selectedCellKey, next.row.idAsignacionPersonal)
  );
}

function buildCellApplyErrorMessage(activeTool: ToolAction, row: MatrixRow, day: MatrixDay, detail: string) {
  const accion = activeTool.kind === 'clear' ? 'limpiar' : activeTool.shortLabel || activeTool.label || 'marcar';

  return `No se pudo ${accion} en ${row.nombreCompleto} / dia ${day.diaMes}. ${detail}`;
}

function isSelectedInRow(selectedCellKey: string | null, idAsignacionPersonal: number) {
  if (!selectedCellKey) {
    return false;
  }

  return selectedCellKey.startsWith(`${idAsignacionPersonal}:`);
}

function getMonthName(month: number) {
  return new Intl.DateTimeFormat('es-BO', {
    month: 'long',
    timeZone: 'UTC'
  }).format(new Date(Date.UTC(2026, month - 1, 1)));
}

type AdaptiveColumn = {
  minWidth: number;
  maxWidth: number;
};

function adaptiveHeaderCell(column: AdaptiveColumn) {
  return {
    minWidth: column.minWidth,
    maxWidth: column.maxWidth,
    // table-layout es 'fixed' (header partido, ver seccion 105): el ancho
    // explicito es obligatorio para que la mini-tabla del header y la tabla
    // real del cuerpo calculen exactamente el mismo ancho de columna. Se usa
    // minWidth (no maxWidth) para compactar horizontalmente — el texto largo
    // ya envuelve a 2+ lineas en vez de truncarse, es preferible a los ~336px
    // de ancho desperdiciado en el caso comun (ver decisiones-tecnicas.md
    // seccion 111).
    width: column.minWidth,
    px: 0.75,
    py: 0.75,
    fontSize: 11,
    lineHeight: 1.15,
    whiteSpace: 'normal',
    wordBreak: 'break-word',
    backgroundColor: '#e8f1f8',
    fontWeight: 700,
    border: '1px solid',
    borderColor: 'divider',
    verticalAlign: 'middle'
  };
}

function adaptiveBodyCell(column: AdaptiveColumn, allowWrap = true) {
  return {
    minWidth: column.minWidth,
    maxWidth: column.maxWidth,
    width: column.minWidth,
    backgroundColor: '#ffffff',
    textAlign: allowWrap ? 'left' : 'center',
    border: '1px solid',
    borderColor: 'divider',
    fontSize: 11,
    px: 0.75,
    py: 0.5,
    whiteSpace: allowWrap ? 'normal' : 'nowrap',
    wordBreak: allowWrap ? 'break-word' : 'normal',
    overflowWrap: allowWrap ? 'anywhere' : 'normal',
    lineHeight: 1.2,
    verticalAlign: 'top'
  };
}

const multilineCellText = {
  whiteSpace: 'normal',
  wordBreak: 'break-word',
  overflowWrap: 'anywhere',
  lineHeight: 1.2,
  fontSize: 11
} as const;

function dayHeaderCellStyle(isWeekend: boolean, isHoliday: boolean, width = DAY_COLUMN_WIDTH) {
  return {
    minWidth: width,
    maxWidth: width,
    width,
    p: 0.25,
    backgroundColor: isHoliday
      ? MATRIX_COLOR_TOKENS.headerHoliday
      : isWeekend
        ? MATRIX_COLOR_TOKENS.headerWeekend
        : MATRIX_COLOR_TOKENS.headerNormal
  };
}

function dayBodyCellStyle(
  palette: { backgroundColor: string; textColor: string },
  hasContent: boolean,
  mergeLeft: boolean,
  mergeRight: boolean,
  isWeekend: boolean,
  isHoliday: boolean,
  activeToolKind?: ToolAction['kind'],
  width = DAY_COLUMN_WIDTH,
  celdaBloqueada = false
) {
  if (celdaBloqueada) {
    return {
      minWidth: width,
      maxWidth: width,
      width,
      p: 0.1,
      backgroundColor: MATRIX_COLOR_TOKENS.bloqueadaTrasladoBackground,
      color: MATRIX_COLOR_TOKENS.bloqueadaTrasladoText,
      boxShadow: 'inset 0 0 0 1px rgba(127, 29, 29, 0.25)',
      cursor: 'not-allowed'
    };
  }

  const dayBackground = isHoliday ? MATRIX_COLOR_TOKENS.bodyHoliday : isWeekend ? MATRIX_COLOR_TOKENS.bodyWeekend : '#ffffff';
  const baseBackground = hasContent ? palette.backgroundColor : dayBackground;
  const hoverOverlay =
    activeToolKind === 'clear'
      ? 'rgba(254, 226, 226, 0.72)'
      : activeToolKind === 'navigate'
        ? 'rgba(226, 232, 240, 0.72)'
        : activeToolKind
          ? 'rgba(219, 234, 254, 0.72)'
          : baseBackground;
  return {
    minWidth: width,
    maxWidth: width,
    width,
    p: 0.1,
    backgroundColor: baseBackground,
    color: hasContent ? palette.textColor : MATRIX_COLOR_TOKENS.defaultText,
    boxShadow: hasContent ? 'inset 0 0 0 1px rgba(15, 23, 42, 0.05)' : undefined,
    borderLeftColor: mergeLeft ? 'transparent' : undefined,
    borderRightColor: mergeRight ? 'transparent' : undefined,
    borderLeftWidth: mergeLeft ? 0 : undefined,
    borderRightWidth: mergeRight ? 0 : undefined,
    transition: 'background-color 0.14s ease, box-shadow 0.14s ease',
    cursor: activeToolKind === 'navigate' ? 'pointer' : activeToolKind ? 'cell' : 'default',
    '&:hover': activeToolKind
      ? {
          backgroundColor: hoverOverlay,
          boxShadow: activeToolKind === 'clear' ? 'inset 0 0 0 2px rgba(127, 29, 29, 0.28)' : 'inset 0 0 0 2px rgba(30, 64, 175, 0.24)'
        }
      : undefined,
    '&:active': activeToolKind
      ? {
          boxShadow: activeToolKind === 'clear' ? 'inset 0 0 0 2px rgba(127, 29, 29, 0.38)' : 'inset 0 0 0 2px rgba(30, 64, 175, 0.34)'
        }
      : undefined
  };
}

function buildOperationalColorMap(configuracion: ConfiguracionOperativaPlanificacion | null) {
  const map = new Map<string, string>();

  (configuracion?.codigosPermitidos || []).forEach((item) => {
    const color = item.color?.trim();
    const code = normalizeOperationalCode(item.codigo);

    if (!color || !code) {
      return;
    }

    map.set(code, color);
  });

  return map;
}

function resolveCellPalette(
  celda: Pick<MatrixCell, 'registros'> | null,
  operationalColorMap: Map<string, string>,
  isWeekend: boolean,
  isHoliday: boolean
) {
  if (hasIncidenciaRegistros(celda?.registros)) {
    return {
      backgroundColor: MATRIX_COLOR_TOKENS.incidenciaBackground,
      textColor: MATRIX_COLOR_TOKENS.incidenciaText
    };
  }

  const configuredColor = resolveConfiguredTurnoColor(celda?.registros, operationalColorMap);
  if (configuredColor) {
    return {
      backgroundColor: configuredColor,
      textColor: '#111827'
    };
  }

  if (hasHolidayCellCode(celda?.registros)) {
    return {
      backgroundColor: MATRIX_COLOR_TOKENS.bodyHoliday,
      textColor: MATRIX_COLOR_TOKENS.holidayText
    };
  }

  return {
    backgroundColor: isHoliday ? MATRIX_COLOR_TOKENS.bodyHoliday : isWeekend ? MATRIX_COLOR_TOKENS.bodyWeekend : '#ffffff',
    textColor: MATRIX_COLOR_TOKENS.defaultText
  };
}

function resolveConfiguredTurnoColor(registros: MatrixRegistro[] | undefined, operationalColorMap: Map<string, string>) {
  if (!registros?.length) {
    return null;
  }

  for (const registro of registros) {
    if (registro.tipo !== 'TURNO') {
      continue;
    }

    const color = operationalColorMap.get(normalizeOperationalCode(registro.codigo));
    if (color) {
      return color;
    }
  }

  return null;
}

function hasIncidenciaRegistros(registros: MatrixRegistro[] | undefined) {
  return (registros || []).some((registro) => {
    if (registro.tipo !== 'TIPO_DIA') {
      return false;
    }

    return isIncidenciaVisualCode(normalizeOperationalCode(registro.codigo || registro.nombre || ''));
  });
}

function hasHolidayCellCode(registros: MatrixRegistro[] | undefined) {
  return (registros || []).some((registro) =>
    ['FERIADO', 'FN', 'F', 'FR', 'FI'].includes(normalizeOperationalCode(registro.codigo || registro.nombre || ''))
  );
}

function normalizeOperationalCode(value: string | null | undefined) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

function isIncidenciaVisualCode(normalizedCode: string) {
  return ['VAC', 'LIC', 'BAJA', 'DES', 'PER', 'FAL', 'COM', 'VA', 'LI', 'BM', 'DE', 'PE', 'FA', 'CO'].some((token) =>
    normalizedCode.includes(token)
  );
}

function resolveHolidayHeaderCode(isHoliday: boolean, holidayCode: string | null) {
  if (!isHoliday) {
    return null;
  }

  return ['F', 'FN', 'FR', 'FI'].includes(holidayCode || '') ? holidayCode : 'F';
}

function buildHolidayHeaderTitle(isHoliday: boolean, persistedCode: string | null, holidayName: string | null, holidayCode: string | null) {
  if (!isHoliday) {
    return '';
  }

  if (holidayName) {
    return `${persistedCode || holidayCode || 'F'} · ${holidayName}`;
  }

  return `Feriado ${persistedCode || holidayCode || 'F'}`;
}

function parseHourToken(value: string | null) {
  if (!value) {
    return 99;
  }

  const normalized = value.slice(0, 5);
  const [hours, minutes] = normalized.split(':').map(Number);
  return hours * 60 + minutes;
}
