import { ArrowDownToLine, PackageCheck, Truck, Wrench } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { StepFooter, StepHeader } from '@/modules/gate/components';
import { Input, Label, NativeSelect, SelectOption, Textarea } from '@/shared/components/ui';

import {
  buildRepairMovementItemsSummary,
  getRepairMovementValue,
  parseRepairMovementItems,
  readRepairMovementEntries,
  REPAIR_PARTS_IN_COMPLETED_KEY,
  REPAIR_PARTS_IN_DRAFT_KEY,
  REPAIR_PARTS_OUT_COMPLETED_KEY,
  type RepairMovementEntry,
  type RepairMovementItem,
} from './repairMovement.storage';

interface RepairPartsInDraft {
  sourceOutEntry: string;
  gateInDate: string;
  inTime: string;
  securityName: string;
  vendorChallanNo: string;
  vendorName: string;
  maintenanceEntryNo: string;
  department: string;
  receivedBy: string;
  manualSapRef: string;
  repairCost: string;
  conditionIn: string;
  repairStatus: string;
  remarks: string;
  vehicleNo: string;
  driverName: string;
  items: RepairMovementItem[];
  itemDescription: string;
  serialNo: string;
  qty: string;
  uom: string;
}

const lockedDateTimeInputClassName =
  'bg-muted/40 text-foreground disabled:cursor-not-allowed disabled:opacity-100';

function toDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toTimeInputValue(date = new Date()) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function buildEntryNo() {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timePart = now.toTimeString().slice(0, 8).replace(/:/g, '');
  return `RPI-${datePart}-${timePart}`;
}

function buildEmptyDraft(): RepairPartsInDraft {
  return {
    sourceOutEntry: '',
    gateInDate: toDateInputValue(),
    inTime: toTimeInputValue(),
    securityName: '',
    vendorChallanNo: '',
    vendorName: '',
    maintenanceEntryNo: '',
    department: '',
    receivedBy: '',
    manualSapRef: '',
    repairCost: '',
    conditionIn: '',
    repairStatus: 'Received',
    remarks: '',
    vehicleNo: '',
    driverName: '',
    items: [],
    itemDescription: '',
    serialNo: '',
    qty: '',
    uom: '',
  };
}

function normalizeItem(item: Partial<RepairMovementItem>, index: number): RepairMovementItem {
  return {
    id: item.id || `line-${index + 1}`,
    itemDescription: item.itemDescription || '',
    serialNo: item.serialNo || '',
    qty: item.qty || '',
    uom: item.uom || '',
    conditionOut: item.conditionOut || '',
  };
}

function parseDraftItems(value: unknown): RepairMovementItem[] {
  if (Array.isArray(value)) {
    return value.map((item, index) => normalizeItem(item, index));
  }

  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value) as Partial<RepairMovementItem>[];
      return Array.isArray(parsed)
        ? parsed.map((item, index) => normalizeItem(item, index))
        : [];
    } catch {
      return [];
    }
  }

  return [];
}

function readDraft(): RepairPartsInDraft {
  const emptyDraft = buildEmptyDraft();
  const rawDraft = window.localStorage.getItem(REPAIR_PARTS_IN_DRAFT_KEY);
  if (!rawDraft) return emptyDraft;

  try {
    const parsedDraft = JSON.parse(rawDraft) as Partial<RepairPartsInDraft> & {
      items?: unknown;
    };
    const parsedItems = parseDraftItems(parsedDraft.items);

    return {
      ...emptyDraft,
      ...parsedDraft,
      items: parsedItems,
    };
  } catch {
    return emptyDraft;
  }
}

function readEntries(): RepairMovementEntry[] {
  return readRepairMovementEntries(REPAIR_PARTS_IN_COMPLETED_KEY);
}

function copySourceValue(entry: RepairMovementEntry, key: string) {
  const value = getRepairMovementValue(entry, key);
  return value === '-' ? '' : value;
}

function buildDraftFromSource(
  currentDraft: RepairPartsInDraft,
  sourceEntry: RepairMovementEntry,
): RepairPartsInDraft {
  const items = parseRepairMovementItems(sourceEntry);
  const itemSummary = buildRepairMovementItemsSummary(sourceEntry);
  const serialNos = items.map((item) => item.serialNo).filter(Boolean).join(', ');

  return {
    ...currentDraft,
    sourceOutEntry: sourceEntry.entryNo,
    vendorName: copySourceValue(sourceEntry, 'vendorName'),
    maintenanceEntryNo: copySourceValue(sourceEntry, 'maintenanceEntryNo'),
    department: copySourceValue(sourceEntry, 'department'),
    vehicleNo: copySourceValue(sourceEntry, 'vehicleNo'),
    driverName: copySourceValue(sourceEntry, 'driverName'),
    items,
    itemDescription: itemSummary === '-' ? '' : itemSummary,
    serialNo: serialNos,
    qty: items.length === 1 ? items[0].qty : '',
    uom: items.length === 1 ? items[0].uom : '',
  };
}

export default function RepairPartsInFormPage() {
  const navigate = useNavigate();
  const sourceOutEntries = useMemo(
    () => readRepairMovementEntries(REPAIR_PARTS_OUT_COMPLETED_KEY),
    [],
  );
  const sourceOutEntryByNo = useMemo(
    () => new Map(sourceOutEntries.map((entry) => [entry.entryNo, entry])),
    [sourceOutEntries],
  );
  const completedInEntries = useMemo(() => readEntries(), []);
  const linkedOutEntries = useMemo(
    () => new Set(
      completedInEntries
        .filter((entry) => entry.status !== 'CANCELLED')
        .map((entry) => getRepairMovementValue(entry, 'sourceOutEntry')),
    ),
    [completedInEntries],
  );
  const sourceOutOptions = useMemo(
    () => sourceOutEntries
      .filter((entry) => entry.status !== 'CANCELLED')
      .filter((entry) => getRepairMovementValue(entry, 'returnable') === 'Yes')
      .filter((entry) => !linkedOutEntries.has(entry.entryNo))
      .map((entry) => {
        const item = buildRepairMovementItemsSummary(entry);
        const vendor = getRepairMovementValue(entry, 'vendorName');
        const vehicle = getRepairMovementValue(entry, 'vehicleNo');

        return {
          label: [entry.entryNo, item, vendor, vehicle].filter((part) => part !== '-').join(' - '),
          value: entry.entryNo,
        };
      }),
    [linkedOutEntries, sourceOutEntries],
  );

  const [draft, setDraft] = useState<RepairPartsInDraft>(() => readDraft());
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const updateDraft = <K extends keyof RepairPartsInDraft>(
    key: K,
    value: RepairPartsInDraft[K],
  ) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setFormError('');
  };

  const handleSourceChange = (entryNo: string) => {
    const sourceEntry = sourceOutEntryByNo.get(entryNo);
    setDraft((current) => (
      sourceEntry
        ? buildDraftFromSource(current, sourceEntry)
        : { ...current, sourceOutEntry: entryNo, items: [], itemDescription: '', serialNo: '', qty: '', uom: '' }
    ));
    setFormError('');
  };

  const handleReset = () => {
    window.localStorage.removeItem(REPAIR_PARTS_IN_DRAFT_KEY);
    setDraft(buildEmptyDraft());
    setFormError('');
  };

  const handleComplete = () => {
    if (!draft.sourceOutEntry) {
      setFormError('Please select the repair parts out entry');
      return;
    }

    if (readEntries().some((entry) => (
      entry.status !== 'CANCELLED'
      && getRepairMovementValue(entry, 'sourceOutEntry') === draft.sourceOutEntry
    ))) {
      setFormError('This repair parts out entry has already been received');
      return;
    }

    if (draft.items.length === 0) {
      setFormError('The selected repair parts out entry has no item details');
      return;
    }

    if (!draft.vendorName.trim()) {
      setFormError('Please enter the repair vendor');
      return;
    }

    if (!draft.conditionIn) {
      setFormError('Please select the condition in');
      return;
    }

    if (!draft.repairStatus) {
      setFormError('Please select the repair status');
      return;
    }

    setIsSaving(true);

    const now = new Date().toISOString();
    const itemDescriptions = draft.items.map((item) => item.itemDescription).join(', ');
    const serialNumbers = draft.items.map((item) => item.serialNo).filter(Boolean).join(', ');
    const entry: RepairMovementEntry = {
      id: `${Date.now()}`,
      entryNo: buildEntryNo(),
      status: 'COMPLETED',
      values: {
        sourceOutEntry: draft.sourceOutEntry,
        gateInDate: draft.gateInDate,
        inTime: draft.inTime,
        securityName: draft.securityName,
        vendorChallanNo: draft.vendorChallanNo,
        vendorName: draft.vendorName,
        maintenanceEntryNo: draft.maintenanceEntryNo,
        department: draft.department,
        receivedBy: draft.receivedBy,
        manualSapRef: draft.manualSapRef,
        repairCost: draft.repairCost,
        conditionIn: draft.conditionIn,
        repairStatus: draft.repairStatus,
        remarks: draft.remarks,
        vehicleNo: draft.vehicleNo,
        driverName: draft.driverName,
        items: JSON.stringify(draft.items),
        itemCount: `${draft.items.length}`,
        itemDescription: itemDescriptions,
        serialNo: serialNumbers,
        qty: draft.items.length === 1 ? draft.items[0].qty : `${draft.items.length} lines`,
        uom: draft.items.length === 1 ? draft.items[0].uom : '',
      },
      createdAt: now,
      updatedAt: now,
    };

    window.localStorage.setItem(
      REPAIR_PARTS_IN_COMPLETED_KEY,
      JSON.stringify([entry, ...readEntries()]),
    );
    window.localStorage.removeItem(REPAIR_PARTS_IN_DRAFT_KEY);
    toast.success('Repair parts gate-in completed');
    navigate('/gate/repair-parts-in');
  };

  return (
    <div className="space-y-6 pb-6">
      <StepHeader currentStep={1} totalSteps={1} title="Repair Parts In" error={formError || null} />

      <div className="space-y-8">
        <FormSection icon={<ArrowDownToLine className="h-5 w-5" />} title="Gate In">
          <div className="grid gap-4 lg:grid-cols-2">
            <SourceOutSelect
              value={draft.sourceOutEntry}
              options={sourceOutOptions}
              onChange={handleSourceChange}
            />

            <ReadOnlyDateTime
              dateLabel="Gate In Date"
              timeLabel="In Time"
              dateValue={draft.gateInDate}
              timeValue={draft.inTime}
            />

            <TextField
              id="repair-in-security-name"
              label="Security Name"
              value={draft.securityName}
              onChange={(value) => updateDraft('securityName', value)}
              placeholder="Security staff name"
            />

            <TextField
              id="repair-in-vendor-challan"
              label="Vendor Challan No."
              value={draft.vendorChallanNo}
              onChange={(value) => updateDraft('vendorChallanNo', value)}
            />
          </div>
        </FormSection>

        <FormSection icon={<Truck className="h-5 w-5" />} title="Source Vehicle & Vendor">
          <div className="grid gap-4 lg:grid-cols-2">
            <ReadOnlyTextField id="repair-in-vehicle" label="Vehicle No." value={draft.vehicleNo} />
            <ReadOnlyTextField id="repair-in-driver" label="Driver Name" value={draft.driverName} />

            <TextField
              id="repair-in-vendor"
              label="Repair Vendor"
              required
              value={draft.vendorName}
              onChange={(value) => updateDraft('vendorName', value)}
            />

            <TextField
              id="repair-in-department"
              label="Department"
              value={draft.department}
              onChange={(value) => updateDraft('department', value)}
            />

            <TextField
              id="repair-in-maintenance-entry"
              label="Maintenance Entry No."
              value={draft.maintenanceEntryNo}
              onChange={(value) => updateDraft('maintenanceEntryNo', value)}
            />

            <TextField
              id="repair-in-received-by"
              label="Received By"
              value={draft.receivedBy}
              onChange={(value) => updateDraft('receivedBy', value)}
            />

            <TextField
              id="repair-in-manual-sap-ref"
              label="Manual SAP Reference"
              value={draft.manualSapRef}
              onChange={(value) => updateDraft('manualSapRef', value)}
            />
          </div>
        </FormSection>

        <FormSection icon={<PackageCheck className="h-5 w-5" />} title="Items Received">
          <RepairItemsTable items={draft.items} />

          <div className="grid gap-4 lg:grid-cols-2">
            <TextField
              id="repair-in-repair-cost"
              label="Repair Cost"
              type="number"
              min="0"
              step="0.01"
              value={draft.repairCost}
              onChange={(value) => updateDraft('repairCost', value)}
            />
          </div>
        </FormSection>

        <FormSection icon={<Wrench className="h-5 w-5" />} title="Condition">
          <div className="grid gap-4 lg:grid-cols-2">
            <SelectField
              id="repair-in-condition"
              label="Condition In"
              required
              value={draft.conditionIn}
              onChange={(value) => updateDraft('conditionIn', value)}
              placeholder="Select condition"
              options={['Working', 'Repaired', 'Rejected', 'Partially Repaired', 'Not Checked']}
            />

            <SelectField
              id="repair-in-status"
              label="Repair Status"
              required
              value={draft.repairStatus}
              onChange={(value) => updateDraft('repairStatus', value)}
              placeholder="Select status"
              options={['Received', 'Repaired', 'Rejected', 'Partially Received']}
            />

            <TextAreaField
              id="repair-in-remarks"
              label="Remarks"
              value={draft.remarks}
              onChange={(value) => updateDraft('remarks', value)}
              placeholder="Optional notes"
            />
          </div>
        </FormSection>
      </div>

      <StepFooter
        onCancel={() => navigate('/gate/repair-parts-in')}
        onNext={handleComplete}
        showPrevious={false}
        isSaving={isSaving}
        nextLabel={isSaving ? 'Saving...' : 'Complete Gate In'}
      />

      <button
        type="button"
        className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        onClick={handleReset}
      >
        Reset form
      </button>
    </div>
  );
}

function FormSection({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 border-t pt-6 first:border-t-0 first:pt-0">
      <h3 className="flex items-center gap-2 text-xl font-semibold">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}

function SourceOutSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2 lg:col-span-2">
      <Label htmlFor="repair-in-source-out-entry">
        Repair Out Entry <span className="ml-1 text-destructive">*</span>
      </Label>
      <NativeSelect
        id="repair-in-source-out-entry"
        value={value}
        required
        disabled={options.length === 0}
        placeholder={options.length > 0 ? 'Select repair out entry' : 'No pending repair out entries'}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <SelectOption key={option.value} value={option.value}>
            {option.label}
          </SelectOption>
        ))}
      </NativeSelect>
    </div>
  );
}

function ReadOnlyDateTime({
  dateLabel,
  timeLabel,
  dateValue,
  timeValue,
}: {
  dateLabel: string;
  timeLabel: string;
  dateValue: string;
  timeValue: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="repair-in-gate-date">
          {dateLabel} <span className="text-destructive">*</span>
        </Label>
        <Input
          id="repair-in-gate-date"
          type="date"
          value={dateValue}
          readOnly
          disabled
          aria-readonly="true"
          className={lockedDateTimeInputClassName}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="repair-in-gate-time">
          {timeLabel} <span className="text-destructive">*</span>
        </Label>
        <Input
          id="repair-in-gate-time"
          type="time"
          value={timeValue}
          readOnly
          disabled
          aria-readonly="true"
          className={lockedDateTimeInputClassName}
        />
      </div>
    </div>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  required,
  placeholder,
  type = 'text',
  min,
  step,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  type?: 'text' | 'number';
  min?: string;
  step?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required ? <span className="ml-1 text-destructive">*</span> : null}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        min={min}
        step={step}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function ReadOnlyTextField({
  id,
  label,
  value,
}: {
  id: string;
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value || '-'}
        readOnly
        disabled
        aria-readonly="true"
        className={lockedDateTimeInputClassName}
      />
    </div>
  );
}

function RepairItemsTable({ items }: { items: RepairMovementItem[] }) {
  return (
    <div className="overflow-hidden rounded-md border">
      <div className="max-w-full overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-3 text-left text-sm font-medium">Item</th>
              <th className="p-3 text-left text-sm font-medium">Serial No.</th>
              <th className="p-3 text-left text-sm font-medium">Qty</th>
              <th className="p-3 text-left text-sm font-medium">UOM</th>
              <th className="p-3 text-left text-sm font-medium">Condition Out</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="h-20 p-3 text-center text-sm text-muted-foreground">
                  Select a repair out entry to view items
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="p-3 text-sm font-medium">{item.itemDescription || '-'}</td>
                  <td className="whitespace-nowrap p-3 text-sm">{item.serialNo || '-'}</td>
                  <td className="whitespace-nowrap p-3 text-sm">{item.qty || '-'}</td>
                  <td className="whitespace-nowrap p-3 text-sm">{item.uom || '-'}</td>
                  <td className="whitespace-nowrap p-3 text-sm">{item.conditionOut || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TextAreaField({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2 lg:col-span-2">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={4}
      />
    </div>
  );
}

function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  required,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required ? <span className="ml-1 text-destructive">*</span> : null}
      </Label>
      <NativeSelect
        id={id}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <SelectOption key={option} value={option}>
            {option}
          </SelectOption>
        ))}
      </NativeSelect>
    </div>
  );
}
