import {
  AlertTriangle,
  FileText,
  PackageCheck,
  Plus,
  RefreshCw,
  ShieldCheck,
  Truck,
  X,
} from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import {
  type SalesDispatchDocument,
  type SalesDispatchDocumentType,
  type SalesDispatchGateOut,
  type SalesDispatchPendingBooking,
  useCreateSalesDispatch,
  useSalesDispatchByVehicleEntry,
  useSalesDispatchDocument,
  useSalesDispatchDocuments,
  useSalesDispatchPendingBookings,
  useUpdateSalesDispatch,
} from '@/modules/gate/api';
import {
  DriverSelect,
  type DriverSelection,
  StepFooter,
  StepHeader,
  StepLoadingSpinner,
  VehicleSelect,
  type VehicleSelection,
} from '@/modules/gate/components';
import { SearchableSelect } from '@/shared/components';
import { Button, Input, Label, NativeSelect, SelectOption, Textarea } from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import {
  buildDocumentKey,
  buildDocumentLabel,
  buildEntryDocumentLabel,
  buildEntryDocumentKey,
  DOCKING_TOTAL_STEPS,
  formatDocumentType,
  formatValue,
  getDocumentLines,
  getLineText,
  lockedDateTimeInputClassName,
  toDateInputValue,
  toTimeInputValue,
} from './salesDispatchFlow.helpers';
import { DOCKING_ROUTES } from './salesDispatchRoutes';

interface DispatchDraft {
  vehicle: VehicleSelection | null;
  driver: DriverSelection | null;
  documentType: SalesDispatchDocumentType;
  documentKey: string;
  gateOutDate: string;
  outTime: string;
  securityName: string;
  biltyNo: string;
  biltyDate: string;
  dockIncharge: string;
  remarks: string;
}

const showServerResults = () => true;

function buildEmptyDraft(documentType: SalesDispatchDocumentType = 'INVOICE'): DispatchDraft {
  return {
    vehicle: null,
    driver: null,
    documentType,
    documentKey: '',
    gateOutDate: toDateInputValue(),
    outTime: toTimeInputValue(),
    securityName: '',
    biltyNo: '',
    biltyDate: '',
    dockIncharge: '',
    remarks: '',
  };
}

function parseInitialDocumentType(value: string | null): SalesDispatchDocumentType {
  return value === 'STOCK_TRANSFER' ? 'STOCK_TRANSFER' : 'INVOICE';
}

function buildVehicleSelection(entry: SalesDispatchGateOut): VehicleSelection {
  return {
    vehicleId: entry.vehicle,
    vehicleNumber: entry.vehicle_no,
    vehicleType: '',
    vehicleCapacity: '',
    transporterId: entry.transporter || 0,
    transporterName: entry.transporter_name || '',
    transporterContactPerson: entry.transporter_contact_person || '',
    transporterMobile: entry.transporter_mobile_no || '',
  };
}

function buildDriverSelection(entry: SalesDispatchGateOut): DriverSelection {
  return {
    driverId: entry.driver,
    driverName: entry.driver_name,
    mobileNumber: entry.driver_mobile_no,
    drivingLicenseNumber: entry.driver_license_no || '',
    idProofType: entry.driver_id_proof_type || '',
    idProofNumber: entry.driver_id_proof_number || '',
    driverPhoto: null,
  };
}

function buildVehicleSelectionFromPendingBooking(
  booking: SalesDispatchPendingBooking,
): VehicleSelection {
  return {
    vehicleId: booking.vehicle || 0,
    vehicleNumber: booking.vehicle_no,
    vehicleType: '',
    vehicleCapacity: '',
    transporterId: booking.transporter || 0,
    transporterName: booking.transporter_name || '',
    transporterContactPerson: booking.transporter_contact_person || '',
    transporterMobile: booking.transporter_mobile_no || '',
    transporterGstin: booking.transporter_gstin || '',
  };
}

function buildDriverSelectionFromPendingBooking(
  booking: SalesDispatchPendingBooking,
): DriverSelection {
  return {
    driverId: booking.driver || 0,
    driverName: booking.driver_name,
    mobileNumber: booking.driver_mobile_no || '',
    drivingLicenseNumber: booking.driver_license_no || '',
    idProofType: booking.driver_id_proof_type || '',
    idProofNumber: booking.driver_id_proof_number || '',
    driverPhoto: null,
  };
}

function canEditEntry(entry?: SalesDispatchGateOut | null) {
  return !entry || ['DOCKED', 'PHOTO_ATTACHED', 'READY_FOR_GATEPASS'].includes(entry.status);
}

function parseDocumentKey(value: string) {
  const [documentType, docEntryText] = value.split(':');
  const docEntry = Number(docEntryText);

  if (
    (documentType === 'INVOICE' || documentType === 'STOCK_TRANSFER') &&
    Number.isFinite(docEntry) &&
    docEntry > 0
  ) {
    return {
      documentType,
      docEntry,
    };
  }

  return null;
}

function getCreateDocuments(
  documentType: SalesDispatchDocumentType,
  selectedDocuments: SalesDispatchDocument[],
  selectedDocument: SalesDispatchDocument | null,
) {
  const sourceDocuments =
    documentType === 'INVOICE' && selectedDocuments.length > 0
      ? selectedDocuments
      : selectedDocument
        ? [selectedDocument]
        : [];
  const seen = new Set<string>();

  return sourceDocuments.filter((document) => {
    const key = buildDocumentKey(document);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getUniqueDocumentValues(
  documents: SalesDispatchDocument[],
  getValue: (document: SalesDispatchDocument) => string,
) {
  const values: string[] = [];
  documents.forEach((document) => {
    const value = getValue(document).trim();
    if (value && !values.includes(value)) {
      values.push(value);
    }
  });
  return values;
}

export default function SalesDispatchNewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const existingVehicleEntryId = Number(searchParams.get('entryId') || 0) || null;
  const pendingDispatchPlanIds = searchParams.get('dispatchPlanIds') || '';
  const isPendingBookingMode = !existingVehicleEntryId && Boolean(pendingDispatchPlanIds);
  const initialDocumentType = parseInitialDocumentType(searchParams.get('documentType'));

  const [draft, setDraft] = useState<DispatchDraft>(() => buildEmptyDraft(initialDocumentType));
  const [selectedListDocument, setSelectedListDocument] = useState<SalesDispatchDocument | null>(
    null,
  );
  const [selectedDocuments, setSelectedDocuments] = useState<SalesDispatchDocument[]>([]);
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [formError, setFormError] = useState('');

  const { data: existingEntry, isLoading: isExistingLoading } =
    useSalesDispatchByVehicleEntry(existingVehicleEntryId);
  const { data: pendingBookings = [], isLoading: isPendingBookingLoading } =
    useSalesDispatchPendingBookings(
      { dispatch_plan_ids: pendingDispatchPlanIds },
      { enabled: isPendingBookingMode },
    );
  const {
    data: documents = [],
    isLoading: isDocumentsLoading,
    isError: isDocumentsError,
    refetch: refetchDocuments,
  } = useSalesDispatchDocuments(
    {
      document_type: draft.documentType,
      search: submittedSearch,
      limit: 50,
    },
    { enabled: !isPendingBookingMode },
  );
  const pendingBooking = pendingBookings[0] || null;
  const selectedDocumentKey = useMemo(
    () => parseDocumentKey(draft.documentKey),
    [draft.documentKey],
  );
  const { data: selectedDocumentDetail } = useSalesDispatchDocument(
    existingEntry ? null : selectedDocumentKey?.documentType,
    existingEntry ? null : selectedDocumentKey?.docEntry,
  );
  const createSalesDispatch = useCreateSalesDispatch();
  const updateSalesDispatch = useUpdateSalesDispatch();

  useEffect(() => {
    if (!existingEntry) return;

    setDraft({
      vehicle: buildVehicleSelection(existingEntry),
      driver: buildDriverSelection(existingEntry),
      documentType: existingEntry.document_type,
      documentKey: buildEntryDocumentKey(existingEntry),
      gateOutDate: existingEntry.gate_out_date || toDateInputValue(),
      outTime: existingEntry.out_time || toTimeInputValue(),
      securityName: existingEntry.security_name || '',
      biltyNo: existingEntry.bilty_no || '',
      biltyDate: existingEntry.bilty_date || '',
      dockIncharge: existingEntry.dock_incharge || '',
      remarks: existingEntry.remarks || '',
    });
  }, [existingEntry]);

  useEffect(() => {
    if (!pendingBooking || existingEntry) return;

    setDraft((current) => ({
      ...current,
      vehicle: buildVehicleSelectionFromPendingBooking(pendingBooking),
      driver: buildDriverSelectionFromPendingBooking(pendingBooking),
      documentType: 'INVOICE',
      documentKey: '',
      biltyNo: pendingBooking.bilty_no || '',
      biltyDate: pendingBooking.bilty_date || '',
      remarks: pendingBooking.document_numbers.length
        ? `Booked invoices: ${pendingBooking.document_numbers.join(', ')}`
        : current.remarks,
    }));
    setSelectedDocuments(pendingBooking.documents);
    setSelectedListDocument(null);
    setSubmittedSearch('');
    setFormError('');
  }, [existingEntry, pendingBooking]);

  const documentFromList = useMemo(
    () => documents.find((document) => buildDocumentKey(document) === draft.documentKey) || null,
    [documents, draft.documentKey],
  );
  const selectedDocument = selectedDocumentDetail || selectedListDocument || documentFromList;
  const documentsForDisplay =
    selectedDocuments.length > 0 ? selectedDocuments : selectedDocument ? [selectedDocument] : [];
  const customerNames = getUniqueDocumentValues(
    documentsForDisplay,
    (document) => document.card_name || document.card_code || '',
  );
  const ewayBills = getUniqueDocumentValues(
    documentsForDisplay,
    (document) => document.eway_bill || '',
  );

  const documentDisplay = selectedDocument
    ? buildDocumentLabel(selectedDocument)
    : existingEntry
      ? buildEntryDocumentLabel(existingEntry)
      : '';
  const isExistingReadOnly = !canEditEntry(existingEntry);
  const isSaving = createSalesDispatch.isPending || updateSalesDispatch.isPending;

  const updateDraft = <K extends keyof DispatchDraft>(key: K, value: DispatchDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setFormError('');
  };

  const handleDocumentTypeChange = (documentType: SalesDispatchDocumentType) => {
    setSelectedListDocument(null);
    setDraft((current) => ({
      ...current,
      documentType,
      documentKey: '',
    }));
    setSelectedDocuments([]);
    setSubmittedSearch('');
    setFormError('');
  };

  const handleAddSelectedDocument = () => {
    if (!selectedDocument || draft.documentType !== 'INVOICE') return;
    setSelectedDocuments((current) => {
      if (
        current.some(
          (document) => buildDocumentKey(document) === buildDocumentKey(selectedDocument),
        )
      ) {
        return current;
      }
      return [...current, selectedDocument];
    });
    setSelectedListDocument(null);
    updateDraft('documentKey', '');
  };

  const handleRemoveSelectedDocument = (documentKey: string) => {
    setSelectedDocuments((current) =>
      current.filter((document) => buildDocumentKey(document) !== documentKey),
    );
  };

  const handleSaveAndNext = async () => {
    if (existingEntry && isExistingReadOnly) {
      navigate(DOCKING_ROUTES.weighment(existingEntry.vehicle_entry));
      return;
    }

    const selectedPayloadDocuments = getCreateDocuments(
      draft.documentType,
      selectedDocuments,
      selectedDocument,
    );

    if (!existingEntry && selectedPayloadDocuments.length === 0) {
      setFormError(`Please select the SAP ${formatDocumentType(draft.documentType).toLowerCase()}`);
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

    if (!draft.gateOutDate) {
      setFormError('Gate out date is required');
      return;
    }

    if (!draft.outTime) {
      setFormError('Out time is required');
      return;
    }

    setFormError('');

    try {
      const payload = {
        gate_out_date: draft.gateOutDate,
        out_time: draft.outTime,
        security_name: draft.securityName,
        bilty_no: draft.biltyNo,
        bilty_date: draft.biltyDate || null,
        dock_incharge: draft.dockIncharge,
        remarks: draft.remarks,
      };
      const entry = existingEntry
        ? await updateSalesDispatch.mutateAsync({ id: existingEntry.id, data: payload })
        : await createSalesDispatch.mutateAsync({
            ...payload,
            document_type: selectedPayloadDocuments[0].document_type,
            sap_doc_entry: selectedPayloadDocuments[0].doc_entry,
            documents: selectedPayloadDocuments.map((document) => ({
              document_type: document.document_type,
              sap_doc_entry: document.doc_entry,
              dispatch_plan_id: getDispatchPlanId(document),
            })),
            vehicle_id: draft.vehicle.vehicleId,
            driver_id: draft.driver.driverId,
            dispatch_plan_id: getDispatchPlanId(selectedPayloadDocuments[0]),
          });

      toast.success('Docking details saved');
      navigate(DOCKING_ROUTES.weighment(entry.vehicle_entry));
    } catch (error) {
      setFormError(getErrorMessage(error, 'Failed to save Docking entry'));
    }
  };

  if (
    (existingVehicleEntryId && isExistingLoading) ||
    (isPendingBookingMode && isPendingBookingLoading)
  ) {
    return <StepLoadingSpinner />;
  }

  return (
    <div className="space-y-6 pb-6">
      <StepHeader
        currentStep={1}
        totalSteps={DOCKING_TOTAL_STEPS}
        title="Docking"
        error={formError || null}
      />

      <div className="space-y-8">
        <FormSection icon={<Truck className="h-5 w-5" />} title="Vehicle & Driver">
          <div className="grid gap-4 lg:grid-cols-2">
            <VehicleSelect
              label="Vehicle Number"
              required
              value={draft.vehicle?.vehicleNumber || ''}
              disabled={isExistingReadOnly || !!existingEntry}
              defaultDisplayText={draft.vehicle?.vehicleNumber || ''}
              onChange={(vehicle) => updateDraft('vehicle', vehicle.vehicleId ? vehicle : null)}
              placeholder="Select vehicle"
            />
            <DriverSelect
              label="Driver"
              required
              value={draft.driver?.driverName || ''}
              disabled={isExistingReadOnly || !!existingEntry}
              defaultDisplayText={draft.driver?.driverName || ''}
              onChange={(driver) => updateDraft('driver', driver.driverId ? driver : null)}
              placeholder="Select driver"
            />
            <ReadOnlyDateTime dateValue={draft.gateOutDate} timeValue={draft.outTime} />
            <TextField
              id="sales-dispatch-security"
              label="Security Name"
              value={draft.securityName}
              disabled={isExistingReadOnly}
              onChange={(value) => updateDraft('securityName', value)}
              placeholder="Security staff name"
            />
          </div>
        </FormSection>

        <FormSection icon={<FileText className="h-5 w-5" />} title="SAP Document">
          <div className="grid gap-4 lg:grid-cols-2">
            {existingEntry ? (
              <ReadOnlyTextField
                label="SAP Document"
                value={documentDisplay}
                className="lg:col-span-2"
              />
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="sales-dispatch-document-type">
                    Document Type <span className="text-destructive">*</span>
                  </Label>
                  <NativeSelect
                    id="sales-dispatch-document-type"
                    value={draft.documentType}
                    onChange={(event) =>
                      handleDocumentTypeChange(event.target.value as SalesDispatchDocumentType)
                    }
                  >
                    <SelectOption value="INVOICE">Invoice</SelectOption>
                    <SelectOption value="STOCK_TRANSFER">Stock Transfer</SelectOption>
                  </NativeSelect>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label>
                      SAP {formatDocumentType(draft.documentType)}{' '}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => refetchDocuments()}
                    >
                      <RefreshCw className="mr-2 h-3.5 w-3.5" />
                      Refresh
                    </Button>
                  </div>
                  <SearchableSelect<SalesDispatchDocument>
                    inputId="sales-dispatch-document"
                    value={draft.documentKey}
                    items={documents}
                    isLoading={isDocumentsLoading}
                    isError={isDocumentsError}
                    placeholder="Search by document, customer, item, or warehouse"
                    getItemKey={buildDocumentKey}
                    getItemLabel={buildDocumentLabel}
                    filterFn={showServerResults}
                    loadingText="Loading SAP documents..."
                    emptyText="Search SAP documents"
                    notFoundText="No SAP documents found"
                    errorText="Failed to load SAP documents"
                    onSearchChange={(value) => setSubmittedSearch(value.trim())}
                    onClear={() => {
                      setSelectedListDocument(null);
                      updateDraft('documentKey', '');
                    }}
                    onItemSelect={(document) => {
                      setSelectedListDocument(document);
                      updateDraft('documentKey', buildDocumentKey(document));
                    }}
                    renderItem={(document) => (
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">
                          {formatDocumentType(document.document_type)} {document.doc_num}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {[
                            document.doc_date,
                            document.card_name || document.to_warehouse || document.warehouses,
                            document.item_summary,
                          ]
                            .filter(Boolean)
                            .join(' - ')}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {document.total_quantity ? `Qty ${document.total_quantity}` : ''}
                        </div>
                      </div>
                    )}
                  />
                  {draft.documentType === 'INVOICE' ? (
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!selectedDocument}
                        onClick={handleAddSelectedDocument}
                      >
                        <Plus className="mr-2 h-3.5 w-3.5" />
                        Add Invoice
                      </Button>
                    </div>
                  ) : null}
                </div>
              </>
            )}

            {!existingEntry && selectedDocuments.length > 0 ? (
              <SelectedDocumentsTable
                documents={selectedDocuments}
                onRemove={handleRemoveSelectedDocument}
              />
            ) : null}

            {!existingEntry && customerNames.length > 1 ? (
              <WarningBanner text="Selected invoices belong to different customers." />
            ) : null}

            {!existingEntry && ewayBills.length > 1 ? (
              <WarningBanner text="Selected invoices have different e-way bills." />
            ) : null}

            <ReadOnlyTextField
              label="Customer / Destination"
              value={
                customerNames.join(', ') ||
                existingEntry?.customer_name ||
                existingEntry?.to_warehouse ||
                ''
              }
            />
            <ReadOnlyTextField
              label="Ship To / Warehouse"
              value={
                getUniqueDocumentValues(
                  documentsForDisplay,
                  (document) => document.ship_to_address || document.warehouses || '',
                ).join(', ') ||
                existingEntry?.ship_to_address ||
                existingEntry?.warehouses ||
                ''
              }
            />
            <ReadOnlyTextField
              label="E-way Bill"
              value={ewayBills.join(', ') || existingEntry?.eway_bill || ''}
            />
            <ReadOnlyTextField
              label="Transporter"
              value={
                getUniqueDocumentValues(
                  documentsForDisplay,
                  (document) => document.transporter_name || '',
                ).join(', ') ||
                existingEntry?.transporter_name ||
                ''
              }
            />
          </div>
        </FormSection>

        <FormSection icon={<PackageCheck className="h-5 w-5" />} title="Document Lines">
          <DocumentLinesTable document={selectedDocument} entry={existingEntry} />
        </FormSection>

        <FormSection icon={<ShieldCheck className="h-5 w-5" />} title="Gate Details">
          <div className="grid gap-4 lg:grid-cols-2">
            <TextField
              id="sales-dispatch-bilty"
              label="Bilty / LR No."
              value={draft.biltyNo}
              disabled={isExistingReadOnly}
              onChange={(value) => updateDraft('biltyNo', value)}
            />
            <TextField
              id="sales-dispatch-bilty-date"
              label="Bilty Date"
              type="date"
              value={draft.biltyDate}
              disabled={isExistingReadOnly}
              onChange={(value) => updateDraft('biltyDate', value)}
            />
            <TextField
              id="sales-dispatch-dock-incharge"
              label="Dock Incharge"
              value={draft.dockIncharge}
              disabled={isExistingReadOnly}
              onChange={(value) => updateDraft('dockIncharge', value)}
              placeholder="Dock staff name"
            />
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="sales-dispatch-remarks">Remarks</Label>
              <Textarea
                id="sales-dispatch-remarks"
                value={draft.remarks}
                disabled={isExistingReadOnly}
                onChange={(event) => updateDraft('remarks', event.target.value)}
                placeholder="Optional notes"
              />
            </div>
          </div>
        </FormSection>
      </div>

      <StepFooter
        onCancel={() => navigate(DOCKING_ROUTES.dashboard)}
        onNext={handleSaveAndNext}
        showPrevious={false}
        isSaving={isSaving}
        nextLabel={
          isExistingReadOnly ? 'Continue to Weighment' : isSaving ? 'Saving...' : 'Save and Next'
        }
      />
    </div>
  );
}

function getDispatchPlanId(document: SalesDispatchDocument | null) {
  const plan = document?.plan;
  if (!plan || typeof plan !== 'object') return null;
  const id = (plan as { id?: unknown }).id;
  return typeof id === 'number' ? id : null;
}

function FormSection({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
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

function SelectedDocumentsTable({
  documents,
  onRemove,
}: {
  documents: SalesDispatchDocument[];
  onRemove: (documentKey: string) => void;
}) {
  return (
    <div className="lg:col-span-2 overflow-hidden rounded-md border">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-3 text-left text-sm font-medium">Invoice</th>
              <th className="p-3 text-left text-sm font-medium">Customer</th>
              <th className="p-3 text-left text-sm font-medium">E-way Bill</th>
              <th className="p-3 text-left text-sm font-medium">Weight</th>
              <th className="w-12 p-3" />
            </tr>
          </thead>
          <tbody>
            {documents.map((document) => (
              <tr key={buildDocumentKey(document)} className="border-t">
                <td className="whitespace-nowrap p-3 text-sm font-medium">{document.doc_num}</td>
                <td className="p-3 text-sm">{document.card_name || '-'}</td>
                <td className="whitespace-nowrap p-3 text-sm">{document.eway_bill || '-'}</td>
                <td className="whitespace-nowrap p-3 text-sm">{document.total_weight || '-'}</td>
                <td className="p-2 text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemove(buildDocumentKey(document))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WarningBanner({ text }: { text: string }) {
  return (
    <div className="lg:col-span-2 flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span>{text}</span>
    </div>
  );
}

function ReadOnlyDateTime({ dateValue, timeValue }: { dateValue: string; timeValue: string }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="sales-dispatch-date">
          Gate Out Date <span className="text-destructive">*</span>
        </Label>
        <Input
          id="sales-dispatch-date"
          type="date"
          value={dateValue}
          readOnly
          disabled
          className={lockedDateTimeInputClassName}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="sales-dispatch-time">
          Out Time <span className="text-destructive">*</span>
        </Label>
        <Input
          id="sales-dispatch-time"
          type="time"
          value={timeValue}
          readOnly
          disabled
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
  disabled,
  type = 'text',
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  type?: string;
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
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function ReadOnlyTextField({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className || ''}`}>
      <Label>{label}</Label>
      <Input
        value={formatValue(value)}
        readOnly
        disabled
        className={lockedDateTimeInputClassName}
      />
    </div>
  );
}

function DocumentLinesTable({
  document,
  entry,
}: {
  document: SalesDispatchDocument | null;
  entry?: SalesDispatchGateOut | null;
}) {
  const documentLines = getDocumentLines(document);
  const entryLines = entry?.items || [];
  const hasLines = documentLines.length > 0 || entryLines.length > 0;

  return (
    <div className="overflow-hidden rounded-md border">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px]">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-3 text-left text-sm font-medium">Item Code</th>
              <th className="p-3 text-left text-sm font-medium">Item</th>
              <th className="p-3 text-left text-sm font-medium">Quantity</th>
              <th className="p-3 text-left text-sm font-medium">UOM</th>
              <th className="p-3 text-left text-sm font-medium">Warehouse</th>
            </tr>
          </thead>
          <tbody>
            {!hasLines ? (
              <tr>
                <td colSpan={5} className="h-20 p-3 text-center text-sm text-muted-foreground">
                  Select a SAP document to view lines
                </td>
              </tr>
            ) : entryLines.length > 0 ? (
              entryLines.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="whitespace-nowrap p-3 text-sm">{item.item_code}</td>
                  <td className="p-3 text-sm font-medium">{item.item_name}</td>
                  <td className="whitespace-nowrap p-3 text-sm">{item.quantity}</td>
                  <td className="whitespace-nowrap p-3 text-sm">{item.uom}</td>
                  <td className="whitespace-nowrap p-3 text-sm">
                    {item.warehouse_code || item.from_warehouse || item.to_warehouse || '-'}
                  </td>
                </tr>
              ))
            ) : (
              documentLines.map((line, index) => (
                <tr key={getLineText(line, ['line_num', 'LineNum']) || index} className="border-t">
                  <td className="whitespace-nowrap p-3 text-sm">
                    {getLineText(line, ['item_code', 'ItemCode', 'ItemCode']) || '-'}
                  </td>
                  <td className="p-3 text-sm font-medium">
                    {getLineText(line, ['item_name', 'ItemName', 'Dscription']) || '-'}
                  </td>
                  <td className="whitespace-nowrap p-3 text-sm">
                    {getLineText(line, ['quantity', 'Quantity']) || '-'}
                  </td>
                  <td className="whitespace-nowrap p-3 text-sm">
                    {getLineText(line, ['uom', 'UomCode', 'unitMsr']) || '-'}
                  </td>
                  <td className="whitespace-nowrap p-3 text-sm">
                    {getLineText(line, [
                      'warehouse_code',
                      'WhsCode',
                      'from_warehouse',
                      'to_warehouse',
                    ]) || '-'}
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
