# Colores Operativos Unificados para Matriz, Vista Previa y Excel

## Objetivo

Usar una sola fuente de verdad para los colores operativos del servicio en:

- matriz web
- vista previa imprimible
- exportacion Excel color

La fuente oficial es:

- `dbo.codigo_operativo_servicio.color`

## Regla de asignacion por defecto

Cuando se crea un turno nuevo para un servicio, el sistema asigna automaticamente un color suave si ese codigo operativo todavia no tiene uno.

Paleta base:

1. `#E8F4FD`
2. `#EAF7E9`
3. `#FFF4DB`
4. `#FCEBEC`
5. `#F2ECFF`
6. `#E8FAF6`
7. `#FFF0F6`
8. `#EEF2FF`
9. `#F9F6E8`
10. `#EAF1F8`

Reglas:

- el color ya configurado se conserva
- dentro del mismo servicio se intenta usar un color no repetido
- si la paleta se agota, el sistema reutiliza la paleta desde el inicio

## Dominancia visual

### Cabecera de la columna

1. `feriado`
2. `fin de semana`
3. normal

Si un feriado cae en fin de semana, domina el estado de feriado.

### Celda del personal

1. incidencia personal
2. color del turno configurado
3. color base de feriado
4. color base de fin de semana
5. blanco

Esto significa:

- si una columna es feriado y la persona tiene turno, domina el color del turno
- si una columna es feriado y la persona tiene una incidencia personal, domina la incidencia
- el color de columna sigue ayudando a leer la matriz, pero no tapa el significado principal de la celda

## Paleta base unificada

- cabecera normal del mes: `#EDF4FB`
- cabecera de fin de semana: `#EEF1F4`
- cabecera de feriado: `#FDF1C7`
- celda base de fin de semana: `#F4F6F8`
- celda base de feriado: `#FFF7CC`
- incidencia personal: `#E6FBF5`
- texto de incidencia: `#0F766E`
- texto de feriado: `#846400`

## Modo sin color

Cuando la exportacion usa `estilo=texto`:

- los turnos no usan color de fondo
- las incidencias tampoco fuerzan color semantico
- los feriados conservan un resalte gris suave para no perder lectura visual

Escala usada:

- cabecera feriado sin color: `#D9D9D9`
- celda feriado sin color: `#EFEFEF`

Ademas, el encabezado del dia feriado se compacta en dos lineas:

- `30` arriba y `FN` abajo
- `15` arriba y `FI` abajo

## Alcance actual

Esta regla ya aplica o debe mantenerse alineada en:

- matriz web
- vista previa HTML imprimible
- Excel color

La exportacion en blanco y negro conserva la misma logica semantica, pero sin depender del color de fondo.
