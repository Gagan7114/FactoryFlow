import { DAILY_NEED_FLOW } from '../../constants/entryFlowConfig';
import SharedAttachmentsPage from '../shared/SharedAttachmentsPage';

export default function AttachmentsPage() {
  return (
    <SharedAttachmentsPage
      config={DAILY_NEED_FLOW}
      requiredDocumentLabel="Bill / Invoice Document"
      requiredDocumentDescription="Supplier bill, invoice, or purchase document"
      requiredDocumentError="Bill upload is required before review."
    />
  );
}
