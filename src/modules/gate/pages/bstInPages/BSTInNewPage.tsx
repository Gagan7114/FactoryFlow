import { ArrowRight, FileText, LogIn, Truck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import {
  type BSTGateInEntry,
  type BSTGateOutEntry,
  useBSTGateInByVehicleEntry,
  useBSTGateInEligibleOuts,
  useCreateBSTGateIn,
  useUpdateBSTGateIn,
} from '@/modules/gate/api';
import { StepFooter, StepHeader } from '@/modules/gate/components';
import { useEntryStepTracker } from '@/modules/gate/hooks';
import { SearchableSelect } from '@/shared/components';
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Textarea,
} from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

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

function formatDateTime(date?: string | null, time?: string | null) {
  if (!date && !time) return '-';
  return [date, time].filter(Boolean).join(' ');
}

function buildOutLabel(entry: BSTGateOutEntry) {
  return [
    entry.entry_no,
    `BST ${entry.sap_doc_num}`,
    entry.vehicle_number,
    `${entry.sap_from_warehouse || '-'} -> ${entry.sap_to_warehouse || '-'}`,
  ].filter(Boolean).join(' - ');
}

function buildExistingOutLabel(entry: BSTGateInEntry) {
  return [
    entry.bst_gate_out_entry_no,
    `BST ${entry.sap_doc_num}`,
    entry.vehicle_number,
    `${entry.sap_from_warehouse || '-'} -> ${entry.sap_to_warehouse || '-'}`,
  ].filter(Boolean).join(' - ');
}

const lockedDateTimeInputClassName =
  'bg-muted/40 text-foreground disabled:cursor-not-allowed disabled:opacity-100';

const showServerResults = () => true;

function getDefaultReceivingQuantity(item: {
  quantity: string;
  actual_quantity?: string;
  receiving_quantity?: string;
}) {
  return item.receiving_quantity || item.actual_quantity || item.quantity || '';
}

export default function BSTInNewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const existingVehicleEntryId = Number(searchParams.get('entryId') || 0) || null;
  useEntryStepTracker();

  const [selectedOutId, setSelectedOutId] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [gateInDate, setGateInDate] = useState(() => toDateInputValue());
  const [inTime, setInTime] = useState(() => toTimeInputValue());
  const [securityName, setSecurityName] = useState('');
  const [remarks, setRemarks] = useState('');
  const [formError, setFormError] = useState('');
  const [selectedOutSnapshot, setSelectedOutSnapshot] = useState<BSTGateOutEntry | null>(null);
  const [receivingQuantities, setReceivingQuantities] = useState<Record<number, string>>({});

  const {
    data: existingEntry,
    isLoading: isExistingLoading,
    error: existingError,
  } = useBSTGateInByVehicleEntry(existingVehicleEntryId);
  const {
    data: eligibleOuts = [],
    isLoading: isEligibleLoading,
    isError: isEligibleError,
  } = useBSTGateInEligibleOuts({ search: submittedSearch });
  const createBSTGateIn = useCreateBSTGateIn();
  const updateBSTGateIn = useUpdateBSTGateIn();

  useEffect(() => {
    if (!existingEntry) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- Sync edit form from loaded BST in draft
    setSelectedOutId(String(existingEntry.bst_gate_out));
    setGateInDate(existingEntry.gate_in_date || toDateInputValue());
    setInTime(existingEntry.in_time?.slice(0, 5) || toTimeInputValue());
    setSecurityName(existingEntry.security_name || '');
    setRemarks(existingEntry.remarks || '');
    setReceivingQuantities(
      Object.fromEntries(
        (existingEntry.items || []).map((item) => [
          item.line_num,
          getDefaultReceivingQuantity(item),
        ]),
      ),
    );
  }, [existingEntry]);

  useEffect(() => {
    if (existingVehicleEntryId) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset reused route form after leaving edit mode
    setSelectedOutId('');
    setSubmittedSearch('');
    setGateInDate(toDateInputValue());
    setInTime(toTimeInputValue());
    setSecurityName('');
    setRemarks('');
    setFormError('');
    setSelectedOutSnapshot(null);
    setReceivingQuantities({});
  }, [existingVehicleEntryId]);

  const selectedOut = useMemo(
    () => selectedOutSnapshot || eligibleOuts.find((entry) => String(entry.id) === selectedOutId),
    [eligibleOuts, selectedOutId, selectedOutSnapshot],
  );
  const selectedOutDisplay = selectedOut
    ? buildOutLabel(selectedOut)
    : existingEntry
      ? buildExistingOutLabel(existingEntry)
      : '';

  useEffect(() => {
    if (!selectedOut?.items?.length) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- Seed receiving quantities from outbound actual quantities
    setReceivingQuantities((current) => {
      const next = { ...current };
      selectedOut.items.forEach((item) => {
        if (next[item.line_num] === undefined) {
          next[item.line_num] = getDefaultReceivingQuantity(item);
        }
      });
      return next;
    });
  }, [selectedOut]);

  const selectedDetails = selectedOut
    ? {
        outEntryNo: selectedOut.entry_no,
        vehicleNumber: selectedOut.vehicle_number,
        vehicleType: selectedOut.vehicle_type || '',
        driverName: selectedOut.driver_name,
        driverMobile: selectedOut.driver_mobile,
        transporterName: selectedOut.transporter_name || '',
        gateOut: formatDateTime(selectedOut.gate_out_date, selectedOut.out_time),
        sapDocNum: selectedOut.sap_doc_num,
        sapDocDate: selectedOut.sap_doc_date || '',
        fromWarehouse: selectedOut.sap_from_warehouse,
        toWarehouse: selectedOut.sap_to_warehouse,
        items: selectedOut.items,
      }
    : existingEntry
      ? {
          outEntryNo: existingEntry.bst_gate_out_entry_no,
          vehicleNumber: existingEntry.vehicle_number,
          vehicleType: existingEntry.vehicle_type || '',
          driverName: existingEntry.driver_name,
          driverMobile: existingEntry.driver_mobile,
          transporterName: existingEntry.transporter_name || '',
          gateOut: formatDateTime(existingEntry.bst_gate_out_date, existingEntry.bst_gate_out_time),
          sapDocNum: existingEntry.sap_doc_num,
          sapDocDate: existingEntry.sap_doc_date || '',
          fromWarehouse: existingEntry.sap_from_warehouse,
          toWarehouse: existingEntry.sap_to_warehouse,
          items: existingEntry.items,
        }
      : null;

  const isReadOnlyExisting = existingEntry?.status === 'COMPLETED';
  const isSaving = createBSTGateIn.isPending || updateBSTGateIn.isPending;
  const loadError = existingError ? getErrorMessage(existingError, 'Failed to load BST in') : '';

  const handleNext = async () => {
    if (isReadOnlyExisting && existingEntry) {
      navigate(`/gate/bst-in/new/attachments?entryId=${existingEntry.vehicle_entry}`);
      return;
    }

    if (!selectedOutId) {
      setFormError('Please select the in-transit BST out entry arriving at this branch');
      return;
    }

    if (!gateInDate) {
      setFormError('Gate in date is required');
      return;
    }

    if (!inTime) {
      setFormError('In time is required');
      return;
    }

    const detailItems = selectedDetails?.items || [];
    const invalidItem = detailItems.find((item) => {
      const value = receivingQuantities[item.line_num];
      return value === undefined || value === '' || Number(value) < 0 || Number.isNaN(Number(value));
    });
    if (invalidItem) {
      setFormError(`Please enter receiving quantity for line ${invalidItem.line_num}`);
      return;
    }

    setFormError('');

    try {
      const payload = {
        bst_gate_out_id: Number(selectedOutId),
        gate_in_date: gateInDate,
        in_time: inTime,
        items: detailItems.map((item) => ({
          line_num: item.line_num,
          receiving_quantity: Number(
            receivingQuantities[item.line_num] || getDefaultReceivingQuantity(item) || 0,
          ),
        })),
        security_name: securityName,
        remarks,
      };

      const entry = existingEntry
        ? await updateBSTGateIn.mutateAsync({ id: existingEntry.id, data: payload })
        : await createBSTGateIn.mutateAsync(payload);

      navigate(`/gate/bst-in/new/attachments?entryId=${entry.vehicle_entry}`);
    } catch (error) {
      setFormError(getErrorMessage(error, 'Failed to save BST in entry'));
    }
  };

  if (existingVehicleEntryId && isExistingLoading) {
    return <EmptyState text="Loading BST in entry..." />;
  }

  return (
    <div className="space-y-6 pb-6">
      <StepHeader currentStep={1} totalSteps={2} title="BST In" error={formError || loadError || null} />

      {isReadOnlyExisting && existingEntry ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Existing BST In
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
            <InfoItem label="Entry No." value={existingEntry.entry_no} />
            <InfoItem label="BST Out" value={existingEntry.bst_gate_out_entry_no} />
            <InfoItem label="Vehicle" value={existingEntry.vehicle_number} />
            <InfoItem label="Driver" value={existingEntry.driver_name} />
            <InfoItem label="SAP BST" value={existingEntry.sap_doc_num} />
            <InfoItem label="From" value={existingEntry.sap_from_warehouse} />
            <InfoItem label="To" value={existingEntry.sap_to_warehouse} />
            <InfoItem label="Gate In" value={formatDateTime(existingEntry.gate_in_date, existingEntry.in_time)} />
            <InfoItem label="Status" value={existingEntry.status} />
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LogIn className="h-5 w-5" />
                Vehicle Arrival & BST
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="lg:col-span-2">
                  <SearchableSelect<BSTGateOutEntry>
                    inputId="bst-out-entry"
                    label="In-Transit BST"
                    required
                    value={selectedOutId}
                    defaultDisplayText={selectedOutDisplay}
                    items={eligibleOuts}
                    isLoading={isEligibleLoading}
                    isError={isEligibleError}
                    placeholder="Search by BST out, vehicle, SAP BST, or warehouse"
                    getItemKey={(entry) => entry.id}
                    getItemLabel={buildOutLabel}
                    filterFn={showServerResults}
                    loadingText="Loading in-transit BST vehicles..."
                    emptyText="Search in-transit BST vehicles"
                    notFoundText="No in-transit BST vehicles found"
                    errorText="Failed to load in-transit BST vehicles"
                    onSearchChange={(value) => setSubmittedSearch(value.trim())}
                    onClear={() => {
                      setSelectedOutId('');
                      setSelectedOutSnapshot(null);
                      setSubmittedSearch('');
                      setReceivingQuantities({});
                      setFormError('');
                    }}
                    onItemSelect={(entry) => {
                      setSelectedOutId(String(entry.id));
                      setSelectedOutSnapshot(entry);
                      setReceivingQuantities(
                        Object.fromEntries(
                          entry.items.map((item) => [
                            item.line_num,
                            getDefaultReceivingQuantity(item),
                          ]),
                        ),
                      );
                      setFormError('');
                    }}
                    renderItem={(entry) => (
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">
                          {entry.entry_no} - {entry.vehicle_number}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {[
                            `BST ${entry.sap_doc_num}`,
                            `${entry.sap_from_warehouse || '-'} -> ${entry.sap_to_warehouse || '-'}`,
                            formatDateTime(entry.gate_out_date, entry.out_time),
                          ].filter(Boolean).join(' - ')}
                        </div>
                      </div>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="gate-in-date">
                      Gate In Date <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="gate-in-date"
                      type="date"
                      value={gateInDate}
                      readOnly
                      disabled
                      aria-readonly="true"
                      className={lockedDateTimeInputClassName}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="in-time">
                      In Time <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="in-time"
                      type="time"
                      value={inTime}
                      readOnly
                      disabled
                      aria-readonly="true"
                      className={lockedDateTimeInputClassName}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="security-name">Security Name</Label>
                  <Input
                    id="security-name"
                    value={securityName}
                    onChange={(event) => setSecurityName(event.target.value)}
                    placeholder="Security staff name"
                  />
                </div>

                <div className="space-y-2 lg:col-span-2">
                  <Label htmlFor="remarks">Remarks</Label>
                  <Textarea
                    id="remarks"
                    value={remarks}
                    onChange={(event) => setRemarks(event.target.value)}
                    placeholder="Optional notes"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {selectedDetails && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Truck className="h-5 w-5" />
                  Selected BST Vehicle
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
                  <InfoItem label="BST Out Entry" value={selectedDetails.outEntryNo} />
                  <InfoItem label="Vehicle" value={selectedDetails.vehicleNumber} />
                  <InfoItem label="Vehicle Type" value={selectedDetails.vehicleType} />
                  <InfoItem label="Driver" value={selectedDetails.driverName} />
                  <InfoItem label="Mobile" value={selectedDetails.driverMobile} />
                  <InfoItem label="Transporter" value={selectedDetails.transporterName} />
                  <InfoItem label="Gate Out" value={selectedDetails.gateOut} />
                  <InfoItem label="SAP BST" value={selectedDetails.sapDocNum} />
                  <InfoItem label="SAP Doc Date" value={selectedDetails.sapDocDate} />
                  <InfoItem label="From" value={selectedDetails.fromWarehouse} />
                  <InfoItem label="To" value={selectedDetails.toWarehouse} />
                </div>

                <div className="overflow-hidden rounded-md border">
                  <div className="max-h-56 overflow-auto">
                    <table className="w-full min-w-[900px]">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="p-2 text-left text-xs font-medium">Item</th>
                          <th className="p-2 text-left text-xs font-medium">SAP Qty</th>
                          <th className="p-2 text-left text-xs font-medium">Actual Qty</th>
                          <th className="p-2 text-left text-xs font-medium">Receiving Qty</th>
                          <th className="p-2 text-left text-xs font-medium">From</th>
                          <th className="p-2 text-left text-xs font-medium">To</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedDetails.items.map((item) => (
                          <tr key={item.id} className="border-t">
                            <td className="p-2 text-xs">
                              <div className="font-medium">{item.item_code}</div>
                              <div className="text-muted-foreground">{item.item_name}</div>
                            </td>
                            <td className="whitespace-nowrap p-2 text-xs">
                              {item.quantity} {item.uom}
                            </td>
                            <td className="whitespace-nowrap p-2 text-xs">
                              {item.actual_quantity} {item.uom}
                            </td>
                            <td className="p-2 text-xs">
                              <Input
                                type="number"
                                min="0"
                                step="0.001"
                                value={receivingQuantities[item.line_num] ?? ''}
                                onChange={(event) => {
                                  setReceivingQuantities((current) => ({
                                    ...current,
                                    [item.line_num]: event.target.value,
                                  }));
                                  setFormError('');
                                }}
                                className="h-9 min-w-28"
                                placeholder="0"
                              />
                            </td>
                            <td className="whitespace-nowrap p-2 text-xs">{item.from_warehouse}</td>
                            <td className="whitespace-nowrap p-2 text-xs">{item.to_warehouse}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <StepFooter
        onCancel={() => navigate('/gate/bst-in')}
        onNext={handleNext}
        showPrevious={false}
        isSaving={isSaving}
        nextLabel={
          isReadOnlyExisting
            ? 'Continue to Attachments'
            : isSaving
              ? 'Saving...'
              : 'Save and Next'
        }
      />
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value || '-'}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex min-h-20 items-center justify-center rounded-md border text-sm text-muted-foreground">
      <span className="inline-flex items-center gap-2">
        <Badge variant="outline">{text}</Badge>
        <ArrowRight className="h-3.5 w-3.5" />
      </span>
    </div>
  );
}
