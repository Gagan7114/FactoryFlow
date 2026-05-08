import { Loader2, Save } from 'lucide-react';
import { useEffect, useState } from 'react';

import {
  CreateDriverDialog,
  CreateVehicleDialog,
  DriverSelect,
  type DriverSelection,
  VehicleSelect,
  type VehicleSelection,
} from '@/modules/gate/components';
import {
  Button,
  Input,
  Label,
  NativeSelect as Select,
  SelectOption,
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Textarea,
} from '@/shared/components/ui';

import { EDIT_BOOKING_STATUS_OPTIONS } from '../constants';
import type {
  DispatchBill,
  DispatchPlanStatus,
  DispatchPlanUpdatePayload,
} from '../types';

interface DispatchPlanEditSheetProps {
  bill: DispatchBill | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (docEntry: number, payload: DispatchPlanUpdatePayload) => Promise<void>;
  isSaving: boolean;
}

interface FormState {
  vehicle_id: number | null;
  transporter_id: number | null;
  driver_id: number | null;
  linked_vehicle_entry_id: number | null;
  booking_status: DispatchPlanStatus;
  dispatch_date: string;
  priority: string;
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

const EMPTY_FORM: FormState = {
  vehicle_id: null,
  transporter_id: null,
  driver_id: null,
  linked_vehicle_entry_id: null,
  booking_status: 'PENDING',
  dispatch_date: '',
  priority: '',
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
  return {
    vehicle_id: bill.plan.vehicle_id ?? null,
    transporter_id: bill.plan.transporter_id ?? null,
    driver_id: bill.plan.driver_id ?? null,
    linked_vehicle_entry_id: bill.plan.linked_vehicle_entry_id ?? null,
    booking_status: bill.plan.booking_status ?? 'PENDING',
    dispatch_date: bill.plan.dispatch_date ?? '',
    priority: bill.plan.priority ?? '',
    transporter_name: bill.plan.transporter_name ?? '',
    transporter_gstin: bill.plan.transporter_gstin ?? '',
    contact_person: bill.plan.contact_person ?? '',
    mobile_no: bill.plan.mobile_no ?? '',
    vehicle_no: bill.plan.vehicle_no ?? '',
    driver_name: bill.plan.driver_name ?? '',
    driver_mobile_no: bill.plan.driver_mobile_no ?? '',
    driver_license_no: bill.plan.driver_license_no ?? '',
    driver_id_proof_type: bill.plan.driver_id_proof_type ?? '',
    driver_id_proof_number: bill.plan.driver_id_proof_number ?? '',
    driver_photo: null,
    bilty_no: bill.plan.bilty_no ?? '',
    bilty_date: bill.plan.bilty_date ?? '',
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

export function DispatchPlanEditSheet({
  bill,
  open,
  onOpenChange,
  onSave,
  isSaving,
}: DispatchPlanEditSheetProps) {
  const [form, setForm] = useState<FormState>(() => formFromBill(bill));
  const [isEditVehicleOpen, setIsEditVehicleOpen] = useState(false);
  const [isEditDriverOpen, setIsEditDriverOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Sheet form must follow the selected bill.
    setForm(formFromBill(bill));
  }, [bill, open]);

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
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
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!bill) return;

    await onSave(bill.doc_entry, {
      sap_invoice_doc_num: bill.doc_num,
      vehicle_id: form.vehicle_id,
      transporter_id: form.transporter_id,
      driver_id: form.driver_id,
      linked_vehicle_entry_id: form.linked_vehicle_entry_id,
      booking_status: form.booking_status,
      dispatch_date: stringOrNull(form.dispatch_date),
      priority: form.priority.trim(),
      vehicle_no: form.vehicle_no.trim(),
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
      <SheetContent side="right" className="flex w-full flex-col overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Dispatch Plan</SheetTitle>
          {bill && (
            <div className="text-sm text-muted-foreground">
              <span className="font-mono text-foreground">{bill.doc_num}</span>
              <span className="mx-2">-</span>
              <span>{bill.card_name}</span>
            </div>
          )}
        </SheetHeader>

        <form className="mt-4 flex flex-1 flex-col gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="dispatch-status">Status</Label>
              <Select
                id="dispatch-status"
                value={form.booking_status}
                onChange={(event) =>
                  updateField('booking_status', event.target.value as DispatchPlanStatus)
                }
              >
                {EDIT_BOOKING_STATUS_OPTIONS.map((option) => (
                  <SelectOption key={option.value} value={option.value}>
                    {option.label}
                  </SelectOption>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dispatch-date">Dispatch Date</Label>
              <Input
                id="dispatch-date"
                type="date"
                value={form.dispatch_date}
                onChange={(event) => updateField('dispatch_date', event.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dispatch-priority">Priority</Label>
              <Input
                id="dispatch-priority"
                value={form.priority}
                onChange={(event) => updateField('priority', event.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <VehicleSelect
                value={form.vehicle_no}
                defaultDisplayText={form.vehicle_no}
                label="Vehicle No."
                labelAction={
                  form.vehicle_id ? (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto px-0"
                    onClick={() => setIsEditVehicleOpen(true)}
                  >
                    Edit Vehicle
                  </Button>
                  ) : null
                }
                placeholder="Select vehicle"
                onChange={handleVehicleSelect}
              />
            </div>

            <div className="space-y-1.5">
              <DriverSelect
                value={form.driver_name}
                defaultDisplayText={form.driver_name}
                label="Driver"
                labelAction={
                  form.driver_id ? (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto px-0"
                    onClick={() => setIsEditDriverOpen(true)}
                  >
                    Edit Driver
                  </Button>
                  ) : null
                }
                placeholder="Select driver"
                onChange={handleDriverSelect}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="dispatch-bilty">Bilty No.</Label>
              <Input
                id="dispatch-bilty"
                value={form.bilty_no}
                onChange={(event) => updateField('bilty_no', event.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dispatch-bilty-date">Bilty Date</Label>
              <Input
                id="dispatch-bilty-date"
                type="date"
                value={form.bilty_date}
                onChange={(event) => updateField('bilty_date', event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="dispatch-freight">Freight</Label>
              <Input
                id="dispatch-freight"
                type="number"
                step="0.01"
                value={form.freight}
                onChange={(event) => updateField('freight', event.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dispatch-total-freight">Total Freight</Label>
              <Input
                id="dispatch-total-freight"
                type="number"
                step="0.01"
                value={form.total_freight}
                onChange={(event) => updateField('total_freight', event.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dispatch-kanta-weight">Kanta Weight</Label>
              <Input
                id="dispatch-kanta-weight"
                type="number"
                step="0.001"
                value={form.kanta_weight}
                onChange={(event) => updateField('kanta_weight', event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dispatch-remarks">Remarks</Label>
            <Textarea
              id="dispatch-remarks"
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
              Save
            </Button>
          </SheetFooter>
        </form>

        {form.vehicle_id && (
          <CreateVehicleDialog
            open={isEditVehicleOpen}
            onOpenChange={setIsEditVehicleOpen}
            initialData={{ id: form.vehicle_id }}
            onSuccess={(vehicle) => {
              setForm((prev) => ({
                ...prev,
                vehicle_id: vehicle.id,
                vehicle_no: vehicle.vehicle_number,
                transporter_id: vehicle.transporter?.id ?? null,
                transporter_name: vehicle.transporter?.name ?? '',
                transporter_gstin: vehicle.transporter?.gstin ?? '',
                contact_person: vehicle.transporter?.contact_person ?? '',
                mobile_no: vehicle.transporter?.mobile_no ?? '',
              }));
            }}
          />
        )}

        {form.driver_id && (
          <CreateDriverDialog
            open={isEditDriverOpen}
            onOpenChange={setIsEditDriverOpen}
            initialData={{
              id: form.driver_id,
              name: form.driver_name,
              mobile_no: form.driver_mobile_no,
              license_no: form.driver_license_no,
              id_proof_type: form.driver_id_proof_type,
              id_proof_number: form.driver_id_proof_number,
              photo: form.driver_photo,
            }}
            onSuccess={(driver) => {
              setForm((prev) => ({
                ...prev,
                driver_id: driver.id,
                driver_name: driver.name,
                driver_mobile_no: driver.mobile_no,
                driver_license_no: driver.license_no,
                driver_id_proof_type: driver.id_proof_type,
                driver_id_proof_number: driver.id_proof_number,
                driver_photo: driver.photo,
              }));
            }}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
