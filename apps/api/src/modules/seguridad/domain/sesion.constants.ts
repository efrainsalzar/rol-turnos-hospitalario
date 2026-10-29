// Duracion de una sesion, tanto para el claim `exp` del JWT como para
// `sesion_usuario.expires_at` en base de datos — una sola fuente de verdad
// para que ambos mecanismos de expiracion no queden desincronizados.
export const SESSION_DURATION_HOURS = 12;
