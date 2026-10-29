import {
  ApartmentOutlined,
  CalendarOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  SafetyOutlined,
  ScheduleOutlined,
  SettingOutlined,
  SolutionOutlined,
  SwapOutlined,
  TeamOutlined,
  UserOutlined
} from '@ant-design/icons';

const icons = {
  ApartmentOutlined,
  CalendarOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  SafetyOutlined,
  ScheduleOutlined,
  SettingOutlined,
  SolutionOutlined,
  SwapOutlined,
  TeamOutlined,
  UserOutlined
};

const system = {
  id: 'group-roles-turnos-system',
  title: 'Sistema',
  type: 'group',
  children: [
    {
      id: 'system-health',
      title: 'Health',
      type: 'item',
      url: '/sistema/health',
      icon: icons.DatabaseOutlined,
      permission: 'puedeGestionarUsuarios'
    }
  ]
};

const organizacion = {
  id: 'group-roles-turnos-organizacion',
  title: 'Organizacion',
  type: 'group',
  children: [
    {
      id: 'organizacion-departamentos',
      title: 'Departamentos',
      type: 'item',
      url: '/organizacion/departamentos',
      icon: icons.ApartmentOutlined,
      permission: 'puedeVerOrganizacion',
      globalOnly: true
    },
    {
      id: 'organizacion-servicios',
      title: 'Servicios',
      type: 'item',
      url: '/organizacion/servicios',
      matchRegexes: ['^/organizacion/servicios$', '^/organizacion/servicios/\\d+$'],
      icon: icons.ApartmentOutlined,
      permission: 'puedeVerOrganizacion'
    }
  ]
};

const personal = {
  id: 'group-roles-turnos-personal',
  title: 'Personal',
  type: 'group',
  children: [
    {
      id: 'personal-listado',
      title: 'Personal',
      type: 'item',
      url: '/personal',
      matchRegexes: ['^/personal$', '^/personal/\\d+$'],
      icon: icons.TeamOutlined,
      permission: 'puedeVerPersonal'
    },
    {
      id: 'personal-asignaciones',
      title: 'Asignaciones',
      type: 'item',
      url: '/personal/asignaciones',
      icon: icons.SwapOutlined,
      permission: 'puedeVerAsignaciones'
    },
    {
      id: 'personal-catalogos',
      title: 'Cargos',
      type: 'item',
      url: '/personal/catalogos',
      matchRegexes: ['^/personal/catalogos(/.*)?$'],
      icon: icons.SolutionOutlined,
      anyOf: [{ permission: 'puedeGestionarPersonal' }, { permission: 'puedeVerOperacion', capability: 'verCargasHorarias' }]
    }
  ]
};

const seguridad = {
  id: 'group-roles-turnos-seguridad',
  title: 'Seguridad',
  type: 'group',
  children: [
    {
      id: 'seguridad-roles',
      title: 'Roles',
      type: 'item',
      url: '/seguridad/roles',
      icon: icons.SafetyOutlined,
      permission: 'puedeVerSeguridad'
    },
    {
      id: 'seguridad-usuarios',
      title: 'Usuarios',
      type: 'item',
      url: '/seguridad/usuarios',
      icon: icons.UserOutlined,
      permission: 'puedeVerSeguridad'
    }
  ]
};

const operacion = {
  id: 'group-roles-turnos-operacion',
  title: 'Operacion',
  type: 'group',
  children: [
    {
      id: 'operacion-calendarios',
      title: 'Calendarios',
      type: 'item',
      url: '/operacion/calendarios',
      matchRegexes: ['^/operacion/calendarios(/.*)?$'],
      icon: icons.CalendarOutlined,
      permission: 'puedeVerOperacion',
      capabilities: ['verCalendarios', 'verIncidenciasPersonales']
    },
    {
      id: 'operacion-configuracion-servicio',
      title: 'Horarios',
      type: 'item',
      url: '/operacion/configuracion-servicio',
      icon: icons.SettingOutlined,
      permission: 'puedeVerOperacion',
      capability: 'verTurnos'
    }
  ]
};

const planificacion = {
  id: 'group-roles-turnos-planificacion',
  title: 'Planificacion',
  type: 'group',
  children: [
    {
      id: 'planificacion-planificaciones',
      title: 'Planificacion Mensual',
      type: 'item',
      url: '/planificacion/planificaciones',
      matchRegexes: ['^/planificacion/planificaciones$', '^/planificacion/detalle/\\d+$', '^/planificacion/matriz/\\d+$'],
      icon: icons.ScheduleOutlined,
      permission: 'puedeVerPlanificacion'
    }
  ]
};

const reportes = {
  id: 'group-roles-turnos-reportes',
  title: 'Reportes',
  type: 'group',
  children: [
    {
      id: 'reportes-rol-personal',
      title: 'Reportes',
      type: 'item',
      url: '/reportes/rol-personal',
      icon: icons.FileTextOutlined,
      permission: 'puedeVerReportes'
    }
  ]
};

export { system, organizacion, personal, seguridad, operacion, planificacion, reportes };
