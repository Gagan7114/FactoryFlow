import { ArrowRight, FileText, RefreshCw, Truck, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import {
  type EmptyVehicleGateInEntry,
  type SAPStockTransfer,
  useBSTGateOutByVehicleEntry,
  useCancelBSTGateOut,
  useCreateBSTGateOut,
  useEligibleEmptyVehicleGateInEntries,
  useSAPStockTransfer,
  useSAPStockTransfers,
  useUpdateBSTGateOut,
} from '@/modules/gate/api';
import { StepFooter, StepHeader } from '@/modules/gate/components';
import { useEntryStepTracker } from '@/modules/gate/hooks';
import { SearchableSelect } from '@/shared/components';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  NativeSelect,
  SelectOption,
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

const lockedDateTimeInputClassName =
  'bg-muted/40 text-foreground disabled:cursor-not-allowed disabled:opacity-100';

function buildVehicleLabel(entry: EmptyVehicleGateInEntry) {
  return [
    entry.vehicle_number,
    entry.driver_name,
    entry.entry_no,
    entry.sap_doc_num ? `BST ${entry.sap_doc_num}` : '',
    entry.vehicle_type,
  ].filter(Boolean).join(' - ');
}

function buildTransferLabel(transfer: SAPStockTransfer) {
  return [
    `BST ${transfer.doc_num}`,
    transfer.doc_date,
    `${transfer.from_warehouse || '-'} -> ${transfer.to_warehouse || '-'}`,
    `${transfer.line_count} line${transfer.line_count === 1 ? '' : 's'}`,
  ].filter(Boolean).join(' - ');
}

function formatDateTime(date?: string, time?: string) {
  if (!date && !time) return '-';
  return [date, time].filter(Boolean).join(' ');
}

function buildLinkedBSTLabel(entry?: EmptyVehicleGateInEntry | null) {
  if (!entry?.sap_doc_entry) return '';
  return [
    `BST ${entry.sap_doc_num || entry.sap_doc_entry}`,
    entry.sap_doc_date,
    `${entry.sap_from_warehouse || '-'} -> ${entry.sap_to_warehouse || '-'}`,
    entry.sap_line_count ? `${entry.sap_line_count} line${entry.sap_line_count === 1 ? '' : 's'}` : '',
  ].filter(Boolean).join(' - ');
}

const showServerResults = () => true;

export default function BSTOutNewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const existingVehicleEntryId = Number(searchParams.get('entryId') || 0) || null;
  const initialSapDocEntry = Number(searchParams.get('sapDocEntry') || 0) || null;
  useEntryStepTracker();

  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedDocEntry, setSelectedDocEntry] = useState(() => (
    initialSapDocEntry ? String(initialSapDocEntry) : ''
  ));
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [gateOutDate, setGateOutDate] = useState(() => toDateInputValue());
  const [outTime, setOutTime] = useState(() => toTimeInputValue());
  const [securityName, setSecurityName] = useState('');
  const [remarks, setRemarks] = useState('');
  const [formError, setFormError] = useState('');
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');

  const {
    data: existingEntry,
    isLoading: isExistingLoading,
  } = useBSTGateOutByVehicleEntry(existingVehicleEntryId);
  const {
    data: eligibleVehicles = [],
    isLoading: isVehiclesLoading,
    refetch: refetchVehicles,
  } = useEligibleEmptyVehicleGateInEntries({ reason: 'BST' });
  const {
    data: sapTransfers = [],
    isLoading: isTransfersLoading,
    isError: isTransfersError,
  } = useSAPStockTransfers({ search: submittedSearch, limit: 50 });
  const { data: selectedTransfer, isLoading: isTransferLoading } = useSAPStockTransfer(
    selectedDocEntry ? Number(selectedDocEntry) : null,
  );
  const createBSTGateOut = useCreateBSTGateOut();
  const updateBSTGateOut = useUpdateBSTGateOut();
  const cancelBSTGateOut = useCancelBSTGateOut();

  useEffect(() => {
    if (!existingEntry) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- Sync edit form from loaded BST out draft
    setSelectedVehicleId(String(existingEntry.empty_vehicle_gate_in));
    setSelectedDocEntry(String(existingEntry.sap_doc_entry));
    setGateOutDate(existingEntry.gate_out_date || toDateInputValue());
    setOutTime(existingEntry.out_time || toTimeInputValue());
    setSecurityName(existingEntry.security_name || '');
    setRemarks(existingEntry.remarks || '');
  }, [existingEntry]);

  useEffect(() => {
    if (existingVehicleEntryId) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset reused route form after leaving edit mode
    setSelectedVehicleId('');
    setSelectedDocEntry(initialSapDocEntry ? String(initialSapDocEntry) : '');
    setSubmittedSearch('');
    setGateOutDate(toDateInputValue());
    setOutTime(toTimeInputValue());
    setSecurityName('');
    setRemarks('');
    setFormError('');
  }, [existingVehicleEntryId, initialSapDocEntry]);

  const selectedVehicle = useMemo(
    () => eligibleVehicles.find((entry) => String(entry.id) === selectedVehicleId),
    [eligibleVehicles, selectedVehicleId],
  );

  useEffect(() => {
    if (existingEntry || !selectedVehicle?.sap_doc_entry) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- Sync BST Out from Empty Vehicle In document link
    setSelectedDocEntry(String(selectedVehicle.sap_doc_entry));
    setSubmittedSearch('');
  }, [existingEntry, selectedVehicle?.sap_doc_entry]);

  const linkedVehicleTransferDisplay = buildLinkedBSTLabel(selectedVehicle);
  const existingTransferDisplay = existingEntry
    ? [
        `BST ${existingEntry.sap_doc_num || existingEntry.sap_doc_entry}`,
        existingEntry.sap_doc_date,
        `${existingEntry.sap_from_warehouse || '-'} -> ${existingEntry.sap_to_warehouse || '-'}`,
        `${existingEntry.items.length} line${existingEntry.items.length === 1 ? '' : 's'}`,
      ].filter(Boolean).join(' - ')
    : '';
  const selectedTransferDisplay = selectedTransfer
    ? buildTransferLabel(selectedTransfer)
    : linkedVehicleTransferDisplay || existingTransferDisplay;
  const actualQuantityByLine = selectedVehicle?.items
    ? Object.fromEntries(selectedVehicle.items.map((item) => [item.line_num, item.actual_quantity]))
    : Object.fromEntries((existingEntry?.items || []).map((item) => [item.line_num, item.actual_quantity]));
  const isBstSelectionLocked = Boolean(existingEntry || selectedVehicle?.sap_doc_entry);
  const isReadOnlyExisting = existingEntry?.status === 'COMPLETED';
  const canCancelExisting = existingEntry?.status === 'IN_PROGRESS';
  const isSaving = createBSTGateOut.isPending || updateBSTGateOut.isPending;
  const existingVehicleLabel = existingEntry
    ? [
        existingEntry.vehicle_number,
        existingEntry.driver_name,
        existingEntry.empty_vehicle_gate_in_entry_no,
        existingEntry.vehicle_type,
      ].filter(Boolean).join(' - ')
    : '';

  const handleNext = async () => {
    if (isReadOnlyExisting && existingEntry) {
      navigate(`/gate/bst-out/new/step2?entryId=${existingEntry.vehicle_entry}`);
      return;
    }

    if (!existingEntry && !selectedVehicle) {
      setFormError('Please select a BST empty vehicle entry');
      return;
    }

    const sapDocEntry = existingEntry?.sap_doc_entry || selectedVehicle?.sap_doc_entry || (
      selectedDocEntry ? Number(selectedDocEntry) : 0
    );

    if (!sapDocEntry) {
      setFormError('Please select the SAP BST document going out');
      return;
    }

    if (!gateOutDate) {
      setFormError('Gate out date is required');
      return;
    }

    if (!outTime) {
      setFormError('Out time is required');
      return;
    }

    setFormError('');

    try {
      const payload = {
        empty_vehicle_gate_in_id: existingEntry
          ? existingEntry.empty_vehicle_gate_in
          : selectedVehicle!.id,
        sap_doc_entry: sapDocEntry,
        gate_out_date: gateOutDate,
        out_time: outTime,
        security_name: securityName,
        remarks,
      };

      const entry = existingEntry
        ? await updateBSTGateOut.mutateAsync({ id: existingEntry.id, data: payload })
        : await createBSTGateOut.mutateAsync(payload);

      navigate(`/gate/bst-out/new/step2?entryId=${entry.vehicle_entry}`);
    } catch (error) {
      setFormError(getErrorMessage(error, 'Failed to save BST out entry'));
    }
  };

  const handleCancel = () => {
    navigate('/gate/bst-out');
  };

  const handleCancelBSTOut = async () => {
    if (!existingEntry) return;

    const trimmedReason = cancelReason.trim();
    if (!trimmedReason) {
      setCancelError('Please enter a cancellation reason');
      return;
    }

    setCancelError('');
    setFormError('');

    try {
      await cancelBSTGateOut.mutateAsync({
        id: existingEntry.id,
        data: { cancel_reason: trimmedReason },
      });
      toast.success('BST out cancelled. Vehicle is available for BST out again.');
      setIsCancelDialogOpen(false);
      setCancelReason('');
      navigate('/gate/bst-out/new');
    } catch (error) {
      setCancelError(getErrorMessage(error, 'Failed to cancel BST out'));
    }
  };

  if (existingVehicleEntryId && isExistingLoading) {
    return <EmptyState text="Loading BST out entry..." />;
  }

  return (
    <div className="space-y-6 pb-6">
      <StepHeader currentStep={1} totalSteps={3} title="BST Out" error={formError || null} />

      {isReadOnlyExisting && existingEntry ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Existing BST Out
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
            <InfoItem label="Entry No." value={existingEntry.entry_no} />
            <InfoItem label="Vehicle" value={existingEntry.vehicle_number} />
            <InfoItem label="Driver" value={existingEntry.driver_name} />
            <InfoItem label="SAP BST" value={existingEntry.sap_doc_num} />
            <InfoItem label="From" value={existingEntry.sap_from_warehouse} />
            <InfoItem label="To" value={existingEntry.sap_to_warehouse} />
            <InfoItem label="Gate Out Date" value={existingEntry.gate_out_date} />
            <InfoItem label="Status" value={existingEntry.status} />
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Vehicle & SAP BST
              </CardTitle>
              {canCancelExisting && (
                <Button
                  type="button"
                  variant="outline"
                  className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => {
                    setCancelError('');
                    setIsCancelDialogOpen(true);
                  }}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancel BST Out
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  {existingEntry ? (
                    <>
                      <Label htmlFor="bst-empty-vehicle">
                        BST Vehicle <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="bst-empty-vehicle"
                        value={existingVehicleLabel}
                        readOnly
                        disabled
                        aria-readonly="true"
                        className={lockedDateTimeInputClassName}
                      />
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between gap-3">
                        <Label htmlFor="bst-empty-vehicle">
                          BST Vehicle <span className="text-destructive">*</span>
                        </Label>
                        <Button variant="ghost" size="sm" onClick={() => refetchVehicles()}>
                          <RefreshCw className="mr-2 h-3.5 w-3.5" />
                          Refresh
                        </Button>
                      </div>
                      <NativeSelect
                        id="bst-empty-vehicle"
                        value={selectedVehicleId}
                        onChange={(event) => {
                          const nextVehicleId = event.target.value;
                          const nextVehicle = eligibleVehicles.find(
                            (entry) => String(entry.id) === nextVehicleId,
                          );
                          setSelectedVehicleId(nextVehicleId);
                          setSelectedDocEntry(nextVehicle?.sap_doc_entry ? String(nextVehicle.sap_doc_entry) : '');
                          setSubmittedSearch('');
                          setFormError('');
                        }}
                        disabled={isVehiclesLoading}
                      >
                        <SelectOption value="">Select vehicle entered for BST</SelectOption>
                        {eligibleVehicles.map((entry) => (
                          <SelectOption key={entry.id} value={String(entry.id)}>
                            {buildVehicleLabel(entry)}
                          </SelectOption>
                        ))}
                      </NativeSelect>
                    </>
                  )}
                </div>

                <div>
                  {isBstSelectionLocked ? (
                    <div className="space-y-2">
                      <Label htmlFor="sap-bst">
                        SAP BST <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="sap-bst"
                        value={selectedTransferDisplay}
                        readOnly
                        disabled
                        aria-readonly="true"
                        className={lockedDateTimeInputClassName}
                      />
                    </div>
                  ) : (
                    <SearchableSelect<SAPStockTransfer>
                      inputId="sap-bst"
                      label="SAP BST"
                      required
                      value={selectedDocEntry}
                      defaultDisplayText={selectedTransferDisplay}
                      items={sapTransfers}
                      isLoading={isTransfersLoading}
                      isError={isTransfersError}
                      placeholder="Search SAP BST by doc number, item, or warehouse"
                      getItemKey={(transfer) => transfer.doc_entry}
                      getItemLabel={buildTransferLabel}
                      filterFn={showServerResults}
                      loadingText="Loading SAP BST documents..."
                      emptyText="Search SAP BST by doc number, item, or warehouse"
                      notFoundText="No SAP BST documents found"
                      errorText="Failed to load SAP BST documents"
                      onSearchChange={(value) => setSubmittedSearch(value.trim())}
                      onClear={() => {
                        setSelectedDocEntry('');
                        setSubmittedSearch('');
                        setFormError('');
                      }}
                      onItemSelect={(transfer) => {
                        setSelectedDocEntry(String(transfer.doc_entry));
                        setFormError('');
                      }}
                      renderItem={(transfer) => (
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">
                            BST {transfer.doc_num}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {[
                              transfer.doc_date,
                              `${transfer.from_warehouse || '-'} -> ${
                                transfer.to_warehouse || '-'
                              }`,
                              `${transfer.line_count} line${
                                transfer.line_count === 1 ? '' : 's'
                              }`,
                            ].filter(Boolean).join(' - ')}
                          </div>
                          {transfer.comments && (
                            <div className="truncate text-xs text-muted-foreground">
                              {transfer.comments}
                            </div>
                          )}
                        </div>
                      )}
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="gate-out-date">
                      Gate Out Date <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="gate-out-date"
                      type="date"
                      value={gateOutDate}
                      readOnly
                      disabled
                      aria-readonly="true"
                      className={lockedDateTimeInputClassName}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="out-time">
                      Out Time <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="out-time"
                      type="time"
                      value={outTime}
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

          {(selectedVehicle || existingEntry || selectedTransfer) && (
            <div className="grid gap-4 xl:grid-cols-2">
              {(selectedVehicle || existingEntry) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Selected Vehicle</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
                    <InfoItem
                      label="Entry No."
                      value={selectedVehicle?.entry_no || existingEntry?.empty_vehicle_gate_in_entry_no}
                    />
                    <InfoItem
                      label="Vehicle"
                      value={selectedVehicle?.vehicle_number || existingEntry?.vehicle_number}
                    />
                    <InfoItem
                      label="Driver"
                      value={selectedVehicle?.driver_name || existingEntry?.driver_name}
                    />
                    <InfoItem
                      label="Mobile"
                      value={selectedVehicle?.driver_mobile || existingEntry?.driver_mobile}
                    />
                    <InfoItem
                      label="Transporter"
                      value={selectedVehicle?.transporter_name || existingEntry?.transporter_name || ''}
                    />
                    <InfoItem
                      label="Gate In"
                      value={
                        selectedVehicle
                          ? formatDateTime(selectedVehicle.gate_in_date, selectedVehicle.in_time)
                          : formatDateTime(
                              existingEntry?.empty_vehicle_gate_in_date || undefined,
                              existingEntry?.empty_vehicle_in_time || undefined,
                            )
                      }
                    />
                  </CardContent>
                </Card>
              )}

              {selectedDocEntry && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Selected SAP BST</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isTransferLoading ? (
                      <EmptyState text="Loading SAP BST details..." />
                    ) : selectedTransfer ? (
                      <>
                        <div className="grid gap-3 text-sm sm:grid-cols-2">
                          <InfoItem label="Doc Num" value={selectedTransfer.doc_num} />
                          <InfoItem label="Doc Date" value={selectedTransfer.doc_date || ''} />
                          <InfoItem label="From" value={selectedTransfer.from_warehouse} />
                          <InfoItem label="To" value={selectedTransfer.to_warehouse} />
                        </div>
                        <div className="max-h-56 overflow-auto rounded-md border">
                          <table className="w-full min-w-[760px]">
                            <thead className="bg-muted/50">
                              <tr>
                                <th className="p-2 text-left text-xs font-medium">Item</th>
                                <th className="p-2 text-left text-xs font-medium">SAP Qty</th>
                                <th className="p-2 text-left text-xs font-medium">Actual Qty</th>
                                <th className="p-2 text-left text-xs font-medium">From</th>
                                <th className="p-2 text-left text-xs font-medium">To</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(selectedTransfer.lines || []).map((line) => (
                                <tr key={line.line_num} className="border-t">
                                  <td className="p-2 text-xs">
                                    <div className="font-medium">{line.item_code}</div>
                                    <div className="text-muted-foreground">{line.item_name}</div>
                                  </td>
                                  <td className="whitespace-nowrap p-2 text-xs">
                                    {line.quantity} {line.uom}
                                  </td>
                                  <td className="whitespace-nowrap p-2 text-xs">
                                    {actualQuantityByLine[line.line_num] || line.quantity} {line.uom}
                                  </td>
                                  <td className="whitespace-nowrap p-2 text-xs">
                                    {line.from_warehouse}
                                  </td>
                                  <td className="whitespace-nowrap p-2 text-xs">
                                    {line.to_warehouse}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    ) : (
                      <EmptyState text="Select a SAP BST document" />
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </>
      )}

      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Cancel BST Out</DialogTitle>
            <DialogDescription>
              This will keep the cancelled BST Out in history and make the empty vehicle available
              for a fresh BST Out entry.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="bst-cancel-reason">
              Cancellation Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="bst-cancel-reason"
              value={cancelReason}
              onChange={(event) => {
                setCancelReason(event.target.value);
                setCancelError('');
              }}
              placeholder="Example: Wrong vehicle selected for this BST out"
            />
            {cancelError && <p className="text-sm text-destructive">{cancelError}</p>}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCancelDialogOpen(false)}
              disabled={cancelBSTGateOut.isPending}
            >
              Keep Entry
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleCancelBSTOut}
              disabled={cancelBSTGateOut.isPending}
            >
              {cancelBSTGateOut.isPending ? 'Cancelling...' : 'Cancel and Release Vehicle'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <StepFooter
        onCancel={handleCancel}
        onNext={handleNext}
        showPrevious={false}
        isSaving={isSaving}
        nextLabel={
          isReadOnlyExisting
            ? 'Continue to Weighment'
            : isSaving
              ? 'Saving...'
              : 'Save and Next'
        }
      />
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value?: string }) {
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
