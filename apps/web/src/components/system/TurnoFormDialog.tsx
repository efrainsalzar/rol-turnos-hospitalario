import { useEffect, useRef, useState } from 'react';

import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Alert from '@mui/material/Alert';
import Grid from '@mui/material/Grid';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import ImpactoUsoDialog from 'components/system/ImpactoUsoDialog';
import FormDialog from 'components/system/FormDialog';
import OperationalTimeField from 'components/system/OperationalTimeField';
import { useAppToast } from 'components/system/AppToastProvider';
import { isBlank, useFormValidation } from 'hooks/useFormValidation';
import { ApiClientError } from 'services/apiClient';
import { operacionApi } from 'services/operacionApi';
import type { GuardarTurnoInput, ImpactoUsoCatalogo, Turno } from 'types/api';
import { CODIGO_VISUAL_PATTERN, sanitizarCodigoVisual, validarParCodigoEtiqueta } from 'utils/codigo-visual-etiqueta';
import { compactSelectMenuProps } from 'utils/select-menu-props';

type TurnoScope = 'servicio' | 'departamento';

export interface TurnoFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  servicios: Array<{ id: number; nombre: string }>;
  departamentos?: Array<{ id: number; nombre: string }>;
  defaultIdServicio?: number;
  defaultIdDepartamento?: number;
  defaultScope?: TurnoScope;
  editTurno?: { id: number | null; data: GuardarTurnoInput } | null;
  /** Se agrega al aviso de creacion (por ejemplo, donde aparece el horario nuevo). */
  creationHint?: string;
}

const DEFAULT_FORM: GuardarTurnoInput = {
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

export default function TurnoFormDialog({
  open,
  onClose,
  onSaved,
  servicios,
  departamentos = [],
  defaultIdServicio,
  defaultIdDepartamento,
  defaultScope = 'servicio',
  editTurno,
  creationHint
}: TurnoFormDialogProps) {
  const { showSuccess, showError } = useAppToast();
  const [formData, setFormData] = useState<GuardarTurnoInput>(DEFAULT_FORM);
  const [scope, setScope] = useState<TurnoScope>(defaultScope);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [loadingEditor, setLoadingEditor] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [impacto, setImpacto] = useState<ImpactoUsoCatalogo | null>(null);

  const isEdit = Boolean(editTurno?.id);

  const tramoRules = Object.fromEntries(
    (formData.tramos || []).flatMap((_, index) => [
      [
        `tramo-${index}-horaInicio`,
        (values: GuardarTurnoInput) =>
          values.tipoHorario === 'DISCONTINUO' && isBlank(values.tramos?.[index]?.horaInicio)
            ? 'Define la hora de inicio del bloque.'
            : undefined
      ],
      [
        `tramo-${index}-horaFin`,
        (values: GuardarTurnoInput) =>
          values.tipoHorario === 'DISCONTINUO' && isBlank(values.tramos?.[index]?.horaFin) ? 'Define la hora de fin del bloque.' : undefined
      ]
    ])
  );

  const validation = useFormValidation<GuardarTurnoInput>({
    idServicio: (values) => (scope === 'servicio' && !values.idServicio ? 'Selecciona un servicio.' : undefined),
    idDepartamento: (values) => (scope === 'departamento' && !values.idDepartamento ? 'Selecciona un departamento.' : undefined),
    horaInicio: (values) => (values.tipoHorario !== 'DISCONTINUO' && isBlank(values.horaInicio) ? 'Define la hora de inicio.' : undefined),
    horaFin: (values) => (values.tipoHorario !== 'DISCONTINUO' && isBlank(values.horaFin) ? 'Define la hora de fin.' : undefined),
    codigoVisual: (values) => {
      if (!showLabels) return undefined;
      const parError = validarParCodigoEtiqueta(values.codigoVisual, values.etiqueta);
      if (!parError) return undefined;
      return isBlank(values.codigoVisual) || !CODIGO_VISUAL_PATTERN.test((values.codigoVisual || '').trim()) ? parError : undefined;
    },
    etiqueta: (values) => {
      if (!showLabels) return undefined;
      const parError = validarParCodigoEtiqueta(values.codigoVisual, values.etiqueta);
      if (!parError) return undefined;
      return isBlank(values.etiqueta) ? parError : undefined;
    },
    ...tramoRules
  });

  useEffect(() => {
    if (!open) return;

    setImpacto(null);
    validation.reset();

    if (editTurno?.id) {
      const initialScope: TurnoScope = editTurno.data.idDepartamento ? 'departamento' : 'servicio';
      setScope(initialScope);
      setFormData(editTurno.data);
      setShowLabels(Boolean(editTurno.data.codigoVisual || editTurno.data.etiqueta));

      if (editTurno.data.tipoHorario === 'DISCONTINUO') {
        setLoadingEditor(true);
        const savedCodigoVisual = editTurno.data.codigoVisual;
        const savedEtiqueta = editTurno.data.etiqueta;
        void operacionApi
          .getTurnoById(editTurno.id)
          .then((full) => {
            setScope(full.idDepartamento ? 'departamento' : 'servicio');
            setFormData({ ...mapTurnoToForm(full), codigoVisual: savedCodigoVisual, etiqueta: savedEtiqueta });
          })
          .catch(() => showError('No se pudo cargar los bloques del horario.'))
          .finally(() => setLoadingEditor(false));
      }
    } else {
      const resolvedScope = defaultIdDepartamento ? 'departamento' : defaultScope;
      setScope(resolvedScope);
      setFormData({
        ...DEFAULT_FORM,
        idServicio: resolvedScope === 'servicio' ? defaultIdServicio || servicios[0]?.id || undefined : undefined,
        idDepartamento: resolvedScope === 'departamento' ? defaultIdDepartamento || departamentos[0]?.id || undefined : undefined
      });
      setShowLabels(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function updateField<K extends keyof GuardarTurnoInput>(key: K, value: GuardarTurnoInput[K]) {
    setFormData((current) => ({ ...current, [key]: value }));
  }

  function handleScopeChange(newScope: TurnoScope) {
    if (isEdit) return;
    setScope(newScope);
    if (newScope === 'servicio') {
      setFormData((current) => ({
        ...current,
        idServicio: defaultIdServicio || servicios[0]?.id || undefined,
        idDepartamento: undefined
      }));
    } else {
      setFormData((current) => ({
        ...current,
        idServicio: undefined,
        idDepartamento: defaultIdDepartamento || departamentos[0]?.id || undefined
      }));
    }
  }

  function addTramo() {
    updateField('tramos', [...(formData.tramos || []), { horaInicio: '08:00', horaFin: '12:00' }]);
  }

  function removeTramo(index: number) {
    updateField(
      'tramos',
      (formData.tramos || []).filter((_, i) => i !== index)
    );
  }

  function updateTramo(index: number, field: 'horaInicio' | 'horaFin', value: string) {
    const current = [...(formData.tramos || [])];
    current[index] = { ...current[index], [field]: value };
    updateField('tramos', current);
  }

  async function handleSave(estrategiaCeldasExistentes?: 'PROPAGAR' | 'LIMPIAR') {
    // Guard sincronico: si el mouse/click dispara dos veces casi al mismo tiempo,
    // ambos eventos pueden llegar aqui antes de que React re-renderice el boton
    // deshabilitado (que depende del estado `saving`). El ref se actualiza al
    // instante, sin esperar el ciclo de render, y evita la doble solicitud.
    if (savingRef.current) {
      return;
    }

    if (!validation.validate(formData)) {
      return;
    }

    const validationError = validateForm(formData);
    if (validationError) {
      showError(validationError);
      return;
    }

    savingRef.current = true;
    setSaving(true);

    try {
      const cleanedInput = cleanTurnoInput(formData, showLabels);
      if (estrategiaCeldasExistentes) {
        cleanedInput.estrategiaCeldasExistentes = estrategiaCeldasExistentes;
      }

      if (isEdit && editTurno?.id) {
        await operacionApi.updateTurno(editTurno.id, cleanedInput);
        showSuccess(`Horario "${cleanedInput.nombre}" del ${scope} actualizado correctamente.`);
      } else {
        await operacionApi.createTurno(cleanedInput);
        showSuccess(`Horario "${cleanedInput.nombre}" del ${scope} creado correctamente.${creationHint ? ` ${creationHint}` : ''}`);
      }

      setImpacto(null);
      onSaved();
      onClose();
    } catch (error) {
      const impactoRecibido = error instanceof ApiClientError ? (error.body?.impacto as ImpactoUsoCatalogo | undefined) : undefined;

      if (error instanceof ApiClientError && error.status === 409 && impactoRecibido) {
        setImpacto(impactoRecibido);
        return;
      }

      showError(error instanceof Error ? error.message : `No se pudo guardar el horario del ${scope}.`);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  const tipoHorario = formData.tipoHorario || 'CONTINUO';
  const scopeLabel = scope === 'departamento' ? 'departamento' : 'servicio';
  const titleText = isEdit ? `Editar horario del ${scopeLabel}` : `Nuevo horario del ${scopeLabel}`;

  return (
    <FormDialog
      maxWidth="md"
      onClose={onClose}
      onSubmit={() => void handleSave()}
      open={open}
      submitDisabled={loadingEditor}
      submitLabel="Guardar"
      submitLoadingLabel={loadingEditor ? 'Cargando...' : 'Guardando...'}
      submitting={saving || loadingEditor}
      title={titleText}
    >
      <Grid container columnSpacing={2} rowSpacing={2}>
        <Grid size={12}>
          <Alert severity="info">Elige el ambito y luego completa el horario.</Alert>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          {!isEdit && servicios.length > 0 && departamentos.length > 0 ? (
            <TextField
              fullWidth
              label="Ambito"
              onChange={(event) => handleScopeChange(event.target.value as TurnoScope)}
              select
              SelectProps={compactSelectMenuProps}
              size="small"
              value={scope}
            >
              <MenuItem value="servicio">Servicio</MenuItem>
              <MenuItem value="departamento">Departamento</MenuItem>
            </TextField>
          ) : (
            <TextField fullWidth disabled label="Ambito" size="small" value={scope === 'servicio' ? 'Servicio' : 'Departamento'} />
          )}
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          {scope === 'servicio' ? (
            servicios.length === 1 ? (
              <TextField fullWidth disabled label="Servicio" size="small" value={servicios[0].nombre} />
            ) : (
              <TextField
                fullWidth
                required
                {...validation.fieldProps('idServicio', 'Servicio al que aplica este horario.')}
                label="Servicio"
                onChange={(event) => updateField('idServicio', Number(event.target.value))}
                select
                SelectProps={compactSelectMenuProps}
                size="small"
                value={formData.idServicio || ''}
              >
                <MenuItem value="">Selecciona un servicio</MenuItem>
                {servicios.map((item) => (
                  <MenuItem key={item.id} value={item.id}>
                    {item.nombre}
                  </MenuItem>
                ))}
              </TextField>
            )
          ) : departamentos.length === 1 ? (
            <TextField fullWidth disabled label="Departamento" size="small" value={departamentos[0].nombre} />
          ) : (
            <TextField
              fullWidth
              required
              {...validation.fieldProps('idDepartamento', 'Departamento al que aplica este horario.')}
              label="Departamento"
              onChange={(event) => updateField('idDepartamento', Number(event.target.value))}
              select
              SelectProps={compactSelectMenuProps}
              size="small"
              value={formData.idDepartamento || ''}
            >
              <MenuItem value="">Selecciona un departamento</MenuItem>
              {departamentos.map((item) => (
                <MenuItem key={item.id} value={item.id}>
                  {item.nombre}
                </MenuItem>
              ))}
            </TextField>
          )}
        </Grid>

        <Grid size={12}>
          <TextField
            fullWidth
            helperText="Continuo = un bloque. Discontinuo = varios bloques."
            label="Tipo de horario"
            onChange={(event) => {
              const tipo = event.target.value as 'CONTINUO' | 'DISCONTINUO';
              updateField('tipoHorario', tipo);
              if (tipo === 'DISCONTINUO' && !formData.tramos?.length) {
                updateField('tramos', [
                  { horaInicio: '08:00', horaFin: '13:00' },
                  { horaInicio: '15:00', horaFin: '19:00' }
                ]);
              }
            }}
            select
            SelectProps={compactSelectMenuProps}
            size="small"
            value={tipoHorario}
          >
            <MenuItem value="CONTINUO">Continuo</MenuItem>
            <MenuItem value="DISCONTINUO">Discontinuo</MenuItem>
          </TextField>
        </Grid>

        {tipoHorario === 'CONTINUO' ? (
          <>
            <Grid size={12}>
              <Typography sx={{ color: 'text.primary', fontSize: 14, fontWeight: 600 }} variant="body2">
                Total: {calculateHorasPreview(formData.horaInicio || '', formData.horaFin || '')} horas
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <OperationalTimeField
                label="Hora inicio"
                required
                {...validation.fieldProps('horaInicio', 'Inicio real del trabajo.')}
                onChange={(value) => updateField('horaInicio', value)}
                value={formData.horaInicio || ''}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <OperationalTimeField
                label="Hora fin"
                required
                {...validation.fieldProps('horaFin', 'Fin real del trabajo.')}
                onChange={(value) => updateField('horaFin', value)}
                value={formData.horaFin || ''}
              />
            </Grid>
          </>
        ) : (
          <Grid size={12}>
            <Stack spacing={1.25}>
              <Typography sx={{ color: 'text.primary', fontSize: 14, fontWeight: 600 }} variant="body2">
                Total: {calculateHorasDesdeTramos(formData.tramos || [])} horas
              </Typography>
              {(formData.tramos || []).map((tramo, index) => (
                <Grid container key={index} columnSpacing={1.5} rowSpacing={1.5} sx={{ alignItems: 'center' }}>
                  <Grid size={{ xs: 12, md: 2 }}>
                    <Typography sx={{ pt: 0.75 }} variant="caption">
                      Bloque {index + 1}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <OperationalTimeField
                      label="Inicio"
                      required
                      {...validation.fieldProps(`tramo-${index}-horaInicio`)}
                      onChange={(value) => updateTramo(index, 'horaInicio', value)}
                      value={tramo.horaInicio}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <OperationalTimeField
                      label="Fin"
                      required
                      {...validation.fieldProps(`tramo-${index}-horaFin`)}
                      onChange={(value) => updateTramo(index, 'horaFin', value)}
                      value={tramo.horaFin}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 2 }}>
                    <Button
                      color="error"
                      disabled={(formData.tramos || []).length <= 2}
                      onClick={() => removeTramo(index)}
                      size="small"
                      sx={{ minWidth: 36, px: 1, mt: { xs: 0, md: 0.5 } }}
                      variant="outlined"
                    >
                      Quitar
                    </Button>
                  </Grid>
                </Grid>
              ))}
              <Button onClick={addTramo} size="small" sx={{ alignSelf: 'flex-start' }} variant="outlined">
                + Agregar bloque
              </Button>
            </Stack>
          </Grid>
        )}

        <Grid size={12}>
          <FormControlLabel
            control={<Checkbox checked={showLabels} onChange={(event) => setShowLabels(event.target.checked)} size="small" />}
            label={<Typography variant="body2">Configurar etiqueta visual</Typography>}
          />
        </Grid>

        {showLabels ? (
          <>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                inputProps={{ maxLength: 4 }}
                label="Codigo visible"
                {...validation.fieldProps('codigoVisual', '1 a 4 letras mayusculas.')}
                onChange={(e) => updateField('codigoVisual', sanitizarCodigoVisual(e.target.value))}
                placeholder="Ej: M, T, N"
                required
                size="small"
                value={formData.codigoVisual || ''}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                inputProps={{ maxLength: 120 }}
                label="Etiqueta"
                {...validation.fieldProps('etiqueta', 'Nombre descriptivo.')}
                onChange={(e) => updateField('etiqueta', e.target.value)}
                placeholder="Ej: Turno Manana"
                required
                size="small"
                value={formData.etiqueta || ''}
              />
            </Grid>
          </>
        ) : null}
      </Grid>

      <ImpactoUsoDialog
        accionLabel="actualizarlo"
        entidadLabel="horario"
        impacto={impacto}
        onClose={() => setImpacto(null)}
        onLimpiar={() => void handleSave('LIMPIAR')}
        onPropagar={() => void handleSave('PROPAGAR')}
        open={Boolean(impacto)}
        saving={saving}
      />
    </FormDialog>
  );
}

export function mapTurnoToForm(turno: Turno): GuardarTurnoInput {
  return {
    idServicio: turno.idServicio ?? undefined,
    idDepartamento: turno.idDepartamento ?? undefined,
    codigo: turno.codigo,
    nombre: turno.nombre,
    tipoHorario: turno.tipoHorario || 'CONTINUO',
    horaInicio: turno.horaInicio,
    horaFin: turno.horaFin,
    tramos: (turno.tramos || []).map((t) => ({ horaInicio: t.horaInicio, horaFin: t.horaFin })),
    activo: turno.activo
  };
}

// Validaciones por campo (servicio/departamento, horas, tramos individuales, codigoVisual/etiqueta)
// ya se resuelven con field-level feedback en useFormValidation. Esta funcion solo cubre la regla
// de negocio que no es atribuible a un campo puntual: la cantidad minima de bloques.
function validateForm(data: GuardarTurnoInput): string | null {
  if (data.tipoHorario === 'DISCONTINUO' && (!data.tramos || data.tramos.length < 2)) {
    return 'El horario discontinuo requiere al menos 2 bloques.';
  }
  return null;
}

// El nombre es el descriptivo de respaldo que usa la matriz cuando el horario
// no tiene codigoVisual/etiqueta configurados (ver typeorm-turno.repository.ts).
// No se pide al usuario: se deriva de la etiqueta si existe, o de las horas/tramos.
function buildNombreHorario(input: GuardarTurnoInput, showLabels: boolean): string {
  const etiqueta = showLabels ? input.etiqueta?.trim() : '';
  if (etiqueta) return etiqueta;

  if (input.tipoHorario === 'DISCONTINUO' && input.tramos && input.tramos.length > 0) {
    return input.tramos.map((t) => `${t.horaInicio}-${t.horaFin}`).join(' / ');
  }

  return `${input.horaInicio || ''} - ${input.horaFin || ''}`;
}

function cleanTurnoInput(input: GuardarTurnoInput, showLabels: boolean): GuardarTurnoInput {
  const base: GuardarTurnoInput = {
    ...input,
    nombre: buildNombreHorario(input, showLabels),
    codigoVisual: showLabels ? input.codigoVisual : undefined,
    etiqueta: showLabels ? input.etiqueta : undefined
  };

  if (input.tipoHorario === 'DISCONTINUO' && input.tramos && input.tramos.length > 0) {
    const tramos = input.tramos;
    return {
      ...base,
      codigo: tramos.map((t) => `${t.horaInicio.replace(':', '')}-${t.horaFin.replace(':', '')}`).join('_'),
      horaInicio: undefined,
      horaFin: undefined
    };
  }

  return {
    ...base,
    codigo: `${(input.horaInicio || '').replace(':', '')}-${(input.horaFin || '').replace(':', '')}`,
    tramos: undefined
  };
}

function calculateHorasPreview(horaInicio: string, horaFin: string) {
  if (!horaInicio || !horaFin) return '-';
  const [startHour, startMinute] = horaInicio.split(':').map(Number);
  const [endHour, endMinute] = horaFin.split(':').map(Number);
  if ([startHour, startMinute, endHour, endMinute].some((v) => Number.isNaN(v))) return '-';
  const start = startHour * 60 + startMinute;
  let end = endHour * 60 + endMinute;
  if (end <= start) end += 24 * 60;
  const hours = (end - start) / 60;
  return Number.isInteger(hours) ? `${hours}` : hours.toFixed(1);
}

function calculateHorasDesdeTramos(tramos: Array<{ horaInicio: string; horaFin: string }>): string {
  let totalMinutos = 0;
  for (const tramo of tramos) {
    if (!tramo.horaInicio || !tramo.horaFin) continue;
    const [startH, startM] = tramo.horaInicio.split(':').map(Number);
    const [endH, endM] = tramo.horaFin.split(':').map(Number);
    if ([startH, startM, endH, endM].some(Number.isNaN)) continue;
    let diff = endH * 60 + endM - (startH * 60 + startM);
    if (diff <= 0) diff += 24 * 60;
    totalMinutos += diff;
  }
  const hours = totalMinutos / 60;
  return Number.isInteger(hours) ? `${hours}` : hours.toFixed(1);
}
