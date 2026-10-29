# Propuesta en progreso: vista semanal, autocompletado y plantilla de intercambio

Estado: idea en progreso, pendiente de validacion con usuarios y datos reales.

Fecha de registro: 2026-10-16.

## Objetivo

Reducir el trabajo repetitivo de cargar una planificacion dia por dia y permitir que el personal prepare una planificacion fuera del sistema, sin perder las validaciones, permisos ni el historial mensual.

La propuesta contiene dos mejoras relacionadas:

1. Una vista semanal editable que permita autocompletar la planificacion mensual y, en una etapa posterior, guardar patrones reutilizables.
2. Una plantilla Excel controlada para exportar, completar fuera del sistema e importar nuevamente.

No se considera aprobada aun como diseño definitivo. Las reglas descritas deben contrastarse con planificadores, jefaturas y casos reales de servicios con personal fijo, rotativo y reemplazos.

## Caso 1: vista semanal para autocompletar la planificacion mensual

### Problema

La matriz mensual obliga a registrar o revisar entre 28 y 31 dias. Para personal de oficina y otros casos con horarios estables, esta repeticion no aporta valor y aumenta el tiempo de carga.

### Idea funcional

Agregar una vista semanal de lunes a domingo para ayudar a cargar la misma planificacion mensual existente. El usuario completa o edita un patron semanal y puede aplicarlo a todas las fechas equivalentes del mes:

```text
Lunes de la plantilla    -> todos los lunes del mes
Martes de la plantilla   -> todos los martes del mes
...
Domingo de la plantilla  -> todos los domingos del mes
```

Solo se generan fechas que pertenecen al mes seleccionado. La matriz mensual continua siendo la fuente de verdad, el resultado concreto y la vista historica de la planificacion. La vista semanal no crea una segunda planificacion ni una segunda version de los datos: es un espacio local de preparacion y una forma alternativa de autocompletar los registros mensuales.

Las dos vistas son opcionales y editables:

```text
Planificacion mensual = fuente de verdad
        ^
Vista semanal = ayuda de autocompletado para patrones repetitivos
```

La vista mensual se mantiene para servicios, departamentos o personas con horarios unicos, variables o excepciones. La vista semanal se ofrece como una ayuda para quienes tienen patrones repetitivos.

### Estado inicial de la vista semanal

La primera vez que se abre la vista semanal debe mostrarse vacia, independientemente de que la matriz mensual este:

- vacia;
- parcialmente llena; o
- completamente llena.

La vista semanal no debe inferir ni copiar automaticamente un patron desde los registros mensuales existentes. Esto evita presentar como plantilla una configuracion que aun no fue preparada por el usuario y permite que la vista semanal se use como una herramienta opcional de autocompletado.

La vista semanal se comporta inicialmente como un borrador local del patron. Sus celdas no modifican la matriz mensual hasta que el usuario elija una accion de aplicacion y confirme los cambios.

### Persistencia propuesta

En la primera version no es necesario guardar una plantilla semanal persistente. El patron se edita temporalmente en la vista semanal y se aplica directamente a la planificacion mensual seleccionada. La persistencia de plantillas reutilizables por servicio o departamento queda como una evolucion posterior, una vez validado el flujo con usuarios reales.

Para la primera version, la estructura conceptual de la edicion sera:

```text
Planificacion mensual
  ├── Vista mensual: fechas concretas del mes
  └── Vista semanal: patron temporal de lunes a domingo
```

Para una futura plantilla persistente, la estructura podria evolucionar a servicio o departamento -> plantilla versionada -> puesto, funcion o rol operativo -> dia de semana y turno.

No se recomienda ligar una futura plantilla persistente unicamente a `idPersonal`. Si una persona se retira, cambia de servicio o es reemplazada, el horario base deberia poder mantenerse.

La relacion con la persona deberia resolverse mediante la asignacion activa (`idAsignacionPersonal`) o mediante un puesto/funcion estable. Esto permite que un nuevo ocupante herede el horario correspondiente cuando el servicio lo confirme.

### Aplicacion del patron semanal al mes

Al abrir o editar una planificacion mensual se ofreceria un selector de vista:

```text
Vista mensual | Vista semanal
```

Desde la vista semanal se ofreceria una accion como:

```text
Aplicar patron semanal al mes
```

La operacion debe aplicar el patron sobre los registros mensuales de la planificacion seleccionada. No debe modificar meses anteriores ni cambiar automaticamente una planificacion ya publicada o cerrada.

La vista semanal no se rellena automaticamente con los datos que ya existian en la matriz mensual. Despues de aplicar un patron, la pantalla puede refrescar la matriz mensual y reconstruir la vista semanal a partir del patron local que el usuario acaba de aplicar, pero los datos mensuales previos no deben convertirse retroactivamente en una plantilla semanal.

Modos sugeridos:

- Completar solo celdas vacias: las celdas con valores existentes se conservan.
- Reemplazar las celdas existentes, con confirmacion explicita.
- Aplicar el patron solamente a una persona, a filas seleccionadas o a un alcance autorizado.
- Aplicar una semana unicamente a un rango de fechas.

Una celda semanal vacia significa "no modificar". Una celda con descanso o incidencia es un valor explicito que debe aplicarse al mes.

Mientras no se confirme la aplicacion, el patron semanal permanece solo en el estado local de la pantalla. Si el usuario cambia de vista, recarga o abandona la pagina con cambios pendientes, el sistema debe advertirlo y permitir cancelar o conservar el borrador local segun la politica de la interfaz.

### Persistencia local temporal

En esta primera etapa, el patron semanal no se guarda en la base de datos ni se convierte en una plantilla persistente institucional. Puede conservarse localmente en el navegador para facilitar la navegacion entre la vista semanal y mensual, usando como clave minima:

```text
idPlanificacion + idAsignacionPersonal + version del patron semanal
```

La persistencia local no reemplaza a `rol_turno` ni tiene valor historico. La unica operacion que modifica la planificacion es la aplicacion confirmada del patron al mes.

Antes de guardar se debe mostrar un resumen de impacto, por ejemplo:

```text
Se actualizaran 186 celdas.
24 celdas tienen un turno previo.
12 celdas quedaran sin cambios.
```

Si existen valores previos, la advertencia debe indicar las fechas afectadas y permitir confirmar o cancelar. Por ejemplo:

```text
El lunes tiene valores previos en 4 fechas del mes.

- Completar solamente lunes vacios.
- Reemplazar todos los lunes del mes.
- Cancelar.
```

### Cambios de personal, roles y turnos

- Si cambia la persona, la plantilla de servicio puede mantenerse y reasignarse al nuevo ocupante.
- Si cambia el rol funcional o el servicio, solo se debe aplicar la plantilla si la asignacion activa cumple las reglas de alcance.
- Si cambia un turno catalogado, el sistema debe validar si el turno sigue activo y si es compatible con la planificacion.
- Una modificacion puntual del mes debe quedar como excepcion mensual y no alterar el patron semanal utilizado para autocompletar.
- Los feriados, descansos, incidencias y restricciones actuales deben seguir aplicandose al generar la matriz.

### Evolucion futura: plantillas semanales persistentes

Despues de validar la vista semanal, se puede agregar una plantilla semanal persistente para no reconstruir el patron cada mes. La asociacion principal recomendada seria el servicio, con posibilidad de cubrir tambien una planificacion departamental.

En esa etapa, la plantilla deberia tener fecha de inicio, fecha de fin opcional, estado activo y version. De esta manera, un cambio de horario en abril no altera la plantilla utilizada para enero, febrero o marzo.

Conceptualmente:

```text
Plantilla semanal vigente -> autocompleta -> planificacion mensual historica
```

### Pendientes de validacion real

- Si el patron se define por persona, puesto, funcion o combinacion de ambos.
- Que hacer cuando existen dos asignaciones activas para una misma persona.
- Si los jefes deben usar la plantilla del servicio o una plantilla propia.
- Como se resuelven cambios de turno a mitad de mes.
- Si la aplicacion por defecto debe completar vacios o reemplazar valores.
- Si se requiere una plantilla especial para turnos rotativos.

## Caso 2: plantilla Excel para trabajo fuera del sistema

### Problema

Los usuarios actualmente pueden llevarse informacion a casa, pero no disponen de un archivo controlado para completar la planificacion y devolverla al sistema con seguridad.

### Idea funcional

Agregar una opcion `Exportar plantilla editable`. El archivo incluiria el personal y los catalogos necesarios, pero limitaria la edicion a las celdas de planificacion.

El flujo propuesto es:

1. El usuario selecciona una planificacion.
2. Descarga una plantilla vacia o con la planificacion actual.
3. Completa el archivo fuera del sistema.
4. Regresa y selecciona `Importar plantilla`.
5. El sistema valida el archivo y muestra una vista previa.
6. El usuario confirma la importacion.
7. El backend guarda las celdas validas en una operacion por lote.

### Hojas del archivo

#### `INSTRUCCIONES`

Debe explicar los campos permitidos, los codigos validos, el procedimiento de importacion y las reglas basicas.

#### `PLAN_SEMANAL`

Para cargar un patron de lunes a domingo:

```text
ID asignacion | Personal | Lunes | Martes | Miercoles | Jueves | Viernes | Sabado | Domingo
```

Esta hoja puede aplicarse posteriormente al mes seleccionado.

#### `PLAN_MENSUAL`

Para quienes necesitan personalizar cada fecha:

```text
ID asignacion | Personal | 01 | 02 | 03 | ... | 31
```

Los dias que no existan en el mes deben quedar bloqueados o claramente marcados.

#### `CATALOGOS`

Hoja protegida u oculta con los codigos validos de turnos, descansos e incidencias permitidas. Puede servir como origen de listas desplegables de Excel.

### Identificacion de personal

La importacion no debe identificar filas solamente por nombre. Debe usar un identificador estable, preferentemente `idAsignacionPersonal`, y conservar como referencia visible el codigo y el nombre del personal.

Si la asignacion ya no existe, esta inactiva o pertenece a otro servicio, el archivo debe rechazarse para esa fila y mostrar el motivo.

### Proteccion del archivo

El Excel puede incluir:

- Encabezados protegidos.
- Celdas internas bloqueadas.
- Celdas editables desbloqueadas.
- Listas desplegables para turnos.
- Codigo de planificacion y version de exportacion.
- Fecha de exportacion.

La proteccion de Excel es una ayuda de usabilidad, no una frontera de seguridad. El backend debe validar nuevamente todos los datos y permisos.

### Validacion e importacion

La importacion debe tener dos pasos separados:

```text
Validar archivo -> mostrar errores y advertencias -> aplicar cambios
```

Ejemplos de errores:

```text
Hoja PLAN_SEMANAL, fila 14, miercoles:
El codigo de turno no existe.

Hoja PLAN_MENSUAL, fila 8, dia 25:
La asignacion personal esta inactiva.

Hoja PLAN_MENSUAL, fila 12, dia 03:
La planificacion esta cerrada.
```

La aplicacion debe ser transaccional: si el archivo tiene errores bloqueantes, no debe guardar cambios parciales.

### Compatibilidad con la planificacion semanal

Las dos hojas deben poder coexistir en el mismo archivo:

- `PLAN_SEMANAL` para personal con patron estable.
- `PLAN_MENSUAL` para excepciones o personal que requiere detalle diario.

Debe definirse una regla de prioridad. Propuesta inicial:

1. Se procesa la plantilla semanal.
2. La hoja mensual puede sobrescribir dias concretos.
3. Las celdas no informadas conservan el valor generado por la plantilla semanal.

## Reglas de seguridad y negocio comunes

- La API sigue siendo la fuente de verdad.
- No se deben importar turnos inexistentes o inactivos.
- No se deben editar planificaciones cerradas sin permiso.
- Se deben respetar los alcances de departamento y servicio.
- La importacion debe registrar usuario, fecha, archivo y cantidad de celdas afectadas.
- La generacion mensual debe conservar el resultado historico aunque luego cambie la plantilla.
- Debe existir una vista previa antes de aplicar cambios masivos.

## Posible API futura

Los nombres son preliminares y deben ajustarse al contrato vigente:

```text
GET  /v1/plantillas-planificacion
POST /v1/plantillas-planificacion
PUT  /v1/plantillas-planificacion/:id
POST /v1/planificaciones/:id/aplicar-plantilla-semanal

GET  /v1/planificaciones/:id/export/plantilla
POST /v1/planificaciones/:id/import/validar
POST /v1/planificaciones/:id/import/aplicar
```

## Orden recomendado de implementacion

1. Validar el modelo funcional con usuarios reales de oficina, jefaturas y personal rotativo.
2. Implementar vista semanal editable sobre la planificacion mensual actual.
3. Agregar vista previa, advertencia y politica de conflictos.
4. Implementar la aplicacion transaccional del patron al mes.
5. Validar el flujo con usuarios y, si corresponde, agregar plantillas semanales persistentes.
6. Exportar plantilla Excel protegida.
7. Implementar validacion e importacion transaccional.
8. Agregar auditoria, versionado y pruebas con cambios de personal.

## Criterios de aceptacion preliminares

- Un usuario puede completar una semana y autocompletar el mes sin editar los 28-31 dias manualmente.
- La vista semanal se abre inicialmente vacia aunque la matriz mensual ya tenga datos.
- La vista semanal y la vista mensual trabajan sobre la misma planificacion, pero la vista semanal solo modifica la matriz mensual despues de una aplicacion confirmada.
- El patron semanal puede conservarse localmente para continuar trabajando en el navegador.
- El usuario puede elegir entre completar celdas vacias o reemplazar valores existentes.
- El sistema advierte cuantas celdas seran creadas, modificadas y conservadas antes de aplicar.
- Una modificacion mensual no altera el patron semanal utilizado para autocompletar.
- Una futura plantilla de servicio puede mantenerse cuando cambia la persona que ocupa una funcion.
- El usuario puede descargar un Excel con personal y catalogos validos.
- El archivo importado muestra errores por hoja, fila, columna y motivo.
- Ningun archivo invalido produce guardados parciales.
- La exportacion mensual posterior refleja exactamente los datos confirmados en el sistema.

## Estado actual

Esta documentacion representa una propuesta funcional en progreso. No implica que las tablas, endpoints o reglas indicadas ya existan ni que deban implementarse literalmente sin una validacion adicional con los usuarios y con el modelo real de asignaciones.
