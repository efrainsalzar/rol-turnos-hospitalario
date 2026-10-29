import { ForbiddenException } from '@nestjs/common';
import type { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import type { ConfiguracionOperativaServicioRepository } from '../../../planificacion/domain/repositories/configuracion-operativa-servicio.repository';
import type { ConfiguracionOperativaServicio } from '../../../planificacion/domain/entities/configuracion-operativa-servicio';
import type { GuardarConfiguracionOperativaServicioDto } from '../dto/guardar-configuracion-operativa-servicio.dto';
import { OperacionAccessPolicyService } from './helpers/operacion-access-policy.service';
import { GuardarConfiguracionOperativaServicioUseCase } from './guardar-configuracion-operativa-servicio.use-case';

function buildActor(
  overrides: Partial<UsuarioSesionResponseDto>,
): UsuarioSesionResponseDto {
  return {
    id: 1,
    username: 'jefe.servicio',
    tipoUsuario: 'ADMINISTRATIVO',
    proveedorAutenticacion: 'LOCAL',
    sujetoAutenticacion: 'jefe.servicio',
    identidadLocalHabilitada: true,
    activo: true,
    rolSeguridad: {
      id: 1,
      codigo: 'JEFE_SERVICIO',
      nombre: 'Jefe de servicio',
    },
    personal: { id: null, codigoPersonal: null, nombreCompleto: null },
    alcancePlanificacion: 'SERVICIO',
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

const configuracionMock: ConfiguracionOperativaServicio = {
  id: 1,
  idServicio: 10,
  codigoServicio: 'URG',
  nombreServicio: 'Urgencias',
  modoVisualDefault: 'ETIQUETAS',
  permiteMultiRegistroDia: false,
  usaEquivalenciaHorariaExportacion: false,
  codigosPermitidos: [],
};

describe('GuardarConfiguracionOperativaServicioUseCase', () => {
  const guardarConfiguracionServicioMock = jest
    .fn()
    .mockResolvedValue(configuracionMock);
  const repositoryMock = {
    guardarConfiguracionServicio: guardarConfiguracionServicioMock,
  } as unknown as ConfiguracionOperativaServicioRepository;
  const useCase = new GuardarConfiguracionOperativaServicioUseCase(
    repositoryMock,
    new OperacionAccessPolicyService(),
  );

  beforeEach(() => {
    guardarConfiguracionServicioMock.mockClear();
  });

  it('permite a un jefe de servicio guardar la configuracion de su propio servicio', async () => {
    const actor = buildActor({
      serviciosGestionables: [
        {
          id: 10,
          idDepartamento: 1,
          codigo: 'URG',
          nombre: 'Urgencias',
          codigoDepartamento: 'ENF',
          nombreDepartamento: 'Enfermeria',
        },
      ],
    });

    await expect(useCase.execute(actor, 10, inputMock)).resolves.toBeDefined();
    expect(guardarConfiguracionServicioMock).toHaveBeenCalledWith(
      expect.objectContaining({ idServicio: 10 }),
    );
  });

  it('rechaza guardar la configuracion de un servicio fuera de alcance', async () => {
    const actor = buildActor({
      serviciosGestionables: [
        {
          id: 10,
          idDepartamento: 1,
          codigo: 'URG',
          nombre: 'Urgencias',
          codigoDepartamento: 'ENF',
          nombreDepartamento: 'Enfermeria',
        },
      ],
    });

    await expect(useCase.execute(actor, 99, inputMock)).rejects.toThrow(
      ForbiddenException,
    );
    expect(guardarConfiguracionServicioMock).not.toHaveBeenCalled();
  });
});
