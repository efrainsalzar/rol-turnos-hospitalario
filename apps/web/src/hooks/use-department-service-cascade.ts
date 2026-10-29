import { useEffect, useMemo } from 'react';

type DepartmentLike = {
  id: number;
  nombre: string;
};

type ServiceLike = {
  id: number;
  idDepartamento: number;
  nombre: string;
};

type CascadeOptions = {
  departments: DepartmentLike[];
  services: ServiceLike[];
  selectedDepartmentId: string;
  selectedServiceId: string;
  setSelectedDepartmentId: (value: string) => void;
  setSelectedServiceId: (value: string) => void;
  autoSelectDepartment?: boolean;
  autoSelectService?: boolean;
};

export function useDepartmentServiceCascade({
  departments,
  services,
  selectedDepartmentId,
  selectedServiceId,
  setSelectedDepartmentId,
  setSelectedServiceId,
  autoSelectDepartment = true,
  autoSelectService = true
}: CascadeOptions) {
  const defaultDepartmentId = departments[0] ? String(departments[0].id) : '';
  const defaultServiceId = services[0] ? String(services[0].id) : '';

  useEffect(() => {
    if (!departments.length) {
      if (selectedDepartmentId) {
        setSelectedDepartmentId('');
      }
      if (selectedServiceId) {
        setSelectedServiceId('');
      }
      return;
    }

    const selectedExists = departments.some((item) => String(item.id) === selectedDepartmentId);
    if (!selectedDepartmentId || !selectedExists) {
      if (autoSelectDepartment) {
        setSelectedDepartmentId(defaultDepartmentId);
      } else if (selectedDepartmentId) {
        setSelectedDepartmentId('');
      }
    }
  }, [
    autoSelectDepartment,
    defaultDepartmentId,
    departments,
    selectedDepartmentId,
    selectedServiceId,
    setSelectedDepartmentId,
    setSelectedServiceId
  ]);

  // La validez del servicio elegido depende unicamente de si sigue presente
  // en `services` (cada pantalla ya lo acota al departamento elegido, o lo
  // deja completo cuando el departamento esta en "Todos"). No se usa
  // `selectedDepartmentId` como condicion aparte: antes, un departamento en
  // "Todos" (string vacio, estado valido cuando autoSelectDepartment=false)
  // hacia que este efecto borrara cualquier servicio elegido apenas se
  // seleccionaba, porque el chequeo de "sin departamento" se disparaba en
  // cada render sin importar si el servicio elegido era valido.
  useEffect(() => {
    if (!services.length) {
      if (selectedServiceId) {
        setSelectedServiceId('');
      }
      return;
    }

    const selectedExists = services.some((item) => String(item.id) === selectedServiceId);
    if (!selectedServiceId || !selectedExists) {
      if (autoSelectService) {
        setSelectedServiceId(defaultServiceId);
      } else if (selectedServiceId) {
        setSelectedServiceId('');
      }
    }
  }, [autoSelectService, defaultServiceId, selectedServiceId, services, setSelectedServiceId]);

  const departmentHelperText = useMemo(() => {
    if (!departments.length) {
      return 'Sin departamentos disponibles.';
    }
    return 'Selecciona el departamento base para acotar los servicios.';
  }, [departments]);

  const serviceHelperText = useMemo(() => {
    if (!departments.length) {
      return 'Sin departamento disponible.';
    }
    if (!selectedDepartmentId) {
      return 'Primero selecciona un departamento.';
    }
    if (!services.length) {
      return 'Sin servicios para el departamento seleccionado.';
    }
    return 'Solo se muestran servicios del departamento seleccionado.';
  }, [departments, selectedDepartmentId, services]);

  const servicePlaceholderLabel = useMemo(() => {
    if (!departments.length) {
      return 'Sin departamento';
    }
    if (!selectedDepartmentId) {
      return 'Selecciona departamento';
    }
    if (!services.length) {
      return 'Sin servicios';
    }
    return 'Todos';
  }, [departments, selectedDepartmentId, services]);

  return {
    departmentHelperText,
    serviceHelperText,
    servicePlaceholderLabel,
    hasDepartments: departments.length > 0,
    hasServices: services.length > 0
  };
}
