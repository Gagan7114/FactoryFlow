import { AlertCircle, Truck } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { RequiredWeighmentForm, StepFooter, StepHeader } from '@/modules/gate/components';
import {
  calculateRequiredNetWeight,
  EMPTY_REQUIRED_WEIGHMENT,
  type RequiredWeighmentValues,
  validateRequiredWeighment,
} from '@/modules/gate/utils';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';

import {
  type CustomerFlowEntry,
  findCustomerFlowEntry,
  getCustomerFlowValue,
  SALES_DISPATCH_KEY,
  updateCustomerFlowEntry,
} from './customerSalesFlow.storage';

function getRawString(entry: CustomerFlowEntry, key: string) {
  const value = entry.values[key];
  return typeof value === 'string' ? value : '';
}

function buildValues(entry: CustomerFlowEntry | null): RequiredWeighmentValues {
  if (!entry) return EMPTY_REQUIRED_WEIGHMENT;

  return {
    grossWeight: getRawString(entry, 'grossWeight'),
    tareWeight: getRawString(entry, 'tareWeight'),
    weighbridgeSlipNo: getRawString(entry, 'weighbridgeSlipNo'),
    firstWeighmentTime: getRawString(entry, 'firstWeighmentTime'),
    secondWeighmentTime: getRawString(entry, 'secondWeighmentTime'),
  };
}

export default function SalesDispatchWeighmentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const entryId = searchParams.get('entryId') || '';
  const [entry, setEntry] = useState<CustomerFlowEntry | null>(() => (
    entryId ? findCustomerFlowEntry(SALES_DISPATCH_KEY, entryId) : null
  ));
  const [values, setValues] = useState<RequiredWeighmentValues>(() => buildValues(entry));
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleValueChange = (field: keyof RequiredWeighmentValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setError('');
  };

  const handleNext = () => {
    if (!entry) {
      setError('Sales dispatch details not found.');
      return;
    }

    const validationError = validateRequiredWeighment(values);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);
    const updatedEntry = updateCustomerFlowEntry(SALES_DISPATCH_KEY, entry.id, (current) => ({
      ...current,
      values: {
        ...current.values,
        grossWeight: values.grossWeight,
        tareWeight: values.tareWeight,
        netWeight: calculateRequiredNetWeight(values),
        weighbridgeSlipNo: values.weighbridgeSlipNo,
        firstWeighmentTime: values.firstWeighmentTime,
        secondWeighmentTime: values.secondWeighmentTime,
      },
      updatedAt: new Date().toISOString(),
    }));

    if (!updatedEntry) {
      setError('Failed to save weighment.');
      setIsSaving(false);
      return;
    }

    setEntry(updatedEntry);
    toast.success('Weighment saved');
    navigate(`/gate/sales-dispatch/new/attachments?entryId=${encodeURIComponent(updatedEntry.id)}`);
  };

  if (!entry) {
    return (
      <div className="space-y-6 pb-6">
        <StepHeader currentStep={2} totalSteps={3} title="Sales Dispatch Out" error={error || null} />
        <div className="flex items-center justify-between gap-4 rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-900">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Sales dispatch details not found</span>
          </div>
          <Button variant="outline" onClick={() => navigate('/gate/sales-dispatch/new')}>
            Fill Details
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      <StepHeader currentStep={2} totalSteps={3} title="Sales Dispatch Out" error={error || null} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Dispatch Vehicle
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
          <InfoItem label="Entry No." value={entry.entryNo} />
          <InfoItem label="Vehicle" value={getCustomerFlowValue(entry, 'vehicleNo')} />
          <InfoItem label="Driver" value={getCustomerFlowValue(entry, 'driverName')} />
          <InfoItem label="Gate Out" value={`${getCustomerFlowValue(entry, 'gateOutDate')} ${getCustomerFlowValue(entry, 'outTime')}`} />
        </CardContent>
      </Card>

      <RequiredWeighmentForm values={values} onChange={handleValueChange} disabled={isSaving} />

      <StepFooter
        onPrevious={() => navigate(`/gate/sales-dispatch/new?entryId=${encodeURIComponent(entry.id)}`)}
        onCancel={() => navigate('/gate/sales-dispatch')}
        onNext={handleNext}
        isSaving={isSaving}
        nextLabel={isSaving ? 'Saving...' : 'Save and Next'}
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
