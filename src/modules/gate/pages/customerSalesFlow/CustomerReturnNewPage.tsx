import { FileCheck2, PackageX, Truck } from 'lucide-react';
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
import { Input, Label, NativeSelect, SelectOption } from '@/shared/components/ui';

import {
  buildCustomerFlowEntryNo,
  CUSTOMER_RETURN_KEY,
  type CustomerFlowEntry,
  type CustomerFlowItem,
  findCustomerFlowEntry,
  getAvailableDispatchSources,
  getCustomerFlowValue,
  upsertCustomerFlowEntry,
} from './customerSalesFlow.storage';

interface ReturnDraft {
  vehicle: VehicleSelection | null;
  driver: DriverSelection | null;
  dispatchId: string;
  gateInDate: string;
  inTime: string;
  securityName: string;
  customerClaimNo: string;
  items: CustomerFlowItem[];
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

function buildEmptyDraft(): ReturnDraft {
  return {
    vehicle: null,
    driver: null,
    dispatchId: '',
    gateInDate: toDateInputValue(),
    inTime: toTimeInputValue(),
    securityName: '',
    customerClaimNo: '',
    items: [],
  };
}

function buildReturnItems(dispatch: CustomerFlowEntry): CustomerFlowItem[] {
  return dispatch.items.map((item) => ({
    ...item,
    returnQty: '',
    acceptedQty: '',
    rejectedQty: '',
    reason: 'Damaged',
    condition: '',
  }));
}

function buildDraftFromEntry(entry: CustomerFlowEntry | null): ReturnDraft {
  if (!entry) return buildEmptyDraft();

  return {
    vehicle: buildVehicleFromEntry(entry),
    driver: buildDriverFromEntry(entry),
    dispatchId: getRawString(entry, 'selectedDispatchId'),
    gateInDate: getRawString(entry, 'gateInDate') || toDateInputValue(),
    inTime: getRawString(entry, 'inTime') || toTimeInputValue(),
    securityName: getRawString(entry, 'securityName'),
    customerClaimNo: getRawString(entry, 'customerClaimNo'),
    items: entry.items,
  };
}

export default function CustomerReturnNewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const entryId = searchParams.get('entryId');
  const existingEntry = useMemo(
    () => (entryId ? findCustomerFlowEntry(CUSTOMER_RETURN_KEY, entryId) : null),
    [entryId],
  );
  const [draft, setDraft] = useState<ReturnDraft>(() => buildDraftFromEntry(existingEntry));
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const dispatches = useMemo(() => getAvailableDispatchSources(), []);
  const selectedDispatch = dispatches.find((entry) => entry.id === draft.dispatchId) || null;

  const updateDraft = <K extends keyof ReturnDraft>(key: K, value: ReturnDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setFormError('');
  };

  const handleDispatchChange = (dispatchId: string) => {
    const dispatch = dispatches.find((entry) => entry.id === dispatchId);
    setDraft((current) => ({
      ...current,
      dispatchId,
      items: dispatch ? buildReturnItems(dispatch) : [],
    }));
    setFormError('');
  };

  const updateItem = (itemId: string, key: keyof CustomerFlowItem, value: string) => {
    setDraft((current) => ({
      ...current,
      items: current.items.map((item) => (item.id === itemId ? { ...item, [key]: value } : item)),
    }));
    setFormError('');
  };

  const handleSaveAndNext = () => {
    if (!selectedDispatch) {
      setFormError('Please select the original sales dispatch');
      return;
    }

    if (!draft.vehicle?.vehicleId) {
      setFormError('Please select the return vehicle');
      return;
    }

    if (!draft.driver?.driverId) {
      setFormError('Please select the driver');
      return;
    }

    const returnItems = draft.items
      .map((item) => ({ ...item, returnQty: item.returnQty.trim(), reason: item.reason.trim() }))
      .filter((item) => Number(item.returnQty) > 0);

    if (returnItems.length === 0) {
      setFormError('Please enter return quantity for at least one item');
      return;
    }

    const hasInvalidQty = returnItems.some(
      (item) => Number(item.returnQty) > Number(item.dispatchedQty || 0),
    );
    if (hasInvalidQty) {
      setFormError('Return quantity cannot be greater than dispatched quantity');
      return;
    }

    setIsSaving(true);
    const now = new Date().toISOString();
    const entry: CustomerFlowEntry = {
      id: existingEntry?.id || now,
      entryNo: existingEntry?.entryNo || buildCustomerFlowEntryNo('CRI'),
      status: existingEntry?.status === 'PENDING_QC' ? 'PENDING_QC' : 'IN_PROGRESS',
      values: {
        ...existingEntry?.values,
        selectedDispatchId: selectedDispatch.id,
        dispatchEntry: selectedDispatch.entryNo,
        salesOrderNo: getCustomerFlowValue(selectedDispatch, 'salesOrderNo'),
        outboundDeliveryNo: getCustomerFlowValue(selectedDispatch, 'outboundDeliveryNo'),
        invoiceNo: getCustomerFlowValue(selectedDispatch, 'invoiceNo'),
        customerCode: getCustomerFlowValue(selectedDispatch, 'customerCode'),
        customerName: getCustomerFlowValue(selectedDispatch, 'customerName'),
        vehicleId: String(draft.vehicle.vehicleId),
        vehicleNo: draft.vehicle.vehicleNumber,
        vehicleType: draft.vehicle.vehicleType,
        transporterId: String(draft.vehicle.transporterId || ''),
        transporterName: draft.vehicle.transporterName,
        driverId: String(draft.driver.driverId),
        driverName: draft.driver.driverName,
        driverMobile: draft.driver.mobileNumber,
        gateInDate: draft.gateInDate,
        inTime: draft.inTime,
        securityName: draft.securityName,
        customerClaimNo: draft.customerClaimNo,
      },
      items: returnItems,
      createdAt: existingEntry?.createdAt || now,
      updatedAt: now,
    };

    upsertCustomerFlowEntry(CUSTOMER_RETURN_KEY, entry);
    toast.success('Return details saved');
    navigate(`/gate/customer-return/new/attachments?entryId=${encodeURIComponent(entry.id)}`);
  };

  return (
    <div className="space-y-6 pb-6">
      <StepHeader currentStep={1} totalSteps={2} title="Customer Return In" error={formError || null} />

      <div className="space-y-8">
        <FormSection icon={<Truck className="h-5 w-5" />} title="Vehicle & Driver">
          <div className="grid gap-4 lg:grid-cols-2">
            <VehicleSelect
              label="Return Vehicle"
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
            <ReadOnlyDateTime dateValue={draft.gateInDate} timeValue={draft.inTime} />
            <TextField
              id="customer-return-security"
              label="Security Name"
              value={draft.securityName}
              onChange={(value) => updateDraft('securityName', value)}
              placeholder="Security staff name"
            />
          </div>
        </FormSection>

        <FormSection icon={<PackageX className="h-5 w-5" />} title="Original Dispatch">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="customer-return-dispatch">
                Sales Dispatch <span className="text-destructive">*</span>
              </Label>
              <NativeSelect
                id="customer-return-dispatch"
                value={draft.dispatchId}
                required
                placeholder={dispatches.length ? 'Select sales dispatch' : 'No completed dispatches'}
                onChange={(event) => handleDispatchChange(event.target.value)}
              >
                {dispatches.map((dispatch) => (
                  <SelectOption key={dispatch.id} value={dispatch.id}>
                    {[
                      dispatch.entryNo,
                      getCustomerFlowValue(dispatch, 'invoiceNo'),
                      getCustomerFlowValue(dispatch, 'customerName'),
                    ].join(' - ')}
                  </SelectOption>
                ))}
              </NativeSelect>
            </div>
            <ReadOnlyTextField label="Invoice" value={selectedDispatch ? getCustomerFlowValue(selectedDispatch, 'invoiceNo') : ''} />
            <ReadOnlyTextField label="Customer" value={selectedDispatch ? getCustomerFlowValue(selectedDispatch, 'customerName') : ''} />
          </div>
        </FormSection>

        <FormSection icon={<FileCheck2 className="h-5 w-5" />} title="Returned Items">
          <ReturnItemsTable items={draft.items} onChange={updateItem} />
        </FormSection>

        <FormSection icon={<FileCheck2 className="h-5 w-5" />} title="Return Reference">
          <div className="grid gap-4 lg:grid-cols-2">
            <TextField
              id="customer-return-claim"
              label="Customer Claim No."
              value={draft.customerClaimNo}
              onChange={(value) => updateDraft('customerClaimNo', value)}
            />
          </div>
        </FormSection>
      </div>

      <StepFooter
        onCancel={() => navigate('/gate/customer-return')}
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
        <Label htmlFor="customer-return-date">
          Gate In Date <span className="text-destructive">*</span>
        </Label>
        <Input id="customer-return-date" type="date" value={dateValue} readOnly disabled className={lockedDateTimeInputClassName} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="customer-return-time">
          In Time <span className="text-destructive">*</span>
        </Label>
        <Input id="customer-return-time" type="time" value={timeValue} readOnly disabled className={lockedDateTimeInputClassName} />
      </div>
    </div>
  );
}

function TextField({
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
      <Input id={id} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
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

function ReturnItemsTable({
  items,
  onChange,
}: {
  items: CustomerFlowItem[];
  onChange: (itemId: string, key: keyof CustomerFlowItem, value: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-md border">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[940px]">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-3 text-left text-sm font-medium">Item</th>
              <th className="p-3 text-left text-sm font-medium">Dispatch Qty</th>
              <th className="p-3 text-left text-sm font-medium">Return Qty</th>
              <th className="p-3 text-left text-sm font-medium">Reason</th>
              <th className="p-3 text-left text-sm font-medium">Condition</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="h-20 p-3 text-center text-sm text-muted-foreground">
                  Select a sales dispatch to view items
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="p-3 text-sm">
                    <div className="font-medium">{item.itemName}</div>
                    <div className="text-xs text-muted-foreground">{item.itemCode}</div>
                  </td>
                  <td className="whitespace-nowrap p-3 text-sm">
                    {item.dispatchedQty} {item.uom}
                  </td>
                  <td className="p-3">
                    <Input
                      type="number"
                      min="0"
                      max={item.dispatchedQty}
                      step="0.001"
                      value={item.returnQty}
                      onChange={(event) => onChange(item.id, 'returnQty', event.target.value)}
                    />
                  </td>
                  <td className="p-3">
                    <Input
                      value={item.reason}
                      onChange={(event) => onChange(item.id, 'reason', event.target.value)}
                      placeholder="Damaged, shortage, wrong item"
                    />
                  </td>
                  <td className="p-3">
                    <Input
                      value={item.condition}
                      onChange={(event) => onChange(item.id, 'condition', event.target.value)}
                      placeholder="Damaged"
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
