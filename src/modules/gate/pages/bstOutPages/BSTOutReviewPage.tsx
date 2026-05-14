import {
  Eye,
  FileCheck,
  FileText,
  Package,
  Paperclip,
  Scale,
  Truck,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  useBSTGateOutByVehicleEntry,
  useCompleteBSTGateOut,
  useGateAttachments,
  useWeighment,
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

export default function BSTOutReviewPage() {
  const navigate = useNavigate();
  const { entryId, entryIdNumber } = useEntryId();
  useEntryStepTracker();
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const {
    data: bstOut,
    isLoading: isBSTOutLoading,
    error: bstOutError,
  } = useBSTGateOutByVehicleEntry(entryIdNumber);
  const { data: weighment } = useWeighment(entryIdNumber);
  const { data: attachments = [] } = useGateAttachments(entryIdNumber);
  const completeBSTOut = useCompleteBSTGateOut();

  const handleComplete = async () => {
    if (!entryIdNumber) {
      setError('Entry ID is missing. Please start the BST out entry again.');
      return;
    }

    if (!weighment) {
      setError('Weighment is required before this gate-out entry can be completed.');
      return;
    }

    try {
      await completeBSTOut.mutateAsync(entryIdNumber);
      setShowSuccess(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to complete BST out'));
    }
  };

  if (showSuccess) {
    return (
      <GateSuccessScreen
        title="Entry Completed!"
        subtitle="BST out gate entry has been successfully completed"
        dashboardLabel="BST Out Dashboard"
        dashboardIcon={Package}
        onNavigateToDashboard={() => navigate('/gate/bst-out')}
        onNavigateToHome={() => navigate('/')}
      />
    );
  }

  if (isBSTOutLoading) {
    return <StepLoadingSpinner />;
  }

  const loadError = bstOutError ? getErrorMessage(bstOutError, 'Failed to load BST out') : '';

  return (
    <div className="space-y-6 pb-6">
      <StepHeader currentStep={3} totalSteps={3} title="BST Out" error={error || loadError || null} />

      {bstOut && (
        <>
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/gate/bst-out/new?entryId=${entryId || bstOut.vehicle_entry}`)}
            >
              <Eye className="mr-2 h-4 w-4" />
              View Full Entry
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Vehicle & Gate Out
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
              <InfoItem label="Entry No." value={bstOut.entry_no} />
              <InfoItem label="Empty In Entry" value={bstOut.empty_vehicle_gate_in_entry_no} />
              <InfoItem label="Vehicle" value={bstOut.vehicle_number} />
              <InfoItem label="Vehicle Type" value={bstOut.vehicle_type || ''} />
              <InfoItem label="Driver" value={bstOut.driver_name} />
              <InfoItem label="Mobile" value={bstOut.driver_mobile} />
              <InfoItem label="Gate Out Date" value={bstOut.gate_out_date} />
              <InfoItem label="Out Time" value={bstOut.out_time} />
              <InfoItem label="Security" value={bstOut.security_name || ''} />
              <InfoItem label="Status" value={bstOut.status} />
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
                <InfoItem label="SAP Doc Num" value={bstOut.sap_doc_num} />
                <InfoItem label="SAP Doc Date" value={bstOut.sap_doc_date || ''} />
                <InfoItem label="From Warehouse" value={bstOut.sap_from_warehouse} />
                <InfoItem label="To Warehouse" value={bstOut.sap_to_warehouse} />
                <InfoItem label="Reference" value={bstOut.sap_reference} />
                <InfoItem label="Comments" value={bstOut.sap_comments} />
              </div>

              <div className="overflow-hidden rounded-md border">
                <div className="max-h-[360px] overflow-auto">
                  <table className="w-full min-w-[940px]">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="p-3 text-left text-sm font-medium">Line</th>
                        <th className="p-3 text-left text-sm font-medium">Item</th>
                        <th className="p-3 text-left text-sm font-medium">SAP Qty</th>
                        <th className="p-3 text-left text-sm font-medium">Actual Qty</th>
                        <th className="p-3 text-left text-sm font-medium">From</th>
                        <th className="p-3 text-left text-sm font-medium">To</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bstOut.items.map((item) => (
                        <tr key={item.id} className="border-t">
                          <td className="whitespace-nowrap p-3 text-sm">{item.line_num}</td>
                          <td className="p-3 text-sm">
                            <div className="font-medium">{item.item_code}</div>
                            <div className="text-muted-foreground">{item.item_name}</div>
                          </td>
                          <td className="whitespace-nowrap p-3 text-sm">
                            {item.quantity} {item.uom}
                          </td>
                          <td className="whitespace-nowrap p-3 text-sm">
                            {item.actual_quantity} {item.uom}
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

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="h-5 w-5" />
                  Weighment
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
                {weighment ? (
                  <>
                    <InfoItem label="Gross Weight" value={weighment.gross_weight} />
                    <InfoItem label="Tare Weight" value={weighment.tare_weight} />
                    <InfoItem label="Net Weight" value={weighment.net_weight} />
                    <InfoItem label="Slip No." value={weighment.weighbridge_slip_no || ''} />
                  </>
                ) : (
                  <p className="sm:col-span-2 text-sm text-destructive">
                    Weighment is required before completion.
                  </p>
                )}
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
          </div>
        </>
      )}

      <StepFooter
        onPrevious={() => navigate(`/gate/bst-out/new/attachments?entryId=${entryId}`)}
        onCancel={() => navigate('/gate/bst-out')}
        onNext={handleComplete}
        isSaving={completeBSTOut.isPending}
        nextLabel={completeBSTOut.isPending ? 'Completing...' : 'Complete Entry'}
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
