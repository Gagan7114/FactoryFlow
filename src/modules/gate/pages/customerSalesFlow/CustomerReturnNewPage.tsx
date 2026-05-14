import {
  AlertCircle,
  CheckCircle2,
  FileCheck2,
  Loader2,
  PackageX,
  ReceiptText,
  Search,
  Truck,
} from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import {
  type CustomerReturnInvoice,
  useCustomerReturnInvoiceSearch,
} from '@/modules/gate/api/customerReturnInvoice';
import {
  DriverSelect,
  type DriverSelection,
  StepFooter,
  StepHeader,
  VehicleSelect,
  type VehicleSelection,
} from '@/modules/gate/components';
import { Badge, Button, Input, Label } from '@/shared/components/ui';
import { getErrorMessage, isNotFoundError } from '@/shared/utils';

import {
  buildCustomerFlowEntryNo,
  CUSTOMER_RETURN_KEY,
  type CustomerFlowEntry,
  type CustomerFlowItem,
  findCustomerFlowEntry,
  upsertCustomerFlowEntry,
} from './customerSalesFlow.storage';

interface ReturnDraft {
  vehicle: VehicleSelection | null;
  driver: DriverSelection | null;
  invoiceNumber: string;
  invoice: CustomerReturnInvoice | null;
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
    invoiceNumber: '',
    invoice: null,
    gateInDate: toDateInputValue(),
    inTime: toTimeInputValue(),
    securityName: '',
    customerClaimNo: '',
    items: [],
  };
}

function buildInvoiceFromEntry(entry: CustomerFlowEntry): CustomerReturnInvoice | null {
  const invoiceNo = getRawString(entry, 'invoiceNo') || getRawString(entry, 'sourceInvoiceDocNum');
  if (!invoiceNo) return null;

  return {
    doc_entry: Number(getRawString(entry, 'sourceInvoiceDocEntry')) || 0,
    doc_num: invoiceNo,
    doc_date: getRawString(entry, 'invoiceDate') || null,
    create_date: getRawString(entry, 'invoiceCreateDate') || null,
    create_time: getRawString(entry, 'invoiceCreateTime'),
    card_code: getRawString(entry, 'customerCode'),
    card_name: getRawString(entry, 'customerName'),
    doc_total: Number(getRawString(entry, 'invoiceTotal')) || 0,
    branch_id: Number(getRawString(entry, 'branchId')) || null,
    branch_name: getRawString(entry, 'branchName'),
    ship_to_code: getRawString(entry, 'shipToCode'),
    ship_to_address: getRawString(entry, 'shipToAddress') || getRawString(entry, 'shipTo'),
    state: getRawString(entry, 'state'),
    city: getRawString(entry, 'city'),
    bp_gstin: getRawString(entry, 'bpGstin'),
    sap_dispatch_date: getRawString(entry, 'sapDispatchDate') || null,
    sap_bilty_no: getRawString(entry, 'sapBiltyNo'),
    sap_bilty_date: getRawString(entry, 'sapBiltyDate') || null,
    sap_transporter_name: getRawString(entry, 'sapTransporterName'),
    sap_vehicle_no: getRawString(entry, 'sapVehicleNo'),
    sap_transporter_invoice: getRawString(entry, 'sapTransporterInvoice'),
    sap_lr_number: getRawString(entry, 'sapLrNumber'),
    gst_vehicle_no: getRawString(entry, 'gstVehicleNo'),
    gst_transport_date: getRawString(entry, 'gstTransportDate') || null,
    gst_transport_reason: getRawString(entry, 'gstTransportReason'),
    line_count: entry.items.length,
    total_quantity: entry.items.reduce((sum, item) => sum + Number(item.dispatchedQty || 0), 0),
    total_litres: Number(getRawString(entry, 'totalLitres')) || 0,
    total_boxes: Number(getRawString(entry, 'totalBoxes')) || 0,
    total_weight: Number(getRawString(entry, 'totalWeight')) || 0,
    total_line_amount: Number(getRawString(entry, 'totalLineAmount')) || 0,
    total_gross_amount: Number(getRawString(entry, 'totalGrossAmount')) || 0,
    warehouses: getRawString(entry, 'warehouses'),
    item_summary: getRawString(entry, 'itemSummary'),
    base_refs: getRawString(entry, 'baseRefs'),
    items: [],
  };
}

function buildReturnItemsFromInvoice(invoice: CustomerReturnInvoice): CustomerFlowItem[] {
  return invoice.items.map((item) => ({
    id: `invoice-${invoice.doc_entry}-${item.line_num}`,
    itemCode: item.item_code,
    itemName: item.item_name,
    orderQty: String(item.quantity || ''),
    dispatchedQty: String(item.quantity || ''),
    returnQty: '',
    acceptedQty: '',
    rejectedQty: '',
    uom: item.uom,
    reason: 'Damaged',
    condition: '',
  }));
}

function buildDraftFromEntry(entry: CustomerFlowEntry | null): ReturnDraft {
  if (!entry) return buildEmptyDraft();

  const invoice = buildInvoiceFromEntry(entry);
  return {
    vehicle: buildVehicleFromEntry(entry),
    driver: buildDriverFromEntry(entry),
    invoiceNumber: invoice?.doc_num || '',
    invoice,
    gateInDate: getRawString(entry, 'gateInDate') || toDateInputValue(),
    inTime: getRawString(entry, 'inTime') || toTimeInputValue(),
    securityName: getRawString(entry, 'securityName'),
    customerClaimNo: getRawString(entry, 'customerClaimNo'),
    items: entry.items,
  };
}

function formatQuantity(value: number | string) {
  const parsed = Number(value || 0);
  return parsed.toLocaleString('en-IN', { maximumFractionDigits: 3 });
}

function formatCurrency(value: number | string) {
  const parsed = Number(value || 0);
  return parsed.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  });
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
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
  const [searchedInvoiceNumber, setSearchedInvoiceNumber] = useState('');
  const [invoiceValidationError, setInvoiceValidationError] = useState('');
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const invoiceSearch = useCustomerReturnInvoiceSearch();

  const invoiceSearchError = invoiceSearch.isError
    ? isNotFoundError(invoiceSearch.error)
      ? `No SAP invoice found for ${searchedInvoiceNumber}.`
      : getErrorMessage(invoiceSearch.error, 'Unable to search SAP invoice right now.')
    : '';

  const updateDraft = <K extends keyof ReturnDraft>(key: K, value: ReturnDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setFormError('');
  };

  const handleInvoiceNumberChange = (value: string) => {
    setDraft((current) => {
      const keepCurrentInvoice = current.invoice?.doc_num === value.trim();
      return {
        ...current,
        invoiceNumber: value,
        invoice: keepCurrentInvoice ? current.invoice : null,
        items: keepCurrentInvoice ? current.items : [],
      };
    });
    setInvoiceValidationError('');
    setFormError('');
    if (!invoiceSearch.isPending) {
      invoiceSearch.reset();
    }
  };

  const handleInvoiceSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedInvoiceNumber = draft.invoiceNumber.trim();

    if (!trimmedInvoiceNumber) {
      setInvoiceValidationError('Enter the complete SAP invoice number.');
      return;
    }

    setInvoiceValidationError('');
    setSearchedInvoiceNumber(trimmedInvoiceNumber);
    invoiceSearch.reset();
    invoiceSearch.mutate(trimmedInvoiceNumber, {
      onSuccess: (invoice) => {
        setDraft((current) => ({
          ...current,
          invoiceNumber: invoice.doc_num || trimmedInvoiceNumber,
          invoice,
          items: buildReturnItemsFromInvoice(invoice),
        }));
        setFormError('');
        toast.success('SAP invoice found');
      },
    });
  };

  const updateItem = (itemId: string, key: keyof CustomerFlowItem, value: string) => {
    setDraft((current) => ({
      ...current,
      items: current.items.map((item) => (item.id === itemId ? { ...item, [key]: value } : item)),
    }));
    setFormError('');
  };

  const handleSaveAndNext = () => {
    if (!draft.invoice) {
      setFormError('Please search and select the SAP invoice first');
      return;
    }

    if (draft.items.length === 0) {
      setFormError('The selected SAP invoice does not have item lines to return');
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
      setFormError('Return quantity cannot be greater than invoice quantity');
      return;
    }

    setIsSaving(true);
    const now = new Date().toISOString();
    const entry: CustomerFlowEntry = {
      id: existingEntry?.id || now,
      entryNo: existingEntry?.entryNo || buildCustomerFlowEntryNo('GR'),
      status: existingEntry?.status === 'PENDING_QC' ? 'PENDING_QC' : 'IN_PROGRESS',
      values: {
        ...existingEntry?.values,
        sourceInvoiceDocEntry: String(draft.invoice.doc_entry),
        sourceInvoiceDocNum: draft.invoice.doc_num,
        invoiceNo: draft.invoice.doc_num,
        invoiceDate: draft.invoice.doc_date || '',
        invoiceCreateDate: draft.invoice.create_date || '',
        invoiceCreateTime: draft.invoice.create_time || '',
        invoiceTotal: String(draft.invoice.doc_total || ''),
        customerCode: draft.invoice.card_code,
        customerName: draft.invoice.card_name,
        branchId: String(draft.invoice.branch_id || ''),
        branchName: draft.invoice.branch_name,
        shipToCode: draft.invoice.ship_to_code,
        shipToAddress: draft.invoice.ship_to_address,
        state: draft.invoice.state,
        city: draft.invoice.city,
        bpGstin: draft.invoice.bp_gstin,
        sapDispatchDate: draft.invoice.sap_dispatch_date || '',
        sapBiltyNo: draft.invoice.sap_bilty_no,
        sapBiltyDate: draft.invoice.sap_bilty_date || '',
        sapTransporterName: draft.invoice.sap_transporter_name,
        sapVehicleNo: draft.invoice.sap_vehicle_no,
        sapTransporterInvoice: draft.invoice.sap_transporter_invoice,
        sapLrNumber: draft.invoice.sap_lr_number,
        gstVehicleNo: draft.invoice.gst_vehicle_no,
        gstTransportDate: draft.invoice.gst_transport_date || '',
        gstTransportReason: draft.invoice.gst_transport_reason,
        totalLitres: String(draft.invoice.total_litres || ''),
        totalBoxes: String(draft.invoice.total_boxes || ''),
        totalWeight: String(draft.invoice.total_weight || ''),
        totalLineAmount: String(draft.invoice.total_line_amount || ''),
        totalGrossAmount: String(draft.invoice.total_gross_amount || ''),
        warehouses: draft.invoice.warehouses,
        itemSummary: draft.invoice.item_summary,
        baseRefs: draft.invoice.base_refs,
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
    toast.success('Goods return details saved');
    navigate(`/gate/customer-return/new/attachments?entryId=${encodeURIComponent(entry.id)}`);
  };

  return (
    <div className="space-y-6 pb-6">
      <StepHeader currentStep={1} totalSteps={2} title="Goods Return" error={formError || null} />

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
              id="goods-return-security"
              label="Security Name"
              value={draft.securityName}
              onChange={(value) => updateDraft('securityName', value)}
              placeholder="Security staff name"
            />
          </div>
        </FormSection>

        <FormSection icon={<ReceiptText className="h-5 w-5" />} title="Source Invoice">
          <div className="space-y-4">
            <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={handleInvoiceSearch}>
              <div className="flex-1 space-y-2">
                <Label htmlFor="goods-return-invoice">
                  SAP Invoice Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="goods-return-invoice"
                  value={draft.invoiceNumber}
                  onChange={(event) => handleInvoiceNumberChange(event.target.value)}
                  placeholder="Enter complete SAP invoice number"
                  disabled={invoiceSearch.isPending}
                />
              </div>
              <Button type="submit" disabled={invoiceSearch.isPending} className="sm:w-auto">
                {invoiceSearch.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-2 h-4 w-4" />
                )}
                Search
              </Button>
            </form>

            {(invoiceValidationError || invoiceSearchError) && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{invoiceValidationError || invoiceSearchError}</span>
              </div>
            )}

            {draft.invoice && !invoiceSearch.isPending && (
              <div className="rounded-md border bg-muted/20 p-4">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold">{draft.invoice.doc_num}</h3>
                      <Badge variant="success" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        SAP Invoice Found
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {draft.invoice.card_name} ({draft.invoice.card_code})
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Invoice Date:{' '}
                    <span className="font-medium text-foreground">
                      {formatDate(draft.invoice.doc_date)}
                    </span>
                  </div>
                </div>

                <div className="grid gap-3 text-sm sm:grid-cols-4">
                  <InvoiceMetric label="Items" value={draft.invoice.line_count} />
                  <InvoiceMetric label="Invoice Qty" value={formatQuantity(draft.invoice.total_quantity)} />
                  <InvoiceMetric label="Invoice Value" value={formatCurrency(draft.invoice.doc_total)} />
                  <InvoiceMetric label="Branch" value={draft.invoice.branch_name || '-'} />
                </div>
              </div>
            )}
          </div>
        </FormSection>

        <FormSection icon={<FileCheck2 className="h-5 w-5" />} title="Returned Items">
          <ReturnItemsTable items={draft.items} onChange={updateItem} />
        </FormSection>

        <FormSection icon={<PackageX className="h-5 w-5" />} title="Return Reference">
          <div className="grid gap-4 lg:grid-cols-2">
            <TextField
              id="goods-return-claim"
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
        <Label htmlFor="goods-return-date">
          Gate In Date <span className="text-destructive">*</span>
        </Label>
        <Input id="goods-return-date" type="date" value={dateValue} readOnly disabled className={lockedDateTimeInputClassName} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="goods-return-time">
          In Time <span className="text-destructive">*</span>
        </Label>
        <Input id="goods-return-time" type="time" value={timeValue} readOnly disabled className={lockedDateTimeInputClassName} />
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

function InvoiceMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="font-semibold">{value || '-'}</p>
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
              <th className="p-3 text-left text-sm font-medium">Invoice Qty</th>
              <th className="p-3 text-left text-sm font-medium">Return Qty</th>
              <th className="p-3 text-left text-sm font-medium">Reason</th>
              <th className="p-3 text-left text-sm font-medium">Condition</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="h-20 p-3 text-center text-sm text-muted-foreground">
                  Search an SAP invoice to view items
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
