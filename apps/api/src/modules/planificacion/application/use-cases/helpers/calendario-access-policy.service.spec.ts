import { ForbiddenException } from '@nestjs/common';
import type { UsuarioSesionResponseDto } from '../../../../seguridad/application/dto/usuario-sesion-response.dto';
import { CalendarioAccessPolicyService } from './calendario-access-policy.service';

describe('CalendarioAccessPolicyService', () => {
  const service = new CalendarioAccessPolicyService();

  function buildActor(
    capacidades: Partial<UsuarioSesionResponseDto['capacidades']>,
    overrides: Partial<UsuarioSesionResponseDto> = {},
  ): UsuarioSesionResponseDto {
    return {
      id: 1,
      username: 'jefe.servicio',
      tipoUsuario: 'ASISTENCIAL',
      proveedorAutenticacion: 'LOCAL',
      sujetoAutenticacion: 'jefe.servicio',
      identidadLocalHabilitada: true,
      activo: true,
      rolSeguridad: {
        id: 2,
        codigo: 'JEFE_SERVICIO',
        nombre: 'Jefe de Servicio',
      },
      personal: {
        id: 10,
        codigoPersonal: 'PER-010',
        nombreCompleto: 'Ana Diaz',
      },
      alcancePlanificacion: 'SERVICIO',
      puedeGestionarPlanificacion: true,
      puedeGestionarTodo: false,
      permisos: {
        puedeVerOrganizacion: true,
        puedeVerPersonal: true,
        puedeGestionarPersonal: false,
        puedeVerAsignaciones: true,
        puedeGestionarAsignaciones: false,
        puedeVerSeguridad: false,
        puedeGestionarUsuarios: false,
        puedeVerOperacion: true,
        puedeVerPlanificacion: true,
        puedeEditarPlanificacion: true,
        puedeAprobarPlanificacion: false,
        puedeVerReportes: false,
      },
      capacidades: capacidades as UsuarioSesionResponseDto['capacidades'],
      departamentosGestionables: [],
      serviciosGestionables: [],
      ...overrides,
    };
  }

  it('assertPuedeGestionarCalendario permite cuando gestionarCalendarios es true y el actor es de alcance SISTEMA', () => {
    const actor = buildActor(
      { gestionarCalendarios: true },
      { alcancePlanificacion: 'SISTEMA', puedeGestionarTodo: true },
    );

    expect(() => service.assertPuedeGestionarCalendario(actor)).not.toThrow();
  });

  it('assertPuedeGestionarCalendario rechaza cuando gestionarCalendarios es false', () => {
    const actor = buildActor(
      { gestionarCalendarios: false },
      { alcancePlanificacion: 'SISTEMA', puedeGestionarTodo: true },
    );

    expect(() => service.assertPuedeGestionarCalendario(actor)).toThrow(
      ForbiddenException,
    );
  });

  it('assertPuedeGestionarCalendario rechaza a un jefe de servicio/departamento aunque tenga la capacidad activa (catalogo global, exige alcance SISTEMA)', () => {
    const actor = buildActor({ gestionarCalendarios: true });

    expect(() => service.assertPuedeGestionarCalendario(actor)).toThrow(
      ForbiddenException,
    );
  });

  it('assertPuedeGestionarTiposFeriado permite cuando gestionarTiposFeriado es true y el actor es de alcance SISTEMA', () => {
    const actor = buildActor(
      { gestionarTiposFeriado: true },
      { alcancePlanificacion: 'SISTEMA', puedeGestionarTodo: true },
    );

    expect(() => service.assertPuedeGestionarTiposFeriado(actor)).not.toThrow();
  });

  it('assertPuedeGestionarTiposFeriado rechaza cuando gestionarTiposFeriado es false, aun con gestionarCalendarios en true', () => {
    const actor = buildActor(
      {
        gestionarCalendarios: true,
        gestionarTiposFeriado: false,
      },
      { alcancePlanificacion: 'SISTEMA', puedeGestionarTodo: true },
    );

    expect(() => service.assertPuedeGestionarTiposFeriado(actor)).toThrow(
      ForbiddenException,
    );
  });

  it('assertPuedeGestionarTiposFeriado rechaza a un jefe de servicio/departamento aunque tenga la capacidad activa (catalogo global, exige alcance SISTEMA)', () => {
    const actor = buildActor({ gestionarTiposFeriado: true });

    expect(() => service.assertPuedeGestionarTiposFeriado(actor)).toThrow(
      ForbiddenException,
    );
  });
});
