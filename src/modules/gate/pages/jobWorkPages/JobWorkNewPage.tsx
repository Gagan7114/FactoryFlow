import { ArrowRight, Factory, Truck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import {
  type SAPProductionOrder,
  useCreateJobWorkGateIn,
  useJobWorkGateInByVehicleEntry,
  useSAPProductionOrder,
  useSAPProductionOrders,
  useUpdateJobWorkGateIn,
} from '@/modules/gate/api';
import {
  DriverSelect,
  type DriverSelection,
  StepFooter,
  StepHeader,
  VehicleSelect,
  type VehicleSelection,
} from '@/modules/gate/components';
import { useEntryStepTracker } from '@/modules/gate/hooks';
import { SearchableSelect } from '@/shared/components';
import { Badge, Card, CardContent, CardHeader, CardTitle, Input, Label, Textarea } from '@/shared/components/ui';
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

function formatProductionStatus(status?: string | null) {
  const labels: Record<string, string> = {
    P: 'Planned',
    R: 'Released',
    L: 'Closed',
    C: 'Cancelled',
  };
  return labels[String(status || '')] || status || '-';
}

const lockedDateTimeInputClassName =
  'bg-muted/40 text-foreground disabled:cursor-not-allowed disabled:opacity-100';

function buildProductionOrderLabel(order: SAPProductionOrder) {
  return [
    `PO ${order.doc_num}`,
    order.item_name || order.item_code,
    order.due_date ? `Due ${order.due_date}` : '',
    formatProductionStatus(order.status),
  ].filter(Boolean).join(' - ');
}

function buildExistingProductionOrderSnapshot(
  existingEntry: NonNullable<ReturnType<typeof useJobWorkGateInByVehicleEntry>['data']>,
): SAPProductionOrder | null {
  if (!existingEntry.production_order_doc_entry) return null;

  return {
    doc_entry: existingEntry.production_order_doc_entry,
    doc_num: existingEntry.production_order_doc_num || String(existingEntry.production_order_doc_entry),
    item_code: existingEntry.production_item_code || '',
    item_name: existingEntry.production_item_name || '',
    planned_qty: Number(existingEntry.production_planned_qty || 0),
    completed_qty: Number(existingEntry.production_completed_qty || 0),
    rejected_qty: Number(existingEntry.production_rejected_qty || 0),
    remaining_qty: Number(existingEntry.production_remaining_qty || 0),
    start_date: existingEntry.production_start_date,
    due_date: existingEntry.production_due_date,
    warehouse: existingEntry.production_warehouse || '',
    status: existingEntry.production_status || '',
    components: existingEntry.items.map((item) => ({
      line_num: item.line_num,
      item_code: item.item_code,
      item_name: item.item_name,
      planned_qty: Number.parseFloat(String(item.quantity)) || 0,
      issued_qty: 0,
      warehouse: item.warehouse_code,
      uom: item.uom,
    })),
  };
}

const showServerResults = () => true;

export default function JobWorkNewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const existingVehicleEntryId = Number(searchParams.get('entryId') || 0) || null;
  useEntryStepTracker();

  const [vehicle, setVehicle] = useState<VehicleSelection | null>(null);
  const [driver, setDriver] = useState<DriverSelection | null>(null);
  const [selectedProductionOrderDocEntry, setSelectedProductionOrderDocEntry] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [selectedProductionOrderSnapshot, setSelectedProductionOrderSnapshot] =
    useState<SAPProductionOrder | null>(null);
  const [gateInDate, setGateInDate] = useState(() => toDateInputValue());
  const [inTime, setInTime] = useState(() => toTimeInputValue());
  const [securityName, setSecurityName] = useState('');
  const [remarks, setRemarks] = useState('');
  const [formError, setFormError] = useState('');

  const {
    data: existingEntry,
    isLoading: isExistingLoading,
  } = useJobWorkGateInByVehicleEntry(existingVehicleEntryId);
  const {
    data: productionOrders = [],
    isLoading: isProductionOrdersLoading,
    isError: isProductionOrdersError,
  } = useSAPProductionOrders({ search: submittedSearch, limit: 50 });
  const { data: selectedProductionOrder, isLoading: isProductionOrderLoading } =
    useSAPProductionOrder(
      selectedProductionOrderDocEntry ? Number(selectedProductionOrderDocEntry) : null,
    );
  const createJobWork = useCreateJobWorkGateIn();
  const updateJobWork = useUpdateJobWorkGateIn();

  useEffect(() => {
    if (!existingEntry) return;

    const productionOrderSnapshot = buildExistingProductionOrderSnapshot(existingEntry);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Sync edit form from loaded job-work entry
    setVehicle({
      vehicleId: existingEntry.vehicle,
      vehicleNumber: existingEntry.vehicle_number,
      vehicleType: existingEntry.vehicle_type || '',
      vehicleCapacity: '',
      transporterId: 0,
      transporterName: existingEntry.transporter_name || '',
      transporterContactPerson: '',
      transporterMobile: '',
    });
    setDriver({
      driverId: existingEntry.driver,
      driverName: existingEntry.driver_name,
      mobileNumber: existingEntry.driver_mobile,
      drivingLicenseNumber: '',
      idProofType: '',
      idProofNumber: '',
      driverPhoto: null,
    });
    setSelectedProductionOrderDocEntry(
      existingEntry.production_order_doc_entry
        ? String(existingEntry.production_order_doc_entry)
        : '',
    );
    setSelectedProductionOrderSnapshot(productionOrderSnapshot);
    setGateInDate(existingEntry.gate_in_date || toDateInputValue());
    setInTime(existingEntry.in_time || toTimeInputValue());
    setSecurityName(existingEntry.security_name || '');
    setRemarks(existingEntry.remarks || '');
  }, [existingEntry]);

  useEffect(() => {
    if (existingVehicleEntryId) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset reused route form after leaving edit mode
    setVehicle(null);
    setDriver(null);
    setSelectedProductionOrderDocEntry('');
    setSubmittedSearch('');
    setSelectedProductionOrderSnapshot(null);
    setGateInDate(toDateInputValue());
    setInTime(toTimeInputValue());
    setSecurityName('');
    setRemarks('');
    setFormError('');
  }, [existingVehicleEntryId]);

  const selectedProductionOrderForDisplay =
    selectedProductionOrder || selectedProductionOrderSnapshot;
  const selectedProductionOrderDisplay = selectedProductionOrderForDisplay
    ? buildProductionOrderLabel(selectedProductionOrderForDisplay)
    : '';
  const isSaving = createJobWork.isPending || updateJobWork.isPending;
  const isCompletedEntry = existingEntry?.status === 'COMPLETED';

  const handleNext = async () => {
    if (!vehicle?.vehicleId) {
      setFormError('Please select a vehicle');
      return;
    }

    if (!driver?.driverId) {
      setFormError('Please select a driver');
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

    setFormError('');

    try {
      const payload = {
        vehicle_id: vehicle.vehicleId,
        driver_id: driver.driverId,
        production_order_doc_entry: selectedProductionOrderDocEntry
          ? Number(selectedProductionOrderDocEntry)
          : null,
        gate_in_date: gateInDate,
        in_time: inTime,
        security_name: securityName,
        remarks,
      };

      const entry = existingEntry
        ? await updateJobWork.mutateAsync({ id: existingEntry.id, data: payload })
        : await createJobWork.mutateAsync(payload);

      navigate(
        entry.status === 'COMPLETED'
          ? `/gate/job-work/new/review?entryId=${entry.vehicle_entry}`
          : `/gate/job-work/new/step2?entryId=${entry.vehicle_entry}`,
      );
    } catch (error) {
      setFormError(getErrorMessage(error, 'Failed to save job work entry'));
    }
  };

  if (existingVehicleEntryId && isExistingLoading) {
    return <EmptyState text="Loading job work entry..." />;
  }

  return (
    <div className="space-y-6 pb-6">
      <StepHeader currentStep={1} totalSteps={3} title="Job Work" error={formError || null} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Vehicle, Driver & Production Order
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <VehicleSelect
              label="Vehicle Number"
              required
              value={vehicle?.vehicleNumber || ''}
              onChange={(selectedVehicle) => {
                setVehicle(selectedVehicle.vehicleId ? selectedVehicle : null);
                setFormError('');
              }}
              placeholder="Select vehicle"
            />

            <DriverSelect
              label="Driver"
              required
              value={driver?.driverName || ''}
              onChange={(selectedDriver) => {
                setDriver(selectedDriver.driverId ? selectedDriver : null);
                setFormError('');
              }}
              placeholder="Select driver"
            />

            <div className="lg:col-span-2">
              <SearchableSelect<SAPProductionOrder>
                inputId="sap-production-order"
                label="SAP Production Order"
                value={selectedProductionOrderDocEntry}
                defaultDisplayText={selectedProductionOrderDisplay}
                items={productionOrders}
                isLoading={isProductionOrdersLoading}
                isError={isProductionOrdersError}
                placeholder="Search production order by number, item, or warehouse"
                getItemKey={(order) => order.doc_entry}
                getItemLabel={buildProductionOrderLabel}
                filterFn={showServerResults}
                loadingText="Loading SAP production orders..."
                emptyText="Search production order by number, item, or warehouse"
                notFoundText="No SAP production orders found"
                errorText="Failed to load SAP production orders"
                onSearchChange={(value) => setSubmittedSearch(value.trim())}
                onClear={() => {
                  setSelectedProductionOrderDocEntry('');
                  setSubmittedSearch('');
                  setSelectedProductionOrderSnapshot(null);
                  setFormError('');
                }}
                onItemSelect={(order) => {
                  setSelectedProductionOrderDocEntry(String(order.doc_entry));
                  setSelectedProductionOrderSnapshot(order);
                  setFormError('');
                }}
                renderItem={(order) => (
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      PO {order.doc_num} - {order.item_name || order.item_code}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {[
                        order.due_date ? `Due ${order.due_date}` : '',
                        order.warehouse,
                        formatProductionStatus(order.status),
                        `${order.remaining_qty} remaining`,
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

      {(vehicle || driver || selectedProductionOrderForDisplay) && (
        <div className="grid gap-4 xl:grid-cols-2">
          {(vehicle || driver) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Selected Vehicle & Driver</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
                <InfoItem label="Vehicle" value={vehicle?.vehicleNumber} />
                <InfoItem label="Vehicle Type" value={vehicle?.vehicleType} />
                <InfoItem label="Transporter" value={vehicle?.transporterName} />
                <InfoItem label="Driver" value={driver?.driverName} />
                <InfoItem label="Mobile" value={driver?.mobileNumber} />
                <InfoItem label="License" value={driver?.drivingLicenseNumber} />
              </CardContent>
            </Card>
          )}

          {selectedProductionOrderForDisplay && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Factory className="h-4 w-4" />
                  Selected SAP Production Order
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isProductionOrderLoading && !selectedProductionOrderSnapshot ? (
                  <EmptyState text="Loading SAP production order details..." />
                ) : (
                  <>
                    <div className="grid gap-3 text-sm sm:grid-cols-2">
                      <InfoItem label="Order No." value={selectedProductionOrderForDisplay.doc_num} />
                      <InfoItem
                        label="Item"
                        value={
                          selectedProductionOrderForDisplay.item_name ||
                          selectedProductionOrderForDisplay.item_code
                        }
                      />
                      <InfoItem label="Planned Qty" value={selectedProductionOrderForDisplay.planned_qty} />
                      <InfoItem label="Remaining Qty" value={selectedProductionOrderForDisplay.remaining_qty} />
                      <InfoItem label="Due Date" value={selectedProductionOrderForDisplay.due_date} />
                      <InfoItem
                        label="Status"
                        value={formatProductionStatus(selectedProductionOrderForDisplay.status)}
                      />
                    </div>
                    <ProductionOrderComponentsTable
                      components={selectedProductionOrderForDisplay.components || []}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <StepFooter
        onCancel={() => navigate('/gate/job-work')}
        onNext={handleNext}
        showPrevious={false}
        isSaving={isSaving}
        nextLabel={isSaving ? 'Saving...' : isCompletedEntry ? 'Save Changes' : 'Save and Next'}
      />
    </div>
  );
}

function ProductionOrderComponentsTable({
  components,
}: {
  components: SAPProductionOrder['components'];
}) {
  if (!components || components.length === 0) {
    return <EmptyState text="No SAP production order components available" />;
  }

  return (
    <div className="max-h-56 overflow-auto rounded-md border">
      <table className="w-full min-w-[620px]">
        <thead className="bg-muted/50">
          <tr>
            <th className="p-2 text-left text-xs font-medium">Component</th>
            <th className="p-2 text-left text-xs font-medium">Planned Qty</th>
            <th className="p-2 text-left text-xs font-medium">Issued Qty</th>
            <th className="p-2 text-left text-xs font-medium">Warehouse</th>
          </tr>
        </thead>
        <tbody>
          {components.map((component) => (
            <tr key={component.line_num} className="border-t">
              <td className="p-2 text-xs">
                <div className="font-medium">{component.item_code}</div>
                <div className="text-muted-foreground">{component.item_name}</div>
              </td>
              <td className="whitespace-nowrap p-2 text-xs">
                {component.planned_qty} {component.uom || ''}
              </td>
              <td className="whitespace-nowrap p-2 text-xs">
                {component.issued_qty} {component.uom || ''}
              </td>
              <td className="whitespace-nowrap p-2 text-xs">{component.warehouse || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
