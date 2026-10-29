# ESPECIFICACIÓN TÉCNICA DE BASE DE DATOS

## Sistema de Gestión de Roles y Turnos Hospitalarios

> **Documento de diseño original — no reconciliado contra el esquema real, uso exclusivamente
> histórico.** A diferencia de `docs/database/modelo-relacional-rol-turnos.md` (reconciliado contra
> la base real el 2026-07-06, esa es la fuente de verdad del esquema vigente), este documento
> conserva el diseño e intención conceptual **inicial** del proyecto y no se actualizó en cada
> migración posterior. Una revisión completa (2026-07-10)
> confirmó que gran parte de la sección 3 describe catálogos y tablas que **ya no existen**, la mayoría
> porque se implementaron de verdad y después se retiraron por decisión explícita del usuario, no
> porque nunca se hayan construido. Antes de citar cualquier tabla de este documento como vigente,
> verificar contra `modelo-relacional-rol-turnos.md`. Lista consolidada de lo que cambió:
>
> * **Eliminadas por decisión explícita del usuario, 2026-07-06** (tenían implementación de aplicación
>   real, no eran solo esquema): toda la sección 3.6 "Futuro, pero ya modelado" —
>   `COBERTURA_TURNO`/`REGLA_HORAS` (estaban conectadas a publicar/aprobar planificación),
>   `PLANTILLA_PLANIFICACION` (CRUD completo con 3 endpoints, nunca invocada desde el frontend) — y la
>   sección 3.7 `OBSERVACION` (diaria, tenía endpoint propio y alimentaba la matriz mensual). El título
>   de la sección 3.6 ya no aplica: no es funcionalidad futura pendiente, es funcionalidad que existió y
>   se retiró. Ver `docs/database/decisiones-tecnicas.md §29`.
> * **`CAMBIO_TURNO` (sección 3.6) eliminada, 2026-07-06** — a diferencia de las anteriores, esta nunca
>   tuvo ninguna implementación de aplicación (tabla vacía sin código). Ver `decisiones-tecnicas.md §28`.
> * **`FAMILIA_LABORAL`, `SERVICIO_FAMILIA_HABILITADA` y `TIPO_ITEM` (sección 3.2, separado de
>   `TIPO_CONTRATO`) eliminadas/fusionadas, 2026-07-03** (migraciones 025/027/028/032) — no existe
>   ningún concepto de familia laboral en el modelo vigente; `TIPO_ITEM` se fusionó dentro de
>   `TIPO_CONTRATO` (una sola tabla).
> * **`TIPO_TURNO` eliminada** (migración `033`, 2026-07-03) — el código/etiqueta visual de un turno se
>   resuelve hoy vía `CODIGO_OPERATIVO_SERVICIO`, no por un catálogo conceptual global.
> * **`ROL` (sección 3.3) renombrada a `ROL_SEGURIDAD`, y `TIPO_DIA` (sección 3.5) renombrada a
>   `INCIDENCIA_PERSONAL`** (migración `042`, 2026-07-06) — mismos conceptos, otro nombre.
> * **`PLANIFICACION.estado` (sección 3.4) real es `BORRADOR`/`REVISION`/`APROBADA`/`CERRADA`**, no
>   `BORRADOR`/`PUBLICADO`/`CERRADO` como describe este documento (migración `010`).
> * **`PLANIFICACION` y `TURNO` (secciones 3.4/3.5) tienen alcance dual servicio o departamento** desde
>   las migraciones `026` y `035` respectivamente — este documento solo describe el alcance de servicio.
> * `SERVICIO.permite_multi_turno` nunca llegó a implementar la validación que describe la sección
>   2.2/7.2 y fue eliminada de la base (migración `047`, 2026-07-10, ver `decisiones-tecnicas.md` §34 y
>   §54).
> * Las columnas `es_feriado`/`codigo_feriado`/`nombre_feriado` de `CALENDARIO` (sección 3.4) fueron
>   eliminadas (migración `049`, 2026-07-10) — un feriado ya no es un flag plano por día, sino una fila
>   con rango de fechas en la tabla nueva `FERIADO` (migración `048`), resuelta por join de rango de
>   fechas (ver `decisiones-tecnicas.md` §58).
>
> Lo que **sí sigue vigente conceptualmente** (aunque el nombre de tabla haya cambiado): la separación
> tipo de día/turno (7.1), el multi-turno por día vía `secuencia_dia` (7.2 — soportado de punta a punta
> en backend, sin UI conectada todavía, ver `ARQUITECTURA.md §1.1`), turno concreto dependiente de
> servicio/departamento (7.3, ahora dual scope), planificar sobre `ASIGNACION_PERSONAL` (7.4), y
> versionar la planificación (7.5). El resto de la sección 7 ("Decisiones críticas de diseño") describe
> el razonamiento original de tablas que ya no existen — léase como historia, no como diseño vigente.

---

# 1. Introducción

El presente documento define el modelo de datos relacional para el Sistema de Gestión de Roles y Turnos Hospitalarios. El objetivo del modelo es soportar la operación real de planificación mensual por servicio, asignación de personal, turnos variables, incidencias no laborales, observaciones operativas y trazabilidad completa de cambios, manteniendo un diseño escalable, normalizado y apto para backend productivo.

El sistema debe representar la operación hospitalaria sin depender de estructuras tipo hoja de cálculo. Para ello, el modelo separa claramente los conceptos administrativos, organizativos, de seguridad, de planificación y de operación diaria. Esta separación permite crecer sin romper la base estructural del sistema y reduce la ambigüedad al momento de implementar validaciones, reportes y reglas futuras.

Los objetivos principales del modelo son:

* registrar planificaciones mensuales por servicio con control de estado
* soportar múltiples turnos por día por persona
* diferenciar turnos laborales de tipos de día no laboral
* modelar turnos dependientes del servicio y con cruce de medianoche
* calcular horas diarias, horas mensuales, faltantes y extras
* permitir rotación, cobertura y reasignación de personal
* registrar auditoría funcional y trazabilidad de usuario
* habilitar crecimiento hacia cobertura, reglas horarias, plantillas y cambios de turno formalizados

---

# 2. Principios de Diseño

## 2.1 Separación entre tipo de día y tipo de turno

El modelo diferencia dos conceptos que funcionalmente no son equivalentes:

* `TIPO_DIA`: representa el estado global del día para una persona, por ejemplo descanso, vacación, licencia o baja médica
* `TIPO_TURNO`: representa una categoría operativa de turno, por ejemplo mañana, tarde o noche

La separación evita mezclar reglas laborales con reglas operativas. Un tipo de día puede no generar horas trabajadas, mientras que un turno siempre representa una jornada programada con duración calculable. Esta distinción es crítica para reportes, validaciones y cálculo de metas mensuales.

## 2.2 Multi-turno por día

El modelo permite múltiples turnos el mismo día para una misma persona. Esto responde a la operación hospitalaria real, donde una persona puede cubrir dos franjas horarias, extender jornada o resolver contingencias de cobertura. Por este motivo, la restricción de unicidad no se define por persona y fecha únicamente, sino por persona, fecha y secuencia operativa dentro del día.

## 2.3 Turno concreto dependiente del servicio

El modelo diferencia entre el concepto abstracto de turno (`TIPO_TURNO`) y el turno concreto (`TURNO`). El turno concreto depende del servicio porque no todos los servicios manejan los mismos horarios, aunque compartan el código conceptual `M`, `T` o `N`. De este modo, un servicio puede tener un turno de mañana `07:00-13:00` y otro `08:00-14:00` sin romper la semántica del sistema.

## 2.4 Trazabilidad y auditoría funcional

Las entidades operativas y administrativas incluyen campos de auditoría y tablas históricas para reconstruir cambios de asignación, generación de roles, publicación, cierre y modificaciones posteriores. La trazabilidad no se limita al control técnico de fechas de creación y actualización; también contempla usuario responsable, motivo del cambio y referencias a registros afectados.

## 2.5 Escalabilidad por normalización y vigencia

El diseño sigue principios de tercera forma normal para evitar redundancias y facilitar mantenimiento. Las reglas futuras, como cobertura mínima o metas de horas, se modelan como entidades independientes con vigencia temporal. Esto permite introducir nuevos servicios, nuevos turnos, nuevas políticas institucionales y nuevas reglas sin rediseñar el núcleo transaccional.

## 2.6 Interpretación controlada de días vacíos

El modelo admite que un día no tenga filas en `ROL_TURNO`, lo que permite representar borradores o días aún no planificados. Sin embargo, para planificaciones en estado `PUBLICADO` o `CERRADO`, se recomienda registrar explícitamente el `TIPO_DIA` correspondiente cuando el día tenga significado operativo o administrativo, como `DESCANSO`, `VACACION` o `BAJA_MEDICA`. Esta práctica reduce ambigüedad en reportes y auditoría.

---

# 3. Modelo de Datos

## 3.1 ORGANIZACIÓN

### DEPARTAMENTO

Representa una agrupación organizativa mayor dentro del hospital. Su función es estructurar los servicios dentro de una jerarquía institucional estable.

| Campo | Tipo | PK/FK | Descripción |
| --- | --- | --- | --- |
| id | BIGINT | PK | Identificador único del departamento. |
| codigo | VARCHAR(30) | - | Código institucional único del departamento. |
| nombre | VARCHAR(150) | - | Nombre oficial del departamento. |
| descripcion | TEXT | - | Descripción funcional del área. |
| activo | BOOLEAN | - | Indicador de vigencia lógica del departamento. |
| created_at | TIMESTAMP | - | Fecha y hora de creación del registro. |
| updated_at | TIMESTAMP | - | Fecha y hora de última actualización. |

**Restricciones y consideraciones**

* `UNIQUE(codigo)`
* `UNIQUE(nombre)` recomendado si la institución no admite duplicidad semántica
* `activo` permite baja lógica sin perder trazabilidad histórica

### SERVICIO

Representa la unidad operativa donde se construye y ejecuta una planificación mensual. Cada servicio puede tener reglas horarias y turnos concretos propios.

| Campo | Tipo | PK/FK | Descripción |
| --- | --- | --- | --- |
| id | BIGINT | PK | Identificador único del servicio. |
| id_departamento | BIGINT | FK -> DEPARTAMENTO.id | Departamento al que pertenece el servicio. |
| codigo | VARCHAR(30) | - | Código institucional único del servicio. |
| nombre | VARCHAR(150) | - | Nombre oficial del servicio. |
| descripcion | TEXT | - | Descripción funcional del servicio. |
| activo | BOOLEAN | - | Indicador de vigencia lógica del servicio. |
| created_at | TIMESTAMP | - | Fecha y hora de creación. |
| updated_at | TIMESTAMP | - | Fecha y hora de actualización. |

**Restricciones y consideraciones**

* `UNIQUE(codigo)`
* `UNIQUE(id_departamento, nombre)` recomendado para evitar duplicados dentro del mismo departamento
* `permite_multi_turno` existió en el diseño original pero nunca implementó ninguna validación real —
  eliminada de la base el 2026-07-10 (migración `047_drop_servicio_permite_multi_turno.sql`, ver
  `docs/database/decisiones-tecnicas.md` §34 y §54)

---

## 3.2 PERSONAL

### FAMILIA_LABORAL

Catálogo de familias profesionales o laborales del hospital. Permite agrupar cargos específicos bajo una clasificación operativa común, por ejemplo `ENFERMERIA`, `MANUALES`, `MEDICINA`, `ADMINISTRACION`. Esta separación resuelve casos donde distintas categorías comparten la misma labor funcional dentro del servicio.

| Campo | Tipo | PK/FK | Descripción |
| --- | --- | --- | --- |
| id | BIGINT | PK | Identificador único de la familia laboral. |
| codigo | VARCHAR(30) | - | Código único de la familia. |
| nombre | VARCHAR(120) | - | Nombre de la familia profesional o laboral. |
| descripcion | TEXT | - | Descripción funcional de la familia. |
| activo | BOOLEAN | - | Vigencia lógica del catálogo. |
| created_at | TIMESTAMP | - | Fecha de creación. |
| updated_at | TIMESTAMP | - | Fecha de actualización. |

**Restricciones y consideraciones**

* `UNIQUE(codigo)`
* `UNIQUE(nombre)` recomendado
* permite agrupar varios `NIVEL_CARGO` bajo una misma labor operativa

### NIVEL_CARGO

Catálogo de cargos o niveles ocupacionales del personal. Representa la categoría concreta de la persona dentro de una familia laboral, por ejemplo `LICENCIADA EN ENFERMERIA`, `AUXILIAR DE ENFERMERIA`, `MANUAL`, `MEDICO ESPECIALISTA`.

| Campo | Tipo | PK/FK | Descripción |
| --- | --- | --- | --- |
| id | BIGINT | PK | Identificador único del nivel o cargo. |
| id_familia_laboral | BIGINT | FK -> FAMILIA_LABORAL.id | Familia profesional o laboral a la que pertenece el cargo. |
| codigo | VARCHAR(30) | - | Código único del cargo. |
| nombre | VARCHAR(120) | - | Nombre del cargo. |
| descripcion | TEXT | - | Descripción funcional del cargo. |
| activo | BOOLEAN | - | Vigencia lógica del cargo. |
| created_at | TIMESTAMP | - | Fecha de creación. |
| updated_at | TIMESTAMP | - | Fecha de actualización. |

**Restricciones y consideraciones**

* `id_familia_laboral` es obligatorio para poder agrupar cargos por labor operativa
* `UNIQUE(codigo)`
* `UNIQUE(nombre)` recomendado

### TIPO_CONTRATO

Catálogo de modalidades de contratación del personal. Se referencia desde la asignación para permitir variación histórica por servicio o período.

| Campo | Tipo | PK/FK | Descripción |
| --- | --- | --- | --- |
| id | BIGINT | PK | Identificador único del tipo de contrato. |
| codigo | VARCHAR(30) | - | Código único del tipo de contrato. |
| nombre | VARCHAR(120) | - | Nombre del tipo de contrato. |
| descripcion | TEXT | - | Descripción de la modalidad contractual. |
| activo | BOOLEAN | - | Vigencia lógica del catálogo. |
| created_at | TIMESTAMP | - | Fecha de creación. |
| updated_at | TIMESTAMP | - | Fecha de actualización. |

**Restricciones y consideraciones**

* `UNIQUE(codigo)`
* `UNIQUE(nombre)` recomendado

### TIPO_ITEM

Catálogo formal del tipo de ítem administrativo o fuente estructural de horas del personal. Ejemplos típicos: `IDH`, `TGN`, `FP`. Todo personal asignado a planificación debe tener un tipo de ítem vigente en su asignación operativa.

| Campo | Tipo | PK/FK | Descripción |
| --- | --- | --- | --- |
| id | BIGINT | PK | Identificador único del tipo de ítem. |
| codigo | VARCHAR(30) | - | Código institucional del tipo de ítem. |
| nombre | VARCHAR(120) | - | Nombre funcional del tipo de ítem. |
| descripcion | TEXT | - | Detalle administrativo o financiero. |
| activo | BOOLEAN | - | Vigencia lógica del catálogo. |
| created_at | TIMESTAMP | - | Fecha de creación. |
| updated_at | TIMESTAMP | - | Fecha de actualización. |

**Restricciones y consideraciones**

* `UNIQUE(codigo)`
* `UNIQUE(nombre)` recomendado
* la cantidad mínima, objetivo o máxima de horas no se almacena aquí, sino en `REGLA_HORAS` para evitar duplicidad de políticas

### ROL_FUNCIONAL

Catálogo de funciones operativas o jerárquicas que una persona puede ejercer dentro de una asignación. Permite diferenciar el cargo profesional de la responsabilidad organizativa, por ejemplo una enfermera asistencial, una jefa de servicio o una jefa de departamento.

| Campo | Tipo | PK/FK | Descripción |
| --- | --- | --- | --- |
| id | BIGINT | PK | Identificador único del rol funcional. |
| codigo | VARCHAR(30) | - | Código único del rol funcional. |
| nombre | VARCHAR(120) | - | Nombre de la función. |
| alcance_organizativo | VARCHAR(20) | - | Alcance de la función: `NINGUNO`, `SERVICIO`, `DEPARTAMENTO`. |
| es_jefatura | BOOLEAN | - | Indica si la función constituye una jefatura formal. |
| descripcion | TEXT | - | Descripción funcional de la responsabilidad. |
| activo | BOOLEAN | - | Vigencia lógica del catálogo. |
| created_at | TIMESTAMP | - | Fecha de creación. |
| updated_at | TIMESTAMP | - | Fecha de actualización. |

**Restricciones y consideraciones**

* `UNIQUE(codigo)`
* `CHECK(alcance_organizativo IN ('NINGUNO','SERVICIO','DEPARTAMENTO'))`
* desacopla la profesión base de la persona de la jefatura que ejerce
* `alcance_organizativo` orienta validaciones, pero la adscripción concreta a servicio o departamento se resuelve en `ASIGNACION_PERSONAL` según la regla vigente

### PERSONAL

Entidad maestra de personas que pueden participar en la planificación hospitalaria. Contiene datos de identidad y clasificación ocupacional base, sin mezclar información transitoria de asignación o turno.

| Campo | Tipo | PK/FK | Descripción |
| --- | --- | --- | --- |
| id | BIGINT | PK | Identificador único del personal. |
| codigo_personal | VARCHAR(30) | - | Código interno o legajo institucional. |
| nombres | VARCHAR(120) | - | Nombres de la persona. |
| apellido_paterno | VARCHAR(120) | - | Apellido paterno. |
| apellido_materno | VARCHAR(120) | - | Apellido materno. |
| documento_identidad | VARCHAR(30) | - | Documento de identidad oficial. |
| complemento_documento | VARCHAR(20) | - | Complemento del documento si aplica. |
| id_nivel_cargo | BIGINT | FK -> NIVEL_CARGO.id | Cargo vigente de la persona. |
| fecha_ingreso_institucion | DATE | - | Fecha de ingreso institucional. |
| activo | BOOLEAN | - | Estado lógico del personal. |
| created_at | TIMESTAMP | - | Fecha de creación. |
| updated_at | TIMESTAMP | - | Fecha de actualización. |

**Restricciones y consideraciones**

* `UNIQUE(codigo_personal)` recomendado
* `UNIQUE(documento_identidad, complemento_documento)` según política documental
* los atributos administrativos variables en el tiempo no deben residir aquí
* la familia laboral puede derivarse desde `NIVEL_CARGO.id_familia_laboral`, evitando duplicidad en la persona

### SERVICIO_FAMILIA_HABILITADA

Tabla de compatibilidad entre servicios y familias laborales. Permite declarar qué familias profesionales o laborales pueden ser asignadas y planificadas dentro de un servicio determinado. Esto evita codificar en el backend reglas rígidas del tipo "las enfermeras van a enfermería" o "los manuales van a manuales".

| Campo | Tipo | PK/FK | Descripción |
| --- | --- | --- | --- |
| id | BIGINT | PK | Identificador único de la habilitación. |
| id_servicio | BIGINT | FK -> SERVICIO.id | Servicio habilitado. |
| id_familia_laboral | BIGINT | FK -> FAMILIA_LABORAL.id | Familia autorizada para operar en el servicio. |
| observacion | TEXT | - | Justificación o nota operativa. |
| activo | BOOLEAN | - | Estado lógico de la compatibilidad. |
| created_at | TIMESTAMP | - | Fecha de creación. |
| updated_at | TIMESTAMP | - | Fecha de actualización. |

**Restricciones y consideraciones**

* `UNIQUE(id_servicio, id_familia_laboral)`
* permite iniciar con pocos servicios y abrir nuevas compatibilidades sin alterar la estructura
* la validación de asignación debe impedir planificar personas cuya familia no esté habilitada en el servicio

### ASIGNACION_PERSONAL

Representa la relación temporal entre una persona y su contexto organizativo. Es la entidad correcta para modelar rotación, cobertura, contratación aplicada, tipo de ítem vigente, función jerárquica y pertenencia operativa, ya sea dentro de un servicio, a nivel de departamento o en un esquema mixto.

| Campo | Tipo | PK/FK | Descripción |
| --- | --- | --- | --- |
| id | BIGINT | PK | Identificador único de la asignación. |
| id_personal | BIGINT | FK -> PERSONAL.id | Persona asignada. |
| id_servicio | BIGINT | FK -> SERVICIO.id | Servicio donde opera la asignación, nulo si la adscripción es exclusivamente departamental. |
| id_departamento | BIGINT | FK -> DEPARTAMENTO.id | Departamento donde se encuadra la asignación, obligatorio cuando no existe servicio asociado. |
| id_tipo_contrato | BIGINT | FK -> TIPO_CONTRATO.id | Tipo de contrato aplicable a la asignación. |
| id_tipo_item | BIGINT | FK -> TIPO_ITEM.id | Tipo de ítem vigente que determina reglas horarias administrativas. |
| id_carga_horaria | BIGINT | FK -> CARGA_HORARIA.id | Carga horaria visible del Excel para la asignación (`TC`, `MT`). |
| id_rol_funcional | BIGINT | FK -> ROL_FUNCIONAL.id | Función operativa o jerárquica que ejerce dentro del servicio, del departamento o de ambos ámbitos. |
| nro_item | VARCHAR(50) | - | Número de ítem administrativo asociado a la asignación. |
| codigo_fuente_item | VARCHAR(30) | - | Código de fuente administrativa o financiera del ítem. |
| tipo_asignacion | VARCHAR(30) | - | Clasificación operativa de la asignación: `PRINCIPAL`, `ROTACION`, `COBERTURA`, `TEMPORAL`. |
| es_principal | BOOLEAN | - | Indica si la asignación es la principal para la persona. |
| fecha_inicio | DATE | - | Inicio de vigencia de la asignación. |
| fecha_fin | DATE | - | Fin de vigencia, nulo si continúa activa. |
| activo | BOOLEAN | - | Estado lógico de la asignación. |
| created_at | TIMESTAMP | - | Fecha de creación. |
| updated_at | TIMESTAMP | - | Fecha de actualización. |

**Restricciones y consideraciones**

* `CHECK(fecha_fin IS NULL OR fecha_fin >= fecha_inicio)`
* `CHECK(tipo_asignacion IN ('PRINCIPAL','ROTACION','COBERTURA','TEMPORAL'))`
* debe existir al menos uno entre `id_servicio` e `id_departamento`
* si ambos se informan, `id_servicio` debe pertenecer a `id_departamento`
* `UNIQUE(id_personal, id_servicio, id_departamento, fecha_inicio)` recomendado, considerando el tratamiento de nulos del motor
* la superposición temporal de asignaciones para la misma persona debe controlarse por regla de negocio o exclusión temporal
* `id_tipo_item` debe ser obligatorio para toda asignación planificable
* `id_carga_horaria` resuelve la columna visible `C/H` del Excel sin mezclarla con contrato, ítem o reglas de horas
* `codigo_fuente_item` puede mantenerse como dato legado o código externo mientras `TIPO_ITEM` normaliza la política funcional
* solo las asignaciones con `id_servicio` pueden participar en `ROL_TURNO` y planificación mensual por servicio
* la validación de `SERVICIO_FAMILIA_HABILITADA` aplica únicamente cuando `id_servicio` no es nulo
* si `id_rol_funcional` corresponde a `JEFE_SERVICIO`, solo puede existir una asignación activa y vigente de esa jefatura por servicio
* si `id_rol_funcional` corresponde a `JEFE_DEPARTAMENTO`, solo puede existir una asignación activa y vigente de esa jefatura por departamento, con o sin servicio asociado
* este diseño permite que una jefatura departamental esté fuera del servicio hoy y pueda quedar asociada a un servicio en el futuro sin cambiar la tabla

### HISTORIAL_ASIGNACION

Registra eventos relevantes sobre cambios de asignación, servicio, departamento, contrato o estado. No reemplaza `ASIGNACION_PERSONAL`; la complementa como bitácora estructurada.

| Campo | Tipo | PK/FK | Descripción |
| --- | --- | --- | --- |
| id | BIGINT | PK | Identificador del evento histórico. |
| id_asignacion_personal | BIGINT | FK -> ASIGNACION_PERSONAL.id | Asignación afectada. |
| fecha_evento | TIMESTAMP | - | Fecha y hora del evento. |
| tipo_evento | VARCHAR(30) | - | Tipo de cambio: `ALTA`, `ACTUALIZACION`, `TRASLADO`, `CIERRE`, `REACTIVACION`. |
| id_servicio_origen | BIGINT | FK -> SERVICIO.id | Servicio origen, si aplica. |
| id_servicio_destino | BIGINT | FK -> SERVICIO.id | Servicio destino, si aplica. |
| id_departamento_origen | BIGINT | FK -> DEPARTAMENTO.id | Departamento origen, si aplica. |
| id_departamento_destino | BIGINT | FK -> DEPARTAMENTO.id | Departamento destino, si aplica. |
| id_tipo_contrato_origen | BIGINT | FK -> TIPO_CONTRATO.id | Contrato previo, si aplica. |
| id_tipo_contrato_destino | BIGINT | FK -> TIPO_CONTRATO.id | Contrato nuevo, si aplica. |
| id_usuario | BIGINT | FK -> USUARIO.id | Usuario que registró el evento. |
| motivo | TEXT | - | Justificación funcional del cambio. |
| created_at | TIMESTAMP | - | Fecha de persistencia del registro histórico. |

**Restricciones y consideraciones**

* `CHECK(tipo_evento IN ('ALTA','ACTUALIZACION','TRASLADO','CIERRE','REACTIVACION'))`
* la combinación de origen y destino depende del tipo de evento
* esta tabla es clave para trazabilidad administrativa

---

## 3.3 SEGURIDAD

### ROL

Catálogo de roles de seguridad del sistema. Define perfiles funcionales de acceso al backend y a las operaciones del sistema.

| Campo | Tipo | PK/FK | Descripción |
| --- | --- | --- | --- |
| id | BIGINT | PK | Identificador único del rol. |
| codigo | VARCHAR(30) | - | Código único del rol. |
| nombre | VARCHAR(120) | - | Nombre legible del rol. |
| descripcion | TEXT | - | Descripción funcional de permisos. |
| activo | BOOLEAN | - | Estado lógico del rol. |
| created_at | TIMESTAMP | - | Fecha de creación. |
| updated_at | TIMESTAMP | - | Fecha de actualización. |

**Restricciones y consideraciones**

* `UNIQUE(codigo)`
* los permisos detallados pueden evolucionar a un modelo RBAC más granular sin alterar esta entidad base
* para una primera etapa se recomienda definir al menos los roles `ADMIN_SISTEMA`, `RRHH`, `JEFE_DEPARTAMENTO`, `JEFE_SERVICIO` y `PLANIFICADOR`

### USUARIO

Entidad de identidad de aplicación. Un usuario puede estar vinculado o no a una persona del personal hospitalario. En una primera etapa puede autenticarse localmente; en una etapa futura puede representar una identidad validada por un servicio central de login y permisos.

| Campo | Tipo | PK/FK | Descripción |
| --- | --- | --- | --- |
| id | BIGINT | PK | Identificador único del usuario. |
| id_personal | BIGINT | FK -> PERSONAL.id | Personal asociado al usuario, si existe vínculo operativo. |
| id_rol | BIGINT | FK -> ROL.id | Rol funcional local del usuario. Puede usarse como perfil inicial o fallback cuando la autorización no proviene aún de un servicio externo. |
| tipo_usuario | VARCHAR(20) | - | Tipo de usuario: `PERSONAL`, `ADMINISTRATIVO`, `INTEGRACION`. |
| proveedor_autenticacion | VARCHAR(30) | - | Origen de autenticación: `LOCAL`, `AUTH_CENTRAL`, otro proveedor futuro. |
| sujeto_autenticacion | VARCHAR(150) | - | Identificador estable del usuario en el proveedor de autenticación externo. |
| username | VARCHAR(80) | - | Identificador único de acceso. |
| password_hash | VARCHAR(255) | - | Hash seguro de contraseña local. Puede ser nulo cuando la autenticación se delega a un servicio externo. |
| ultimo_acceso_at | TIMESTAMP | - | Fecha y hora del último acceso exitoso. |
| activo | BOOLEAN | - | Estado lógico del usuario. |
| created_at | TIMESTAMP | - | Fecha de creación. |
| updated_at | TIMESTAMP | - | Fecha de actualización. |

**Restricciones y consideraciones**

* `UNIQUE(username)`
* `UNIQUE(id_personal)` recomendado cuando cada persona debe tener a lo sumo una cuenta
* la gestión de credenciales debe seguir estándares de seguridad del backend
* `CHECK(tipo_usuario IN ('PERSONAL','ADMINISTRATIVO','INTEGRACION'))`
* `UNIQUE(proveedor_autenticacion, sujeto_autenticacion)` recomendado cuando `sujeto_autenticacion` no sea nulo
* `password_hash` debería ser obligatorio solo si `proveedor_autenticacion = 'LOCAL'`
* para integrarse a futuro con un microservicio general de login, este sistema debería tratar `USUARIO` como proyección local de identidad y no como autoridad final de permisos

### ESTRATEGIA DE LOGIN Y PERMISOS A FUTURO

El diseño actual soporta un login local inicial, pero debe prepararse para evolucionar a un esquema donde la autenticación y la autorización se resuelvan en un servicio central externo.

**Etapa 1: login independiente**

* el sistema autentica con `username` y `password_hash`
* el permiso operativo puede resolverse con `USUARIO.id_rol`
* la auditoría referencia al `USUARIO` local que ejecutó la acción

**Etapa 2: login por microservicio o servicio central**

* el sistema recibe o valida la identidad a través de un servicio externo de autenticación
* el permiso para ejecutar una operación se consulta al servicio central antes de procesar cambios o peticiones sensibles
* `USUARIO` permanece como representación local de la identidad conocida por este sistema
* `sujeto_autenticacion` permite vincular la cuenta local con la identidad global del ecosistema
* `id_rol` puede mantenerse como perfil local auxiliar, pero no debería asumirse como autoridad única de permisos si existe validación externa

**Criterio recomendado**

* diseñar el backend para que la verificación de permisos sea desacoplable del almacenamiento local
* evitar que la lógica crítica dependa exclusivamente de `password_hash` o `id_rol`
* exigir validación externa previa en operaciones como crear asignaciones, publicar planificaciones, aprobar cambios de turno o cerrar períodos, cuando el servicio central exista

### GOBIERNO DE ASIGNACIONES

La asignación de personal no debe tratarse como una acción libre del planificador de turnos. `ASIGNACION_PERSONAL` expresa una relación administrativa y operativa con impacto en planificación, auditoría, jefaturas, compatibilidad de servicio y cálculo de horas. Por ello debe existir un gobierno explícito de quién solicita, quién aprueba y quién ejecuta la asignación.

| Rol sugerido | Puede solicitar | Puede aprobar | Puede ejecutar en `ASIGNACION_PERSONAL` | Alcance recomendado |
| --- | --- | --- | --- | --- |
| `ADMIN_SISTEMA` | Sí | Sí | Sí | Soporte excepcional, parametrización y contingencias. |
| `RRHH` | Sí | Sí | Sí | Alta, actualización, traslado, cierre y reactivación formal de asignaciones. |
| `JEFE_DEPARTAMENTO` | Sí | Sí | No, salvo política institucional expresa | Movimientos entre servicios de su departamento y validación de jefaturas departamentales. |
| `JEFE_SERVICIO` | Sí | No | No | Solicita incorporación, retiro, cobertura o rotación dentro de su servicio. |
| `PLANIFICADOR` | No | No | No | Utiliza asignaciones vigentes para construir `PLANIFICACION` y `ROL_TURNO`. |

**Criterio recomendado para empezar**

* la creación y modificación formal de `ASIGNACION_PERSONAL` debería quedar en manos de `RRHH` o `ADMIN_SISTEMA`
* `JEFE_SERVICIO` debería proponer o solicitar movimientos, pero no ejecutarlos directamente en la base
* `JEFE_DEPARTAMENTO` debería aprobar movimientos que afecten su estructura, especialmente traslados entre servicios y jefaturas departamentales
* `PLANIFICADOR` debería trabajar solo con asignaciones ya vigentes y aprobadas

### FLUJO RECOMENDADO DE ASIGNACIÓN

Se recomienda el siguiente flujo mínimo antes de construir la base de datos y el backend:

1. El responsable operativo detecta la necesidad.
   Puede ser ingreso de personal, rotación, cobertura, reemplazo, designación de jefatura o retiro de una persona de un servicio.
2. `JEFE_SERVICIO` o `JEFE_DEPARTAMENTO` registra la solicitud.
   La solicitud debe indicar persona, motivo, ámbito organizativo, fechas, tipo de asignación y rol funcional esperado.
3. `JEFE_DEPARTAMENTO` valida la necesidad funcional cuando la solicitud afecta a un servicio del departamento o a una jefatura.
4. `RRHH` revisa consistencia administrativa.
   Debe verificar contrato, tipo de ítem, cargo vigente, familia laboral, jefaturas activas y vigencia temporal.
5. `RRHH` o `ADMIN_SISTEMA` ejecuta la asignación en `ASIGNACION_PERSONAL`.
   Esta es la acción formal que habilita o inhabilita su uso en la planificación.
6. El sistema registra la trazabilidad en `HISTORIAL_ASIGNACION`.
   Debe quedar quién hizo el cambio, cuándo lo hizo y cuál fue el motivo.
7. Si la asignación tiene `id_servicio`, recién entonces queda disponible para `PLANIFICACION` y `ROL_TURNO`.

### REGLAS DE AUTORIZACIÓN RECOMENDADAS

* una asignación nueva con `id_servicio` debe validar compatibilidad entre servicio y familia laboral antes de persistirse
* una asignación exclusivamente departamental no debe quedar visible para programación diaria en `ROL_TURNO`
* un cambio de `id_servicio`, `id_departamento`, `id_tipo_item`, `id_rol_funcional` o vigencia debe generar un registro en `HISTORIAL_ASIGNACION`
* la designación de `JEFE_SERVICIO` debe exigir verificación de unicidad activa por servicio
* la designación de `JEFE_DEPARTAMENTO` debe exigir verificación de unicidad activa por departamento
* el cierre de una asignación no debe borrar historial ni filas previas relacionadas

---

## 3.4 PLANIFICACIÓN

### CALENDARIO

Dimensión temporal reutilizable para todo el sistema. Centraliza atributos de fecha requeridos para planificación, reglas horarias, feriados y reportes.

| Campo | Tipo | PK/FK | Descripción |
| --- | --- | --- | --- |
| id | BIGINT | PK | Identificador único del día calendario. |
| fecha | DATE | - | Fecha exacta. |
| anio | SMALLINT | - | Año calendario. |
| mes | SMALLINT | - | Mes calendario. |
| dia_mes | SMALLINT | - | Número de día dentro del mes. |
| dia_semana_num | SMALLINT | - | Número del día de semana. |
| dia_semana_nombre | VARCHAR(20) | - | Nombre o abreviatura del día de semana. |
| semana_mes | SMALLINT | - | Semana ordinal dentro del mes. |
| es_fin_semana | BOOLEAN | - | Indica si la fecha cae en fin de semana. |
| es_feriado | BOOLEAN | - | Indica si la fecha es feriado. |
| nombre_feriado | VARCHAR(150) | - | Nombre del feriado, si aplica. |

**Restricciones y consideraciones**

* `UNIQUE(fecha)`
* `CHECK(mes BETWEEN 1 AND 12)`
* `CHECK(dia_mes BETWEEN 1 AND 31)`
* el valor de `dia_semana_num` debe seguir una convención establecida por backend

### PLANIFICACION

Encabezado de una planificación mensual por servicio. Controla el ciclo de vida del rol, su versión, origen y responsables de publicación y cierre.

| Campo | Tipo | PK/FK | Descripción |
| --- | --- | --- | --- |
| id | BIGINT | PK | Identificador único de la planificación. |
| id_servicio | BIGINT | FK -> SERVICIO.id | Servicio al que pertenece la planificación. |
| anio | SMALLINT | - | Año de planificación. |
| mes | SMALLINT | - | Mes de planificación. |
| version | INTEGER | - | Versión de la planificación dentro del mismo servicio y período. |
| estado | VARCHAR(20) | - | Estado del rol: `BORRADOR`, `PUBLICADO`, `CERRADO`. |
| fecha_inicio | DATE | - | Fecha inicial del período planificado. |
| fecha_fin | DATE | - | Fecha final del período planificado. |
| id_plantilla_planificacion | BIGINT | FK -> PLANTILLA_PLANIFICACION.id | Plantilla desde la cual se generó, si aplica. |
| id_usuario_creador | BIGINT | FK -> USUARIO.id | Usuario que creó la planificación. |
| id_usuario_publicador | BIGINT | FK -> USUARIO.id | Usuario que publicó la planificación. |
| fecha_publicacion | TIMESTAMP | - | Fecha y hora de publicación. |
| id_usuario_cierre | BIGINT | FK -> USUARIO.id | Usuario que cerró la planificación. |
| fecha_cierre | TIMESTAMP | - | Fecha y hora de cierre. |
| created_at | TIMESTAMP | - | Fecha de creación. |
| updated_at | TIMESTAMP | - | Fecha de actualización. |

**Restricciones y consideraciones**

* `CHECK(mes BETWEEN 1 AND 12)`
* `CHECK(estado IN ('BORRADOR','PUBLICADO','CERRADO'))`
* `CHECK(fecha_fin >= fecha_inicio)`
* `UNIQUE(id_servicio, anio, mes, version)`
* se recomienda una regla adicional para permitir solo una versión vigente por servicio y período

---

## 3.5 OPERACIÓN

### TIPO_DIA

Catálogo de estados diarios no equivalentes a un turno concreto. Se utiliza para representar descanso, vacación, licencia, baja médica u otros estados operativos o administrativos del día.

| Campo | Tipo | PK/FK | Descripción |
| --- | --- | --- | --- |
| id | BIGINT | PK | Identificador único del tipo de día. |
| codigo | VARCHAR(30) | - | Código único del tipo de día. |
| nombre | VARCHAR(120) | - | Nombre funcional del tipo de día. |
| descripcion | TEXT | - | Descripción operativa. |
| es_laborable | BOOLEAN | - | Indica si el estado se considera laborable. |
| genera_horas_trabajadas | BOOLEAN | - | Indica si el tipo de día produce horas efectivamente trabajadas. |
| computa_para_meta_horas | BOOLEAN | - | Indica si el tipo de día impacta la meta mensual de horas esperadas. |
| requiere_respaldo | BOOLEAN | - | Indica si requiere documento o aprobación de respaldo. |
| activo | BOOLEAN | - | Vigencia lógica del tipo de día. |
| created_at | TIMESTAMP | - | Fecha de creación. |
| updated_at | TIMESTAMP | - | Fecha de actualización. |

**Restricciones y consideraciones**

* `UNIQUE(codigo)`
* `UNIQUE(nombre)` recomendado
* esta tabla debe contener estados institucionales oficiales y no abreviaturas ambiguas

### TIPO_TURNO

Catálogo conceptual de clases de turno. No define el horario exacto; define la categoría operativa reutilizable entre servicios.

| Campo | Tipo | PK/FK | Descripción |
| --- | --- | --- | --- |
| id | BIGINT | PK | Identificador único del tipo de turno. |
| codigo | VARCHAR(30) | - | Código único del tipo de turno, por ejemplo `M`, `T`, `N`. |
| nombre | VARCHAR(120) | - | Nombre legible del tipo de turno. |
| descripcion | TEXT | - | Significado funcional del turno. |
| orden_visual | SMALLINT | - | Orden sugerido para visualización. |
| activo | BOOLEAN | - | Estado lógico del catálogo. |
| created_at | TIMESTAMP | - | Fecha de creación. |
| updated_at | TIMESTAMP | - | Fecha de actualización. |

**Restricciones y consideraciones**

* `UNIQUE(codigo)`
* `orden_visual` facilita renderización consistente en frontend y reportes

### TURNO

Turno concreto programable dentro de un servicio. Define horario real, duración y vigencia operativa.

| Campo | Tipo | PK/FK | Descripción |
| --- | --- | --- | --- |
| id | BIGINT | PK | Identificador único del turno concreto. |
| id_servicio | BIGINT | FK -> SERVICIO.id | Servicio al que pertenece el turno. |
| id_tipo_turno | BIGINT | FK -> TIPO_TURNO.id | Categoría conceptual del turno. |
| codigo | VARCHAR(30) | - | Código único del turno dentro del servicio. |
| nombre | VARCHAR(120) | - | Nombre descriptivo del turno. |
| hora_inicio | TIME | - | Hora de inicio programada. |
| hora_fin | TIME | - | Hora de fin programada. |
| cruza_medianoche | BOOLEAN | - | Indica si el turno termina en el día siguiente. |
| duracion_horas | DECIMAL(5,2) | - | Duración total del turno en horas. |
| vigencia_desde | DATE | - | Inicio de vigencia del turno. |
| vigencia_hasta | DATE | - | Fin de vigencia del turno, nulo si está vigente. |
| activo | BOOLEAN | - | Estado lógico del turno. |
| created_at | TIMESTAMP | - | Fecha de creación. |
| updated_at | TIMESTAMP | - | Fecha de actualización. |

**Restricciones y consideraciones**

* `CHECK(vigencia_hasta IS NULL OR vigencia_hasta >= vigencia_desde)`
* `CHECK(duracion_horas > 0)`
* `UNIQUE(id_servicio, codigo, vigencia_desde)`
* `cruza_medianoche` es obligatorio para cálculo consistente de horas y continuidad temporal
* la duración puede derivarse de las horas, pero se almacena para consistencia operativa y desempeño de consulta

### ROL_TURNO

Tabla transaccional principal del sistema. Cada fila representa una asignación operativa puntual dentro de una planificación, asociada a una persona, un día y una secuencia dentro del día. Permite tanto turnos concretos como tipos de día, pero nunca ambos simultáneamente en la misma fila.

| Campo | Tipo | PK/FK | Descripción |
| --- | --- | --- | --- |
| id | BIGINT | PK | Identificador único del registro operativo. |
| id_planificacion | BIGINT | FK -> PLANIFICACION.id | Planificación a la que pertenece el registro. |
| id_asignacion_personal | BIGINT | FK -> ASIGNACION_PERSONAL.id | Asignación operativa de la persona, obligatoriamente con servicio cuando se usa en planificación. |
| id_calendario | BIGINT | FK -> CALENDARIO.id | Día calendario programado. |
| secuencia_dia | SMALLINT | - | Orden del registro dentro del mismo día para la misma persona. |
| id_turno | BIGINT | FK -> TURNO.id | Turno concreto asignado. Nulo si se trata de un tipo de día. |
| id_tipo_dia | BIGINT | FK -> TIPO_DIA.id | Tipo de día asignado. Nulo si se trata de un turno. |
| horas_programadas | DECIMAL(5,2) | - | Horas efectivamente imputadas al registro. |
| origen_registro | VARCHAR(20) | - | Procedencia del registro: `MANUAL`, `PLANTILLA`, `AJUSTE`, `CAMBIO`. |
| created_by | BIGINT | FK -> USUARIO.id | Usuario que generó el registro. |
| created_at | TIMESTAMP | - | Fecha de creación. |
| updated_by | BIGINT | FK -> USUARIO.id | Usuario que realizó la última modificación. |
| updated_at | TIMESTAMP | - | Fecha de última actualización. |

**Restricciones y consideraciones**

* `CHECK(secuencia_dia >= 1)`
* `CHECK(horas_programadas >= 0)`
* `CHECK(origen_registro IN ('MANUAL','PLANTILLA','AJUSTE','CAMBIO'))`
* `CHECK((id_turno IS NOT NULL AND id_tipo_dia IS NULL) OR (id_turno IS NULL AND id_tipo_dia IS NOT NULL))`
* `UNIQUE(id_planificacion, id_asignacion_personal, id_calendario, secuencia_dia)`
* se recomienda índice compuesto por `(id_planificacion, id_asignacion_personal, id_calendario)`
* para filas con `id_tipo_dia`, se recomienda una restricción adicional que impida coexistencia con otros registros del mismo día para la misma persona
* la consistencia entre `PLANIFICACION.id_servicio`, `ASIGNACION_PERSONAL.id_servicio` y `TURNO.id_servicio` debe validarse a nivel de aplicación o trigger
* una asignación sin `id_servicio` no debe poder generar filas en `ROL_TURNO`

**Explicación funcional adicional**

`ROL_TURNO` es la entidad que permite resolver el requerimiento de múltiples turnos por día sin duplicar la estructura de planificación. Si una persona tiene dos turnos el mismo día, se registran dos filas con distinta `secuencia_dia`. Si una persona tiene una incidencia no laboral como `VACACION` o `BAJA_MEDICA`, se registra una sola fila con `id_tipo_dia` y `id_turno` nulo. Si el día está en blanco en estado borrador, el sistema puede no persistir fila alguna; una vez publicado, se recomienda explicitar el estado con `TIPO_DIA` si corresponde.

---

## 3.6 FUTURO, PERO YA MODELADO

### COBERTURA_TURNO

Permite definir la cantidad mínima, objetivo y máxima de personal requerido por turno y servicio, incluyendo condiciones especiales por día de semana o feriado.

| Campo | Tipo | PK/FK | Descripción |
| --- | --- | --- | --- |
| id | BIGINT | PK | Identificador único de la regla de cobertura. |
| id_servicio | BIGINT | FK -> SERVICIO.id | Servicio al que aplica la cobertura. |
| id_turno | BIGINT | FK -> TURNO.id | Turno concreto al que aplica la cobertura. |
| dia_semana_num | SMALLINT | - | Día de semana específico, nulo si aplica a cualquier día. |
| es_feriado | BOOLEAN | - | Indica si la regla aplica exclusivamente a feriados o no feriados; nulo si es indiferente. |
| cantidad_minima | SMALLINT | - | Cobertura mínima exigida. |
| cantidad_objetivo | SMALLINT | - | Cobertura ideal planificada. |
| cantidad_maxima | SMALLINT | - | Límite máximo permitido, si aplica. |
| vigencia_desde | DATE | - | Inicio de vigencia de la regla. |
| vigencia_hasta | DATE | - | Fin de vigencia, nulo si continúa vigente. |
| created_at | TIMESTAMP | - | Fecha de creación. |
| updated_at | TIMESTAMP | - | Fecha de actualización. |

**Restricciones y consideraciones**

* `CHECK(cantidad_minima >= 0)`
* `CHECK(cantidad_objetivo >= cantidad_minima)`
* `CHECK(cantidad_maxima IS NULL OR cantidad_maxima >= cantidad_objetivo)`
* `CHECK(vigencia_hasta IS NULL OR vigencia_hasta >= vigencia_desde)`
* índice recomendado sobre `(id_servicio, id_turno, vigencia_desde, vigencia_hasta)`

### REGLA_HORAS

Define metas, mínimos y máximos de horas mensuales bajo distintos ámbitos de aplicación. Permite parametrizar políticas por servicio, familia laboral, cargo, tipo de contrato y tipo de ítem.

| Campo | Tipo | PK/FK | Descripción |
| --- | --- | --- | --- |
| id | BIGINT | PK | Identificador único de la regla horaria. |
| id_servicio | BIGINT | FK -> SERVICIO.id | Servicio al que aplica la regla, nulo si es general. |
| id_familia_laboral | BIGINT | FK -> FAMILIA_LABORAL.id | Familia laboral a la que aplica la regla, nulo si no restringe por familia. |
| id_nivel_cargo | BIGINT | FK -> NIVEL_CARGO.id | Cargo al que aplica la regla, nulo si no restringe por cargo. |
| id_tipo_contrato | BIGINT | FK -> TIPO_CONTRATO.id | Tipo de contrato al que aplica la regla, nulo si no restringe por contrato. |
| id_tipo_item | BIGINT | FK -> TIPO_ITEM.id | Tipo de ítem al que aplica la regla, nulo si no restringe por ítem. |
| horas_objetivo_mes | DECIMAL(6,2) | - | Meta mensual estándar de horas. |
| horas_min_mes | DECIMAL(6,2) | - | Mínimo aceptable de horas trabajadas. |
| horas_max_mes | DECIMAL(6,2) | - | Máximo permitido de horas trabajadas. |
| tolerancia_extra_mes | DECIMAL(6,2) | - | Tolerancia permitida por encima de la meta. |
| vigencia_desde | DATE | - | Inicio de vigencia de la regla. |
| vigencia_hasta | DATE | - | Fin de vigencia, nulo si sigue activa. |
| activo | BOOLEAN | - | Estado lógico de la regla. |
| created_at | TIMESTAMP | - | Fecha de creación. |
| updated_at | TIMESTAMP | - | Fecha de actualización. |

**Restricciones y consideraciones**

* `CHECK(horas_objetivo_mes >= 0 AND horas_min_mes >= 0 AND horas_max_mes >= 0 AND tolerancia_extra_mes >= 0)`
* `CHECK(horas_min_mes <= horas_objetivo_mes AND horas_objetivo_mes <= horas_max_mes)`
* `CHECK(vigencia_hasta IS NULL OR vigencia_hasta >= vigencia_desde)`
* debe existir al menos un ámbito de aplicación entre servicio, familia laboral, cargo, tipo de contrato o tipo de ítem
* `id_nivel_cargo` debe ser consistente con `id_familia_laboral` cuando ambos estén informados
* para casos como `IDH=120`, `TGN=120`, `FP=144`, la regla mínima debe resolverse prioritariamente por `id_tipo_item`
* cuando varias reglas sean aplicables, debe definirse una precedencia funcional. Se recomienda: `servicio + tipo_item + cargo` -> `servicio + tipo_item + familia_laboral` -> `servicio + tipo_item` -> `tipo_item` -> reglas generales

### PLANTILLA_PLANIFICACION

Define plantillas reutilizables para generar nuevas planificaciones a partir de una planificación base previamente validada y cerrada.

| Campo | Tipo | PK/FK | Descripción |
| --- | --- | --- | --- |
| id | BIGINT | PK | Identificador único de la plantilla. |
| id_servicio | BIGINT | FK -> SERVICIO.id | Servicio al que corresponde la plantilla. |
| id_planificacion_base | BIGINT | FK -> PLANIFICACION.id | Planificación cerrada que sirve como base estructural. |
| nombre | VARCHAR(150) | - | Nombre funcional de la plantilla. |
| version | INTEGER | - | Versión de la plantilla. |
| descripcion | TEXT | - | Descripción de uso de la plantilla. |
| activa | BOOLEAN | - | Estado lógico de la plantilla. |
| created_by | BIGINT | FK -> USUARIO.id | Usuario que registró la plantilla. |
| created_at | TIMESTAMP | - | Fecha de creación. |
| updated_at | TIMESTAMP | - | Fecha de actualización. |

**Restricciones y consideraciones**

* `UNIQUE(id_servicio, nombre, version)`
* `id_planificacion_base` debería referenciar solo planificaciones en estado `CERRADO`
* la clonación de detalle operativo se resuelve copiando filas válidas de `ROL_TURNO` desde la planificación base

### CAMBIO_TURNO

Registra solicitudes y ejecuciones de cambios posteriores a la programación inicial. Soporta intercambio, reemplazo, reasignación, cancelación o edición operativa.

| Campo | Tipo | PK/FK | Descripción |
| --- | --- | --- | --- |
| id | BIGINT | PK | Identificador único del cambio de turno. |
| id_planificacion | BIGINT | FK -> PLANIFICACION.id | Planificación afectada. |
| tipo_cambio | VARCHAR(30) | - | Tipo de cambio: `INTERCAMBIO`, `REEMPLAZO`, `REASIGNACION`, `CANCELACION`, `EDICION`. |
| fecha_operacion | TIMESTAMP | - | Fecha y hora en que se aplica o registra el cambio. |
| id_rol_turno_origen | BIGINT | FK -> ROL_TURNO.id | Registro original afectado. |
| id_rol_turno_destino | BIGINT | FK -> ROL_TURNO.id | Registro resultante o contraparte, si aplica. |
| id_asignacion_personal_origen | BIGINT | FK -> ASIGNACION_PERSONAL.id | Persona origen del cambio. |
| id_asignacion_personal_destino | BIGINT | FK -> ASIGNACION_PERSONAL.id | Persona destino del cambio, si aplica. |
| id_usuario_solicitante | BIGINT | FK -> USUARIO.id | Usuario que solicitó el cambio. |
| id_usuario_aprobador | BIGINT | FK -> USUARIO.id | Usuario que aprobó o rechazó el cambio. |
| estado | VARCHAR(20) | - | Estado del cambio: `PENDIENTE`, `APROBADO`, `RECHAZADO`, `APLICADO`, `CANCELADO`. |
| motivo | TEXT | - | Justificación funcional del cambio. |
| created_at | TIMESTAMP | - | Fecha de creación. |
| updated_at | TIMESTAMP | - | Fecha de actualización. |

**Restricciones y consideraciones**

* `CHECK(tipo_cambio IN ('INTERCAMBIO','REEMPLAZO','REASIGNACION','CANCELACION','EDICION'))`
* `CHECK(estado IN ('PENDIENTE','APROBADO','RECHAZADO','APLICADO','CANCELADO'))`
* la semántica de origen y destino depende del tipo de cambio
* esta tabla no reemplaza `ROL_TURNO`; documenta la transición entre estados operativos

---

## 3.7 OBSERVACIONES

### OBSERVACION

Observación operativa diaria. Puede referenciar un registro específico de `ROL_TURNO` y, adicionalmente, mantener contexto diario por persona y fecha para soportar escenarios de multi-turno.

| Campo | Tipo | PK/FK | Descripción |
| --- | --- | --- | --- |
| id | BIGINT | PK | Identificador único de la observación diaria. |
| id_planificacion | BIGINT | FK -> PLANIFICACION.id | Planificación donde ocurre la observación. |
| id_asignacion_personal | BIGINT | FK -> ASIGNACION_PERSONAL.id | Persona observada dentro del servicio. |
| id_calendario | BIGINT | FK -> CALENDARIO.id | Día calendario relacionado. |
| id_rol_turno | BIGINT | FK -> ROL_TURNO.id | Registro operativo específico, nulo si la observación es general del día. |
| tipo_observacion | VARCHAR(30) | - | Clasificación funcional de la observación. |
| descripcion | TEXT | - | Contenido de la observación. |
| created_by | BIGINT | FK -> USUARIO.id | Usuario que registró la observación. |
| created_at | TIMESTAMP | - | Fecha de creación. |

**Restricciones y consideraciones**

* `CHECK(tipo_observacion IN ('OPERATIVA','ADMINISTRATIVA','CLINICA','SISTEMA'))` recomendado
* índice recomendado sobre `(id_planificacion, id_asignacion_personal, id_calendario)`
* `id_rol_turno` es opcional para soportar observaciones generales del día en escenarios con múltiples turnos

### OBSERVACION_MENSUAL

Observación consolidada o comentario global sobre una persona dentro de una planificación mensual.

| Campo | Tipo | PK/FK | Descripción |
| --- | --- | --- | --- |
| id | BIGINT | PK | Identificador único de la observación mensual. |
| id_planificacion | BIGINT | FK -> PLANIFICACION.id | Planificación de referencia. |
| id_asignacion_personal | BIGINT | FK -> ASIGNACION_PERSONAL.id | Persona a la que aplica la observación. |
| tipo_observacion | VARCHAR(30) | - | Clasificación funcional de la observación. |
| descripcion | TEXT | - | Observación global del período mensual. |
| created_by | BIGINT | FK -> USUARIO.id | Usuario que registró la observación. |
| created_at | TIMESTAMP | - | Fecha de creación. |

**Restricciones y consideraciones**

* índice recomendado sobre `(id_planificacion, id_asignacion_personal)`
* no sustituye a `OBSERVACION`; su alcance es mensual y consolidado

---

# 4. Relaciones del Modelo

## 4.1 Cardinalidades principales

* `DEPARTAMENTO 1:N SERVICIO`
* `DEPARTAMENTO 1:N ASIGNACION_PERSONAL`
* `FAMILIA_LABORAL 1:N NIVEL_CARGO`
* `NIVEL_CARGO 1:N PERSONAL`
* `SERVICIO 1:N SERVICIO_FAMILIA_HABILITADA`
* `FAMILIA_LABORAL 1:N SERVICIO_FAMILIA_HABILITADA`
* `PERSONAL 1:N ASIGNACION_PERSONAL`
* `TIPO_CONTRATO 1:N ASIGNACION_PERSONAL`
* `TIPO_ITEM 1:N ASIGNACION_PERSONAL`
* `ROL_FUNCIONAL 1:N ASIGNACION_PERSONAL`
* `SERVICIO 1:N ASIGNACION_PERSONAL` para asignaciones con ámbito de servicio
* `ASIGNACION_PERSONAL 1:N HISTORIAL_ASIGNACION`
* `ROL 1:N USUARIO`
* `PERSONAL 1:0..1 USUARIO`
* `SERVICIO 1:N PLANIFICACION`
* `SERVICIO 1:N TURNO`
* `TIPO_TURNO 1:N TURNO`
* `CALENDARIO 1:N ROL_TURNO`
* `PLANIFICACION 1:N ROL_TURNO`
* `ASIGNACION_PERSONAL 1:N ROL_TURNO`
* `TIPO_DIA 1:N ROL_TURNO`
* `TURNO 1:N ROL_TURNO`
* `PLANIFICACION 1:N OBSERVACION`
* `PLANIFICACION 1:N OBSERVACION_MENSUAL`
* `ROL_TURNO 1:N OBSERVACION` en el caso de observaciones específicas de un turno
* `SERVICIO 1:N COBERTURA_TURNO`
* `TURNO 1:N COBERTURA_TURNO`
* `SERVICIO 1:N REGLA_HORAS`
* `FAMILIA_LABORAL 1:N REGLA_HORAS`
* `NIVEL_CARGO 1:N REGLA_HORAS`
* `TIPO_CONTRATO 1:N REGLA_HORAS`
* `TIPO_ITEM 1:N REGLA_HORAS`
* `SERVICIO 1:N PLANTILLA_PLANIFICACION`
* `PLANIFICACION 1:N CAMBIO_TURNO`

## 4.2 Dependencias relevantes

### Turno dependiente del servicio

`TURNO` depende de `SERVICIO` porque el horario real no es global. `TIPO_TURNO` solo aporta la categoría conceptual reutilizable.

### Persona operativa depende de asignación

La relación operativa para planificar no se hace directamente con `PERSONAL`, sino con `ASIGNACION_PERSONAL`. Esto permite que una misma persona tenga distintas asignaciones temporales o concurrentes según cobertura, rotación o reemplazo, manteniendo además su tipo de ítem vigente y su rol funcional dentro del servicio, del departamento o en ambos niveles.

### Compatibilidad entre familia laboral y servicio

La asignación operativa debe respetar la compatibilidad declarada en `SERVICIO_FAMILIA_HABILITADA` cuando exista `id_servicio`. De este modo, una categoría de enfermería puede habilitarse para `SERVICIO ENFERMERIA`, mientras personal manual puede habilitarse para `SERVICIO MANUALES`, sin codificar reglas fijas en la estructura.

### Asignación organizativa flexible

`ASIGNACION_PERSONAL` permite tres escenarios con la misma tabla: adscripción a servicio, adscripción a departamento sin servicio y adscripción mixta. Esto deja preparado el sistema para reglas institucionales que hoy ubican ciertas jefaturas fuera del servicio, pero que mañana podrían reubicarlas dentro de uno.

### Rol operativo depende de planificación, asignación y calendario

Cada fila de `ROL_TURNO` existe dentro de una `PLANIFICACION`, para una `ASIGNACION_PERSONAL` y un `CALENDARIO`. El día no se modela como texto libre ni como columna dinámica.

### Tipo de día y turno son mutuamente excluyentes por fila

La fila de `ROL_TURNO` debe representar o bien un turno concreto o bien un tipo de día. Esta decisión evita inconsistencias como registrar una vacación y un turno en la misma fila.

## 4.3 Decisiones relacionales importantes

* la dimensión `CALENDARIO` centraliza atributos de fecha y evita recalcular feriados o días de semana en cada consulta
* la versión en `PLANIFICACION` permite coexistencia controlada de borradores y revisiones
* `CAMBIO_TURNO` y `HISTORIAL_ASIGNACION` separan trazabilidad funcional de la operación principal
* las reglas parametrizables (`COBERTURA_TURNO`, `REGLA_HORAS`) se modelan fuera del núcleo transaccional para no acoplar política y ejecución
* `FAMILIA_LABORAL` y `ROL_FUNCIONAL` separan la profesión base de la responsabilidad jerárquica
* `ASIGNACION_PERSONAL` admite anclaje organizativo flexible sin exigir que toda persona operativa pertenezca siempre a un servicio

---

# 5. Reglas de Negocio Implementadas

El modelo refleja explícitamente las siguientes reglas de negocio:

* una persona puede pertenecer a un servicio, a un departamento o a ambos mediante `ASIGNACION_PERSONAL`
* toda asignación planificable puede portar un `TIPO_ITEM` que determina la política horaria aplicable
* una familia laboral puede agrupar múltiples cargos concretos, por ejemplo distintas categorías de enfermería
* un servicio puede declarar qué familias laborales admite mediante `SERVICIO_FAMILIA_HABILITADA`
* una jefatura de servicio debe ser única por servicio y una jefatura de departamento debe ser única por departamento dentro de la vigencia activa
* una jefatura departamental puede existir fuera de un servicio hoy y quedar asociada a un servicio si las reglas institucionales cambian después
* una persona puede tener múltiples turnos el mismo día mediante `ROL_TURNO.secuencia_dia`
* un día puede representar trabajo o incidencia no laboral, gracias a la exclusión entre `id_turno` e `id_tipo_dia`
* los turnos dependen del servicio mediante la tabla `TURNO`
* un turno puede cruzar medianoche mediante `TURNO.cruza_medianoche`
* las horas diarias se almacenan por registro en `ROL_TURNO.horas_programadas`
* las horas mensuales, faltantes y extras se calculan agregando `ROL_TURNO` y contrastando con `REGLA_HORAS`, pudiendo priorizar el tipo de ítem por encima de reglas generales
* las observaciones diarias y mensuales se registran de manera independiente sin contaminar las tablas transaccionales principales
* las planificaciones son mensuales por servicio y tienen estados controlados
* el sistema puede generar una planificación a partir de una plantilla referenciando una planificación base
* los cambios posteriores al rol quedan trazados en `CAMBIO_TURNO`
* los cambios administrativos de relación persona-contexto organizativo quedan trazados en `HISTORIAL_ASIGNACION`

---

# 6. Consideraciones de Escalabilidad

## 6.1 Crecimiento de servicios

El modelo admite alta de nuevos servicios sin afectar la estructura central. Cada nuevo servicio puede definir sus propios turnos concretos, reglas horarias, coberturas y plantillas sin requerir tablas nuevas ni alteración de integridad histórica.

Además, con `SERVICIO_FAMILIA_HABILITADA` cada servicio puede abrirse inicialmente a pocas familias laborales y ampliarse después sin refactorizar asignaciones ni planificaciones existentes.

Las asignaciones puramente departamentales no obligan a crear servicios artificiales, lo que evita distorsionar la estructura al comienzo.

## 6.2 Crecimiento de tipos de turno y tipos de día

La incorporación de nuevos códigos operativos o incidencias no laborales se resuelve agregando registros a `TIPO_TURNO`, `TIPO_DIA` y, cuando corresponda, nuevos `TURNO` por servicio y vigencia. El modelo no asume un conjunto cerrado de códigos.

## 6.3 Escalado de reglas

Las reglas futuras se encuentran desacopladas del detalle operativo. Nuevas políticas de cobertura o de carga horaria pueden incorporarse como nuevas filas en `COBERTURA_TURNO` y `REGLA_HORAS`, incluso con vigencias diferenciadas en el tiempo y con ámbitos por tipo de ítem, familia laboral o cargo. Esto evita cambios destructivos sobre el histórico existente.

## 6.4 Escalado de volumen transaccional

`ROL_TURNO` será la tabla de mayor crecimiento. Para entornos de alto volumen se recomienda:

* índices por `id_planificacion`, `id_asignacion_personal`, `id_calendario`
* particionamiento lógico o físico por año y mes si el motor lo soporta
* vistas materializadas o tablas derivadas para reportes mensuales intensivos
* control de actualización concurrente durante procesos de publicación o cierre

## 6.5 Escalado de auditoría

La separación entre tablas maestras, transaccionales e históricas permite ampliar la trazabilidad sin alterar la operación primaria. Esto habilita futuras integraciones con bitácoras de seguridad, flujos de aprobación o firma electrónica.

---

# 7. Decisiones Críticas de Diseño

## 7.1 Separar tipo de día y turno

Se tomó esta decisión para evitar modelar descanso, vacación o baja médica como si fueran turnos. La separación mejora la consistencia de cálculo y evita que reglas de cobertura y reglas de ausencia compitan sobre el mismo atributo.

## 7.2 Permitir multi-turno por día

La operación hospitalaria requiere cubrir extensiones, apoyos y combinaciones en una misma fecha. Restringir una persona a una sola fila por día generaría pérdida de información o codificaciones ambiguas. `ROL_TURNO.secuencia_dia` resuelve este escenario sin romper normalización.

## 7.3 Diferenciar turno conceptual y turno concreto

No basta con un catálogo simple de `M`, `T` y `N`. El sistema necesita distinguir entre el concepto operativo del turno y su horario real por servicio. Por ello `TIPO_TURNO` modela la semántica y `TURNO` modela la implementación concreta y vigente.

## 7.4 Planificar sobre asignación y no directamente sobre persona

La entidad correcta para programar es `ASIGNACION_PERSONAL`, no `PERSONAL`. Esta decisión permite que una misma persona tenga distintas pertenencias operativas en el tiempo y evita mezclar identidad con disponibilidad organizativa.

## 7.5 Versionar la planificación mensual

La planificación no debe sobrescribirse sin control. La columna `version` en `PLANIFICACION` permite mantener borradores, revisiones y cierres con trazabilidad funcional, algo indispensable para auditoría y análisis de cambios.

## 7.6 Registrar historial estructurado

`HISTORIAL_ASIGNACION` y `CAMBIO_TURNO` existen porque el histórico funcional no debe inferirse únicamente a partir de `updated_at`. La trazabilidad hospitalaria exige saber qué cambió, quién lo hizo, cuándo lo hizo y por qué motivo.

## 7.7 Separar familia laboral, cargo y función jerárquica

No conviene mezclar en una sola tabla la profesión base, la categoría concreta y la jefatura organizativa. `FAMILIA_LABORAL` permite agrupar por labor, `NIVEL_CARGO` define la categoría específica y `ROL_FUNCIONAL` expresa si la persona actúa como asistencial, jefa de servicio o jefa de departamento.

## 7.8 Modelar el tipo de ítem como dimensión de regla

La meta o mínimo de horas no debe quedar enterrada en texto libre. `TIPO_ITEM` formaliza la dimensión administrativa y `REGLA_HORAS` resuelve la política vigente de horas por ítem, servicio, familia o cargo. Esto cubre casos reales como `IDH`, `TGN` y `FP` sin endurecer la lógica del backend.

## 7.9 Permitir adscripción dentro o fuera del servicio

No todas las funciones organizativas viven siempre dentro de un servicio. Por eso `ASIGNACION_PERSONAL` permite adscribir una persona a un servicio, a un departamento o a ambos. Esta decisión evita crear estructuras falsas para las jefaturas departamentales y conserva flexibilidad si mañana cambian las reglas internas.

---

# 8. Posibles Mejoras Futuras

El modelo propuesto es suficiente como base de desarrollo backend, pero puede evolucionar con los siguientes módulos o mejoras:

* motor de validación de reglas configurables por servicio, cargo y período
* integración con control de asistencia para contrastar programación vs ejecución real
* módulo de disponibilidad, preferencias o restricciones de personal
* módulo de aprobación multinivel para cambios de turno y publicación de planificaciones
* dimensionamiento avanzado de cobertura con niveles de criticidad por servicio
* trazabilidad de documentos de respaldo para licencias, bajas o permisos
* reportes materializados de carga horaria mensual y proyección de cobertura
* estrategias de particionamiento y archivado histórico para grandes volúmenes

---

# Conclusión

El modelo de datos aquí definido está diseñado para representar fielmente la operación hospitalaria del rol de turnos, evitando dependencias con estructuras de Excel y priorizando integridad, trazabilidad, normalización y escalabilidad. La estructura resultante es apta para servir como base directa de desarrollo backend, construcción de migraciones, definición de entidades ORM y diseño de servicios transaccionales y analíticos.
### CARGA_HORARIA

Catálogo formal para la columna visible `C/H` del rol mensual. Su objetivo es separar la carga horaria administrativa del tipo de contrato, del tipo de ítem y de las reglas horarias.

Valores iniciales previstos para Enfermería Fase 1:

* `TC` = Tiempo Completo = `6` horas por día
* `MT` = Medio Tiempo = `3` horas por día

Esta tabla no reemplaza `REGLA_HORAS`. `REGLA_HORAS` sigue representando metas, mínimos y máximos mensuales; `CARGA_HORARIA` solo identifica la etiqueta administrativa visible en la hoja tipo Excel.
