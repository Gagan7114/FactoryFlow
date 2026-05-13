import { MAINTENANCE_FLOW } from '../../constants/entryFlowConfig';
import SharedAttachmentsPage from '../shared/SharedAttachmentsPage';

export default function AttachmentsPage() {
  return (
    <SharedAttachmentsPage
      config={MAINTENANCE_FLOW}
      requiredDocumentLabel="Bill / Invoice Document"
      requiredDocumentDescription="Supplier bill, service invoice, or maintenance purchase document"
      requiredDocumentError="Bill upload is required before review."
    />
  );
}
