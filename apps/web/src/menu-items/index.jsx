// project import
import { operacion, organizacion, personal, planificacion, reportes, seguridad, system } from './roles-turnos-system';

// ==============================|| MENU ITEMS ||============================== //

const menuItems = {
  items: [system, organizacion, personal, seguridad, operacion, planificacion, reportes]
};

export default menuItems;
