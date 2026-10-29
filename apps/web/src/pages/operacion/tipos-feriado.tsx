import { useCallback, useMemo, useState } from 'react';

import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import ActionButtonGroup from 'components/system/ActionButtonGroup';
import FormDialog from 'components/system/FormDialog';
import OperationalTableCard from 'components/system/OperationalTableCard';
import { useAppToast } from 'components/system/AppToastProvider';
import OperationalPageTemplate from 'components/system/OperationalPageTemplate';
import OperationalStats from 'components/system/OperationalStats';
import StatusChip from 'components/system/StatusChip';
import { canManageGlobalCalendarCatalog, useAccessControl } from 'hooks/use-access-control';
import { useApiRequest } from 'hooks/useApiRequest';
import { isBlank, requiredMessage, useFormValidation } from 'hooks/useFormValidation';
import { operacionApi } from 'services/operacionApi';
import type { GuardarTipoFeriadoInput, TipoFeriado } from 'types/api';

const DEFAULT_FORM: GuardarTipoFeriadoInput = {
  codigo: '',
  nombre: '',
  descripcion: '',
  orden: 1,
  activo: true
};

export default function TiposFeriadoPage() {
  const { session } = useAccessControl();
  const puedeGestionar = canManageGlobalCalendarCatalog(session, 'gestionarTiposFeriado');
  const { showSuccess, showError } = useAppToast();
  const [refreshKey, setRefreshKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [editor, setEditor] = useState<{ id: number | null; data: GuardarTipoFeriadoInput } | null>(null);
  const validation = useFormValidation<GuardarTipoFeriadoInput>({
    codigo: (values) => (isBlank(values.codigo) ? requiredMessage('El codigo') : undefined),
    nombre: (values) => (isBlank(values.nombre) ? requiredMessage('El nombre') : undefined)
  });

  const response = useApiRequest(() => operacionApi.getTiposFeriado(), [refreshKey]);
  const rows = useMemo(() => response.data?.data || [], [response.data?.data]);

  const handleDelete = useCallback(
    async (id: number, nombre: string) => {
      try {
        await operacionApi.deleteTipoFeriado(id);
        showSuccess(`Tipo de feriado "${nombre}" desactivado correctamente.`);
        setRefreshKey((value) => value + 1);
      } catch (error) {
        showError(error instanceof Error ? error.message : 'No se pudo desactivar.');
      }
    },
    [showError, showSuccess]
  );

  const handleActivar = useCallback(
    async (id: number, row: TipoFeriado) => {
      try {
        await operacionApi.updateTipoFeriado(id, { ...mapTipoFeriadoToForm(row), activo: true });
        showSuccess(`Tipo de feriado "${row.nombre}" activado correctamente.`);
        setRefreshKey((value) => value + 1);
      } catch (error) {
        showError(error instanceof Error ? error.message : 'No se pudo activar.');
      }
    },
    [showError, showSuccess]
  );

  const columns = useMemo(
    () => [
      {
        key: 'codigo',
        title: 'Codigo',
        render: (row: TipoFeriado) => <Typography variant="body2">{row.codigo}</Typography>
      },
      {
        key: 'nombre',
        title: 'Nombre',
        render: (row: TipoFeriado) => <Typography variant="body2">{row.nombre}</Typography>
      },
      {
        key: 'descripcion',
        title: 'Descripcion',
        render: (row: TipoFeriado) => (
          <Typography color="text.secondary" variant="body2">
            {row.descripcion || '-'}
          </Typography>
        )
      },
      {
        key: 'orden',
        title: 'Orden',
        render: (row: TipoFeriado) => <Typography variant="body2">{row.orden}</Typography>
      },
      {
        key: 'estado',
        title: 'Estado',
        render: (row: TipoFeriado) => <StatusChip active={row.activo} />
      },
      ...(puedeGestionar
        ? [
            {
              key: 'acciones',
              title: 'Acciones',
              render: (row: TipoFeriado) => (
                <ActionButtonGroup
                  actions={[
                    {
                      label: 'Editar',
                      onClick: () => setEditor({ id: row.id, data: mapTipoFeriadoToForm(row) }),
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
                          onClick: () => void handleActivar(row.id, row),
                          tone: 'secondary'
                        }
                  ]}
                />
              )
            }
          ]
        : [])
    ],
    [handleActivar, handleDelete, puedeGestionar]
  );

  const isEdit = Boolean(editor?.id);

  return (
    <OperationalPageTemplate
      actions={[
        ...(puedeGestionar
          ? [
              {
                label: 'Nuevo tipo de feriado',
                onClick: () => setEditor({ id: null, data: { ...DEFAULT_FORM, orden: rows.length + 1 } }),
                tone: 'primary' as const
              }
            ]
          : [])
      ]}
      description="Catalogo de clases de feriado institucional. Cada entrada define un codigo de feriado que puede usarse en el calendario y en la cabecera de la matriz mensual."
      stats={
        <OperationalStats
          items={[
            { label: 'Tipos', value: rows.length },
            { label: 'Activos', value: rows.filter((row) => row.activo).length }
          ]}
        />
      }
      // summary={`${rows.length} tipos de feriado disponibles`}
      title="Catalogo de feriados"
    >
      <Grid size={12}>
        <OperationalTableCard
          columns={columns}
          emptyMessage="No hay tipos de feriado configurados."
          error={response.error}
          loading={response.loading}
          onRetry={response.refetch}
          rows={rows}
          slow={response.slow}
          subtitle="Define los codigos de feriado institucional. Ejemplo: F (Feriado), FN (Feriado Nacional), FR (Feriado Regional)."
          title="Catalogo institucional de feriados"
          total={rows.length}
        />
      </Grid>

      <FormDialog
        maxWidth="xs"
        onClose={closeEditor}
        onSubmit={() => void handleSave()}
        open={Boolean(editor)}
        submitting={saving}
        title={isEdit ? 'Editar tipo de feriado' : 'Nuevo tipo de feriado'}
      >
        <Stack spacing={1.5}>
          <TextField
            disabled={isEdit}
            inputProps={{ maxLength: 4 }}
            label="Codigo"
            required
            {...validation.fieldProps('codigo', isEdit ? 'El codigo no puede cambiarse.' : 'Identificador corto. Ejemplo: F, FN, FR, FI.')}
            onChange={(event) => updateField('codigo', event.target.value.toUpperCase())}
            size="small"
            value={editor?.data.codigo || ''}
          />
          <TextField
            inputProps={{ maxLength: 100 }}
            label="Nombre"
            required
            {...validation.fieldProps('nombre', 'Nombre visible. Ejemplo: Feriado Nacional.')}
            onChange={(event) => updateField('nombre', event.target.value)}
            size="small"
            value={editor?.data.nombre || ''}
          />
          <TextField
            helperText="Opcional. Cuando aplica este tipo de feriado."
            inputProps={{ maxLength: 300 }}
            label="Descripcion"
            multiline
            minRows={2}
            onChange={(event) => updateField('descripcion', event.target.value)}
            size="small"
            value={editor?.data.descripcion || ''}
          />
          <TextField
            helperText="Orden de presentacion en listas y reportes."
            label="Orden"
            onChange={(event) => updateField('orden', Number(event.target.value) || 1)}
            size="small"
            type="number"
            value={editor?.data.orden ?? 1}
          />
        </Stack>
      </FormDialog>
    </OperationalPageTemplate>
  );

  function updateField<K extends keyof GuardarTipoFeriadoInput>(field: K, value: GuardarTipoFeriadoInput[K]) {
    setEditor((current) => (current ? { ...current, data: { ...current.data, [field]: value } } : current));
  }

  function closeEditor() {
    setEditor(null);
    validation.reset();
  }

  async function handleSave() {
    if (!editor) return;
    if (!validation.validate(editor.data)) return;

    const codigo = (editor.data.codigo || '').trim();
    const nombre = (editor.data.nombre || '').trim();

    setSaving(true);

    try {
      if (isEdit && editor.id) {
        await operacionApi.updateTipoFeriado(editor.id, { ...editor.data, codigo, nombre });
        showSuccess(`Tipo de feriado "${nombre}" actualizado correctamente.`);
      } else {
        await operacionApi.createTipoFeriado({ ...editor.data, codigo, nombre });
        showSuccess(`Tipo de feriado "${nombre}" creado correctamente.`);
      }

      closeEditor();
      setRefreshKey((value) => value + 1);
    } catch (error) {
      showError(error instanceof Error ? error.message : 'No se pudo guardar el tipo de feriado.');
    } finally {
      setSaving(false);
    }
  }
}

function mapTipoFeriadoToForm(row: TipoFeriado): GuardarTipoFeriadoInput {
  return {
    codigo: row.codigo,
    nombre: row.nombre,
    descripcion: row.descripcion || '',
    orden: row.orden,
    activo: row.activo
  };
}
