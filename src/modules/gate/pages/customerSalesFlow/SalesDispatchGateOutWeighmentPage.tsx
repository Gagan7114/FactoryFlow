import { AlertCircle, FileText, Scale, Truck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import {
  type CreateWeighmentRequest,
  type Weighment,
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
} from '@/modules/gate/utils';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import { formatTimestamp, formatValue, toTimeInputValue } from './salesDispatchFlow.helpers';
import { getSalesDispatchRoutes } from './salesDispatchRoutes';

const GATE_OUT_WEIGHMENT_TOTAL_STEPS = 2;

function buildValuesFromWeighment(weighment?: Weighment | null): RequiredWeighmentValues {
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
      : toTimeInputValue(),
  };
}

function validateGateOutWeighment(values: RequiredWeighmentValues) {
  const gross = toFiniteNumber(values.grossWeight);
  const tare = toFiniteNumber(values.tareWeight);

  if (tare === null || tare < 0) {
    return 'Tare weight is required before sales dispatch out.';
  }
  if (gross === null || gross <= 0) {
    return 'Gross weight is required before sales dispatch out.';
  }
  if (gross < tare) {
    return 'Gross weight cannot be less than tare weight.';
  }

  return '';
}

export default function SalesDispatchGateOutWeighmentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const routes = getSalesDispatchRoutes(location.pathname);
  const { entryId, entryIdNumber } = useEntryId();
  const [values, setValues] = useState<RequiredWeighmentValues>(EMPTY_REQUIRED_WEIGHMENT);
  const [error, setError] = useState('');

  const {
    data: entry,
    isLoading: isEntryLoading,
    error: entryError,
    refetch: refetchEntry,
  } = useSalesDispatchByVehicleEntry(entryIdNumber);
  const vehicleEntryId = entry?.vehicle_entry || entryIdNumber || null;
  const {
    data: weighment,
    isLoading: isWeighmentLoading,
    error: weighmentError,
  } = useWeighment(vehicleEntryId);
  const saveWeighment = useCreateWeighment(vehicleEntryId || 0);

  useEffect(() => {
    if (!weighment) return;

    const timerId = window.setTimeout(() => {
      setValues(buildValuesFromWeighment(weighment));
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [weighment]);

  const handleValueChange = (field: keyof RequiredWeighmentValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setError('');
  };

  const handleNext = async () => {
    if (!entry || !vehicleEntryId) {
      setError('Sales dispatch out entry not found.');
      return;
    }
    if (entry.status !== 'PRINT_COMMITTED') {
      setError('Gatepass print must be committed before recording gate-out weighment.');
      return;
    }

    const validationError = validateGateOutWeighment(values);
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload: CreateWeighmentRequest = {
      gross_weight: Number(values.grossWeight),
      tare_weight: Number(values.tareWeight),
      weighbridge_slip_no: values.weighbridgeSlipNo,
      second_weighment_time: buildRequiredWeighmentDateTime(
        values.secondWeighmentTime || toTimeInputValue(),
      ),
    };
    if (values.firstWeighmentTime) {
      payload.first_weighment_time = buildRequiredWeighmentDateTime(values.firstWeighmentTime);
    }

    try {
      await saveWeighment.mutateAsync(payload);
      await refetchEntry();
      toast.success('Gross weight saved');
      navigate(routes.gatepass(entry.vehicle_entry));
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Failed to save gross weight'));
    }
  };

  if (isEntryLoading || isWeighmentLoading) {
    return <StepLoadingSpinner />;
  }

  if (!entryId || !entry) {
    return (
      <div className="space-y-6 pb-6">
        <StepHeader
          currentStep={1}
          totalSteps={GATE_OUT_WEIGHMENT_TOTAL_STEPS}
          title="Sales Dispatch Out"
          error={
            error ||
            (entryError ? getErrorMessage(entryError, 'Sales dispatch out entry not found') : null)
          }
        />
        <div className="flex items-center justify-between gap-4 rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-900">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Sales dispatch out entry details not found</span>
          </div>
          <Button variant="outline" onClick={() => navigate(routes.dashboard)}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const contextError = weighmentError
    ? getErrorMessage(weighmentError, 'Unable to load existing weighment')
    : '';

  return (
    <div className="space-y-6 pb-6">
      <StepHeader
        currentStep={1}
        totalSteps={GATE_OUT_WEIGHMENT_TOTAL_STEPS}
        title="Sales Dispatch Out"
        error={error || contextError || null}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Dispatch Context
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm md:grid-cols-2 xl:grid-cols-4">
          <InfoItem label="Vehicle" value={entry.vehicle_no} />
          <InfoItem label="Driver" value={entry.driver_name} />
          <InfoItem label="Gatepass No." value={entry.gatepass_no} />
          <InfoItem
            label={entry.document_type === 'STOCK_TRANSFER' ? 'SAP Document' : 'Invoice'}
            value={entry.sap_doc_num}
          />
          <InfoItem
            label="Customer / Destination"
            value={entry.customer_name || entry.to_warehouse}
          />
          <InfoItem label="Tare Weight" value={formatWeight(values.tareWeight)} />
          <InfoItem label="Gatepass Printed" value={formatTimestamp(entry.printed_at)} />
          <InfoItem label="Print Committed" value={formatTimestamp(entry.print_committed_at)} />
        </CardContent>
      </Card>

      <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
        <div className="flex items-start gap-3">
          <Scale className="mt-0.5 h-5 w-5" />
          <div>
            <p className="font-medium">Record loaded vehicle gross weight</p>
            <p className="mt-1">
              Enter the loaded gross weight here. If the tare weight was missed during empty vehicle
              in, enter it here as well; it will stay on the same vehicle weighment record.
            </p>
          </div>
        </div>
      </div>

      <RequiredWeighmentForm
        values={values}
        onChange={handleValueChange}
        disabled={saveWeighment.isPending}
        requiredFields={{ grossWeight: true, tareWeight: true }}
      />

      <StepFooter
        onPrevious={() => navigate(routes.detail(entry.id))}
        onCancel={() => navigate(routes.dashboard)}
        onNext={handleNext}
        isSaving={saveWeighment.isPending}
        nextLabel={saveWeighment.isPending ? 'Saving...' : 'Save and Continue to Gate Out'}
      />
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <div className="flex items-center gap-1 text-xs uppercase tracking-wide text-muted-foreground">
        <FileText className="h-3 w-3" />
        {label}
      </div>
      <div className="mt-1 font-medium">{formatValue(value)}</div>
    </div>
  );
}

function formatWeight(value?: string | number | null) {
  if (value === null || value === undefined || value === '') return '';
  return `${value} kg`;
}

function toFiniteNumber(value?: string | number | null) {
  if (value === null || value === undefined || value === '') return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}
