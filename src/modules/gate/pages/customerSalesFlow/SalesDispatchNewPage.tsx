import { FileText, PackageCheck, ShieldCheck, Truck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import {
  DriverSelect,
  type DriverSelection,
  StepFooter,
  StepHeader,
  VehicleSelect,
  type VehicleSelection,
} from '@/modules/gate/components';
import { Checkbox, Input, Label, NativeSelect, SelectOption } from '@/shared/components/ui';

import {
  buildCustomerFlowEntryNo,
  type CustomerFlowEntry,
  findCustomerFlowEntry,
  getCustomerFlowValue,
  readCustomerFlowEntries,
  SALES_DISPATCH_KEY,
  SAMPLE_DELIVERIES,
  upsertCustomerFlowEntry,
} from './customerSalesFlow.storage';

interface DispatchDraft {
  vehicle: VehicleSelection | null;
  driver: DriverSelection | null;
  deliveryId: string;
  gateOutDate: string;
  outTime: string;
  sealNo: string;
  securityName: string;
  invoiceChecked: boolean;
  deliveryNoteChecked: boolean;
  ewayBillChecked: boolean;
  lrChecked: boolean;
  goodsIssuePosted: boolean;
  pgiDocumentNo: string;
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

function getRawString(entry: CustomerFlowEntry, key: string) {
  const value = entry.values[key];
  return typeof value === 'string' ? value : '';
}

function getRawBoolean(entry: CustomerFlowEntry, key: string) {
  const value = entry.values[key];
  return typeof value === 'boolean' ? value : value === 'true' || value === 'Yes';
}

function buildVehicleFromEntry(entry: CustomerFlowEntry): VehicleSelection | null {
  const vehicleNumber = getRawString(entry, 'vehicleNo');
  if (!vehicleNumber) return null;

  return {
    vehicleId: Number(getRawString(entry, 'vehicleId')) || 1,
    vehicleNumber,
    vehicleType: getRawString(entry, 'vehicleType'),
    vehicleCapacity: '',
    transporterId: Number(getRawString(entry, 'transporterId')) || 0,
    transporterName: getRawString(entry, 'transporterName'),
    transporterContactPerson: '',
    transporterMobile: '',
  };
}

function buildDriverFromEntry(entry: CustomerFlowEntry): DriverSelection | null {
  const driverName = getRawString(entry, 'driverName');
  if (!driverName) return null;

  return {
    driverId: Number(getRawString(entry, 'driverId')) || 1,
    driverName,
    mobileNumber: getRawString(entry, 'driverMobile'),
    drivingLicenseNumber: '',
    idProofType: '',
    idProofNumber: '',
    driverPhoto: null,
  };
}

function getDeliveryIdFromEntry(entry: CustomerFlowEntry) {
  const savedDeliveryId = getRawString(entry, 'selectedDeliveryId');
  if (savedDeliveryId) return savedDeliveryId;

  const outboundDeliveryNo = getRawString(entry, 'outboundDeliveryNo');
  return SAMPLE_DELIVERIES.find(
    (delivery) => getCustomerFlowValue(delivery, 'outboundDeliveryNo') === outboundDeliveryNo,
  )?.id || '';
}

function buildEmptyDraft(): DispatchDraft {
  return {
    vehicle: null,
    driver: null,
    deliveryId: '',
    gateOutDate: toDateInputValue(),
    outTime: toTimeInputValue(),
    sealNo: '',
    securityName: '',
    invoiceChecked: false,
    deliveryNoteChecked: false,
    ewayBillChecked: false,
    lrChecked: false,
    goodsIssuePosted: true,
    pgiDocumentNo: '',
  };
}

function buildDraftFromEntry(entry: CustomerFlowEntry | null): DispatchDraft {
  if (!entry) return buildEmptyDraft();

  return {
    vehicle: buildVehicleFromEntry(entry),
    driver: buildDriverFromEntry(entry),
    deliveryId: getDeliveryIdFromEntry(entry),
    gateOutDate: getRawString(entry, 'gateOutDate') || toDateInputValue(),
    outTime: getRawString(entry, 'outTime') || toTimeInputValue(),
    sealNo: getRawString(entry, 'sealNo'),
    securityName: getRawString(entry, 'securityName'),
    invoiceChecked: getRawBoolean(entry, 'invoiceChecked'),
    deliveryNoteChecked: getRawBoolean(entry, 'deliveryNoteChecked'),
    ewayBillChecked: getRawBoolean(entry, 'ewayBillChecked'),
    lrChecked: getRawBoolean(entry, 'lrChecked'),
    goodsIssuePosted: getRawBoolean(entry, 'goodsIssuePosted'),
    pgiDocumentNo: getRawString(entry, 'pgiDocumentNo'),
  };
}

export default function SalesDispatchNewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const entryId = searchParams.get('entryId');
  const existingEntry = useMemo(
    () => (entryId ? findCustomerFlowEntry(SALES_DISPATCH_KEY, entryId) : null),
    [entryId],
  );
  const [draft, setDraft] = useState<DispatchDraft>(() => buildDraftFromEntry(existingEntry));
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const completedDeliveryNos = useMemo(
    () => new Set(
      readCustomerFlowEntries(SALES_DISPATCH_KEY)
        .filter((entry) => entry.status !== 'CANCELLED' && entry.id !== existingEntry?.id)
        .map((entry) => getCustomerFlowValue(entry, 'outboundDeliveryNo')),
    ),
    [existingEntry?.id],
  );
  const availableDeliveries = useMemo(
    () => SAMPLE_DELIVERIES.filter(
      (delivery) => !completedDeliveryNos.has(getCustomerFlowValue(delivery, 'outboundDeliveryNo')),
    ),
    [completedDeliveryNos],
  );
  const selectedDelivery = availableDeliveries.find((delivery) => delivery.id === draft.deliveryId) || null;

  const updateDraft = <K extends keyof DispatchDraft>(key: K, value: DispatchDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setFormError('');
  };

  const handleSaveAndNext = () => {
    if (!selectedDelivery) {
      setFormError('Please select the SAP outbound delivery');
      return;
    }

    if (!draft.vehicle?.vehicleId) {
      setFormError('Please select a vehicle');
      return;
    }

    if (!draft.driver?.driverId) {
      setFormError('Please select a driver');
      return;
    }

    if (!draft.sealNo.trim()) {
      setFormError('Please enter the seal number');
      return;
    }

    if (!draft.invoiceChecked || !draft.deliveryNoteChecked || !draft.ewayBillChecked || !draft.lrChecked) {
      setFormError('Please complete all document checks');
      return;
    }

    setIsSaving(true);
    const now = new Date().toISOString();
    const entry: CustomerFlowEntry = {
      id: existingEntry?.id || now,
      entryNo: existingEntry?.entryNo || buildCustomerFlowEntryNo('SDO'),
      status: existingEntry?.status === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS',
      values: {
        ...selectedDelivery.values,
        ...existingEntry?.values,
        selectedDeliveryId: selectedDelivery.id,
        vehicleId: String(draft.vehicle.vehicleId),
        vehicleNo: draft.vehicle.vehicleNumber,
        vehicleType: draft.vehicle.vehicleType,
        transporterId: String(draft.vehicle.transporterId || ''),
        transporterName: draft.vehicle.transporterName || getCustomerFlowValue(selectedDelivery, 'transporterName'),
        driverId: String(draft.driver.driverId),
        driverName: draft.driver.driverName,
        driverMobile: draft.driver.mobileNumber,
        gateOutDate: draft.gateOutDate,
        outTime: draft.outTime,
        sealNo: draft.sealNo,
        securityName: draft.securityName,
        invoiceChecked: draft.invoiceChecked,
        deliveryNoteChecked: draft.deliveryNoteChecked,
        ewayBillChecked: draft.ewayBillChecked,
        lrChecked: draft.lrChecked,
        goodsIssuePosted: draft.goodsIssuePosted,
        pgiDocumentNo: draft.pgiDocumentNo,
      },
      items: selectedDelivery.items,
      createdAt: existingEntry?.createdAt || now,
      updatedAt: now,
    };

    upsertCustomerFlowEntry(SALES_DISPATCH_KEY, entry);
    toast.success('Dispatch details saved');
    navigate(`/gate/sales-dispatch/new/attachments?entryId=${encodeURIComponent(entry.id)}`);
  };

  return (
    <div className="space-y-6 pb-6">
      <StepHeader currentStep={1} totalSteps={2} title="Sales Dispatch Out" error={formError || null} />

      <div className="space-y-8">
        <FormSection icon={<Truck className="h-5 w-5" />} title="Vehicle & Driver">
          <div className="grid gap-4 lg:grid-cols-2">
            <VehicleSelect
              label="Vehicle Number"
              required
              value={draft.vehicle?.vehicleNumber || ''}
              onChange={(vehicle) => updateDraft('vehicle', vehicle.vehicleId ? vehicle : null)}
              placeholder="Select vehicle"
            />
            <DriverSelect
              label="Driver"
              required
              value={draft.driver?.driverName || ''}
              onChange={(driver) => updateDraft('driver', driver.driverId ? driver : null)}
              placeholder="Select driver"
            />
            <ReadOnlyDateTime
              dateValue={draft.gateOutDate}
              timeValue={draft.outTime}
            />
            <TextField
              id="sales-dispatch-security"
              label="Security Name"
              value={draft.securityName}
              onChange={(value) => updateDraft('securityName', value)}
              placeholder="Security staff name"
            />
          </div>
        </FormSection>

        <FormSection icon={<FileText className="h-5 w-5" />} title="SAP Outbound Delivery">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="sales-dispatch-delivery">
                SAP Outbound Delivery <span className="text-destructive">*</span>
              </Label>
              <NativeSelect
                id="sales-dispatch-delivery"
                value={draft.deliveryId}
                required
                placeholder={availableDeliveries.length ? 'Select SAP outbound delivery' : 'No open deliveries'}
                onChange={(event) => updateDraft('deliveryId', event.target.value)}
              >
                {availableDeliveries.map((delivery) => (
                  <SelectOption key={delivery.id} value={delivery.id}>
                    {[
                      getCustomerFlowValue(delivery, 'outboundDeliveryNo'),
                      getCustomerFlowValue(delivery, 'salesOrderNo'),
                      getCustomerFlowValue(delivery, 'customerName'),
                    ].join(' - ')}
                  </SelectOption>
                ))}
              </NativeSelect>
            </div>

            <ReadOnlyTextField label="Customer" value={selectedDelivery ? getCustomerFlowValue(selectedDelivery, 'customerName') : ''} />
            <ReadOnlyTextField label="Invoice" value={selectedDelivery ? getCustomerFlowValue(selectedDelivery, 'invoiceNo') : ''} />
            <ReadOnlyTextField label="Delivery Note" value={selectedDelivery ? getCustomerFlowValue(selectedDelivery, 'deliveryNoteNo') : ''} />
            <ReadOnlyTextField label="Ship To" value={selectedDelivery ? getCustomerFlowValue(selectedDelivery, 'shipTo') : ''} />
          </div>
        </FormSection>

        <FormSection icon={<PackageCheck className="h-5 w-5" />} title="Delivery Lines">
          <ItemsTable items={selectedDelivery?.items || []} />
        </FormSection>

        <FormSection icon={<ShieldCheck className="h-5 w-5" />} title="Gate Checks">
          <div className="grid gap-4 lg:grid-cols-2">
            <TextField
              id="sales-dispatch-seal"
              label="Seal No."
              required
              value={draft.sealNo}
              onChange={(value) => updateDraft('sealNo', value)}
            />
            <TextField
              id="sales-dispatch-pgi"
              label="PGI / Goods Issue Doc No."
              value={draft.pgiDocumentNo}
              onChange={(value) => updateDraft('pgiDocumentNo', value)}
              placeholder="Optional SAP reference"
            />

            <CheckField id="sales-dispatch-invoice" label="Invoice Checked" checked={draft.invoiceChecked} onChange={(value) => updateDraft('invoiceChecked', value)} />
            <CheckField id="sales-dispatch-dn" label="Delivery Note Checked" checked={draft.deliveryNoteChecked} onChange={(value) => updateDraft('deliveryNoteChecked', value)} />
            <CheckField id="sales-dispatch-eway" label="E-way Bill Checked" checked={draft.ewayBillChecked} onChange={(value) => updateDraft('ewayBillChecked', value)} />
            <CheckField id="sales-dispatch-lr" label="LR / Freight Doc Checked" checked={draft.lrChecked} onChange={(value) => updateDraft('lrChecked', value)} />
            <CheckField id="sales-dispatch-pgi-posted" label="Goods Issue Posted" checked={draft.goodsIssuePosted} onChange={(value) => updateDraft('goodsIssuePosted', value)} />
          </div>
        </FormSection>
      </div>

      <StepFooter
        onCancel={() => navigate('/gate/sales-dispatch')}
        onNext={handleSaveAndNext}
        showPrevious={false}
        isSaving={isSaving}
        nextLabel={isSaving ? 'Saving...' : 'Save and Next'}
      />
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

function ReadOnlyDateTime({ dateValue, timeValue }: { dateValue: string; timeValue: string }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="sales-dispatch-date">
          Gate Out Date <span className="text-destructive">*</span>
        </Label>
        <Input id="sales-dispatch-date" type="date" value={dateValue} readOnly disabled className={lockedDateTimeInputClassName} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="sales-dispatch-time">
          Out Time <span className="text-destructive">*</span>
        </Label>
        <Input id="sales-dispatch-time" type="time" value={timeValue} readOnly disabled className={lockedDateTimeInputClassName} />
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
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required ? <span className="ml-1 text-destructive">*</span> : null}
      </Label>
      <Input id={id} value={value} required={required} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function ReadOnlyTextField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value || '-'} readOnly disabled className={lockedDateTimeInputClassName} />
    </div>
  );
}

function CheckField({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border px-3 py-2">
      <Checkbox id={id} checked={checked} onCheckedChange={(value) => onChange(Boolean(value))} />
      <Label htmlFor={id}>{label}</Label>
    </div>
  );
}

function ItemsTable({ items }: { items: CustomerFlowEntry['items'] }) {
  return (
    <div className="overflow-hidden rounded-md border">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-3 text-left text-sm font-medium">Item Code</th>
              <th className="p-3 text-left text-sm font-medium">Item</th>
              <th className="p-3 text-left text-sm font-medium">Order Qty</th>
              <th className="p-3 text-left text-sm font-medium">Dispatch Qty</th>
              <th className="p-3 text-left text-sm font-medium">UOM</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="h-20 p-3 text-center text-sm text-muted-foreground">
                  Select an outbound delivery to view lines
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="whitespace-nowrap p-3 text-sm">{item.itemCode}</td>
                  <td className="p-3 text-sm font-medium">{item.itemName}</td>
                  <td className="whitespace-nowrap p-3 text-sm">{item.orderQty}</td>
                  <td className="whitespace-nowrap p-3 text-sm">{item.dispatchedQty}</td>
                  <td className="whitespace-nowrap p-3 text-sm">{item.uom}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
