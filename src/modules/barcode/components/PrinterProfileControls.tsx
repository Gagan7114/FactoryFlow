import { Printer } from 'lucide-react';

import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui';

import type { LabelPrintMode } from './labelPrint';

interface PrinterProfileControlsProps {
  printerName: string;
  printMode: LabelPrintMode;
  onPrinterNameChange: (value: string) => void;
  onPrintModeChange: (value: LabelPrintMode) => void;
}

export default function PrinterProfileControls({
  printerName,
  printMode,
  onPrinterNameChange,
  onPrintModeChange,
}: PrinterProfileControlsProps) {
  return (
    <div className="grid gap-3 rounded border bg-muted/20 p-3 md:grid-cols-[minmax(220px,280px)_minmax(180px,220px)] md:items-end">
      <div>
        <Label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Printer className="h-3.5 w-3.5" />
          Printer
        </Label>
        <Input
          className="mt-1"
          value={printerName}
          onChange={(event) => onPrinterNameChange(event.target.value)}
          placeholder="TSC DA310"
        />
      </div>
      <div>
        <Label className="text-xs font-medium text-muted-foreground">Print Profile</Label>
        <Select
          value={printMode}
          onValueChange={(value) => onPrintModeChange(value as LabelPrintMode)}
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TSC_DA310_100X40">TSC DA310 - 100 x 40 mm</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
