import { Scale } from 'lucide-react';

import type { RequiredWeighmentValues } from '@/modules/gate/utils';
import { calculateRequiredNetWeight } from '@/modules/gate/utils';
import { Card, CardContent, CardHeader, CardTitle, Input, Label } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

interface RequiredWeighmentFormProps {
  values: RequiredWeighmentValues;
  onChange: (field: keyof RequiredWeighmentValues, value: string) => void;
  disabled?: boolean;
  requiredFields?: {
    grossWeight?: boolean;
    tareWeight?: boolean;
  };
}

export function RequiredWeighmentForm({
  values,
  onChange,
  disabled = false,
  requiredFields,
}: RequiredWeighmentFormProps) {
  const netWeight = calculateRequiredNetWeight(values);
  const isGrossRequired = requiredFields?.grossWeight ?? true;
  const isTareRequired = requiredFields?.tareWeight ?? true;

  return (
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
            <Label htmlFor="required-gross-weight">
              Gross Weight {isGrossRequired && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id="required-gross-weight"
              type="number"
              min="0"
              step="0.001"
              value={values.grossWeight}
              onChange={(event) => onChange('grossWeight', event.target.value)}
              disabled={disabled}
              className={cn(disabled && 'cursor-not-allowed opacity-50')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="required-tare-weight">
              Tare Weight {isTareRequired && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id="required-tare-weight"
              type="number"
              min="0"
              step="0.001"
              value={values.tareWeight}
              onChange={(event) => onChange('tareWeight', event.target.value)}
              disabled={disabled}
              className={cn(disabled && 'cursor-not-allowed opacity-50')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="required-net-weight">Net Weight</Label>
            <Input
              id="required-net-weight"
              value={netWeight === '0.000' ? '' : netWeight}
              disabled
              className="cursor-not-allowed bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="required-weighbridge-slip">Weighbridge Ticket No.</Label>
            <Input
              id="required-weighbridge-slip"
              value={values.weighbridgeSlipNo}
              onChange={(event) => onChange('weighbridgeSlipNo', event.target.value)}
              disabled={disabled}
              placeholder="WB-2026-001"
              className={cn(disabled && 'cursor-not-allowed opacity-50')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="required-first-weighment-time">First Weighment Time</Label>
            <Input
              id="required-first-weighment-time"
              type="time"
              value={values.firstWeighmentTime}
              onChange={(event) => onChange('firstWeighmentTime', event.target.value)}
              disabled={disabled}
              className={cn(disabled && 'cursor-not-allowed opacity-50')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="required-second-weighment-time">Second Weighment Time</Label>
            <Input
              id="required-second-weighment-time"
              type="time"
              value={values.secondWeighmentTime}
              onChange={(event) => onChange('secondWeighmentTime', event.target.value)}
              disabled={disabled}
              className={cn(disabled && 'cursor-not-allowed opacity-50')}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
