import { ForbiddenException } from '@nestjs/common';
import type { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import type { ConfiguracionOperativaServicioRepository } from '../../../planificacion/domain/repositories/configuracion-operativa-servicio.repository';
import type { ConfiguracionOperativaDepartamento } from '../../../planificacion/domain/entities/configuracion-operativa-servicio';
import type { GuardarConfiguracionOperativaServicioDto } from '../dto/guardar-configuracion-operativa-servicio.dto';
import { OperacionAccessPolicyService } from './helpers/operacion-access-policy.service';
import { GuardarConfiguracionOperativaDepartamentoUseCase } from './guardar-configuracion-operativa-departamento.use-case';

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

const inputMock: GuardarConfiguracionOperativaServicioDto = {
  modoVisual: 'ETIQUETAS',
  permiteMultiRegistroDia: false,
  usaEquivalenciaHorariaExportacion: false,
  codigos: [],
};

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

describe('GuardarConfiguracionOperativaDepartamentoUseCase', () => {
  const guardarConfiguracionDepartamentoMock = jest
    .fn()
    .mockResolvedValue(configuracionMock);
  const repositoryMock = {
    guardarConfiguracionDepartamento: guardarConfiguracionDepartamentoMock,
  } as unknown as ConfiguracionOperativaServicioRepository;
  const useCase = new GuardarConfiguracionOperativaDepartamentoUseCase(
    repositoryMock,
    new OperacionAccessPolicyService(),
  );

  it('permite a un jefe de departamento guardar la configuracion de su propio departamento', async () => {
    const actor = buildActor({
      departamentosGestionables: [
        { id: 5, codigo: 'ENF', nombre: 'Enfermeria' },
      ],
    });

    await expect(useCase.execute(actor, 5, inputMock)).resolves.toBeDefined();
    expect(guardarConfiguracionDepartamentoMock).toHaveBeenCalledWith(
      expect.objectContaining({ idDepartamento: 5 }),
    );
  });

  it('rechaza guardar la configuracion de un departamento fuera de alcance, incluso si coincide con un id de servicio gestionable', async () => {
    const actor = buildActor({
      departamentosGestionables: [
        { id: 5, codigo: 'ENF', nombre: 'Enfermeria' },
      ],
      serviciosGestionables: [{ id: 7, idDepartamento: 5 }],
    } as Partial<UsuarioSesionResponseDto>);

    await expect(useCase.execute(actor, 7, inputMock)).rejects.toThrow(
      ForbiddenException,
    );
  });
});
