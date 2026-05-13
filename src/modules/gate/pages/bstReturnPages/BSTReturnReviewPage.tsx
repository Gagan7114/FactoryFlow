import {
  Eye,
  FileCheck,
  FileText,
  Paperclip,
  RotateCcw,
  Truck,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  useBSTGateReturnByVehicleEntry,
  useCompleteBSTGateReturn,
  useGateAttachments,
} from '@/modules/gate/api';
import {
  GateSuccessScreen,
  StepFooter,
  StepHeader,
  StepLoadingSpinner,
} from '@/modules/gate/components';
import { useEntryId, useEntryStepTracker } from '@/modules/gate/hooks';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

function formatDateTime(date?: string | null, time?: string | null) {
  if (!date && !time) return '-';
  return [date, time].filter(Boolean).join(' ');
}

export default function BSTReturnReviewPage() {
  const navigate = useNavigate();
  const { entryId, entryIdNumber } = useEntryId();
  useEntryStepTracker();
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const {
    data: bstReturn,
    isLoading: isBSTReturnLoading,
    error: bstReturnError,
  } = useBSTGateReturnByVehicleEntry(entryIdNumber);
  const { data: attachments = [] } = useGateAttachments(entryIdNumber);
  const completeBSTReturn = useCompleteBSTGateReturn();

  const handleComplete = async () => {
    if (!entryIdNumber) {
      setError('Entry ID is missing. Please start the BST return entry again.');
      return;
    }

    if (!bstReturn?.sap_return_doc_num?.trim()) {
      setError('SAP return/reversal document is required before completing. Use View Full Entry to add it.');
      return;
    }

    try {
      await completeBSTReturn.mutateAsync(entryIdNumber);
      setShowSuccess(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to complete BST return'));
    }
  };

  if (showSuccess) {
    return (
      <GateSuccessScreen
        title="Entry Completed!"
        subtitle="BST return gate entry has been successfully completed"
        dashboardLabel="BST Return Dashboard"
        dashboardIcon={RotateCcw}
        onNavigateToDashboard={() => navigate('/gate/bst-return')}
        onNavigateToHome={() => navigate('/')}
      />
    );
  }

  if (isBSTReturnLoading) {
    return <StepLoadingSpinner />;
  }

  const loadError = bstReturnError
    ? getErrorMessage(bstReturnError, 'Failed to load BST return')
    : '';

  return (
    <div className="space-y-6 pb-6">
      <StepHeader
        currentStep={2}
        totalSteps={2}
        title="BST Return"
        error={error || loadError || null}
      />

      {bstReturn && (
        <>
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                navigate(`/gate/bst-return/new?entryId=${entryId || bstReturn.vehicle_entry}`)
              }
            >
              <Eye className="mr-2 h-4 w-4" />
              View Full Entry
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Returned Vehicle
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
              <InfoItem label="Entry No." value={bstReturn.entry_no} />
              <InfoItem label="Vehicle" value={bstReturn.vehicle_number} />
              <InfoItem label="Vehicle Type" value={bstReturn.vehicle_type || ''} />
              <InfoItem label="Driver" value={bstReturn.driver_name} />
              <InfoItem label="Mobile" value={bstReturn.driver_mobile} />
              <InfoItem
                label="Returned In"
                value={formatDateTime(bstReturn.gate_in_date, bstReturn.in_time)}
              />
              <InfoItem label="Security" value={bstReturn.security_name || ''} />
              <InfoItem label="Status" value={bstReturn.status} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5" />
                Original BST Out
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
              <InfoItem label="BST Out Entry" value={bstReturn.bst_gate_out_entry_no} />
              <InfoItem
                label="Gate Out"
                value={formatDateTime(bstReturn.bst_gate_out_date, bstReturn.bst_gate_out_time)}
              />
              <InfoItem label="Vehicle" value={bstReturn.vehicle_number} />
              <InfoItem label="Driver" value={bstReturn.driver_name} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                SAP BST
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
                <InfoItem label="SAP Doc Num" value={bstReturn.sap_doc_num} />
                <InfoItem label="SAP Doc Date" value={bstReturn.sap_doc_date || ''} />
                <InfoItem label="From Warehouse" value={bstReturn.sap_from_warehouse} />
                <InfoItem label="To Warehouse" value={bstReturn.sap_to_warehouse} />
                <InfoItem label="Reference" value={bstReturn.sap_reference} />
                <InfoItem label="Comments" value={bstReturn.sap_comments} />
                <InfoItem label="SAP Return Doc" value={bstReturn.sap_return_doc_num || ''} />
                <InfoItem label="Return Doc Date" value={bstReturn.sap_return_doc_date || ''} />
                <InfoItem label="Return Reference" value={bstReturn.sap_return_reference || ''} />
              </div>

              <div className="overflow-hidden rounded-md border">
                <div className="max-h-[360px] overflow-auto">
                  <table className="w-full min-w-[820px]">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="p-3 text-left text-sm font-medium">Line</th>
                        <th className="p-3 text-left text-sm font-medium">Item</th>
                        <th className="p-3 text-left text-sm font-medium">Quantity</th>
                        <th className="p-3 text-left text-sm font-medium">From</th>
                        <th className="p-3 text-left text-sm font-medium">To</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bstReturn.items.map((item) => (
                        <tr key={item.id} className="border-t">
                          <td className="whitespace-nowrap p-3 text-sm">{item.line_num}</td>
                          <td className="p-3 text-sm">
                            <div className="font-medium">{item.item_code}</div>
                            <div className="text-muted-foreground">{item.item_name}</div>
                          </td>
                          <td className="whitespace-nowrap p-3 text-sm">
                            {item.quantity} {item.uom}
                          </td>
                          <td className="whitespace-nowrap p-3 text-sm">{item.from_warehouse}</td>
                          <td className="whitespace-nowrap p-3 text-sm">{item.to_warehouse}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Paperclip className="h-5 w-5" />
                Attachments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {attachments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No attachments uploaded</p>
              ) : (
                <div className="space-y-2">
                  {attachments.map((attachment) => (
                    <a
                      key={attachment.id}
                      href={attachment.file}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-md border p-2 text-sm hover:bg-muted/50"
                    >
                      <FileCheck className="h-4 w-4 text-muted-foreground" />
                      {attachment.file_name || attachment.file.split('/').pop() || 'Attachment'}
                    </a>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <StepFooter
        onPrevious={() => navigate(`/gate/bst-return/new/attachments?entryId=${entryId}`)}
        onCancel={() => navigate('/gate/bst-return')}
        onNext={handleComplete}
        isSaving={completeBSTReturn.isPending}
        nextLabel={completeBSTReturn.isPending ? 'Completing...' : 'Complete Entry'}
      />
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value || '-'}</p>
    </div>
  );
}
