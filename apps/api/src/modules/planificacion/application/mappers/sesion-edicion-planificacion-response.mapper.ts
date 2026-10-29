import type { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import { SesionEdicionPlanificacion } from '../../domain/entities/sesion-edicion-planificacion';
import {
  obtenerEtiquetaCortaRol,
  puedeTomarControl,
} from '../use-cases/helpers/jerarquia-edicion-planificacion.helper';
import { SesionEdicionPlanificacionResponseDto } from '../dto/sesion-edicion-planificacion-response.dto';

export function mapSesionEdicionToResponse(
  actor: UsuarioSesionResponseDto,
  sesion: SesionEdicionPlanificacion | null,
): SesionEdicionPlanificacionResponseDto {
  if (!sesion) {
    return {
      ocupada: false,
      codigoRolEditor: null,
      etiquetaRolEditor: null,
      adquiridoEn: null,
      ultimoLatido: null,
      esPropia: false,
      puedeTomarControl: true,
    };
  }

  const esPropia = sesion.idUsuarioEditor === actor.id;

  return {
    ocupada: true,
    codigoRolEditor: sesion.codigoRolEditor,
    etiquetaRolEditor: obtenerEtiquetaCortaRol(sesion.codigoRolEditor),
    adquiridoEn: sesion.adquiridoEn.toISOString(),
    ultimoLatido: sesion.ultimoLatido.toISOString(),
    esPropia,
    puedeTomarControl:
      !esPropia && puedeTomarControl(actor, sesion.codigoRolEditor),
  };
}
