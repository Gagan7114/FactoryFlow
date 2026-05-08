import { FileText, Package, Plus, Trash2, Truck, Wrench } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import {
  DriverSelect,
  type DriverSelection,
  StepFooter,
  StepHeader,
  VehicleSelect,
  type VehicleSelection,
} from '@/modules/gate/components';
import {
  Button,
  Checkbox,
  Input,
  Label,
  NativeSelect,
  SelectOption,
  Textarea,
} from '@/shared/components/ui';

import {
  REPAIR_PARTS_OUT_COMPLETED_KEY,
  REPAIR_PARTS_OUT_DRAFT_KEY,
  type RepairMovementEntry,
  type RepairMovementItem,
} from './repairMovement.storage';

type RepairPartLine = RepairMovementItem;

interface RepairPartsOutDraft {
  vehicle: VehicleSelection | null;
  driver: DriverSelection | null;
  gateOutDate: string;
  outTime: string;
  securityName: string;
  challanNo: string;
  items: RepairPartLine[];
  returnable: boolean;
  expectedReturnDate: string;
  vendorName: string;
  vendorContact: string;
  department: string;
  requestedBy: string;
  maintenanceEntryNo: string;
  manualSapRef: string;
  ewayBillNo: string;
  repairPurpose: string;
  expectedWork: string;
  remarks: string;
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
  return `RPO-${datePart}-${timePart}`;
}

function buildLineItemId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildEmptyItem(): RepairPartLine {
  return {
    id: buildLineItemId(),
    itemDescription: '',
    serialNo: '',
    qty: '',
    uom: '',
    conditionOut: '',
  };
}

function normalizeItem(item: Partial<RepairPartLine>): RepairPartLine {
  return {
    id: item.id || buildLineItemId(),
    itemDescription: item.itemDescription || '',
    serialNo: item.serialNo || '',
    qty: item.qty || '',
    uom: item.uom || '',
    conditionOut: item.conditionOut || '',
  };
}

function buildEmptyDraft(): RepairPartsOutDraft {
  return {
    vehicle: null,
    driver: null,
    gateOutDate: toDateInputValue(),
    outTime: toTimeInputValue(),
    securityName: '',
    challanNo: '',
    items: [buildEmptyItem()],
    returnable: true,
    expectedReturnDate: '',
    vendorName: '',
    vendorContact: '',
    department: '',
    requestedBy: '',
    maintenanceEntryNo: '',
    manualSapRef: '',
    ewayBillNo: '',
    repairPurpose: '',
    expectedWork: '',
    remarks: '',
  };
}

function readDraft(): RepairPartsOutDraft {
  const emptyDraft = buildEmptyDraft();
  const rawDraft = window.localStorage.getItem(REPAIR_PARTS_OUT_DRAFT_KEY);
  if (!rawDraft) return emptyDraft;

  try {
    const parsedDraft = JSON.parse(rawDraft) as Partial<RepairPartsOutDraft> & {
      itemDescription?: string;
      serialNo?: string;
      qty?: string;
      uom?: string;
      conditionOut?: string;
    };
    const parsedItems = Array.isArray(parsedDraft.items)
      ? parsedDraft.items.map(normalizeItem)
      : [];
    const legacyItems = parsedDraft.itemDescription
      ? [
          normalizeItem({
            itemDescription: parsedDraft.itemDescription,
            serialNo: parsedDraft.serialNo,
            qty: parsedDraft.qty,
            uom: parsedDraft.uom,
            conditionOut: parsedDraft.conditionOut,
          }),
        ]
      : [];

    return {
      ...emptyDraft,
      ...parsedDraft,
      items: parsedItems.length > 0 ? parsedItems : legacyItems.length > 0 ? legacyItems : emptyDraft.items,
    };
  } catch {
    return emptyDraft;
  }
}

function readEntries(): RepairMovementEntry[] {
  const rawEntries = window.localStorage.getItem(REPAIR_PARTS_OUT_COMPLETED_KEY);
  if (!rawEntries) return [];

  try {
    return JSON.parse(rawEntries) as RepairMovementEntry[];
  } catch {
    return [];
  }
}

export default function RepairPartsOutFormPage() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<RepairPartsOutDraft>(() => readDraft());
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const updateDraft = <K extends keyof RepairPartsOutDraft>(
    key: K,
    value: RepairPartsOutDraft[K],
  ) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setFormError('');
  };

  const handleReset = () => {
    window.localStorage.removeItem(REPAIR_PARTS_OUT_DRAFT_KEY);
    setDraft(buildEmptyDraft());
    setFormError('');
  };

  const updateItem = <K extends keyof RepairPartLine>(
    itemId: string,
    key: K,
    value: RepairPartLine[K],
  ) => {
    setDraft((current) => ({
      ...current,
      items: current.items.map((item) => (
        item.id === itemId ? { ...item, [key]: value } : item
      )),
    }));
    setFormError('');
  };

  const addItem = () => {
    setDraft((current) => ({
      ...current,
      items: [...current.items, buildEmptyItem()],
    }));
    setFormError('');
  };

  const removeItem = (itemId: string) => {
    setDraft((current) => {
      if (current.items.length === 1) return current;
      return {
        ...current,
        items: current.items.filter((item) => item.id !== itemId),
      };
    });
    setFormError('');
  };

  const handleComplete = () => {
    if (!draft.vehicle?.vehicleId) {
      setFormError('Please select a vehicle');
      return;
    }

    if (!draft.driver?.driverId) {
      setFormError('Please select a driver');
      return;
    }

    const trimmedItems = draft.items.map((item) => ({
      ...item,
      itemDescription: item.itemDescription.trim(),
      serialNo: item.serialNo.trim(),
      qty: item.qty.trim(),
      uom: item.uom.trim(),
      conditionOut: item.conditionOut.trim(),
    }));
    const hasBlankItem = trimmedItems.some((item) => !item.itemDescription);

    if (hasBlankItem) {
      setFormError('Please enter the item description for every part going out');
      return;
    }

    if (!draft.vendorName.trim()) {
      setFormError('Please enter the repair vendor');
      return;
    }

    if (!draft.department.trim()) {
      setFormError('Please enter the department');
      return;
    }

    setIsSaving(true);

    const now = new Date().toISOString();
    const itemDescriptions = trimmedItems.map((item) => item.itemDescription).join(', ');
    const serialNumbers = trimmedItems.map((item) => item.serialNo).filter(Boolean).join(', ');
    const conditionsOut = trimmedItems.map((item) => item.conditionOut).filter(Boolean).join(', ');
    const entry: RepairMovementEntry = {
      id: `${Date.now()}`,
      entryNo: buildEntryNo(),
      status: 'COMPLETED',
      values: {
        vehicleNo: draft.vehicle.vehicleNumber,
        vehicleType: draft.vehicle.vehicleType,
        transporterName: draft.vehicle.transporterName,
        driverName: draft.driver.driverName,
        driverMobile: draft.driver.mobileNumber,
        gateOutDate: draft.gateOutDate,
        outTime: draft.outTime,
        securityName: draft.securityName,
        challanNo: draft.challanNo,
        items: JSON.stringify(trimmedItems),
        itemCount: `${trimmedItems.length}`,
        itemDescription: itemDescriptions,
        serialNo: serialNumbers,
        qty: trimmedItems.length === 1 ? trimmedItems[0].qty : `${trimmedItems.length} lines`,
        uom: trimmedItems.length === 1 ? trimmedItems[0].uom : '',
        conditionOut: conditionsOut,
        returnable: draft.returnable,
        expectedReturnDate: draft.expectedReturnDate,
        vendorName: draft.vendorName,
        vendorContact: draft.vendorContact,
        department: draft.department,
        requestedBy: draft.requestedBy,
        maintenanceEntryNo: draft.maintenanceEntryNo,
        manualSapRef: draft.manualSapRef,
        ewayBillNo: draft.ewayBillNo,
        repairPurpose: draft.repairPurpose,
        expectedWork: draft.expectedWork,
        remarks: draft.remarks,
      },
      createdAt: now,
      updatedAt: now,
    };

    window.localStorage.setItem(
      REPAIR_PARTS_OUT_COMPLETED_KEY,
      JSON.stringify([entry, ...readEntries()]),
    );
    window.localStorage.removeItem(REPAIR_PARTS_OUT_DRAFT_KEY);
    toast.success('Repair parts gate-out completed');
    navigate('/gate/repair-parts-out');
  };

  return (
    <div className="space-y-6 pb-6">
      <StepHeader currentStep={1} totalSteps={1} title="Repair Parts Out" error={formError || null} />

      <div className="space-y-8">
        <FormSection
          icon={<Truck className="h-5 w-5" />}
          title="Vehicle & Driver"
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <VehicleSelect
              label="Vehicle Number"
              required
              value={draft.vehicle?.vehicleNumber || ''}
              onChange={(vehicle) => {
                updateDraft('vehicle', vehicle.vehicleId ? vehicle : null);
              }}
              placeholder="Select vehicle"
            />

            <DriverSelect
              label="Driver"
              required
              value={draft.driver?.driverName || ''}
              onChange={(driver) => {
                updateDraft('driver', driver.driverId ? driver : null);
              }}
              placeholder="Select driver"
            />

            <ReadOnlyDateTime
              dateLabel="Gate Out Date"
              timeLabel="Out Time"
              dateValue={draft.gateOutDate}
              timeValue={draft.outTime}
            />

            <TextField
              id="repair-out-security-name"
              label="Security Name"
              value={draft.securityName}
              onChange={(value) => updateDraft('securityName', value)}
              placeholder="Security staff name"
            />

            <TextField
              id="repair-out-challan-no"
              label="Challan No."
              value={draft.challanNo}
              onChange={(value) => updateDraft('challanNo', value)}
            />
          </div>
        </FormSection>

        <FormSection
          icon={<Package className="h-5 w-5" />}
          title="Parts Going Out"
        >
          <div className="space-y-5">
            {draft.items.map((item, index) => (
              <div
                key={item.id}
                className="grid gap-4 border-t pt-5 first:border-t-0 first:pt-0 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_120px_120px_minmax(0,1fr)_auto]"
              >
                <TextField
                  id={`repair-out-item-description-${item.id}`}
                  label={`Item ${index + 1} Description`}
                  required
                  value={item.itemDescription}
                  onChange={(value) => updateItem(item.id, 'itemDescription', value)}
                  placeholder="Part or item going out"
                />

                <TextField
                  id={`repair-out-serial-no-${item.id}`}
                  label="Serial No."
                  value={item.serialNo}
                  onChange={(value) => updateItem(item.id, 'serialNo', value)}
                />

                <TextField
                  id={`repair-out-qty-${item.id}`}
                  label="Qty"
                  type="number"
                  value={item.qty}
                  onChange={(value) => updateItem(item.id, 'qty', value)}
                  min="0"
                  step="0.001"
                />

                <TextField
                  id={`repair-out-uom-${item.id}`}
                  label="UOM"
                  value={item.uom}
                  onChange={(value) => updateItem(item.id, 'uom', value)}
                />

                <SelectField
                  id={`repair-out-condition-${item.id}`}
                  label="Condition Out"
                  value={item.conditionOut}
                  onChange={(value) => updateItem(item.id, 'conditionOut', value)}
                  placeholder="Select condition"
                  options={['Working', 'Damaged', 'Needs Repair', 'Not Checked']}
                />

                <div className="flex items-end justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={draft.items.length === 1}
                    onClick={() => removeItem(item.id)}
                    aria-label={`Remove item ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            <Button type="button" variant="outline" onClick={addItem}>
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>

            <div className="grid gap-4 border-t pt-5 sm:grid-cols-[minmax(0,1fr)_220px]">
              <TextField
                id="repair-out-expected-return"
                label="Expected Return Date"
                type="date"
                value={draft.expectedReturnDate}
                onChange={(value) => updateDraft('expectedReturnDate', value)}
              />

              <div className="flex items-center gap-3 pt-7">
                <Checkbox
                  id="repair-out-returnable"
                  checked={draft.returnable}
                  onCheckedChange={(checked) => updateDraft('returnable', Boolean(checked))}
                />
                <Label htmlFor="repair-out-returnable">Returnable</Label>
              </div>
            </div>
          </div>
        </FormSection>

        <FormSection
          icon={<FileText className="h-5 w-5" />}
          title="Vendor & Department"
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <TextField
              id="repair-out-vendor"
              label="Repair Vendor"
              required
              value={draft.vendorName}
              onChange={(value) => updateDraft('vendorName', value)}
            />

            <TextField
              id="repair-out-vendor-contact"
              label="Vendor Contact"
              value={draft.vendorContact}
              onChange={(value) => updateDraft('vendorContact', value)}
            />

            <TextField
              id="repair-out-department"
              label="Department"
              required
              value={draft.department}
              onChange={(value) => updateDraft('department', value)}
            />

            <TextField
              id="repair-out-requested-by"
              label="Requested By"
              value={draft.requestedBy}
              onChange={(value) => updateDraft('requestedBy', value)}
            />

            <TextField
              id="repair-out-maintenance-entry"
              label="Maintenance Entry No."
              value={draft.maintenanceEntryNo}
              onChange={(value) => updateDraft('maintenanceEntryNo', value)}
            />

            <TextField
              id="repair-out-manual-sap-ref"
              label="Manual SAP Reference"
              value={draft.manualSapRef}
              onChange={(value) => updateDraft('manualSapRef', value)}
            />

            <TextField
              id="repair-out-eway-bill"
              label="E-way Bill No."
              value={draft.ewayBillNo}
              onChange={(value) => updateDraft('ewayBillNo', value)}
            />
          </div>
        </FormSection>

        <FormSection
          icon={<Wrench className="h-5 w-5" />}
          title="Repair Details"
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <SelectField
              id="repair-out-purpose"
              label="Repair Purpose"
              value={draft.repairPurpose}
              onChange={(value) => updateDraft('repairPurpose', value)}
              placeholder="Select purpose"
              options={['Repair', 'Service', 'Calibration', 'Exchange', 'Scrap Return']}
            />

            <div />

            <TextAreaField
              id="repair-out-expected-work"
              label="Expected Work"
              value={draft.expectedWork}
              onChange={(value) => updateDraft('expectedWork', value)}
              placeholder="Work expected from vendor"
            />

            <TextAreaField
              id="repair-out-remarks"
              label="Remarks"
              value={draft.remarks}
              onChange={(value) => updateDraft('remarks', value)}
              placeholder="Optional notes"
            />
          </div>
        </FormSection>
      </div>

      <StepFooter
        onCancel={() => navigate('/gate/repair-parts-out')}
        onNext={handleComplete}
        showPrevious={false}
        isSaving={isSaving}
        nextLabel={isSaving ? 'Saving...' : 'Complete Gate Out'}
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
        <Label htmlFor="repair-out-gate-date">
          {dateLabel} <span className="text-destructive">*</span>
        </Label>
        <Input
          id="repair-out-gate-date"
          type="date"
          value={dateValue}
          readOnly
          disabled
          aria-readonly="true"
          className={lockedDateTimeInputClassName}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="repair-out-gate-time">
          {timeLabel} <span className="text-destructive">*</span>
        </Label>
        <Input
          id="repair-out-gate-time"
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
  type?: 'text' | 'date' | 'number';
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
    <div className="space-y-2">
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
