import { BST_OUT_FLOW } from '../../constants/entryFlowConfig';
import SharedAttachmentsPage from '../shared/SharedAttachmentsPage';

export default function BSTOutAttachmentsPage() {
  return <SharedAttachmentsPage config={BST_OUT_FLOW} requireGatepass />;
}
