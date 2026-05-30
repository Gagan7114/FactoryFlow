import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  ClipboardList,
  FileQuestion,
  FileText,
  Hash,
  LogIn,
  LogOut,
  type LucideIcon,
  MapPin,
  Package,
  PackageCheck,
  Paperclip,
  ReceiptText,
  RotateCcw,
  Scale,
  Search,
  Truck,
  UserCheck,
  UserRound,
  Wrench,
} from 'lucide-react';
import { type Dispatch, type ReactNode, type SetStateAction, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ENTRY_TYPES } from '@/config/constants';
import type { ApiError } from '@/core/api/types';
import { usePermission } from '@/core/auth';
import {
  Badge,
  Button,
  Input,
  Label,
  NativeSelect,
  SelectOption,
  Textarea,
} from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import { useCreateVehicleEntry } from '../api/vehicle/vehicleEntry.queries';
import {
  DriverSelect,
  type DriverSelection,
  VehicleSelect,
  type VehicleSelection,
} from '../components';
import {
  GATE_ENTRY_TYPES,
  type GateEntryDirection,
  type GateEntryTypeConfig,
} from '../constants/gateEntryTypes';

type MovementKind = 'vehicle' | 'person';
type DocumentChoice =
  | 'purchase'
  | 'invoice'
  | 'stock-transfer'
  | 'qc-rejection'
  | 'repair'
  | 'job-work'
  | 'none';
type NoDocumentReason = 'empty-vehicle' | 'routine-supply' | 'spares-tools' | 'civil-work' | 'other';
type PersonType = 'visitor' | 'labour' | 'contractor' | 'staff';

interface GateTimingData {
  gateDate: string;
  gateTime: string;
  securityName: string;
  gateLocation: string;
  remarks: string;
}

interface VehicleIntakeData {
  vehicleId: number;
  vehicleNumber: string;
  transporterId: number;
  driverId: number;
  driverName: string;
}

interface PersonIntakeData {
  personType: PersonType | '';
  personName: string;
  mobileNumber: string;
  companyName: string;
  idProofType: string;
  idProofNumber: string;
  purpose: string;
  approvedBy: string;
  expectedReturnTime: string;
}

interface DocumentIntakeData {
  documentNumber: string;
  partyName: string;
  sourceLocation: string;
  destinationLocation: string;
  linkedEntryNo: string;
  challanNumber: string;
  ewayBillNumber: string;
  sapReference: string;
  sealNumber: string;
  reasonNotes: string;
}

interface ItemSnapshotData {
  itemCode: string;
  itemName: string;
  quantity: string;
  uom: string;
  conditionNotes: string;
}

interface WeighmentSnapshotData {
  grossWeight: string;
  tareWeight: string;
  weighbridgeSlipNo: string;
  firstWeighmentTime: string;
  secondWeighmentTime: string;
}

interface ChoiceOption<T extends string> {
  id: T;
  label: string;
  description: string;
  icon: LucideIcon;
  directions?: GateEntryDirection[];
}

const MOVEMENT_KIND_OPTIONS: ChoiceOption<MovementKind>[] = [
  {
    id: 'vehicle',
    label: 'Vehicle',
    description: 'Truck, tanker, empty vehicle, goods, materials, or repair movement',
    icon: Truck,
  },
  {
    id: 'person',
    label: 'Person',
    description: 'Visitor, labour, contractor, or staff movement at the gate',
    icon: UserRound,
  },
];

const DIRECTION_OPTIONS: ChoiceOption<GateEntryDirection>[] = [
  {
    id: 'in',
    label: 'Coming in',
    description: 'Vehicle is entering the factory',
    icon: LogIn,
  },
  {
    id: 'out',
    label: 'Going out',
    description: 'Vehicle is leaving the factory',
    icon: LogOut,
  },
  {
    id: 'return',
    label: 'Returning',
    description: 'Goods or vehicle came back to the factory',
    icon: RotateCcw,
  },
];

const DOCUMENT_OPTIONS: ChoiceOption<DocumentChoice>[] = [
  {
    id: 'purchase',
    label: 'Purchase order',
    description: 'RM, PM, asset, or vendor material against PO',
    icon: ReceiptText,
    directions: ['in'],
  },
  {
    id: 'invoice',
    label: 'Invoice',
    description: 'Sales dispatch or customer goods return',
    icon: FileText,
    directions: ['out', 'return'],
  },
  {
    id: 'stock-transfer',
    label: 'Stock transfer',
    description: 'Branch stock transfer out, in, or return',
    icon: PackageCheck,
    directions: ['in', 'out', 'return'],
  },
  {
    id: 'qc-rejection',
    label: 'QC rejection',
    description: 'Rejected material being sent back out',
    icon: FileQuestion,
    directions: ['out'],
  },
  {
    id: 'repair',
    label: 'Repair movement',
    description: 'Repairable parts sent out or received back',
    icon: Wrench,
    directions: ['in', 'out', 'return'],
  },
  {
    id: 'job-work',
    label: 'Job work',
    description: 'Oil refining or production-linked outward movement',
    icon: ClipboardList,
    directions: ['out'],
  },
  {
    id: 'none',
    label: 'No document',
    description: 'Routine supply, empty vehicle, civil work, or manual classification',
    icon: Search,
  },
];

const NO_DOCUMENT_REASONS: ChoiceOption<NoDocumentReason>[] = [
  {
    id: 'empty-vehicle',
    label: 'Empty vehicle',
    description: 'Vehicle enters or exits without goods',
    icon: Truck,
    directions: ['in', 'out'],
  },
  {
    id: 'routine-supply',
    label: 'Routine supply',
    description: 'Food, consumables, or daily operational needs',
    icon: PackageCheck,
    directions: ['in'],
  },
  {
    id: 'spares-tools',
    label: 'Spares or tools',
    description: 'Maintenance spares, tools, or service material',
    icon: Wrench,
    directions: ['in'],
  },
  {
    id: 'civil-work',
    label: 'Civil work',
    description: 'Construction material or contractor work',
    icon: ClipboardList,
    directions: ['in'],
  },
  {
    id: 'other',
    label: 'Other',
    description: 'Choose from matching gate movements manually',
    icon: FileQuestion,
  },
];

const PERSON_TYPE_OPTIONS: Array<{ value: PersonType; label: string }> = [
  { value: 'visitor', label: 'Visitor' },
  { value: 'labour', label: 'Labour' },
  { value: 'contractor', label: 'Contractor' },
  { value: 'staff', label: 'Staff' },
];

const DIRECTION_LABELS: Record<GateEntryDirection, string> = {
  in: 'Gate In',
  out: 'Gate Out',
  return: 'Return In',
};

const CLASSIC_VEHICLE_ENTRY_TYPES: Record<string, string> = {
  'raw-materials': ENTRY_TYPES.RAW_MATERIAL,
  'daily-needs': ENTRY_TYPES.DAILY_NEED,
  maintenance: ENTRY_TYPES.MAINTENANCE,
  construction: ENTRY_TYPES.CONSTRUCTION,
};

const CLASSIC_DETAIL_ROUTES: Record<string, string> = {
  'raw-materials': '/gate/raw-materials/new/step3',
  'daily-needs': '/gate/daily-needs/new/step3',
  maintenance: '/gate/maintenance/new/step3',
  construction: '/gate/construction/new/step3',
};

const GATE_INTAKE_DRAFT_KEY = 'gate_movement_intake_draft';

export default function GateNewEntryPage() {
  const navigate = useNavigate();
  const { hasAnyPermission } = usePermission();
  const createVehicleEntry = useCreateVehicleEntry();
  const [movementKind, setMovementKind] = useState<MovementKind>();
  const [vehicleDirection, setVehicleDirection] = useState<GateEntryDirection>();
  const [documentChoice, setDocumentChoice] = useState<DocumentChoice>();
  const [noDocumentReason, setNoDocumentReason] = useState<NoDocumentReason>();
  const [manualEntryTypeId, setManualEntryTypeId] = useState<string>();
  const [searchTerm, setSearchTerm] = useState('');
  const [gateTiming, setGateTiming] = useState<GateTimingData>(() => ({
    gateDate: getLocalDateValue(),
    gateTime: getLocalTimeValue(),
    securityName: '',
    gateLocation: '',
    remarks: '',
  }));
  const [vehicleData, setVehicleData] = useState<VehicleIntakeData>({
    vehicleId: 0,
    vehicleNumber: '',
    transporterId: 0,
    driverId: 0,
    driverName: '',
  });
  const [personData, setPersonData] = useState<PersonIntakeData>({
    personType: '',
    personName: '',
    mobileNumber: '',
    companyName: '',
    idProofType: '',
    idProofNumber: '',
    purpose: '',
    approvedBy: '',
    expectedReturnTime: '',
  });
  const [documentData, setDocumentData] = useState<DocumentIntakeData>({
    documentNumber: '',
    partyName: '',
    sourceLocation: '',
    destinationLocation: '',
    linkedEntryNo: '',
    challanNumber: '',
    ewayBillNumber: '',
    sapReference: '',
    sealNumber: '',
    reasonNotes: '',
  });
  const [itemSnapshot, setItemSnapshot] = useState<ItemSnapshotData>({
    itemCode: '',
    itemName: '',
    quantity: '',
    uom: '',
    conditionNotes: '',
  });
  const [weighmentSnapshot, setWeighmentSnapshot] = useState<WeighmentSnapshotData>({
    grossWeight: '',
    tareWeight: '',
    weighbridgeSlipNo: '',
    firstWeighmentTime: '',
    secondWeighmentTime: '',
  });
  const [attachmentNotes, setAttachmentNotes] = useState('');
  const [apiErrors, setApiErrors] = useState<Record<string, string>>({});

  const creatableEntryTypes = useMemo(
    () => GATE_ENTRY_TYPES.filter((entryType) => hasAnyPermission(entryType.createPermissions)),
    [hasAnyPermission],
  );

  const matchedEntryTypes = useMemo(() => {
    const matchedIds = deriveMatchedEntryTypeIds({
      movementKind,
      vehicleDirection,
      documentChoice,
      noDocumentReason,
    });

    return matchedIds
      .map((id) => creatableEntryTypes.find((entryType) => entryType.id === id))
      .filter(Boolean) as GateEntryTypeConfig[];
  }, [creatableEntryTypes, documentChoice, movementKind, noDocumentReason, vehicleDirection]);

  const searchableManualEntryTypes = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const directionFiltered = fallbackEntryTypes(creatableEntryTypes, movementKind, vehicleDirection);
    if (!query) return directionFiltered;

    return directionFiltered.filter((entryType) =>
      [
        entryType.title,
        entryType.description,
        DIRECTION_LABELS[entryType.direction],
        entryType.keywords.join(' '),
      ]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [creatableEntryTypes, movementKind, searchTerm, vehicleDirection]);

  const selectedEntryType =
    creatableEntryTypes.find((entryType) => entryType.id === manualEntryTypeId) ||
    (matchedEntryTypes.length === 1 ? matchedEntryTypes[0] : undefined);
  const selectedClassicEntryType = selectedEntryType
    ? CLASSIC_VEHICLE_ENTRY_TYPES[selectedEntryType.id]
    : undefined;
  const shouldCreateVehicleEntry = Boolean(selectedEntryType && selectedClassicEntryType);
  const showGateTiming =
    movementKind === 'person' || (movementKind === 'vehicle' && Boolean(vehicleDirection));
  const showVehicleDetails = movementKind === 'vehicle' && Boolean(vehicleDirection);
  const showPersonDetails = movementKind === 'person';
  const showDocumentDetails = movementKind === 'vehicle' && Boolean(vehicleDirection && documentChoice);
  const showItemSnapshot =
    showDocumentDetails &&
    documentChoice !== 'none' &&
    selectedEntryType?.id !== 'empty-vehicle-in' &&
    selectedEntryType?.id !== 'empty-vehicle-out';
  const showWeighmentSnapshot =
    showDocumentDetails &&
    Boolean(
      selectedEntryType?.requiresWeighment ||
        documentChoice === 'purchase' ||
        documentChoice === 'stock-transfer' ||
        documentChoice === 'job-work',
    );

  const availableDocumentOptions = DOCUMENT_OPTIONS.filter(
    (option) => !option.directions || !vehicleDirection || option.directions.includes(vehicleDirection),
  );
  const availableNoDocumentReasons = NO_DOCUMENT_REASONS.filter(
    (option) => !option.directions || !vehicleDirection || option.directions.includes(vehicleDirection),
  );

  const handleContinue = async () => {
    if (!selectedEntryType) return;

    const validationErrors = validateIntake({
      movementKind,
      vehicleDirection,
      documentChoice,
      noDocumentReason,
      vehicleData,
      personData,
      shouldCreateVehicleEntry,
    });

    if (Object.keys(validationErrors).length > 0) {
      setApiErrors(validationErrors);
      return;
    }

    setApiErrors({});
    saveGateIntakeDraft({
      movementKind,
      vehicleDirection,
      documentChoice,
      noDocumentReason,
      selectedEntryTypeId: selectedEntryType.id,
      gateTiming,
      vehicleData,
      personData,
      documentData,
      itemSnapshot,
      weighmentSnapshot,
      attachmentNotes,
    });

    if (shouldCreateVehicleEntry && selectedClassicEntryType) {
      try {
        const result = await createVehicleEntry.mutateAsync({
          entry_no: generateEntryNumber(),
          vehicle: vehicleData.vehicleId,
          driver: vehicleData.driverId,
          remarks: buildVehicleEntryRemarks(gateTiming, documentData),
          entry_type: selectedClassicEntryType,
        });

        saveGateIntakeDraft({
          movementKind,
          vehicleDirection,
          documentChoice,
          noDocumentReason,
          selectedEntryTypeId: selectedEntryType.id,
          vehicleEntryId: result.id,
          gateTiming,
          vehicleData,
          personData,
          documentData,
          itemSnapshot,
          weighmentSnapshot,
          attachmentNotes,
        });

        navigate(`${CLASSIC_DETAIL_ROUTES[selectedEntryType.id]}?entryId=${result.id}`);
      } catch (error) {
        const apiError = error as ApiError;
        if (apiError.errors) {
          const fieldErrors: Record<string, string> = {};
          Object.entries(apiError.errors).forEach(([field, messages]) => {
            if (Array.isArray(messages) && messages.length > 0) {
              fieldErrors[field] = messages[0];
            }
          });
          setApiErrors(fieldErrors);
        } else {
          setApiErrors({ general: apiError.message || 'Failed to create gate entry' });
        }
      }
      return;
    }

    navigate(selectedEntryType.newEntryRoute);
  };

  const handleVehicleSelect = (vehicle: VehicleSelection) => {
    setVehicleData((prev) => ({
      ...prev,
      vehicleId: vehicle.vehicleId,
      vehicleNumber: vehicle.vehicleNumber,
      transporterId: vehicle.transporterId,
    }));
    clearFieldError(setApiErrors, 'vehicle');
  };

  const handleDriverSelect = (driver: DriverSelection) => {
    setVehicleData((prev) => ({
      ...prev,
      driverId: driver.driverId,
      driverName: driver.driverName,
    }));
    clearFieldError(setApiErrors, 'driver');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">Gate operations</p>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
            New Movement
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Capture the gate basics once, then continue to the matching flow.
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/gate')}>
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <FlowSection
            step="1"
            title="Movement"
            value={movementKind ? labelForOption(MOVEMENT_KIND_OPTIONS, movementKind) : undefined}
          >
            <ChoiceGrid
              options={MOVEMENT_KIND_OPTIONS}
              value={movementKind}
              onChange={(value) => {
                setMovementKind(value);
                setVehicleDirection(undefined);
                setDocumentChoice(undefined);
                setNoDocumentReason(undefined);
                setManualEntryTypeId(undefined);
                setApiErrors({});
              }}
            />
          </FlowSection>

          {movementKind === 'vehicle' && (
            <FlowSection
              step="2"
              title="Direction"
              value={vehicleDirection ? labelForOption(DIRECTION_OPTIONS, vehicleDirection) : undefined}
            >
              <ChoiceGrid
                options={DIRECTION_OPTIONS}
                value={vehicleDirection}
                onChange={(value) => {
                  setVehicleDirection(value);
                  setDocumentChoice(undefined);
                  setNoDocumentReason(undefined);
                  setManualEntryTypeId(undefined);
                  setApiErrors({});
                }}
              />
            </FlowSection>
          )}

          {showPersonDetails && (
            <FlowSection
              step="2"
              title="Person details"
              value={personData.personType ? formatStatusLabel(personData.personType) : undefined}
              icon={UserCheck}
            >
              <PersonIntakeFields
                data={personData}
                errors={apiErrors}
                onChange={(field, value) => {
                  setPersonData((prev) => ({ ...prev, [field]: value }));
                  clearFieldError(setApiErrors, field);
                }}
              />
            </FlowSection>
          )}

          {showGateTiming && (
            <FlowSection
              step={movementKind === 'person' ? '3' : '3'}
              title="Gate timing"
              value={gateTiming.gateTime || undefined}
              icon={CalendarClock}
            >
              <GateTimingFields
                data={gateTiming}
                onChange={(field, value) =>
                  setGateTiming((prev) => ({ ...prev, [field]: value }))
                }
              />
            </FlowSection>
          )}

          {showVehicleDetails && (
            <FlowSection
              step="4"
              title="Vehicle and driver"
              value={vehicleData.vehicleNumber || undefined}
              icon={Truck}
            >
              <VehicleIntakeFields
                data={vehicleData}
                errors={apiErrors}
                onVehicleSelect={handleVehicleSelect}
                onDriverSelect={handleDriverSelect}
              />
            </FlowSection>
          )}

          {movementKind === 'vehicle' && vehicleDirection && (
            <FlowSection
              step="5"
              title="Document"
              value={documentChoice ? labelForOption(DOCUMENT_OPTIONS, documentChoice) : undefined}
              icon={FileText}
            >
              <ChoiceGrid
                options={availableDocumentOptions}
                value={documentChoice}
                onChange={(value) => {
                  setDocumentChoice(value);
                  setNoDocumentReason(undefined);
                  setManualEntryTypeId(undefined);
                  setApiErrors({});
                }}
              />
            </FlowSection>
          )}

          {movementKind === 'vehicle' && vehicleDirection && documentChoice === 'none' && (
            <FlowSection
              step="6"
              title="Reason"
              value={
                noDocumentReason ? labelForOption(NO_DOCUMENT_REASONS, noDocumentReason) : undefined
              }
              icon={FileQuestion}
            >
              <ChoiceGrid
                options={availableNoDocumentReasons}
                value={noDocumentReason}
                onChange={(value) => {
                  setNoDocumentReason(value);
                  setManualEntryTypeId(undefined);
                  setApiErrors({});
                }}
              />
            </FlowSection>
          )}

          {showDocumentDetails && (
            <FlowSection
              step={documentChoice === 'none' ? '7' : '6'}
              title="Document and reason details"
              value={documentData.documentNumber || documentData.reasonNotes || undefined}
              icon={Hash}
            >
              <DocumentIntakeFields
                documentChoice={documentChoice}
                direction={vehicleDirection}
                data={documentData}
                onChange={(field, value) =>
                  setDocumentData((prev) => ({ ...prev, [field]: value }))
                }
              />
            </FlowSection>
          )}

          {showItemSnapshot && (
            <FlowSection step="8" title="Item snapshot" value={itemSnapshot.quantity} icon={Package}>
              <ItemSnapshotFields
                data={itemSnapshot}
                onChange={(field, value) =>
                  setItemSnapshot((prev) => ({ ...prev, [field]: value }))
                }
              />
            </FlowSection>
          )}

          {showWeighmentSnapshot && (
            <FlowSection
              step="9"
              title="Weighment"
              value={weighmentSnapshot.weighbridgeSlipNo || undefined}
              icon={Scale}
            >
              <WeighmentSnapshotFields
                data={weighmentSnapshot}
                onChange={(field, value) =>
                  setWeighmentSnapshot((prev) => ({ ...prev, [field]: value }))
                }
              />
            </FlowSection>
          )}

          {showDocumentDetails && (
            <FlowSection
              step="10"
              title="Attachments note"
              value={attachmentNotes ? 'Noted' : undefined}
              icon={Paperclip}
            >
              <div className="space-y-2">
                <Label htmlFor="attachmentNotes">Documents to collect later</Label>
                <Textarea
                  id="attachmentNotes"
                  value={attachmentNotes}
                  onChange={(event) => setAttachmentNotes(event.target.value)}
                  placeholder="Invoice copy, challan, e-way bill, weighment slip, vehicle photo..."
                  rows={3}
                />
              </div>
            </FlowSection>
          )}
        </div>

        <aside className="space-y-4">
          <section className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Matched gate form</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {selectedEntryType ? 'Ready to continue' : 'Select a movement route'}
                </p>
              </div>
              <Badge variant="outline" className="border-orange-200 bg-orange-50 text-primary">
                {matchedEntryTypes.length || searchableManualEntryTypes.length}
              </Badge>
            </div>

            {matchedEntryTypes.length > 0 ? (
              <div className="mt-4 space-y-2">
                {matchedEntryTypes.map((entryType) => (
                  <EntryTypeButton
                    key={entryType.id}
                    entryType={entryType}
                    selected={
                      selectedEntryType?.id === entryType.id || manualEntryTypeId === entryType.id
                    }
                    onClick={() => setManualEntryTypeId(entryType.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No matching gate form is available for this selection.
              </div>
            )}

            {apiErrors.general && (
              <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {apiErrors.general}
              </div>
            )}

            <Button
              className="mt-4 w-full"
              disabled={!selectedEntryType || createVehicleEntry.isPending}
              onClick={handleContinue}
            >
              {createVehicleEntry.isPending ? 'Creating entry...' : 'Continue'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </section>

          <section className="rounded-lg border bg-card p-4 shadow-sm">
            <p className="text-sm font-semibold text-foreground">Intake summary</p>
            <div className="mt-3 space-y-2 text-sm text-muted-foreground">
              <SummaryLine label="Movement" value={movementKind && formatStatusLabel(movementKind)} />
              <SummaryLine
                label="Direction"
                value={vehicleDirection ? labelForOption(DIRECTION_OPTIONS, vehicleDirection) : undefined}
              />
              <SummaryLine
                label="Gate"
                value={[gateTiming.gateDate, gateTiming.gateTime].filter(Boolean).join(' ')}
              />
              <SummaryLine
                label={movementKind === 'person' ? 'Person' : 'Vehicle'}
                value={movementKind === 'person' ? personData.personName : vehicleData.vehicleNumber}
              />
              <SummaryLine label="Matched" value={selectedEntryType?.title} />
            </div>
          </section>

          <section className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-foreground">Manual adjustment</p>
              {vehicleDirection && (
                <Badge variant="outline">{DIRECTION_LABELS[vehicleDirection]}</Badge>
              )}
            </div>
            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search gate form"
                className="pl-9"
              />
            </div>
            <div className="mt-3 max-h-[380px] space-y-2 overflow-auto pr-1">
              {searchableManualEntryTypes.map((entryType) => (
                <EntryTypeButton
                  key={entryType.id}
                  entryType={entryType}
                  compact
                  selected={selectedEntryType?.id === entryType.id}
                  onClick={() => setManualEntryTypeId(entryType.id)}
                />
              ))}
              {searchableManualEntryTypes.length === 0 && (
                <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  No gate forms match this search.
                </p>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function FlowSection({
  step,
  title,
  value,
  icon: Icon,
  children,
}: {
  step: string;
  title: string;
  value?: string;
  icon?: LucideIcon;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-orange-200 bg-orange-50 text-sm font-semibold text-primary">
            {Icon ? <Icon className="h-4 w-4" /> : step}
          </span>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Step {step}</p>
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
          </div>
        </div>
        {value && (
          <Badge variant="outline" className="border-orange-200 bg-orange-50 text-primary">
            {value}
          </Badge>
        )}
      </div>
      {children}
    </section>
  );
}

function GateTimingFields({
  data,
  onChange,
}: {
  data: GateTimingData;
  onChange: (field: keyof GateTimingData, value: string) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <FormField label="Gate date" htmlFor="gateDate">
        <Input
          id="gateDate"
          type="date"
          value={data.gateDate}
          onChange={(event) => onChange('gateDate', event.target.value)}
        />
      </FormField>
      <FormField label="Gate time" htmlFor="gateTime">
        <Input
          id="gateTime"
          type="time"
          value={data.gateTime}
          onChange={(event) => onChange('gateTime', event.target.value)}
        />
      </FormField>
      <FormField label="Security name" htmlFor="securityName">
        <Input
          id="securityName"
          value={data.securityName}
          onChange={(event) => onChange('securityName', event.target.value)}
          placeholder="Guard name"
        />
      </FormField>
      <FormField label="Gate location" htmlFor="gateLocation">
        <div className="relative">
          <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="gateLocation"
            value={data.gateLocation}
            onChange={(event) => onChange('gateLocation', event.target.value)}
            placeholder="Main gate"
            className="pl-9"
          />
        </div>
      </FormField>
      <div className="md:col-span-2 xl:col-span-4">
        <FormField label="Gate remarks" htmlFor="gateRemarks">
          <Textarea
            id="gateRemarks"
            value={data.remarks}
            onChange={(event) => onChange('remarks', event.target.value)}
            placeholder="Any gate-level notes"
            rows={3}
          />
        </FormField>
      </div>
    </div>
  );
}

function VehicleIntakeFields({
  data,
  errors,
  onVehicleSelect,
  onDriverSelect,
}: {
  data: VehicleIntakeData;
  errors: Record<string, string>;
  onVehicleSelect: (vehicle: VehicleSelection) => void;
  onDriverSelect: (driver: DriverSelection) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <VehicleSelect
        value={data.vehicleNumber}
        onChange={onVehicleSelect}
        label="Vehicle number"
        placeholder="Select or create vehicle"
        required
        error={errors.vehicle}
      />
      <DriverSelect
        value={data.driverName}
        onChange={onDriverSelect}
        label="Driver"
        placeholder="Select or create driver"
        required
        error={errors.driver}
      />
    </div>
  );
}

function PersonIntakeFields({
  data,
  errors,
  onChange,
}: {
  data: PersonIntakeData;
  errors: Record<string, string>;
  onChange: (field: keyof PersonIntakeData, value: string) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <FormField label="Person type" htmlFor="personType" error={errors.personType}>
        <NativeSelect
          id="personType"
          value={data.personType}
          onChange={(event) => onChange('personType', event.target.value)}
          placeholder="Select person type"
        >
          {PERSON_TYPE_OPTIONS.map((option) => (
            <SelectOption key={option.value} value={option.value}>
              {option.label}
            </SelectOption>
          ))}
        </NativeSelect>
      </FormField>
      <FormField label="Person name" htmlFor="personName" error={errors.personName}>
        <Input
          id="personName"
          value={data.personName}
          onChange={(event) => onChange('personName', event.target.value)}
          placeholder="Visitor or worker name"
        />
      </FormField>
      <FormField label="Mobile number" htmlFor="personMobile">
        <Input
          id="personMobile"
          value={data.mobileNumber}
          onChange={(event) => onChange('mobileNumber', event.target.value)}
          placeholder="9876543210"
        />
      </FormField>
      <FormField label="Company / contractor" htmlFor="companyName">
        <Input
          id="companyName"
          value={data.companyName}
          onChange={(event) => onChange('companyName', event.target.value)}
          placeholder="Company or contractor"
        />
      </FormField>
      <FormField label="ID proof type" htmlFor="personIdProofType">
        <Input
          id="personIdProofType"
          value={data.idProofType}
          onChange={(event) => onChange('idProofType', event.target.value)}
          placeholder="Aadhaar, license, etc."
        />
      </FormField>
      <FormField label="ID proof number" htmlFor="personIdProofNumber">
        <Input
          id="personIdProofNumber"
          value={data.idProofNumber}
          onChange={(event) => onChange('idProofNumber', event.target.value)}
          placeholder="Document number"
        />
      </FormField>
      <FormField label="Purpose" htmlFor="purpose">
        <Input
          id="purpose"
          value={data.purpose}
          onChange={(event) => onChange('purpose', event.target.value)}
          placeholder="Visit purpose"
        />
      </FormField>
      <FormField label="Approved by / person to meet" htmlFor="approvedBy">
        <Input
          id="approvedBy"
          value={data.approvedBy}
          onChange={(event) => onChange('approvedBy', event.target.value)}
          placeholder="Approver or host"
        />
      </FormField>
      <FormField label="Expected return time" htmlFor="expectedReturnTime">
        <Input
          id="expectedReturnTime"
          type="time"
          value={data.expectedReturnTime}
          onChange={(event) => onChange('expectedReturnTime', event.target.value)}
        />
      </FormField>
    </div>
  );
}

function DocumentIntakeFields({
  documentChoice,
  direction,
  data,
  onChange,
}: {
  documentChoice?: DocumentChoice;
  direction?: GateEntryDirection;
  data: DocumentIntakeData;
  onChange: (field: keyof DocumentIntakeData, value: string) => void;
}) {
  const documentLabel = getDocumentNumberLabel(documentChoice);

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {documentChoice !== 'none' && (
        <FormField label={documentLabel} htmlFor="documentNumber">
          <Input
            id="documentNumber"
            value={data.documentNumber}
            onChange={(event) => onChange('documentNumber', event.target.value)}
            placeholder={documentLabel}
          />
        </FormField>
      )}
      <FormField label="Vendor / customer / party" htmlFor="partyName">
        <Input
          id="partyName"
          value={data.partyName}
          onChange={(event) => onChange('partyName', event.target.value)}
          placeholder="Party name"
        />
      </FormField>
      <FormField label="Challan number" htmlFor="challanNumber">
        <Input
          id="challanNumber"
          value={data.challanNumber}
          onChange={(event) => onChange('challanNumber', event.target.value)}
          placeholder="Challan no."
        />
      </FormField>
      <FormField label="E-way bill" htmlFor="ewayBillNumber">
        <Input
          id="ewayBillNumber"
          value={data.ewayBillNumber}
          onChange={(event) => onChange('ewayBillNumber', event.target.value)}
          placeholder="E-way bill no."
        />
      </FormField>
      <FormField label="SAP / source reference" htmlFor="sapReference">
        <Input
          id="sapReference"
          value={data.sapReference}
          onChange={(event) => onChange('sapReference', event.target.value)}
          placeholder="SAP reference"
        />
      </FormField>
      {(direction === 'out' || direction === 'return') && (
        <FormField label="Linked entry / source out" htmlFor="linkedEntryNo">
          <Input
            id="linkedEntryNo"
            value={data.linkedEntryNo}
            onChange={(event) => onChange('linkedEntryNo', event.target.value)}
            placeholder="Previous gate entry"
          />
        </FormField>
      )}
      <FormField label="From location" htmlFor="sourceLocation">
        <Input
          id="sourceLocation"
          value={data.sourceLocation}
          onChange={(event) => onChange('sourceLocation', event.target.value)}
          placeholder="Source"
        />
      </FormField>
      <FormField label="To location" htmlFor="destinationLocation">
        <Input
          id="destinationLocation"
          value={data.destinationLocation}
          onChange={(event) => onChange('destinationLocation', event.target.value)}
          placeholder="Destination"
        />
      </FormField>
      {(direction === 'out' || direction === 'return') && (
        <FormField label="Seal number" htmlFor="sealNumber">
          <Input
            id="sealNumber"
            value={data.sealNumber}
            onChange={(event) => onChange('sealNumber', event.target.value)}
            placeholder="Seal no."
          />
        </FormField>
      )}
      <div className="md:col-span-2 xl:col-span-3">
        <FormField label="Reason / notes" htmlFor="reasonNotes">
          <Textarea
            id="reasonNotes"
            value={data.reasonNotes}
            onChange={(event) => onChange('reasonNotes', event.target.value)}
            placeholder="Explain manual/no-document movement or anything unusual"
            rows={3}
          />
        </FormField>
      </div>
    </div>
  );
}

function ItemSnapshotFields({
  data,
  onChange,
}: {
  data: ItemSnapshotData;
  onChange: (field: keyof ItemSnapshotData, value: string) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      <FormField label="Item code" htmlFor="itemCode">
        <Input
          id="itemCode"
          value={data.itemCode}
          onChange={(event) => onChange('itemCode', event.target.value)}
          placeholder="Optional"
        />
      </FormField>
      <FormField label="Item / material name" htmlFor="itemName">
        <Input
          id="itemName"
          value={data.itemName}
          onChange={(event) => onChange('itemName', event.target.value)}
          placeholder="Material name"
        />
      </FormField>
      <FormField label="Quantity" htmlFor="itemQuantity">
        <Input
          id="itemQuantity"
          type="number"
          min="0"
          value={data.quantity}
          onChange={(event) => onChange('quantity', event.target.value)}
          placeholder="0"
        />
      </FormField>
      <FormField label="UOM" htmlFor="itemUom">
        <Input
          id="itemUom"
          value={data.uom}
          onChange={(event) => onChange('uom', event.target.value)}
          placeholder="KG, Nos, Ltr"
        />
      </FormField>
      <FormField label="Condition / reason" htmlFor="conditionNotes">
        <Input
          id="conditionNotes"
          value={data.conditionNotes}
          onChange={(event) => onChange('conditionNotes', event.target.value)}
          placeholder="Accepted, rejected, return..."
        />
      </FormField>
    </div>
  );
}

function WeighmentSnapshotFields({
  data,
  onChange,
}: {
  data: WeighmentSnapshotData;
  onChange: (field: keyof WeighmentSnapshotData, value: string) => void;
}) {
  const gross = parseFloat(data.grossWeight);
  const tare = parseFloat(data.tareWeight);
  const netWeight = Number.isFinite(gross) && Number.isFinite(tare) ? Math.max(0, gross - tare) : null;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
      <FormField label="Gross weight" htmlFor="grossWeight">
        <Input
          id="grossWeight"
          type="number"
          min="0"
          step="0.001"
          value={data.grossWeight}
          onChange={(event) => onChange('grossWeight', event.target.value)}
          placeholder="0"
        />
      </FormField>
      <FormField label="Tare weight" htmlFor="tareWeight">
        <Input
          id="tareWeight"
          type="number"
          min="0"
          step="0.001"
          value={data.tareWeight}
          onChange={(event) => onChange('tareWeight', event.target.value)}
          placeholder="0"
        />
      </FormField>
      <ReadOnlyField label="Net weight" value={netWeight === null ? '' : netWeight.toFixed(3)} />
      <FormField label="Slip / ticket number" htmlFor="weighbridgeSlipNo">
        <Input
          id="weighbridgeSlipNo"
          value={data.weighbridgeSlipNo}
          onChange={(event) => onChange('weighbridgeSlipNo', event.target.value)}
          placeholder="WB slip"
        />
      </FormField>
      <FormField label="First time" htmlFor="firstWeighmentTime">
        <Input
          id="firstWeighmentTime"
          type="time"
          value={data.firstWeighmentTime}
          onChange={(event) => onChange('firstWeighmentTime', event.target.value)}
        />
      </FormField>
      <FormField label="Second time" htmlFor="secondWeighmentTime">
        <Input
          id="secondWeighmentTime"
          type="time"
          value={data.secondWeighmentTime}
          onChange={(event) => onChange('secondWeighmentTime', event.target.value)}
        />
      </FormField>
    </div>
  );
}

function FormField({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value?: string | number | null }) {
  const id = `readonly-${label.replace(/\W+/g, '-').toLowerCase()}`;

  return (
    <FormField label={label} htmlFor={id}>
      <Input id={id} value={value || ''} disabled placeholder="Auto-filled" />
    </FormField>
  );
}

function SummaryLine({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span>{label}</span>
      <span className="max-w-[190px] text-right font-medium text-foreground">
        {value || '-'}
      </span>
    </div>
  );
}

function ChoiceGrid<T extends string>({
  options,
  value,
  onChange,
}: {
  options: ChoiceOption<T>[];
  value?: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {options.map((option) => {
        const Icon = option.icon;
        const selected = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            className={cn(
              'rounded-lg border bg-background p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-orange-50/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              selected && 'border-primary/60 bg-orange-50 ring-1 ring-primary/20',
            )}
            onClick={() => onChange(option.id)}
          >
            <span
              className={cn(
                'inline-flex h-10 w-10 items-center justify-center rounded-lg border bg-muted text-muted-foreground',
                selected && 'border-orange-200 bg-orange-100 text-primary',
              )}
            >
              <Icon className="h-5 w-5" />
            </span>
            <span className="mt-3 block font-semibold text-foreground">{option.label}</span>
            <span className="mt-1 block text-sm leading-5 text-muted-foreground">
              {option.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function EntryTypeButton({
  entryType,
  selected,
  compact,
  onClick,
}: {
  entryType: GateEntryTypeConfig;
  selected: boolean;
  compact?: boolean;
  onClick: () => void;
}) {
  const Icon = entryType.icon;

  return (
    <button
      type="button"
      className={cn(
        'flex w-full items-start gap-3 rounded-lg border bg-background p-3 text-left transition hover:border-primary/40 hover:bg-orange-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        selected && 'border-primary/60 bg-orange-50 ring-1 ring-primary/20',
      )}
      onClick={onClick}
    >
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-orange-200 bg-orange-50 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-foreground">{entryType.title}</span>
        {!compact && (
          <span className="mt-1 block text-sm leading-5 text-muted-foreground">
            {entryType.description}
          </span>
        )}
        <span className="mt-2 inline-flex rounded-full border px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {DIRECTION_LABELS[entryType.direction]}
        </span>
      </span>
    </button>
  );
}

function deriveMatchedEntryTypeIds({
  movementKind,
  vehicleDirection,
  documentChoice,
  noDocumentReason,
}: {
  movementKind?: MovementKind;
  vehicleDirection?: GateEntryDirection;
  documentChoice?: DocumentChoice;
  noDocumentReason?: NoDocumentReason;
}) {
  if (movementKind === 'person') return ['visitor-labour'];
  if (movementKind !== 'vehicle' || !vehicleDirection || !documentChoice) return [];

  switch (documentChoice) {
    case 'purchase':
      return vehicleDirection === 'in' ? ['raw-materials'] : [];
    case 'invoice':
      if (vehicleDirection === 'out') return ['sales-dispatch'];
      if (vehicleDirection === 'return') return ['customer-return'];
      return [];
    case 'stock-transfer':
      if (vehicleDirection === 'in') return ['bst-in'];
      if (vehicleDirection === 'out') return ['bst-out'];
      return ['bst-return'];
    case 'qc-rejection':
      return vehicleDirection === 'out' ? ['rejected-qc-return'] : [];
    case 'repair':
      return vehicleDirection === 'out' ? ['repair-parts-out'] : ['repair-parts-in'];
    case 'job-work':
      return vehicleDirection === 'out' ? ['job-work'] : [];
    case 'none':
      if (!noDocumentReason) return [];
      return entryTypeIdsForNoDocumentReason(noDocumentReason, vehicleDirection);
    default:
      return [];
  }
}

function entryTypeIdsForNoDocumentReason(
  reason: NoDocumentReason,
  direction: GateEntryDirection,
) {
  switch (reason) {
    case 'empty-vehicle':
      if (direction === 'in') return ['empty-vehicle-in'];
      if (direction === 'out') return ['empty-vehicle-out'];
      return [];
    case 'routine-supply':
      return direction === 'in' ? ['daily-needs'] : [];
    case 'spares-tools':
      return direction === 'in' ? ['maintenance'] : [];
    case 'civil-work':
      return direction === 'in' ? ['construction'] : [];
    case 'other':
      return [];
    default:
      return [];
  }
}

function fallbackEntryTypes(
  entryTypes: GateEntryTypeConfig[],
  movementKind?: MovementKind,
  direction?: GateEntryDirection,
) {
  if (!movementKind) return [];

  if (movementKind === 'person') {
    return entryTypes.filter((entryType) => entryType.id === 'visitor-labour');
  }

  if (!direction) return [];

  return entryTypes.filter((entryType) => {
    if (entryType.vehicleMode !== 'vehicle') return false;
    return entryType.direction === direction;
  });
}

function labelForOption<T extends string>(options: ChoiceOption<T>[], id: T) {
  return options.find((option) => option.id === id)?.label || id;
}

function validateIntake({
  movementKind,
  vehicleDirection,
  documentChoice,
  noDocumentReason,
  vehicleData,
  personData,
  shouldCreateVehicleEntry,
}: {
  movementKind?: MovementKind;
  vehicleDirection?: GateEntryDirection;
  documentChoice?: DocumentChoice;
  noDocumentReason?: NoDocumentReason;
  vehicleData: VehicleIntakeData;
  personData: PersonIntakeData;
  shouldCreateVehicleEntry: boolean;
}) {
  const errors: Record<string, string> = {};

  if (!movementKind) {
    errors.general = 'Please select whether this is a vehicle or person movement.';
    return errors;
  }

  if (movementKind === 'person') {
    if (!personData.personType) errors.personType = 'Please select person type.';
    if (!personData.personName.trim()) errors.personName = 'Please enter person name.';
    return errors;
  }

  if (!vehicleDirection) {
    errors.general = 'Please select whether the vehicle is coming in, going out, or returning.';
    return errors;
  }

  if (!documentChoice) {
    errors.general = 'Please select the document or reason for this movement.';
    return errors;
  }

  if (documentChoice === 'none' && !noDocumentReason) {
    errors.general = 'Please select the reason for the no-document movement.';
    return errors;
  }

  if (shouldCreateVehicleEntry) {
    if (!vehicleData.vehicleId) errors.vehicle = 'Please select a vehicle.';
    if (!vehicleData.driverId) errors.driver = 'Please select a driver.';
  }

  return errors;
}

function clearFieldError(
  setApiErrors: Dispatch<SetStateAction<Record<string, string>>>,
  field: string,
) {
  setApiErrors((prev) => {
    if (!prev[field]) return prev;
    const next = { ...prev };
    delete next[field];
    return next;
  });
}

function getLocalDateValue() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getLocalTimeValue() {
  const date = new Date();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function generateEntryNumber() {
  const year = new Date().getFullYear();
  const timestamp = Date.now().toString().slice(-5);
  return `GE-${year}-${timestamp}`;
}

function saveGateIntakeDraft(draft: unknown) {
  try {
    sessionStorage.setItem(GATE_INTAKE_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Session storage is a convenience only; the created vehicle entry remains the source of truth.
  }
}

function buildVehicleEntryRemarks(gateTiming: GateTimingData, documentData: DocumentIntakeData) {
  const intakeLines = [
    gateTiming.remarks.trim(),
    `Gate date: ${gateTiming.gateDate || '-'}`,
    `Gate time: ${gateTiming.gateTime || '-'}`,
    gateTiming.securityName ? `Security: ${gateTiming.securityName}` : '',
    gateTiming.gateLocation ? `Gate: ${gateTiming.gateLocation}` : '',
    documentData.documentNumber ? `Document: ${documentData.documentNumber}` : '',
    documentData.challanNumber ? `Challan: ${documentData.challanNumber}` : '',
    documentData.ewayBillNumber ? `E-way bill: ${documentData.ewayBillNumber}` : '',
    documentData.reasonNotes ? `Reason: ${documentData.reasonNotes}` : '',
  ].filter(Boolean);

  return intakeLines.join('\n') || undefined;
}

function getDocumentNumberLabel(documentChoice?: DocumentChoice) {
  switch (documentChoice) {
    case 'purchase':
      return 'PO number';
    case 'invoice':
      return 'Invoice number';
    case 'stock-transfer':
      return 'Stock transfer document';
    case 'qc-rejection':
      return 'QC rejection reference';
    case 'repair':
      return 'Repair reference';
    case 'job-work':
      return 'Job work reference';
    default:
      return 'Document number';
  }
}

function formatStatusLabel(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}
