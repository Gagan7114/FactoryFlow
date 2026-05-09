import { Scale } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { CreateWeighmentRequest } from '@/modules/gate/api';
import { useBSTGateOutByVehicleEntry, useCreateWeighment, useWeighment } from '@/modules/gate/api';
import {
  FillDataAlert,
  StepFooter,
  StepHeader,
  StepLoadingSpinner,
} from '@/modules/gate/components';
import { useEntryId, useEntryStepTracker } from '@/modules/gate/hooks';
import { RecordTimestamps } from '@/shared/components';
import { Card, CardContent, CardHeader, CardTitle, Input, Label } from '@/shared/components/ui';
import {
  cn,
  getErrorMessage,
  getServerErrorMessage,
  isNotFoundError as checkNotFoundError,
  isServerError as checkServerError,
} from '@/shared/utils';

export default function BSTOutWeighmentPage() {
  const navigate = useNavigate();
  const { entryId, entryIdNumber } = useEntryId();
  useEntryStepTracker();
  const {
    data: weighmentData,
    isLoading: isWeighmentLoading,
    error: weighmentError,
  } = useWeighment(entryIdNumber);
  const { data: bstOut } = useBSTGateOutByVehicleEntry(entryIdNumber);
  const createWeighment = useCreateWeighment(entryIdNumber || 0);
  const [formData, setFormData] = useState({
    grossWeight: '0',
    tareWeight: '0',
    weighbridgeTicketNo: '',
    firstWeighmentTime: '',
    secondWeighmentTime: '',
  });
  const [error, setError] = useState('');
  const [fillDataMode, setFillDataMode] = useState(false);
  const [updateMode, setUpdateMode] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  const isNotFoundError = checkNotFoundError(weighmentError);
  const hasServerError = checkServerError(weighmentError);
  const hasNoWeighmentData = !isWeighmentLoading && (!weighmentData || isNotFoundError);
  const isCompleted = bstOut?.status === 'COMPLETED';
  const isReadOnly =
    isCompleted ||
    (!!weighmentData && !fillDataMode && !updateMode) ||
    (hasNoWeighmentData && !fillDataMode);
  const canUpdate = !isCompleted && !!weighmentData;

  useEffect(() => {
    if (weighmentData && !fillDataMode) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Syncing form state with fetched weighment data matches the existing gate step pattern.
      setFormData({
        grossWeight: weighmentData.gross_weight || '0',
        tareWeight: weighmentData.tare_weight || '0',
        weighbridgeTicketNo: weighmentData.weighbridge_slip_no || '',
        firstWeighmentTime: weighmentData.first_weighment_time
          ? weighmentData.first_weighment_time.slice(11, 16)
          : '',
        secondWeighmentTime: weighmentData.second_weighment_time
          ? weighmentData.second_weighment_time.slice(11, 16)
          : '',
      });
    }
  }, [fillDataMode, weighmentData]);

  const netWeight = useMemo(() => {
    const gross = parseFloat(formData.grossWeight) || 0;
    const tare = parseFloat(formData.tareWeight) || 0;
    return Math.max(0, gross - tare).toFixed(3);
  }, [formData.grossWeight, formData.tareWeight]);

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    if (isReadOnly) return;
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleFillData = () => {
    setFillDataMode(true);
    setUpdateMode(false);
    setError('');
    setFormData({
      grossWeight: '0',
      tareWeight: '0',
      weighbridgeTicketNo: '',
      firstWeighmentTime: '',
      secondWeighmentTime: '',
    });
  };

  const handleUpdate = () => {
    setUpdateMode(true);
    setError('');
  };

  const handleNext = async () => {
    if (!entryId || !entryIdNumber) {
      setError('Entry ID is missing. Please start the BST out entry again.');
      return;
    }

    if (hasNoWeighmentData && !fillDataMode) {
      setError('Weighment is required before this gate-out entry can be completed.');
      return;
    }

    if (!fillDataMode && !updateMode) {
      navigate(`/gate/bst-out/new/attachments?entryId=${entryId}`);
      return;
    }

    const grossWeight = parseFloat(formData.grossWeight);
    const tareWeight = parseFloat(formData.tareWeight);
    if (!Number.isFinite(grossWeight) || grossWeight <= 0) {
      setError('Gross weight is required.');
      return;
    }
    if (!Number.isFinite(tareWeight) || tareWeight < 0) {
      setError('Tare weight is required.');
      return;
    }
    if (tareWeight > grossWeight) {
      setError('Tare weight cannot be greater than gross weight.');
      return;
    }

    try {
      const today = new Date().toISOString().slice(0, 10);
      const requestData: CreateWeighmentRequest = {
        gross_weight: grossWeight,
        tare_weight: tareWeight,
        weighbridge_slip_no: formData.weighbridgeTicketNo || '',
        first_weighment_time: formData.firstWeighmentTime
          ? `${today}T${formData.firstWeighmentTime}:00`
          : undefined,
        second_weighment_time: formData.secondWeighmentTime
          ? `${today}T${formData.secondWeighmentTime}:00`
          : undefined,
      };

      await createWeighment.mutateAsync(requestData);
      setIsNavigating(true);
      navigate(`/gate/bst-out/new/attachments?entryId=${entryId}`);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save weighment details'));
    }
  };

  if (isWeighmentLoading) {
    return <StepLoadingSpinner />;
  }

  return (
    <div className="space-y-6 pb-6">
      <StepHeader
        currentStep={2}
        totalSteps={3}
        title="BST Out"
        error={
          hasServerError
            ? getServerErrorMessage()
            : error ||
              (weighmentError && !isNotFoundError
                ? getErrorMessage(weighmentError, 'Failed to load weighment data')
                : null)
        }
      />

      {hasNoWeighmentData && !fillDataMode && !hasServerError && (
        <FillDataAlert
          message={
            isNotFoundError
              ? getErrorMessage(weighmentError, 'Weighment details not found for this entry.')
              : 'No weighment details found for this entry.'
          }
          buttonLabel="Fill Details"
          onFillData={handleFillData}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Weighment Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="grossWeight">Gross Weight</Label>
              <Input
                id="grossWeight"
                type="number"
                step="0.001"
                min="0"
                value={formData.grossWeight}
                onChange={(event) => handleInputChange('grossWeight', event.target.value)}
                disabled={isReadOnly || createWeighment.isPending}
                className={cn(isReadOnly && 'cursor-not-allowed opacity-50')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tareWeight">Tare Weight</Label>
              <Input
                id="tareWeight"
                type="number"
                step="0.001"
                min="0"
                value={formData.tareWeight}
                onChange={(event) => handleInputChange('tareWeight', event.target.value)}
                disabled={isReadOnly || createWeighment.isPending}
                className={cn(isReadOnly && 'cursor-not-allowed opacity-50')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="netWeight">Net Weight</Label>
              <Input
                id="netWeight"
                value={netWeight === '0.000' ? '' : netWeight}
                disabled
                className="cursor-not-allowed bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="weighbridgeTicketNo">Weighbridge Ticket No.</Label>
              <Input
                id="weighbridgeTicketNo"
                value={formData.weighbridgeTicketNo}
                onChange={(event) => handleInputChange('weighbridgeTicketNo', event.target.value)}
                disabled={isReadOnly || createWeighment.isPending}
                placeholder="WB-2026-001"
                className={cn(isReadOnly && 'cursor-not-allowed opacity-50')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="firstWeighmentTime">First Weighment Time</Label>
              <Input
                id="firstWeighmentTime"
                type="time"
                value={formData.firstWeighmentTime}
                onChange={(event) => handleInputChange('firstWeighmentTime', event.target.value)}
                disabled={isReadOnly || createWeighment.isPending}
                className={cn(isReadOnly && 'cursor-not-allowed opacity-50')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondWeighmentTime">Second Weighment Time</Label>
              <Input
                id="secondWeighmentTime"
                type="time"
                value={formData.secondWeighmentTime}
                onChange={(event) => handleInputChange('secondWeighmentTime', event.target.value)}
                disabled={isReadOnly || createWeighment.isPending}
                className={cn(isReadOnly && 'cursor-not-allowed opacity-50')}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {weighmentData?.created_at && (
        <RecordTimestamps
          createdAt={weighmentData.created_at}
          updatedAt={weighmentData.updated_at}
        />
      )}

      <StepFooter
        onPrevious={() => navigate(`/gate/bst-out/new?entryId=${entryId}`)}
        onCancel={() => navigate('/gate/bst-out')}
        onNext={handleNext}
        showUpdate={canUpdate && !updateMode && !fillDataMode}
        onUpdate={handleUpdate}
        isSaving={createWeighment.isPending || isNavigating}
        isEditMode={!fillDataMode}
        isUpdateMode={updateMode}
      />
    </div>
  );
}
