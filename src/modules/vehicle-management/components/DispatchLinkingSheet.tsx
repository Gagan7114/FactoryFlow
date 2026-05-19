import { Eye, Loader2, Paperclip, Plus, Save, Upload, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
import { useScrollToError } from '@/shared/hooks';
import { resolveFileUrl } from '@/shared/utils';

import type { DispatchVehicleLinkPayload } from '../types';

interface DispatchLinkingSheetProps {
  bill: DispatchBill | null;
  selectedBills: DispatchBill[];
  open: boolean;
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (docEntry: number, payload: DispatchVehicleLinkPayload) => Promise<void>;
}

interface FormState {
  invoice_number: string;
  eway_bill: string;
  invoice_weight: string;
  invoice_amount: string;
  place_of_supply: string;
  budget_delivery_point: string;
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
  bilty_attachment: File | null;
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
  invoice_number: '',
  eway_bill: '',
  invoice_weight: '',
  invoice_amount: '',
  place_of_supply: '',
  budget_delivery_point: '',
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
  bilty_attachment: null,
  freight: '',
  total_freight: '',
  kanta_weight: '',
  remarks: '',
};

function formFromBill(bill: DispatchBill | null): FormState {
  if (!bill) return EMPTY_FORM;
  const sapVehicleNo = bill.sap_vehicle_no || bill.gst_vehicle_no || '';
  const placeOfSupply = bill.state || bill.city || '';

  return {
    invoice_number: bill.plan.invoice_number || bill.doc_num || '',
    eway_bill: bill.plan.eway_bill || bill.sap_eway_bill || '',
    invoice_weight: bill.plan.invoice_weight ?? '',
    invoice_amount: bill.plan.invoice_amount ?? numberToString(bill.doc_total),
    place_of_supply: bill.plan.place_of_supply || placeOfSupply,
    budget_delivery_point: bill.plan.budget_delivery_point || bill.city || '',
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
    bilty_attachment: null,
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

function numberToString(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : String(value);
}

function inferProductVariety(itemSummary: string): string {
  const normalized = itemSummary.toLowerCase();
  if (
    ['water', 'mineral', 'drink', 'beverage', 'juice'].some((token) =>
      normalized.includes(token),
    )
  ) {
    return 'Beverage';
  }
  return itemSummary.trim() ? 'Oil' : '';
}

function monthValue(dateValue: string | null | undefined): string | null {
  if (!dateValue) return null;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function formatNumber(value: number, fractionDigits = 2): string {
  return value.toLocaleString('en-IN', {
    maximumFractionDigits: fractionDigits,
  });
}

function formatLoadLabel(totalBoxes: number, totalWeight: number): string {
  const weightLabel =
    Number.isFinite(totalWeight) && totalWeight > 0
      ? `${formatNumber(totalWeight, 3)} kg`
      : 'Weight not available';
  return Number.isFinite(totalBoxes) && totalBoxes > 0
    ? `${formatNumber(totalBoxes, 2)} boxes / ${weightLabel}`
    : weightLabel;
}

function compactText(value: string | null | undefined, fallback = '-') {
  return value?.trim() || fallback;
}

function cleanSapSeed(value: string | null | undefined) {
  const trimmed = value?.trim() ?? '';
  return trimmed && trimmed !== '-' ? trimmed : '';
}

function normalizeVehicleNumber(value: string | null | undefined) {
  return cleanSapSeed(value).toUpperCase().replace(/\s/g, '');
}

export function DispatchLinkingSheet({
  bill,
  selectedBills,
  open,
  isSaving,
  onOpenChange,
  onSave,
}: DispatchLinkingSheetProps) {
  const [form, setForm] = useState<FormState>(() => formFromBill(bill));
  const [formError, setFormError] = useState('');
  const formErrors = useMemo(
    () => (formError ? { 'dispatch-linking-form-error': { message: formError } } : {}),
    [formError],
  );
  const { scrollToFirstError } = useScrollToError(formErrors);
  const sapTransporterDetails = useMemo(
    () => ({
      name: cleanSapSeed(form.transporter_name),
      contact_person: cleanSapSeed(form.contact_person),
      mobile_no: cleanSapSeed(form.mobile_no),
      gstin: cleanSapSeed(form.transporter_gstin),
    }),
    [form.contact_person, form.mobile_no, form.transporter_gstin, form.transporter_name],
  );
  const activeBills = useMemo(
    () => (selectedBills.length > 0 ? selectedBills : bill ? [bill] : []),
    [bill, selectedBills],
  );
  const isBatchLink = activeBills.length > 1;
  const selectedTotals = useMemo(
    () => ({
      invoices: activeBills.length,
      litres: activeBills.reduce((sum, item) => sum + (item.total_litres || 0), 0),
      weight: activeBills.reduce((sum, item) => sum + (item.total_weight || 0), 0),
      amount: activeBills.reduce((sum, item) => sum + (item.doc_total || 0), 0),
    }),
    [activeBills],
  );

  const showFormError = useCallback(
    (message: string) => {
      setFormError(message);
      scrollToFirstError();
    },
    [scrollToFirstError],
  );

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
      const sapVehicleNo = normalizeVehicleNumber(form.vehicle_no);
      showFormError(
        sapVehicleNo
          ? `Vehicle ${sapVehicleNo} is coming from SAP but is not linked to Vehicle Master. Select an existing vehicle or add it before saving.`
          : 'Please select a vehicle.',
      );
      return;
    }
    if (!form.driver_id) {
      showFormError('Please select a driver.');
      return;
    }
    if (!form.bilty_no.trim()) {
      showFormError('Please enter the bilty number.');
      return;
    }
    if (!form.bilty_attachment && !bill.plan.bilty_attachment) {
      showFormError('Please upload the bilty attachment.');
      return;
    }

    await onSave(bill.doc_entry, {
      sap_invoice_doc_num: bill.doc_num,
      linked_invoice_doc_entries: activeBills.map((selected) => selected.doc_entry),
      invoice_number: form.invoice_number.trim(),
      eway_bill: form.eway_bill.trim(),
      invoice_weight: stringOrNull(form.invoice_weight),
      invoice_amount: stringOrNull(form.invoice_amount),
      place_of_supply: form.place_of_supply.trim(),
      product_variety: bill.plan.product_variety || inferProductVariety(bill.item_summary),
      total_litres: bill.plan.total_litres ?? numberToString(bill.total_litres),
      effective_month: bill.plan.effective_month || monthValue(bill.doc_date),
      budget_delivery_point: form.budget_delivery_point.trim(),
      service_location_code: bill.plan.service_location_code ?? null,
      service_location_name: bill.plan.service_location_name || '',
      sac_entry: bill.plan.sac_entry ?? null,
      sac_code: bill.plan.sac_code || '',
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
      bilty_attachment: form.bilty_attachment || undefined,
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
              value={
                isBatchLink
                  ? 'Multiple invoices'
                  : `${compactText(bill.city)} ${compactText(bill.state)}`
              }
            />
            <InfoItem
              label="Load"
              value={
                isBatchLink
                  ? formatLoadLabel(0, selectedTotals.weight)
                  : formatLoadLabel(bill.total_boxes, bill.total_weight)
              }
            />
          </div>
        )}

        {activeBills.length > 1 && (
          <div className="mt-4 rounded-md border bg-primary/5 p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-medium">{activeBills.length} invoices selected for one bilty</div>
              <div className="text-xs text-muted-foreground">
                {formatNumber(selectedTotals.litres, 3)} L / {formatNumber(selectedTotals.weight, 3)} kg / Rs {formatNumber(selectedTotals.amount)}
              </div>
            </div>
            <div className="mt-3 max-h-48 overflow-auto rounded border bg-background">
              <table className="w-full text-xs">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-2 py-1 text-left font-medium">Invoice</th>
                    <th className="px-2 py-1 text-left font-medium">Customer</th>
                    <th className="px-2 py-1 text-left font-medium">State</th>
                    <th className="px-2 py-1 text-left font-medium">Delivery Point</th>
                    <th className="px-2 py-1 text-right font-medium">Weight</th>
                    <th className="px-2 py-1 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {activeBills.map((selected) => (
                    <tr key={selected.doc_entry} className="border-b last:border-b-0">
                      <td className="px-2 py-1 font-mono">{selected.doc_num}</td>
                      <td className="px-2 py-1">{selected.card_name}</td>
                      <td className="px-2 py-1 whitespace-nowrap">{compactText(selected.state)}</td>
                      <td className="px-2 py-1 whitespace-nowrap">{compactText(selected.city)}</td>
                      <td className="px-2 py-1 text-right tabular-nums">
                        {formatNumber(selected.total_weight, 3)} kg
                      </td>
                      <td className="px-2 py-1 text-right tabular-nums">
                        Rs {formatNumber(selected.doc_total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {formError && (
          <div
            role="alert"
            tabIndex={-1}
            data-field="dispatch-linking-form-error"
            className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive outline-none"
          >
            {formError}
          </div>
        )}

        <form className="mt-4 flex flex-1 flex-col gap-6" noValidate onSubmit={handleSubmit}>
          {!isBatchLink && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="dispatch-link-invoice-number">Invoice Number</Label>
                <Input
                  id="dispatch-link-invoice-number"
                  value={form.invoice_number}
                  onChange={(event) => updateField('invoice_number', event.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dispatch-link-eway-bill">E-way Bill</Label>
                <Input
                  id="dispatch-link-eway-bill"
                  value={form.eway_bill}
                  onChange={(event) => updateField('eway_bill', event.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dispatch-link-invoice-weight">
                  Invoice Weight <span className="text-muted-foreground">(Charged Kgs)</span>
                </Label>
                <Input
                  id="dispatch-link-invoice-weight"
                  type="number"
                  step="0.001"
                  value={form.invoice_weight}
                  onChange={(event) => updateField('invoice_weight', event.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dispatch-link-invoice-amount">Amount</Label>
                <Input
                  id="dispatch-link-invoice-amount"
                  type="number"
                  step="0.01"
                  value={form.invoice_amount}
                  onChange={(event) => updateField('invoice_amount', event.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dispatch-link-place-of-supply">Place of Supply</Label>
                <Input
                  id="dispatch-link-place-of-supply"
                  value={form.place_of_supply}
                  onChange={(event) => updateField('place_of_supply', event.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dispatch-link-delivery-point">Delivery Point</Label>
                <Input
                  id="dispatch-link-delivery-point"
                  value={form.budget_delivery_point}
                  onChange={(event) => updateField('budget_delivery_point', event.target.value)}
                />
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <DispatchVehicleSelect
              selectedId={form.vehicle_id}
              value={form.vehicle_no}
              sapTransporterDetails={sapTransporterDetails}
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
              <Label htmlFor="dispatch-link-kanta">
                Kanta Weight <span className="text-muted-foreground">(Actual Kgs)</span>
              </Label>
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
              <Label htmlFor="dispatch-link-bilty">
                Bilty No. <span className="text-destructive">*</span>
              </Label>
              <Input
                id="dispatch-link-bilty"
                value={form.bilty_no}
                required
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

            <BiltyAttachmentField
              existingFileName={bill?.plan.bilty_attachment_name}
              existingFileUrl={bill?.plan.bilty_attachment}
              file={form.bilty_attachment}
              onChange={(file) => updateField('bilty_attachment', file)}
            />

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
  sapTransporterDetails?: {
    name?: string;
    contact_person?: string;
    mobile_no?: string;
    gstin?: string;
  };
  sheetOpen: boolean;
  onChange: (vehicle: VehicleSelection) => void;
}

function DispatchVehicleSelect({
  selectedId,
  value,
  sapTransporterDetails,
  sheetOpen,
  onChange,
}: DispatchVehicleSelectProps) {
  const [localSelectedId, setLocalSelectedId] = useState<number | null>(selectedId);
  const [selectedVehicleDetails, setSelectedVehicleDetails] = useState<Vehicle | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const { data: vehicleNames = [], isLoading } = useVehicleNames(sheetOpen);
  const { data: vehicleDetails } = useVehicleById(
    localSelectedId,
    sheetOpen && localSelectedId !== null,
  );
  const sapVehicleNo = normalizeVehicleNumber(value);
  const hasUnlinkedSapVehicle = Boolean(sapVehicleNo && !localSelectedId);

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

  useEffect(() => {
    if (localSelectedId || !sapVehicleNo || vehicleNames.length === 0) return;

    const matchingVehicle = vehicleNames.find(
      (vehicle) => normalizeVehicleNumber(vehicle.vehicle_number) === sapVehicleNo,
    );
    if (matchingVehicle) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Auto-link exact SAP vehicle matches from Vehicle Master.
      setLocalSelectedId(matchingVehicle.id);
    }
  }, [localSelectedId, sapVehicleNo, vehicleNames]);

  const applyVehicle = useCallback((vehicle: Vehicle) => {
    prevVehicleDetailsRef.current = vehicle;
    setSelectedVehicleDetails(vehicle);
    onChangeRef.current({
      vehicleId: vehicle.id,
      vehicleNumber: vehicle.vehicle_number,
      vehicleType: vehicle.vehicle_type.name,
      vehicleCapacity: `${vehicle.capacity_ton} Tons`,
      transporterId: vehicle.transporter?.id || 0,
      transporterName: vehicle.transporter?.name || '',
      transporterGstin: vehicle.transporter?.gstin || '',
      transporterContactPerson: vehicle.transporter?.contact_person || '',
      transporterMobile: vehicle.transporter?.mobile_no || '',
    });
  }, []);

  const syncVehicleDetails = useCallback(() => {
    if (!vehicleDetails || vehicleDetails === prevVehicleDetailsRef.current) return;

    applyVehicle(vehicleDetails);
  }, [applyVehicle, vehicleDetails]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Sync fetched vehicle details into sheet form.
    syncVehicleDetails();
  }, [syncVehicleDetails]);

  return (
    <div className="space-y-2">
      <SearchableSelect<VehicleName>
        value={localSelectedId !== null ? String(localSelectedId) : ''}
        defaultDisplayText={selectedVehicleDetails?.vehicle_number || ''}
        items={vehicleNames}
        isLoading={isLoading}
        label="Vehicle No."
        labelAction={
          hasUnlinkedSapVehicle ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Vehicle
            </Button>
          ) : undefined
        }
        required
        placeholder={sapVehicleNo ? `Select or add ${sapVehicleNo}` : 'Select vehicle'}
        inputId="dispatch-link-vehicle-select"
        getItemKey={(vehicle) => vehicle.id}
        getItemLabel={(vehicle) => vehicle.vehicle_number}
        loadingText="Loading vehicles..."
        emptyText="No vehicles available"
        notFoundText="No vehicles found"
        addNewLabel={sapVehicleNo ? `Add ${sapVehicleNo} as New Vehicle` : 'Add New Vehicle'}
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
          ) : sapVehicleNo ? (
            <div className="text-sm text-muted-foreground">
              SAP shows vehicle {sapVehicleNo}. Add it to Vehicle Master or select an existing
              vehicle.
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
            initialVehicleNumber={sapVehicleNo}
            initialTransporterDetails={sapTransporterDetails}
            onSuccess={(vehicle) => {
              updateSelection(vehicle.id, vehicle.vehicle_number);
              setLocalSelectedId(vehicle.id);
              applyVehicle(vehicle);
            }}
          />
        )}
      />

      {hasUnlinkedSapVehicle && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          SAP shows vehicle <span className="font-semibold">{sapVehicleNo}</span>, but it is not
          linked to Vehicle Master yet. Add it or select the matching master vehicle before saving.
        </div>
      )}

      <CreateVehicleDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        initialVehicleNumber={sapVehicleNo}
        initialTransporterDetails={sapTransporterDetails}
        onSuccess={(vehicle) => {
          setLocalSelectedId(vehicle.id);
          applyVehicle(vehicle);
        }}
      />
    </div>
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

function BiltyAttachmentField({
  existingFileName,
  existingFileUrl,
  file,
  onChange,
}: {
  existingFileName?: string | null;
  existingFileUrl?: string | null;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const displayName = file?.name || existingFileName || '';
  const [localPreviewUrl, setLocalPreviewUrl] = useState('');

  useEffect(() => {
    if (!file) {
      setLocalPreviewUrl('');
      return undefined;
    }

    const objectUrl = URL.createObjectURL(file);
    setLocalPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const previewUrl = localPreviewUrl || resolveFileUrl(existingFileUrl);

  return (
    <div className="space-y-1.5 sm:col-span-2">
      <Label htmlFor="dispatch-link-bilty-attachment">
        Bilty Attachment <span className="text-destructive">*</span>
      </Label>
      <input
        ref={inputRef}
        id="dispatch-link-bilty-attachment"
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={(event) => onChange(event.target.files?.[0] || null)}
      />
      <div className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <Paperclip className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          {displayName ? (
            previewUrl ? (
              <a
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
                className="truncate font-medium text-primary hover:underline"
                title={displayName}
              >
                {displayName}
              </a>
            ) : (
              <span className="truncate font-medium" title={displayName}>
                {displayName}
              </span>
            )
          ) : (
            <span className="text-muted-foreground">No bilty attachment selected</span>
          )}
        </div>
        <div className="flex gap-2">
          {previewUrl && (
            <Button asChild variant="ghost" size="sm">
              <a href={previewUrl} target="_blank" rel="noreferrer">
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </a>
            </Button>
          )}
          {file && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
              <X className="mr-2 h-4 w-4" />
              Remove
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            Upload
          </Button>
        </div>
      </div>
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
