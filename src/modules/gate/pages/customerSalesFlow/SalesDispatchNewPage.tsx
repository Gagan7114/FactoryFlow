import { FileText, PackageCheck, ShieldCheck, Truck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { useDispatchBills } from '@/modules/dashboards/dispatch-plans/api';
import type { DispatchBill } from '@/modules/dashboards/dispatch-plans/types';
import {
  useCreateSalesDispatchGateOut,
  useDispatchGateLock,
  useSalesDispatchGateOut,
  useUpdateSalesDispatchGateOut,
} from '@/modules/gate/api';
import {
  DriverSelect,
  type DriverSelection,
  StepFooter,
  StepHeader,
  VehicleSelect,
  type VehicleSelection,
} from '@/modules/gate/components';
import { Input, Label, NativeSelect, SelectOption } from '@/shared/components/ui';

import type { DispatchPhysicalUOM, SalesDispatchGateOut } from '../../api/salesDispatch';

interface DispatchDraft {
  vehicle: VehicleSelection | null;
  driver: DriverSelection | null;
  invoiceDocEntry: string;
  gateOutDate: string;
  outTime: string;
  securityName: string;
  sealNo: string;
  pgiDocumentNo: string;
  physicalQuantity: string;
  physicalUom: DispatchPhysicalUOM;
  goodsIssuePosted: boolean;
  invoiceChecked: boolean;
  deliveryNoteChecked: boolean;
  ewayBillChecked: boolean;
  lrChecked: boolean;
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

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function buildEmptyDraft(): DispatchDraft {
  return {
    vehicle: null,
    driver: null,
    invoiceDocEntry: '',
    gateOutDate: toDateInputValue(),
    outTime: toTimeInputValue(),
    securityName: '',
    sealNo: '',
    pgiDocumentNo: '',
    physicalQuantity: '',
    physicalUom: 'BOX',
    goodsIssuePosted: true,
    invoiceChecked: false,
    deliveryNoteChecked: false,
    ewayBillChecked: false,
    lrChecked: false,
    remarks: '',
  };
}

function buildVehicleFromEntry(entry: SalesDispatchGateOut): VehicleSelection {
  return {
    vehicleId: entry.vehicle,
    vehicleNumber: entry.vehicle_number,
    vehicleType: entry.vehicle_type || '',
    vehicleCapacity: '',
    transporterId: 0,
    transporterName: entry.transporter_name || '',
    transporterContactPerson: '',
    transporterMobile: '',
  };
}

function buildDriverFromEntry(entry: SalesDispatchGateOut): DriverSelection {
  return {
    driverId: entry.driver,
    driverName: entry.driver_name,
    mobileNumber: entry.driver_mobile || '',
    drivingLicenseNumber: '',
    idProofType: '',
    idProofNumber: '',
    driverPhoto: null,
  };
}

function buildDraftFromEntry(entry: SalesDispatchGateOut): DispatchDraft {
  return {
    vehicle: buildVehicleFromEntry(entry),
    driver: buildDriverFromEntry(entry),
    invoiceDocEntry: String(entry.sap_invoice_doc_entry),
    gateOutDate: entry.gate_out_date || toDateInputValue(),
    outTime: (entry.out_time || toTimeInputValue()).slice(0, 5),
    securityName: entry.security_name || '',
    sealNo: entry.seal_no || '',
    pgiDocumentNo: entry.pgi_document_no || '',
    physicalQuantity: entry.physical_quantity || '',
    physicalUom: (entry.physical_uom || 'BOX') as DispatchPhysicalUOM,
    goodsIssuePosted: entry.goods_issue_posted,
    invoiceChecked: entry.invoice_checked,
    deliveryNoteChecked: entry.delivery_note_checked,
    ewayBillChecked: entry.eway_bill_checked,
    lrChecked: entry.lr_checked,
    remarks: entry.remarks || '',
  };
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
  return detail || fallback;
}

function formatInvoiceOption(bill: DispatchBill) {
  return [
    `Invoice ${bill.doc_num}`,
    bill.doc_date,
    bill.card_name,
    `${bill.total_quantity || 0} qty`,
  ].filter(Boolean).join(' - ');
}

function buildLineFromBill(bill: DispatchBill, physicalUom: DispatchPhysicalUOM) {
  return [{
    line_num: 1,
    item_code: bill.base_refs || `INV-${bill.doc_num}`,
    item_name: bill.item_summary || `Invoice ${bill.doc_num}`,
    order_qty: bill.total_quantity || bill.total_boxes || bill.total_litres || 0,
    dispatched_qty: bill.total_quantity || bill.total_boxes || bill.total_litres || 0,
    uom: physicalUom,
    warehouse: bill.warehouses || '',
  }];
}

export default function SalesDispatchNewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const entryId = Number(searchParams.get('entryId') || 0) || null;
  const [draft, setDraft] = useState<DispatchDraft>(() => buildEmptyDraft());
  const [formError, setFormError] = useState('');
  const [invoiceSearch, setInvoiceSearch] = useState('');

  const dateFilters = useMemo(() => ({
    date_from: toDateInputValue(addDays(new Date(), -180)),
    date_to: toDateInputValue(new Date()),
    booking_status: 'all' as const,
    search: invoiceSearch,
    limit: 200,
  }), [invoiceSearch]);

  const { data: lock } = useDispatchGateLock();
  const { data: existingEntry, isLoading: isEntryLoading } = useSalesDispatchGateOut(entryId);
  const { data: billResponse, isFetching: isBillsFetching } = useDispatchBills(dateFilters);
  const createMutation = useCreateSalesDispatchGateOut();
  const updateMutation = useUpdateSalesDispatchGateOut();

  useEffect(() => {
    if (existingEntry) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Step form follows the loaded entry.
      setDraft(buildDraftFromEntry(existingEntry));
    }
  }, [existingEntry]);

  const bills = useMemo(() => billResponse?.data || [], [billResponse?.data]);
  const selectedBill = useMemo(() => {
    const fromList = bills.find((bill) => String(bill.doc_entry) === draft.invoiceDocEntry);
    if (fromList) return fromList;
    if (!existingEntry) return null;

    return {
      doc_entry: existingEntry.sap_invoice_doc_entry,
      doc_num: existingEntry.sap_invoice_doc_num,
      doc_date: null,
      create_date: null,
      create_time: '',
      card_code: existingEntry.customer_code || '',
      card_name: existingEntry.customer_name || '',
      doc_total: Number(existingEntry.invoice_amount || 0),
      branch_id: null,
      branch_name: '',
      ship_to_code: '',
      ship_to_address: existingEntry.ship_to_address || '',
      state: '',
      city: '',
      bp_gstin: '',
      sap_dispatch_date: null,
      sap_bilty_no: '',
      sap_bilty_date: null,
      sap_transporter_name: existingEntry.transporter_name || '',
      sap_vehicle_no: existingEntry.vehicle_number,
      sap_transporter_invoice: '',
      sap_lr_number: '',
      gst_vehicle_no: existingEntry.vehicle_number,
      gst_transport_date: null,
      gst_transport_reason: '',
      line_count: existingEntry.items.length,
      total_quantity: Number(existingEntry.physical_quantity || 0),
      total_litres: 0,
      total_boxes: Number(existingEntry.physical_quantity || 0),
      total_weight: Number(existingEntry.sap_weight || 0),
      total_line_amount: Number(existingEntry.invoice_amount || 0),
      total_gross_amount: Number(existingEntry.invoice_amount || 0),
      warehouses: '',
      item_summary: existingEntry.items.map((item) => item.item_name).filter(Boolean).join(', '),
      base_refs: existingEntry.sap_invoice_doc_num,
      plan: null,
    } as DispatchBill;
  }, [bills, draft.invoiceDocEntry, existingEntry]);
  const invoiceOptions = useMemo(() => {
    if (!selectedBill) return bills;
    if (bills.some((bill) => bill.doc_entry === selectedBill.doc_entry)) return bills;
    return [selectedBill, ...bills];
  }, [bills, selectedBill]);

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isReadOnlyInvoice = Boolean(existingEntry);

  const updateDraft = <K extends keyof DispatchDraft>(key: K, value: DispatchDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setFormError('');
  };

  const handleInvoiceChange = (docEntry: string) => {
    const bill = bills.find((item) => String(item.doc_entry) === docEntry);
    setDraft((current) => ({
      ...current,
      invoiceDocEntry: docEntry,
      physicalQuantity: bill
        ? String(bill.total_boxes || bill.total_quantity || bill.total_litres || '')
        : current.physicalQuantity,
      physicalUom: bill?.total_boxes ? 'BOX' : current.physicalUom,
    }));
    setFormError('');
  };

  const handleSaveAndNext = async () => {
    if (lock?.locked) {
      setFormError(lock.reason || 'Sales dispatch gate-out is currently locked.');
      return;
    }
    if (!selectedBill) {
      setFormError('Please select the SAP invoice / dispatch bill');
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
    if (!draft.physicalQuantity || Number(draft.physicalQuantity) <= 0) {
      setFormError('Please enter the physical quantity going out');
      return;
    }

    try {
      const payload = {
        sap_invoice_doc_entry: selectedBill.doc_entry,
        sap_invoice_doc_num: selectedBill.doc_num,
        vehicle_id: draft.vehicle.vehicleId,
        driver_id: draft.driver.driverId,
        linked_vehicle_entry_id: selectedBill.plan?.linked_vehicle_entry_id || null,
        customer_code: selectedBill.card_code,
        customer_name: selectedBill.card_name,
        ship_to_address: selectedBill.ship_to_address,
        invoice_amount: selectedBill.doc_total,
        sap_weight: selectedBill.total_weight,
        gate_out_date: draft.gateOutDate,
        out_time: draft.outTime,
        security_name: draft.securityName,
        seal_no: draft.sealNo,
        pgi_document_no: draft.pgiDocumentNo,
        goods_issue_posted: draft.goodsIssuePosted,
        invoice_checked: draft.invoiceChecked,
        delivery_note_checked: draft.deliveryNoteChecked,
        eway_bill_checked: draft.ewayBillChecked,
        lr_checked: draft.lrChecked,
        physical_quantity: draft.physicalQuantity,
        physical_uom: draft.physicalUom,
        remarks: draft.remarks,
        items: buildLineFromBill(selectedBill, draft.physicalUom),
      };

      const saved = existingEntry
        ? await updateMutation.mutateAsync({ id: existingEntry.id, data: payload })
        : await createMutation.mutateAsync(payload);

      toast.success('Dispatch details saved');
      navigate(`/gate/sales-dispatch/new/weighment?entryId=${saved.id}`);
    } catch (error) {
      setFormError(getApiErrorMessage(error, 'Failed to save dispatch details.'));
    }
  };

  if (entryId && isEntryLoading) {
    return (
      <div className="space-y-6 pb-6">
        <StepHeader currentStep={1} totalSteps={3} title="Sales Dispatch Out" error={null} />
        <div className="rounded-md border p-6 text-sm text-muted-foreground">Loading dispatch entry...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      <StepHeader currentStep={1} totalSteps={3} title="Sales Dispatch Out" error={formError || null} />

      {lock?.locked ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm font-medium text-amber-900">
          {lock.reason || 'Sales dispatch gate-out is currently locked.'}
        </div>
      ) : null}

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
            <ReadOnlyDateTime dateValue={draft.gateOutDate} timeValue={draft.outTime} />
            <TextField
              id="sales-dispatch-security"
              label="Security Name"
              value={draft.securityName}
              onChange={(value) => updateDraft('securityName', value)}
              placeholder="Security staff name"
            />
          </div>
        </FormSection>

        <FormSection icon={<FileText className="h-5 w-5" />} title="SAP Invoice & Dispatch Bill">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="sales-dispatch-search">Search SAP Bill</Label>
              <Input
                id="sales-dispatch-search"
                value={invoiceSearch}
                disabled={isReadOnlyInvoice}
                onChange={(event) => setInvoiceSearch(event.target.value)}
                placeholder="Search invoice, customer, vehicle, city"
              />
            </div>
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="sales-dispatch-invoice">
                SAP Invoice / Dispatch Bill <span className="text-destructive">*</span>
              </Label>
              <NativeSelect
                id="sales-dispatch-invoice"
                value={draft.invoiceDocEntry}
                disabled={isReadOnlyInvoice}
                required
                placeholder={isBillsFetching ? 'Loading SAP bills...' : 'Select invoice'}
                onChange={(event) => handleInvoiceChange(event.target.value)}
              >
                {invoiceOptions.map((bill) => (
                  <SelectOption key={bill.doc_entry} value={String(bill.doc_entry)}>
                    {formatInvoiceOption(bill)}
                  </SelectOption>
                ))}
              </NativeSelect>
            </div>

            <ReadOnlyTextField label="Customer" value={selectedBill?.card_name || ''} />
            <ReadOnlyTextField label="Invoice No." value={selectedBill?.doc_num || ''} />
            <ReadOnlyTextField label="Invoice Date" value={selectedBill?.doc_date || ''} />
            <ReadOnlyTextField label="Ship To" value={selectedBill?.ship_to_address || ''} />
            <ReadOnlyTextField label="SAP Weight" value={selectedBill ? `${selectedBill.total_weight || 0}` : ''} />
            <ReadOnlyTextField label="Warehouses" value={selectedBill?.warehouses || ''} />
          </div>
        </FormSection>

        <FormSection icon={<PackageCheck className="h-5 w-5" />} title="Physical Quantity">
          <div className="grid gap-4 lg:grid-cols-3">
            <TextField
              id="sales-dispatch-physical-qty"
              label="Actual Quantity"
              required
              type="number"
              value={draft.physicalQuantity}
              onChange={(value) => updateDraft('physicalQuantity', value)}
              placeholder="Actual qty at gate"
            />
            <div className="space-y-2">
              <Label htmlFor="sales-dispatch-uom">
                UOM <span className="text-destructive">*</span>
              </Label>
              <NativeSelect
                id="sales-dispatch-uom"
                value={draft.physicalUom}
                onChange={(event) => updateDraft('physicalUom', event.target.value as DispatchPhysicalUOM)}
              >
                <SelectOption value="BOX">Box</SelectOption>
                <SelectOption value="PCS">Pcs</SelectOption>
              </NativeSelect>
            </div>
            <ReadOnlyTextField label="SAP Quantity" value={selectedBill ? `${selectedBill.total_quantity || selectedBill.total_boxes || 0}` : ''} />
          </div>
          <ItemsTable bill={selectedBill} physicalUom={draft.physicalUom} />
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

            <CheckField label="Invoice Checked" checked={draft.invoiceChecked} onChange={(value) => updateDraft('invoiceChecked', value)} />
            <CheckField label="Delivery Note Checked" checked={draft.deliveryNoteChecked} onChange={(value) => updateDraft('deliveryNoteChecked', value)} />
            <CheckField label="E-way Bill Checked" checked={draft.ewayBillChecked} onChange={(value) => updateDraft('ewayBillChecked', value)} />
            <CheckField label="LR / Freight Doc Checked" checked={draft.lrChecked} onChange={(value) => updateDraft('lrChecked', value)} />
            <CheckField label="Goods Issue Posted" checked={draft.goodsIssuePosted} onChange={(value) => updateDraft('goodsIssuePosted', value)} />
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
  type = 'text',
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required ? <span className="ml-1 text-destructive">*</span> : null}
      </Label>
      <Input id={id} type={type} value={value} required={required} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
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
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-input"
      />
      <span className="text-sm font-medium">{label}</span>
    </label>
  );
}

function ItemsTable({ bill, physicalUom }: { bill: DispatchBill | null; physicalUom: DispatchPhysicalUOM }) {
  const lines = bill ? buildLineFromBill(bill, physicalUom) : [];

  return (
    <div className="overflow-hidden rounded-md border">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-3 text-left text-sm font-medium">Reference</th>
              <th className="p-3 text-left text-sm font-medium">Item Summary</th>
              <th className="p-3 text-left text-sm font-medium">Order Qty</th>
              <th className="p-3 text-left text-sm font-medium">Dispatch Qty</th>
              <th className="p-3 text-left text-sm font-medium">UOM</th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td colSpan={5} className="h-20 p-3 text-center text-sm text-muted-foreground">
                  Select a SAP invoice to view dispatch summary
                </td>
              </tr>
            ) : (
              lines.map((item) => (
                <tr key={item.line_num} className="border-t">
                  <td className="whitespace-nowrap p-3 text-sm">{item.item_code}</td>
                  <td className="p-3 text-sm font-medium">{item.item_name}</td>
                  <td className="whitespace-nowrap p-3 text-sm">{item.order_qty}</td>
                  <td className="whitespace-nowrap p-3 text-sm">{item.dispatched_qty}</td>
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
