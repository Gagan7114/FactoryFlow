import { AlertCircle, Truck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import {
  type CreateWeighmentRequest,
  useCreateWeighment,
  useSalesDispatchByVehicleEntry,
  useWeighment,
} from '@/modules/gate/api';
import {
  RequiredWeighmentForm,
  StepFooter,
  StepHeader,
  StepLoadingSpinner,
} from '@/modules/gate/components';
import { useEntryId } from '@/modules/gate/hooks';
import {
  buildRequiredWeighmentDateTime,
  EMPTY_REQUIRED_WEIGHMENT,
  type RequiredWeighmentValues,
  validateRequiredWeighment,
} from '@/modules/gate/utils';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import {
  DOCKING_TOTAL_STEPS,
  formatDateTime,
  formatValue,
} from './salesDispatchFlow.helpers';
import { DOCKING_ROUTES } from './salesDispatchRoutes';

function buildValuesFromWeighment(
  weighment?: {
    gross_weight?: string;
    tare_weight?: string;
    weighbridge_slip_no?: string;
    first_weighment_time?: string | null;
    second_weighment_time?: string | null;
  } | null,
): RequiredWeighmentValues {
  if (!weighment) return EMPTY_REQUIRED_WEIGHMENT;

  return {
    grossWeight: weighment.gross_weight || '',
    tareWeight: weighment.tare_weight || '',
    weighbridgeSlipNo: weighment.weighbridge_slip_no || '',
    firstWeighmentTime: weighment.first_weighment_time
      ? weighment.first_weighment_time.slice(11, 16)
      : '',
    secondWeighmentTime: weighment.second_weighment_time
      ? weighment.second_weighment_time.slice(11, 16)
      : '',
  };
}

export default function SalesDispatchWeighmentPage() {
  const navigate = useNavigate();
  const { entryId, entryIdNumber } = useEntryId();
  const [values, setValues] = useState<RequiredWeighmentValues>(EMPTY_REQUIRED_WEIGHMENT);
  const [error, setError] = useState('');

  const {
    data: entry,
    isLoading: isEntryLoading,
    error: entryError,
  } = useSalesDispatchByVehicleEntry(entryIdNumber);
  const {
    data: weighment,
    isLoading: isWeighmentLoading,
  } = useWeighment(entryIdNumber);
  const createWeighment = useCreateWeighment(entryIdNumber || 0);

  useEffect(() => {
    if (!weighment) return;

    setValues(buildValuesFromWeighment(weighment));
  }, [weighment]);

  const isReadOnly = entry
    ? ['PRINT_COMMITTED', 'DISPATCHED', 'REJECTED', 'CANCELLED'].includes(entry.status)
    : false;

  const handleValueChange = (field: keyof RequiredWeighmentValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setError('');
  };

  const handleNext = async () => {
    if (!entryIdNumber || !entry) {
      setError('Docking details not found.');
      return;
    }

    if (isReadOnly) {
      navigate(DOCKING_ROUTES.attachments(entryIdNumber));
      return;
    }

    const validationError = validateRequiredWeighment(values);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      const payload: CreateWeighmentRequest = {
        gross_weight: Number(values.grossWeight),
        tare_weight: Number(values.tareWeight),
        weighbridge_slip_no: values.weighbridgeSlipNo,
        first_weighment_time: buildRequiredWeighmentDateTime(values.firstWeighmentTime),
        second_weighment_time: buildRequiredWeighmentDateTime(values.secondWeighmentTime),
      };

      await createWeighment.mutateAsync(payload);
      toast.success('Docking weighment saved');
      navigate(DOCKING_ROUTES.attachments(entryIdNumber));
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Failed to save Docking weighment'));
    }
  };

  if (isEntryLoading || isWeighmentLoading) {
    return <StepLoadingSpinner />;
  }

  if (!entry) {
    return (
      <div className="space-y-6 pb-6">
        <StepHeader
          currentStep={2}
          totalSteps={DOCKING_TOTAL_STEPS}
          title="Docking"
          error={error || (entryError ? getErrorMessage(entryError, 'Docking details not found') : null)}
        />
        <div className="flex items-center justify-between gap-4 rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-900">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Docking details not found</span>
          </div>
          <Button variant="outline" onClick={() => navigate(DOCKING_ROUTES.newEntry)}>
            Fill Details
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      <StepHeader
        currentStep={2}
        totalSteps={DOCKING_TOTAL_STEPS}
        title="Docking"
        error={error || null}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Docking Vehicle
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
          <InfoItem label="Entry No." value={entry.entry_no} />
          <InfoItem label="Vehicle" value={entry.vehicle_no} />
          <InfoItem label="Driver" value={entry.driver_name} />
          <InfoItem label="SAP Document" value={entry.sap_doc_num} />
          <InfoItem label="Customer / Destination" value={entry.customer_name || entry.to_warehouse} />
          <InfoItem label="Gate Out" value={formatDateTime(entry.gate_out_date, entry.out_time)} />
        </CardContent>
      </Card>

      <RequiredWeighmentForm
        values={values}
        onChange={handleValueChange}
        disabled={isReadOnly || createWeighment.isPending}
      />

      <StepFooter
        onPrevious={() => navigate(`${DOCKING_ROUTES.newEntry}?entryId=${entryId || entry.vehicle_entry}`)}
        onCancel={() => navigate(DOCKING_ROUTES.dashboard)}
        onNext={handleNext}
        isSaving={createWeighment.isPending}
        nextLabel={createWeighment.isPending ? 'Saving...' : 'Save and Next'}
      />
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{formatValue(value)}</p>
    </div>
  );
}
