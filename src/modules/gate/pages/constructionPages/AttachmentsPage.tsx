import { CONSTRUCTION_FLOW } from '../../constants/entryFlowConfig';
import SharedAttachmentsPage from '../shared/SharedAttachmentsPage';

export default function AttachmentsPage() {
  return (
    <SharedAttachmentsPage
      config={CONSTRUCTION_FLOW}
      requiredDocumentLabel="Bill / Invoice Document"
      requiredDocumentDescription="Vendor bill, invoice, challan, or construction purchase document"
      requiredDocumentError="Bill upload is required before review."
    />
  );
}
