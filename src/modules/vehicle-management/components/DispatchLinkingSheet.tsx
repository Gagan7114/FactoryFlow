import { Loader2, Save } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { DispatchBill } from '@/modules/dashboards/dispatch-plans/types';
import type { DriverName } from '@/modules/gate/api/driver/driver.api';
import { useDriverById, useDriverNames } from '@/modules/gate/api/driver/driver.queries';
import type { Vehicle, VehicleName } from '@/modules/gate/api/vehicle/vehicle.api';
import { useVehicleById, useVehicleNames } from '@/modules/gate/api/vehicle/vehicle.queries';
import { CreateDriverDialog, CreateVehicleDialog } from '@/modules/gate/components';
import { SearchableSelect } from '@/shared/components';
import {
  Button,
  Input,
  Label,
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Textarea,
} from '@/shared/components/ui';

import type { DispatchVehicleLinkPayload } from '../types';

interface DispatchLinkingSheetProps {
  bill: DispatchBill | null;
  open: boolean;
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (docEntry: number, payload: DispatchVehicleLinkPayload) => Promise<void>;
}

interface FormState {
  vehicle_id: number | null;
  transporter_id: number | null;
  driver_id: number | null;
  linked_vehicle_entry_id: string;
  transporter_name: string;
  transporter_gstin: string;
  contact_person: string;
  mobile_no: string;
  vehicle_no: string;
  driver_name: string;
  driver_mobile_no: string;
  driver_license_no: string;
  driver_id_proof_type: string;
  driver_id_proof_number: string;
  driver_photo: string | null;
  bilty_no: string;
  bilty_date: string;
  freight: string;
  total_freight: string;
  kanta_weight: string;
  remarks: string;
}

interface VehicleSelection {
  vehicleId: number;
  vehicleNumber: string;
  vehicleType: string;
  vehicleCapacity: string;
  transporterId: number;
  transporterName: string;
  transporterGstin: string;
  transporterContactPerson: string;
  transporterMobile: string;
}

interface DriverSelection {
  driverId: number;
  driverName: string;
  mobileNumber: string;
  drivingLicenseNumber: string;
  idProofType: string;
  idProofNumber: string;
  driverPhoto: string | null;
}

const EMPTY_FORM: FormState = {
  vehicle_id: null,
  transporter_id: null,
  driver_id: null,
  linked_vehicle_entry_id: '',
  transporter_name: '',
  transporter_gstin: '',
  contact_person: '',
  mobile_no: '',
  vehicle_no: '',
  driver_name: '',
  driver_mobile_no: '',
  driver_license_no: '',
  driver_id_proof_type: '',
  driver_id_proof_number: '',
  driver_photo: null,
  bilty_no: '',
  bilty_date: '',
  freight: '',
  total_freight: '',
  kanta_weight: '',
  remarks: '',
};

function formFromBill(bill: DispatchBill | null): FormState {
  if (!bill) return EMPTY_FORM;
  const sapVehicleNo = bill.sap_vehicle_no || bill.gst_vehicle_no || '';

  return {
    vehicle_id: bill.plan.vehicle_id ?? null,
    transporter_id: bill.plan.transporter_id ?? null,
    driver_id: bill.plan.driver_id ?? null,
    linked_vehicle_entry_id: bill.plan.linked_vehicle_entry_id
      ? String(bill.plan.linked_vehicle_entry_id)
      : '',
    transporter_name: bill.plan.transporter_name || bill.sap_transporter_name || '',
    transporter_gstin: bill.plan.transporter_gstin ?? '',
    contact_person: bill.plan.contact_person ?? '',
    mobile_no: bill.plan.mobile_no ?? '',
    vehicle_no: bill.plan.vehicle_no || sapVehicleNo,
    driver_name: bill.plan.driver_name ?? '',
    driver_mobile_no: bill.plan.driver_mobile_no ?? '',
    driver_license_no: bill.plan.driver_license_no ?? '',
    driver_id_proof_type: bill.plan.driver_id_proof_type ?? '',
    driver_id_proof_number: bill.plan.driver_id_proof_number ?? '',
    driver_photo: null,
    bilty_no: bill.plan.bilty_no || bill.sap_bilty_no || bill.sap_lr_number || '',
    bilty_date: bill.plan.bilty_date || bill.sap_bilty_date || '',
    freight: bill.plan.freight ?? '',
    total_freight: bill.plan.total_freight ?? '',
    kanta_weight: bill.plan.kanta_weight ?? '',
    remarks: bill.plan.remarks ?? '',
  };
}

function stringOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}

function numberOrNull(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function compactText(value: string | null | undefined, fallback = '-') {
  return value?.trim() || fallback;
}

export function DispatchLinkingSheet({
  bill,
  open,
  isSaving,
  onOpenChange,
  onSave,
}: DispatchLinkingSheetProps) {
  const [form, setForm] = useState<FormState>(() => formFromBill(bill));
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Sheet form must follow the selected bill.
    setForm(formFromBill(bill));
    setFormError('');
  }, [bill, open]);

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFormError('');
  }

  function handleVehicleSelect(vehicle: VehicleSelection) {
    setForm((prev) => ({
      ...prev,
      vehicle_id: vehicle.vehicleId || null,
      vehicle_no: vehicle.vehicleNumber,
      transporter_id: vehicle.transporterId || null,
      transporter_name: vehicle.transporterName || '',
      transporter_gstin: vehicle.transporterGstin || '',
      contact_person: vehicle.transporterContactPerson || '',
      mobile_no: vehicle.transporterMobile || '',
    }));
    setFormError('');
  }

  function handleDriverSelect(driver: DriverSelection) {
    setForm((prev) => ({
      ...prev,
      driver_id: driver.driverId || null,
      driver_name: driver.driverName,
      driver_mobile_no: driver.mobileNumber,
      driver_license_no: driver.drivingLicenseNumber,
      driver_id_proof_type: driver.idProofType,
      driver_id_proof_number: driver.idProofNumber,
      driver_photo: driver.driverPhoto,
    }));
    setFormError('');
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!bill) return;
    if (!form.vehicle_id) {
      setFormError('Please select a vehicle.');
      return;
    }
    if (!form.driver_id) {
      setFormError('Please select a driver.');
      return;
    }

    await onSave(bill.doc_entry, {
      sap_invoice_doc_num: bill.doc_num,
      vehicle_id: form.vehicle_id,
      transporter_id: form.transporter_id,
      driver_id: form.driver_id,
      linked_vehicle_entry_id: numberOrNull(form.linked_vehicle_entry_id),
      booking_status: 'BOOKED',
      dispatch_date: bill.plan.dispatch_date,
      transporter_name: form.transporter_name.trim(),
      transporter_gstin: form.transporter_gstin.trim(),
      contact_person: form.contact_person.trim(),
      mobile_no: form.mobile_no.trim(),
      vehicle_no: form.vehicle_no.trim(),
      driver_name: form.driver_name.trim(),
      driver_mobile_no: form.driver_mobile_no.trim(),
      driver_license_no: form.driver_license_no.trim(),
      driver_id_proof_type: form.driver_id_proof_type.trim(),
      driver_id_proof_number: form.driver_id_proof_number.trim(),
      bilty_no: form.bilty_no.trim(),
      bilty_date: stringOrNull(form.bilty_date),
      freight: stringOrNull(form.freight),
      total_freight: stringOrNull(form.total_freight),
      kanta_weight: stringOrNull(form.kanta_weight),
      remarks: form.remarks.trim(),
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col overflow-y-auto sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle>Link Dispatch Vehicle</SheetTitle>
          {bill && (
            <div className="text-sm text-muted-foreground">
              <span className="font-mono text-foreground">{bill.doc_num}</span>
              <span className="mx-2">-</span>
              <span>{bill.card_name}</span>
            </div>
          )}
        </SheetHeader>

        {bill && (
          <div className="mt-4 grid gap-3 rounded-md border bg-muted/20 p-4 text-sm sm:grid-cols-3">
            <InfoItem label="Dispatch Date" value={bill.plan.dispatch_date} />
            <InfoItem
              label="Ship To"
              value={`${compactText(bill.city)} ${compactText(bill.state)}`}
            />
            <InfoItem
              label="Load"
              value={`${bill.total_boxes || 0} boxes / ${bill.total_weight || 0} kg`}
            />
          </div>
        )}

        {formError && (
          <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {formError}
          </div>
        )}

        <form className="mt-4 flex flex-1 flex-col gap-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <DispatchVehicleSelect
              selectedId={form.vehicle_id}
              value={form.vehicle_no}
              sheetOpen={open}
              onChange={handleVehicleSelect}
            />

            <DispatchDriverSelect
              selectedId={form.driver_id}
              value={form.driver_name}
              sheetOpen={open}
              onChange={handleDriverSelect}
            />

            <ReadOnlyField label="Transporter" value={form.transporter_name} />
            <ReadOnlyField label="Transporter Mobile" value={form.mobile_no} />

            <div className="space-y-1.5">
              <Label htmlFor="dispatch-link-entry-id">Linked Vehicle Entry ID</Label>
              <Input
                id="dispatch-link-entry-id"
                type="number"
                min="1"
                value={form.linked_vehicle_entry_id}
                onChange={(event) => updateField('linked_vehicle_entry_id', event.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dispatch-link-kanta">Kanta Weight</Label>
              <Input
                id="dispatch-link-kanta"
                type="number"
                step="0.001"
                value={form.kanta_weight}
                onChange={(event) => updateField('kanta_weight', event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="dispatch-link-bilty">Bilty No.</Label>
              <Input
                id="dispatch-link-bilty"
                value={form.bilty_no}
                onChange={(event) => updateField('bilty_no', event.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dispatch-link-bilty-date">Bilty Date</Label>
              <Input
                id="dispatch-link-bilty-date"
                type="date"
                value={form.bilty_date}
                onChange={(event) => updateField('bilty_date', event.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dispatch-link-freight">Freight</Label>
              <Input
                id="dispatch-link-freight"
                type="number"
                step="0.01"
                value={form.freight}
                onChange={(event) => updateField('freight', event.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dispatch-link-total-freight">Total Freight</Label>
              <Input
                id="dispatch-link-total-freight"
                type="number"
                step="0.01"
                value={form.total_freight}
                onChange={(event) => updateField('total_freight', event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dispatch-link-remarks">Transport Remarks</Label>
            <Textarea
              id="dispatch-link-remarks"
              rows={4}
              value={form.remarks}
              onChange={(event) => updateField('remarks', event.target.value)}
            />
          </div>

          <SheetFooter className="mt-auto border-t pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Link
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

interface DispatchVehicleSelectProps {
  selectedId: number | null;
  value: string;
  sheetOpen: boolean;
  onChange: (vehicle: VehicleSelection) => void;
}

function DispatchVehicleSelect({
  selectedId,
  value,
  sheetOpen,
  onChange,
}: DispatchVehicleSelectProps) {
  const [localSelectedId, setLocalSelectedId] = useState<number | null>(selectedId);
  const [selectedVehicleDetails, setSelectedVehicleDetails] = useState<Vehicle | null>(null);

  const { data: vehicleNames = [], isLoading } = useVehicleNames(sheetOpen);
  const { data: vehicleDetails } = useVehicleById(
    localSelectedId,
    sheetOpen && localSelectedId !== null,
  );

  const prevVehicleDetailsRef = useRef(vehicleDetails);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (selectedId === localSelectedId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Sheet edit mode must sync selected id from the opened bill.
    setLocalSelectedId(selectedId);
    if (!selectedId) {
      setSelectedVehicleDetails(null);
      prevVehicleDetailsRef.current = undefined;
    }
  }, [selectedId, localSelectedId]);

  const syncVehicleDetails = useCallback(() => {
    if (!vehicleDetails || vehicleDetails === prevVehicleDetailsRef.current) return;

    prevVehicleDetailsRef.current = vehicleDetails;
    setSelectedVehicleDetails(vehicleDetails);
    onChangeRef.current({
      vehicleId: vehicleDetails.id,
      vehicleNumber: vehicleDetails.vehicle_number,
      vehicleType: vehicleDetails.vehicle_type.name,
      vehicleCapacity: `${vehicleDetails.capacity_ton} Tons`,
      transporterId: vehicleDetails.transporter?.id || 0,
      transporterName: vehicleDetails.transporter?.name || '',
      transporterGstin: '',
      transporterContactPerson: vehicleDetails.transporter?.contact_person || '',
      transporterMobile: vehicleDetails.transporter?.mobile_no || '',
    });
  }, [vehicleDetails]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Sync fetched vehicle details into sheet form.
    syncVehicleDetails();
  }, [syncVehicleDetails]);

  return (
    <SearchableSelect<VehicleName>
      value={localSelectedId !== null ? String(localSelectedId) : value}
      defaultDisplayText={selectedVehicleDetails?.vehicle_number || value}
      items={vehicleNames}
      isLoading={isLoading}
      label="Vehicle No."
      required
      placeholder="Select vehicle"
      inputId="dispatch-link-vehicle-select"
      getItemKey={(vehicle) => vehicle.id}
      getItemLabel={(vehicle) => vehicle.vehicle_number}
      loadingText="Loading vehicles..."
      emptyText="No vehicles available"
      notFoundText="No vehicles found"
      addNewLabel="Add New Vehicle"
      onSelectedKeyChange={(key) => {
        setLocalSelectedId(key as number | null);
        if (!key) setSelectedVehicleDetails(null);
      }}
      onItemSelect={(vehicle) => {
        setLocalSelectedId(vehicle.id);
      }}
      onClear={() => {
        setLocalSelectedId(null);
        setSelectedVehicleDetails(null);
        prevVehicleDetailsRef.current = undefined;
        onChange({
          vehicleId: 0,
          vehicleNumber: '',
          vehicleType: '',
          vehicleCapacity: '',
          transporterId: 0,
          transporterName: '',
          transporterGstin: '',
          transporterContactPerson: '',
          transporterMobile: '',
        });
      }}
      renderPopoverContent={(activeKey) =>
        selectedVehicleDetails ? (
          <div className="space-y-1.5 text-sm">
            <div>
              <span className="font-medium">Vehicle Number:</span>{' '}
              <span className="text-muted-foreground">
                {selectedVehicleDetails.vehicle_number}
              </span>
            </div>
            <div>
              <span className="font-medium">Vehicle Type:</span>{' '}
              <span className="text-muted-foreground">
                {selectedVehicleDetails.vehicle_type.name}
              </span>
            </div>
            <div>
              <span className="font-medium">Capacity:</span>{' '}
              <span className="text-muted-foreground">
                {selectedVehicleDetails.capacity_ton} Tons
              </span>
            </div>
            {selectedVehicleDetails.transporter && (
              <div>
                <span className="font-medium">Transporter:</span>{' '}
                <span className="text-muted-foreground">
                  {selectedVehicleDetails.transporter.name}
                </span>
              </div>
            )}
          </div>
        ) : activeKey ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading vehicle details...
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            Please select a vehicle to view details.
          </div>
        )
      }
      renderCreateDialog={(open, onOpenChange, updateSelection) => (
        <CreateVehicleDialog
          open={open}
          onOpenChange={onOpenChange}
          onSuccess={(vehicle) => {
            updateSelection(vehicle.id, vehicle.vehicle_number);
            setLocalSelectedId(vehicle.id);
          }}
        />
      )}
    />
  );
}

interface DispatchDriverSelectProps {
  selectedId: number | null;
  value: string;
  sheetOpen: boolean;
  onChange: (driver: DriverSelection) => void;
}

function DispatchDriverSelect({
  selectedId,
  value,
  sheetOpen,
  onChange,
}: DispatchDriverSelectProps) {
  const [localSelectedId, setLocalSelectedId] = useState<number | null>(selectedId);

  const { data: driverNames = [], isLoading } = useDriverNames(sheetOpen);
  const { data: driverDetails } = useDriverById(
    localSelectedId,
    sheetOpen && localSelectedId !== null,
  );

  const prevDriverDetailsRef = useRef(driverDetails);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (selectedId === localSelectedId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Sheet edit mode must sync selected id from the opened bill.
    setLocalSelectedId(selectedId);
    if (!selectedId) {
      prevDriverDetailsRef.current = undefined;
    }
  }, [selectedId, localSelectedId]);

  useEffect(() => {
    if (!driverDetails || driverDetails === prevDriverDetailsRef.current) return;

    prevDriverDetailsRef.current = driverDetails;
    onChangeRef.current({
      driverId: driverDetails.id,
      driverName: driverDetails.name,
      mobileNumber: driverDetails.mobile_no,
      drivingLicenseNumber: driverDetails.license_no,
      idProofType: driverDetails.id_proof_type,
      idProofNumber: driverDetails.id_proof_number,
      driverPhoto: driverDetails.photo,
    });
  }, [driverDetails]);

  return (
    <SearchableSelect<DriverName>
      value={localSelectedId !== null ? String(localSelectedId) : value}
      defaultDisplayText={driverDetails?.name || value}
      items={driverNames}
      isLoading={isLoading}
      label="Driver"
      required
      placeholder="Select driver"
      inputId="dispatch-link-driver-select"
      getItemKey={(driver) => driver.id}
      getItemLabel={(driver) => driver.name}
      loadingText="Loading drivers..."
      emptyText="No drivers available"
      notFoundText="No drivers found"
      addNewLabel="Add New Driver"
      onSelectedKeyChange={(key) => {
        setLocalSelectedId(key as number | null);
        if (!key) prevDriverDetailsRef.current = undefined;
      }}
      onItemSelect={(driver) => {
        setLocalSelectedId(driver.id);
      }}
      onClear={() => {
        setLocalSelectedId(null);
        prevDriverDetailsRef.current = undefined;
        onChange({
          driverId: 0,
          driverName: '',
          mobileNumber: '',
          drivingLicenseNumber: '',
          idProofType: '',
          idProofNumber: '',
          driverPhoto: null,
        });
      }}
      renderPopoverContent={(activeKey) =>
        driverDetails ? (
          <div className="space-y-1.5 text-sm">
            <div>
              <span className="font-medium">Name:</span>{' '}
              <span className="text-muted-foreground">{driverDetails.name}</span>
            </div>
            <div>
              <span className="font-medium">Mobile Number:</span>{' '}
              <span className="text-muted-foreground">{driverDetails.mobile_no}</span>
            </div>
            <div>
              <span className="font-medium">License Number:</span>{' '}
              <span className="text-muted-foreground">{driverDetails.license_no}</span>
            </div>
            <div>
              <span className="font-medium">ID Proof Type:</span>{' '}
              <span className="text-muted-foreground">{driverDetails.id_proof_type}</span>
            </div>
            <div>
              <span className="font-medium">ID Proof Number:</span>{' '}
              <span className="text-muted-foreground">{driverDetails.id_proof_number}</span>
            </div>
          </div>
        ) : activeKey ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading driver details...
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            Please select a driver to view details.
          </div>
        )
      }
      renderCreateDialog={(open, onOpenChange, updateSelection) => (
        <CreateDriverDialog
          open={open}
          onOpenChange={onOpenChange}
          onSuccess={(driver) => {
            updateSelection(driver.id, driver.name);
            setLocalSelectedId(driver.id);
          }}
        />
      )}
    />
  );
}

function InfoItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium">{compactText(value)}</div>
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input value={compactText(value)} readOnly disabled className="bg-muted/40 opacity-100" />
    </div>
  );
}
