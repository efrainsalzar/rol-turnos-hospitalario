import { ForbiddenException } from '@nestjs/common';
import type { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import type { ConfiguracionOperativaServicioRepository } from '../../../planificacion/domain/repositories/configuracion-operativa-servicio.repository';
import type { ConfiguracionOperativaDepartamento } from '../../../planificacion/domain/entities/configuracion-operativa-servicio';
import { OperacionAccessPolicyService } from './helpers/operacion-access-policy.service';
import { ObtenerConfiguracionOperativaDepartamentoUseCase } from './obtener-configuracion-operativa-departamento.use-case';

function buildActor(
  overrides: Partial<UsuarioSesionResponseDto>,
): UsuarioSesionResponseDto {
  return {
    id: 1,
    username: 'jefe.departamento',
    tipoUsuario: 'ADMINISTRATIVO',
    proveedorAutenticacion: 'LOCAL',
    sujetoAutenticacion: 'jefe.departamento',
    identidadLocalHabilitada: true,
    activo: true,
    rolSeguridad: {
      id: 1,
      codigo: 'JEFE_DEPARTAMENTO',
      nombre: 'Jefe de departamento',
    },
    personal: { id: null, codigoPersonal: null, nombreCompleto: null },
    alcancePlanificacion: 'DEPARTAMENTO',
    puedeGestionarPlanificacion: false,
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
    departamentosGestionables: [],
    serviciosGestionables: [],
    ...overrides,
  };
}

const configuracionMock: ConfiguracionOperativaDepartamento = {
  id: 1,
  idDepartamento: 5,
  codigoDepartamento: 'ENF',
  nombreDepartamento: 'Enfermeria',
  modoVisualDefault: 'ETIQUETAS',
  permiteMultiRegistroDia: false,
  usaEquivalenciaHorariaExportacion: false,
  codigosPermitidos: [],
};

describe('ObtenerConfiguracionOperativaDepartamentoUseCase', () => {
  const obtenerPorDepartamentoMock = jest
    .fn()
    .mockResolvedValue(configuracionMock);
  const repositoryMock = {
    obtenerPorDepartamento: obtenerPorDepartamentoMock,
  } as unknown as ConfiguracionOperativaServicioRepository;
  const useCase = new ObtenerConfiguracionOperativaDepartamentoUseCase(
    repositoryMock,
    new OperacionAccessPolicyService(),
  );

  it('permite a un jefe de departamento ver la configuracion de su propio departamento', async () => {
    const actor = buildActor({
      departamentosGestionables: [
        { id: 5, codigo: 'ENF', nombre: 'Enfermeria' },
      ],
    });

    await expect(useCase.execute(actor, 5)).resolves.toBeDefined();
  });

  it('rechaza ver la configuracion de un departamento fuera de alcance, incluso si coincide con un id de servicio gestionable', async () => {
    const actor = buildActor({
      departamentosGestionables: [
        { id: 5, codigo: 'ENF', nombre: 'Enfermeria' },
      ],
      serviciosGestionables: [{ id: 7, idDepartamento: 5 }],
    } as Partial<UsuarioSesionResponseDto>);

    await expect(useCase.execute(actor, 7)).rejects.toThrow(ForbiddenException);
  });
});
