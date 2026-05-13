import { RAW_MATERIAL_FLOW } from '../../constants/entryFlowConfig';
import SharedDashboard from '../shared/SharedDashboard';
import { RAW_MATERIAL_STATUS_CONFIG } from '../shared/dashboardStatusConfig';

export default function RawMaterialsDashboard() {
  return <SharedDashboard config={RAW_MATERIAL_FLOW} statusConfig={RAW_MATERIAL_STATUS_CONFIG} />;
}
