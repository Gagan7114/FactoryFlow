import { AlertCircle, Truck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { useSalesDispatchGateOut, useUpdateSalesDispatchGateOut } from '@/modules/gate/api';
import { RequiredWeighmentForm, StepFooter, StepHeader } from '@/modules/gate/components';
import {
  buildRequiredWeighmentDateTime,
  EMPTY_REQUIRED_WEIGHMENT,
  type RequiredWeighmentValues,
  validateRequiredWeighment,
} from '@/modules/gate/utils';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';

function timeFromDateTime(value?: string | null) {
  if (!value) return '';
  const time = value.includes('T') ? value.split('T')[1] : value;
  return time.slice(0, 5);
}

function buildValues(entry?: {
  gross_weight?: string | null;
  tare_weight?: string | null;
  weighbridge_slip_no?: string;
  first_weighment_time?: string | null;
  second_weighment_time?: string | null;
}): RequiredWeighmentValues {
  if (!entry) return EMPTY_REQUIRED_WEIGHMENT;

  return {
    grossWeight: entry.gross_weight || '',
    tareWeight: entry.tare_weight || '',
    weighbridgeSlipNo: entry.weighbridge_slip_no || '',
    firstWeighmentTime: timeFromDateTime(entry.first_weighment_time),
    secondWeighmentTime: timeFromDateTime(entry.second_weighment_time),
  };
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
  return detail || fallback;
}

export default function SalesDispatchWeighmentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const entryId = Number(searchParams.get('entryId') || 0) || null;
  const { data: entry, isLoading } = useSalesDispatchGateOut(entryId);
  const updateMutation = useUpdateSalesDispatchGateOut();
  const [values, setValues] = useState<RequiredWeighmentValues>(EMPTY_REQUIRED_WEIGHMENT);
  const [error, setError] = useState('');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Weighment form follows the loaded entry.
    if (entry) setValues(buildValues(entry));
  }, [entry]);

  const handleValueChange = (field: keyof RequiredWeighmentValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setError('');
  };

  const handleNext = async () => {
    if (!entry) {
      setError('Sales dispatch details not found.');
      return;
    }

    const validationError = validateRequiredWeighment(values);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: entry.id,
        data: {
          gross_weight: values.grossWeight,
          tare_weight: values.tareWeight,
          weighbridge_slip_no: values.weighbridgeSlipNo,
          first_weighment_time: buildRequiredWeighmentDateTime(values.firstWeighmentTime) || null,
          second_weighment_time: buildRequiredWeighmentDateTime(values.secondWeighmentTime) || null,
        },
      });
      toast.success('Weighment saved');
      navigate(`/gate/sales-dispatch/new/attachments?entryId=${entry.id}`);
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Failed to save weighment.'));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 pb-6">
        <StepHeader currentStep={2} totalSteps={3} title="Sales Dispatch Out" error={null} />
        <div className="rounded-md border p-6 text-sm text-muted-foreground">Loading dispatch entry...</div>
      </div>
    );
  }

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
          <InfoItem label="Entry No." value={entry.entry_no} />
          <InfoItem label="Vehicle" value={entry.vehicle_number} />
          <InfoItem label="Driver" value={entry.driver_name} />
          <InfoItem label="Gate Out" value={`${entry.gate_out_date} ${entry.out_time}`} />
        </CardContent>
      </Card>

      <RequiredWeighmentForm
        values={values}
        onChange={handleValueChange}
        disabled={updateMutation.isPending}
      />

      <StepFooter
        onPrevious={() => navigate(`/gate/sales-dispatch/new?entryId=${entry.id}`)}
        onCancel={() => navigate('/gate/sales-dispatch')}
        onNext={handleNext}
        isSaving={updateMutation.isPending}
        nextLabel={updateMutation.isPending ? 'Saving...' : 'Save and Next'}
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
