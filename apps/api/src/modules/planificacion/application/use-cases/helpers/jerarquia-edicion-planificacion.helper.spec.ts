import type { UsuarioSesionResponseDto } from '../../../../seguridad/application/dto/usuario-sesion-response.dto';
import {
  obtenerRangoEdicion,
  obtenerRangoEdicionPorCodigoRol,
  puedeTomarControl,
} from './jerarquia-edicion-planificacion.helper';

function buildActor(codigoRol: string | null): UsuarioSesionResponseDto {
  return {
    id: 1,
    username: 'actor',
    rolSeguridad: { id: 1, codigo: codigoRol, nombre: codigoRol },
  } as UsuarioSesionResponseDto;
}

describe('jerarquia-edicion-planificacion.helper', () => {
  it('ordena el rango ADMIN_SISTEMA > RRHH > JEFE_DEPARTAMENTO > JEFE_SERVICIO', () => {
    const rangoAdmin = obtenerRangoEdicionPorCodigoRol('ADMIN_SISTEMA');
    const rangoRrhh = obtenerRangoEdicionPorCodigoRol('RRHH');
    const rangoJefeDepartamento =
      obtenerRangoEdicionPorCodigoRol('JEFE_DEPARTAMENTO');
    const rangoJefeServicio = obtenerRangoEdicionPorCodigoRol('JEFE_SERVICIO');

    expect(rangoAdmin).toBeGreaterThan(rangoRrhh);
    expect(rangoRrhh).toBeGreaterThan(rangoJefeDepartamento);
    expect(rangoJefeDepartamento).toBeGreaterThan(rangoJefeServicio);
  });

  it('un rol desconocido o nulo queda en el rango mas bajo (0)', () => {
    expect(obtenerRangoEdicionPorCodigoRol('ROL_INEXISTENTE')).toBe(0);
    expect(obtenerRangoEdicionPorCodigoRol(null)).toBe(0);
    expect(obtenerRangoEdicion(buildActor(null))).toBe(0);
  });

  it('RRHH puede tomar el control de JEFE_DEPARTAMENTO y JEFE_SERVICIO, pero no de ADMIN_SISTEMA', () => {
    const rrhh = buildActor('RRHH');

    expect(puedeTomarControl(rrhh, 'JEFE_DEPARTAMENTO')).toBe(true);
    expect(puedeTomarControl(rrhh, 'JEFE_SERVICIO')).toBe(true);
    expect(puedeTomarControl(rrhh, 'ADMIN_SISTEMA')).toBe(false);
  });

  it('JEFE_DEPARTAMENTO puede tomar el control de JEFE_SERVICIO, pero no de RRHH ni ADMIN_SISTEMA', () => {
    const jefeDepartamento = buildActor('JEFE_DEPARTAMENTO');

    expect(puedeTomarControl(jefeDepartamento, 'JEFE_SERVICIO')).toBe(true);
    expect(puedeTomarControl(jefeDepartamento, 'RRHH')).toBe(false);
    expect(puedeTomarControl(jefeDepartamento, 'ADMIN_SISTEMA')).toBe(false);
  });

  it('JEFE_SERVICIO no puede tomar el control de ningun rango superior', () => {
    const jefeServicio = buildActor('JEFE_SERVICIO');

    expect(puedeTomarControl(jefeServicio, 'JEFE_DEPARTAMENTO')).toBe(false);
    expect(puedeTomarControl(jefeServicio, 'RRHH')).toBe(false);
    expect(puedeTomarControl(jefeServicio, 'ADMIN_SISTEMA')).toBe(false);
  });

  it('un actor puede tomar el control de otro con su mismo rango (ej. dos ADMIN_SISTEMA distintos)', () => {
    const admin = buildActor('ADMIN_SISTEMA');

    expect(puedeTomarControl(admin, 'ADMIN_SISTEMA')).toBe(true);
  });

  it('ADMIN_SISTEMA puede tomar el control de cualquier rango, incluido RRHH', () => {
    const admin = buildActor('ADMIN_SISTEMA');

    expect(puedeTomarControl(admin, 'RRHH')).toBe(true);
    expect(puedeTomarControl(admin, 'JEFE_DEPARTAMENTO')).toBe(true);
    expect(puedeTomarControl(admin, 'JEFE_SERVICIO')).toBe(true);
  });
});
