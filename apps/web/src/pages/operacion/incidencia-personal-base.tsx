import { useCallback, useMemo, useState } from 'react';

import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import ActionButtonGroup from 'components/system/ActionButtonGroup';
import FormDialog from 'components/system/FormDialog';
import ImpactoUsoDialog from 'components/system/ImpactoUsoDialog';
import OperationalTableCard from 'components/system/OperationalTableCard';
import { useAppToast } from 'components/system/AppToastProvider';
import OperationalPageTemplate from 'components/system/OperationalPageTemplate';
import OperationalStats from 'components/system/OperationalStats';
import StatusChip from 'components/system/StatusChip';
import { canManageGlobalCalendarCatalog, useAccessControl } from 'hooks/use-access-control';
import { useApiRequest } from 'hooks/useApiRequest';
import { isBlank, requiredMessage, useFormValidation } from 'hooks/useFormValidation';
import { ApiClientError } from 'services/apiClient';
import { operacionApi } from 'services/operacionApi';
import type { GuardarIncidenciaPersonalInput, ImpactoUsoCatalogo, IncidenciaPersonal } from 'types/api';

type IncidenciaPersonalBasePageScope = 'GENERAL' | 'PERSONAL';

interface IncidenciaPersonalBasePageProps {
  scope?: IncidenciaPersonalBasePageScope;
}

const DEFAULT_FORM: GuardarIncidenciaPersonalInput = {
  codigo: '',
  nombre: '',
  descripcion: '',
  activo: true
};

export default function IncidenciaPersonalBasePage({ scope = 'GENERAL' }: IncidenciaPersonalBasePageProps) {
  const { session } = useAccessControl();
  const puedeGestionar = canManageGlobalCalendarCatalog(session, 'gestionarIncidenciasPersonales');
  const [refreshKey, setRefreshKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [editor, setEditor] = useState<{ id: number | null; data: GuardarIncidenciaPersonalInput } | null>(null);
  const [impactoEliminar, setImpactoEliminar] = useState<{ id: number; nombre: string; impacto: ImpactoUsoCatalogo } | null>(null);
  const [confirmandoLimpieza, setConfirmandoLimpieza] = useState(false);
  const { showSuccess, showError } = useAppToast();
  const validation = useFormValidation<GuardarIncidenciaPersonalInput>({
    codigo: (values) => (isBlank(values.codigo) ? requiredMessage('El codigo') : undefined),
    nombre: (values) => (isBlank(values.nombre) ? requiredMessage('El nombre') : undefined)
  });

  const response = useApiRequest(() => operacionApi.getIncidenciasPersonales({ alcance: scope }), [refreshKey, scope]);
  const rows = useMemo(() => response.data?.data || [], [response.data?.data]);

  // "Incidencia" es femenino y "Dia general" masculino: la terminacion concuerda con la etiqueta.
  const describirRegistro = useCallback(
    (nombre: string, accion: string) =>
      scope === 'PERSONAL' ? `Incidencia "${nombre}" ${accion}a correctamente.` : `Dia general "${nombre}" ${accion}o correctamente.`,
    [scope]
  );

  const handleDelete = useCallback(
    async (id: number, nombre: string, confirmarLimpieza = false) => {
      setConfirmandoLimpieza(true);
      try {
        await operacionApi.deleteIncidenciaPersonal(id, confirmarLimpieza);
        showSuccess(describirRegistro(nombre, 'desactivad'));
        setImpactoEliminar(null);
        setRefreshKey((value) => value + 1);
      } catch (error) {
        const impacto = error instanceof ApiClientError ? (error.body?.impacto as ImpactoUsoCatalogo | undefined) : undefined;

        if (error instanceof ApiClientError && error.status === 409 && impacto) {
          setImpactoEliminar({ id, nombre, impacto });
          return;
        }

        showError(error instanceof Error ? error.message : 'No se pudo desactivar.');
      } finally {
        setConfirmandoLimpieza(false);
      }
    },
    [describirRegistro, showError, showSuccess]
  );

  const handleActivar = useCallback(
    async (id: number) => {
      const row = rows.find((r) => r.id === id);
      if (!row) return;
      try {
        await operacionApi.updateIncidenciaPersonal(id, { ...mapIncidenciaPersonalToForm(row), activo: true });
        showSuccess(describirRegistro(row.nombre, 'activad'));
        setRefreshKey((value) => value + 1);
      } catch (error) {
        showError(error instanceof Error ? error.message : 'No se pudo activar.');
      }
    },
    [describirRegistro, rows, showError, showSuccess]
  );

  const columns = useMemo(
    () => [
      {
        key: 'codigo',
        title: 'Codigo',
        render: (row: IncidenciaPersonal) => <Typography variant="body2">{row.codigo}</Typography>
      },
      {
        key: 'nombre',
        title: scope === 'GENERAL' ? 'Dia general' : 'Incidencia',
        render: (row: IncidenciaPersonal) => <Typography variant="body2">{row.nombre}</Typography>
      },
      {
        key: 'descripcion',
        title: 'Descripcion',
        render: (row: IncidenciaPersonal) => (
          <Typography color="text.secondary" variant="body2">
            {row.descripcion || '-'}
          </Typography>
        )
      },
      {
        key: 'activo',
        title: 'Estado',
        render: (row: IncidenciaPersonal) => <StatusChip active={row.activo} />
      },
      ...(puedeGestionar
        ? [
            {
              key: 'acciones',
              title: 'Acciones',
              render: (row: IncidenciaPersonal) => (
                <ActionButtonGroup
                  actions={[
                    {
                      label: 'Editar',
                      onClick: () => setEditor({ id: row.id, data: mapIncidenciaPersonalToForm(row) }),
                      tone: 'secondary'
                    },
                    row.activo
                      ? {
                          label: 'Desactivar',
                          onClick: () => void handleDelete(row.id, row.nombre),
                          tone: 'danger'
                        }
                      : {
                          label: 'Activar',
                          onClick: () => void handleActivar(row.id),
                          tone: 'secondary'
                        }
                  ]}
                />
              )
            }
          ]
        : [])
    ],
    [handleActivar, handleDelete, puedeGestionar, scope]
  );

  return (
    <OperationalPageTemplate
      actions={[
        ...(puedeGestionar
          ? [
              {
                label: scope === 'PERSONAL' ? 'Nueva incidencia' : 'Nuevo dia general',
                onClick: () => setEditor({ id: null, data: { ...DEFAULT_FORM } }),
                tone: 'primary' as const
              }
            ]
          : [])
      ]}
      description={
        scope === 'PERSONAL'
          ? 'Catalogo de incidencias aplicadas a una persona puntual: vacacion, licencia, baja medica, franco, etc.'
          : 'Catalogo de dias que afectan el contexto comun del calendario: feriados, descansos generales, etc.'
      }
      stats={
        <OperationalStats
          items={[
            { label: scope === 'PERSONAL' ? 'Incidencias' : 'Dias generales', value: rows.length },
            { label: 'Activos', value: rows.filter((row) => row.activo).length }
          ]}
        />
      }
      // summary={`${rows.length} ${scope === 'PERSONAL' ? 'incidencias personales' : 'dias generales'} disponibles`}
      title={scope === 'PERSONAL' ? 'Incidencias personales' : 'Dias generales del calendario'}
    >
      <Grid size={12}>
        <OperationalTableCard
          columns={columns}
          emptyMessage={scope === 'PERSONAL' ? 'No hay incidencias personales configuradas.' : 'No hay dias generales configurados.'}
          error={response.error}
          loading={response.loading}
          onRetry={response.refetch}
          rows={rows}
          slow={response.slow}
          subtitle={
            scope === 'PERSONAL'
              ? 'Cada incidencia representa una situacion que afecta solo al trabajador asignado en la matriz mensual.'
              : 'Cada dia general aplica como contexto institucional en toda la columna del calendario.'
          }
          title={scope === 'PERSONAL' ? 'Catalogo de incidencias personales' : 'Catalogo de dias generales'}
          total={rows.length}
        />
      </Grid>

      <FormDialog
        maxWidth="xs"
        onClose={closeEditor}
        onSubmit={() => void handleSave()}
        open={Boolean(editor)}
        submitting={saving}
        title={editor?.id ? 'Editar' : scope === 'PERSONAL' ? 'Nueva incidencia' : 'Nuevo dia general'}
      >
        <Stack spacing={1.5}>
          <TextField
            inputProps={{ maxLength: 20 }}
            label="Codigo"
            required
            {...validation.fieldProps('codigo', 'Identificador corto. Ejemplo: VAC, LIC, COMP, FRAN.')}
            onChange={(event) => updateField('codigo', event.target.value.toUpperCase())}
            size="small"
            value={editor?.data.codigo || ''}
          />
          <TextField
            inputProps={{ maxLength: 100 }}
            label="Nombre"
            required
            {...validation.fieldProps('nombre', 'Nombre visible en la matriz y reportes.')}
            onChange={(event) => updateField('nombre', event.target.value)}
            size="small"
            value={editor?.data.nombre || ''}
          />
          <TextField
            helperText="Opcional. Cuando debe usarse esta incidencia."
            inputProps={{ maxLength: 300 }}
            label="Descripcion"
            multiline
            minRows={2}
            onChange={(event) => updateField('descripcion', event.target.value)}
            size="small"
            value={editor?.data.descripcion || ''}
          />
        </Stack>
      </FormDialog>

      <ImpactoUsoDialog
        accionLabel="desactivar"
        entidadGenero={scope === 'PERSONAL' ? 'f' : 'm'}
        entidadLabel={scope === 'PERSONAL' ? 'incidencia' : 'dia general'}
        impacto={impactoEliminar?.impacto ?? null}
        onClose={() => setImpactoEliminar(null)}
        onLimpiar={() => impactoEliminar && void handleDelete(impactoEliminar.id, impactoEliminar.nombre, true)}
        open={Boolean(impactoEliminar)}
        saving={confirmandoLimpieza}
      />
    </OperationalPageTemplate>
  );

  function closeEditor() {
    setEditor(null);
    validation.reset();
  }

  function updateField<K extends keyof GuardarIncidenciaPersonalInput>(key: K, value: GuardarIncidenciaPersonalInput[K]) {
    setEditor((current) => (current ? { ...current, data: { ...current.data, [key]: value } } : current));
  }

  async function handleSave() {
    if (!editor) return;
    if (!validation.validate(editor.data)) return;

    const codigo = (editor.data.codigo || '').trim();
    const nombre = (editor.data.nombre || '').trim();

    setSaving(true);

    try {
      // Estos 4 flags no tienen control propio en este formulario simple, pero el backend los exige
      // como booleanos obligatorios en cada guardado (afectan el calculo de horas de la matriz
      // mensual). Al editar deben preservarse los valores reales de la fila (ya cargados en
      // editor.data via mapIncidenciaPersonalToForm); al crear, no hay valor previo y se usa false
      // como default seguro. Antes esto se pisaba siempre con `false`, lo que resetea en silencio
      // estos flags cada vez que se edita una incidencia que los tenia en `true`.
      const payload: GuardarIncidenciaPersonalInput = {
        ...editor.data,
        codigo,
        nombre,
        alcance: scope,
        esLaborable: editor.data.esLaborable ?? false,
        generaHorasTrabajadas: editor.data.generaHorasTrabajadas ?? false,
        computaParaMetaHoras: editor.data.computaParaMetaHoras ?? false,
        requiereRespaldo: editor.data.requiereRespaldo ?? false
      };

      if (editor.id) {
        await operacionApi.updateIncidenciaPersonal(editor.id, payload);
        showSuccess(describirRegistro(nombre, 'actualizad'));
      } else {
        await operacionApi.createIncidenciaPersonal(payload);
        showSuccess(describirRegistro(nombre, 'cread'));
      }

      closeEditor();
      setRefreshKey((value) => value + 1);
    } catch (error) {
      showError(error instanceof Error ? error.message : 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  }
}

function mapIncidenciaPersonalToForm(incidenciaPersonal: IncidenciaPersonal): GuardarIncidenciaPersonalInput {
  return {
    codigo: incidenciaPersonal.codigo,
    nombre: incidenciaPersonal.nombre,
    descripcion: incidenciaPersonal.descripcion || '',
    alcance: incidenciaPersonal.alcance === 'OTRO' ? 'PERSONAL' : incidenciaPersonal.alcance,
    esLaborable: incidenciaPersonal.esLaborable,
    generaHorasTrabajadas: incidenciaPersonal.generaHorasTrabajadas,
    computaParaMetaHoras: incidenciaPersonal.computaParaMetaHoras,
    requiereRespaldo: incidenciaPersonal.requiereRespaldo,
    activo: incidenciaPersonal.activo
  };
}
