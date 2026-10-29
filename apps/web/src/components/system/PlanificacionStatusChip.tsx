import StatusChip from 'components/system/StatusChip';

import type { EstadoPlanificacion } from 'types/api';

export default function PlanificacionStatusChip({ estado }: { estado: EstadoPlanificacion }) {
  return <StatusChip status={estado} />;
}
