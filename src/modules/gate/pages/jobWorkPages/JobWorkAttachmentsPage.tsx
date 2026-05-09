import { JOB_WORK_FLOW } from '../../constants/entryFlowConfig';
import SharedAttachmentsPage from '../shared/SharedAttachmentsPage';

export default function JobWorkAttachmentsPage() {
  return <SharedAttachmentsPage config={JOB_WORK_FLOW} requireGatepass />;
}
