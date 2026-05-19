import { AlertCircle, ExternalLink, FileText, Loader2, LocateFixed, Paperclip, Upload } from 'lucide-react';
import { type ChangeEvent, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import {
  type SalesDispatchAttachment,
  type SalesDispatchAttachmentType,
  usePreviewSalesDispatchGatepass,
  useSalesDispatchAttachments,
  useSalesDispatchByVehicleEntry,
  useUploadSalesDispatchAttachment,
} from '@/modules/gate/api';
import { StepFooter, StepHeader, StepLoadingSpinner } from '@/modules/gate/components';
import { useEntryId } from '@/modules/gate/hooks';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Label,
  Textarea,
} from '@/shared/components/ui';
import { getErrorMessage, resolveFileUrl } from '@/shared/utils';

import {
  DOCKING_TOTAL_STEPS,
  formatValue,
} from './salesDispatchFlow.helpers';
import { DOCKING_ROUTES } from './salesDispatchRoutes';

interface UploadPanelConfig {
  type: SalesDispatchAttachmentType;
  label: string;
  description: string;
  required?: boolean;
  needsGeolocation?: boolean;
  accept?: string;
}

const UPLOAD_PANELS: UploadPanelConfig[] = [
  {
    type: 'TRUCK_PHOTO',
    label: 'Truck Photo',
    description: 'Live vehicle photo with GPS coordinates',
    required: true,
    needsGeolocation: true,
    accept: 'image/*',
  },
  {
    type: 'INVOICE_COPY',
    label: 'Invoice Copy',
    description: 'Invoice scan, photo, or PDF',
  },
  {
    type: 'DELIVERY_NOTE',
    label: 'Delivery Note',
    description: 'Delivery note or dispatch note',
  },
  {
    type: 'EWAY_BILL',
    label: 'E-way Bill',
    description: 'E-way bill document',
  },
  {
    type: 'BILTY',
    label: 'Bilty / LR',
    description: 'Freight document or LR copy',
  },
  {
    type: 'OTHER',
    label: 'Other Document',
    description: 'Any other supporting file',
  },
];

export default function SalesDispatchAttachmentsPage() {
  const navigate = useNavigate();
  const { entryId, entryIdNumber } = useEntryId();
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [uploadingType, setUploadingType] = useState<SalesDispatchAttachmentType | null>(null);
  const [uploadingMessage, setUploadingMessage] = useState('');

  const {
    data: entry,
    isLoading: isEntryLoading,
    error: entryError,
    refetch: refetchEntry,
  } = useSalesDispatchByVehicleEntry(entryIdNumber);
  const {
    data: attachments = [],
    isLoading: isAttachmentsLoading,
  } = useSalesDispatchAttachments(entry?.id);
  const uploadAttachment = useUploadSalesDispatchAttachment();
  const previewGatepass = usePreviewSalesDispatchGatepass();

  const isReadOnly = entry
    ? ['PRINT_COMMITTED', 'DISPATCHED', 'REJECTED', 'CANCELLED'].includes(entry.status)
    : false;
  const isLoading = isEntryLoading || isAttachmentsLoading;
  const hasTruckPhoto = attachments.some(
    (attachment) =>
      attachment.attachment_type === 'TRUCK_PHOTO'
      && attachment.latitude !== null
      && attachment.longitude !== null,
  ) || Boolean(entry?.gatepass_readiness.has_truck_photo_geolocation);

  const handleUpload = async (type: SalesDispatchAttachmentType, file: File) => {
    if (!entry) {
      setError('Docking details not found.');
      return;
    }

    setError(null);
    setUploadingType(type);

    try {
      setUploadingMessage(type === 'TRUCK_PHOTO' ? 'Getting GPS location...' : 'Uploading document...');
      const location = type === 'TRUCK_PHOTO' ? await getBrowserPosition() : null;
      setUploadingMessage(type === 'TRUCK_PHOTO' ? 'Uploading truck photo...' : 'Uploading document...');
      await uploadAttachment.mutateAsync({
        id: entry.id,
        data: {
          attachment_type: type,
          file,
          notes,
          latitude: location?.latitude ?? null,
          longitude: location?.longitude ?? null,
        },
      });
      toast.success(type === 'TRUCK_PHOTO' ? 'Truck photo uploaded with location' : 'Document uploaded');
      await refetchEntry();
    } catch (uploadError) {
      setError(getErrorMessage(uploadError, 'Failed to upload attachment'));
    } finally {
      setUploadingType(null);
      setUploadingMessage('');
    }
  };

  const handleNext = async () => {
    if (!entry) {
      setError('Docking details not found.');
      return;
    }

    if (!hasTruckPhoto) {
      setError('Truck photo with geolocation is required before gatepass printing.');
      return;
    }

    try {
      await previewGatepass.mutateAsync(entry.id);
      navigate(DOCKING_ROUTES.gatepass(entry.vehicle_entry));
    } catch (previewError) {
      setError(getErrorMessage(previewError, 'Failed to prepare gatepass'));
    }
  };

  if (isLoading) {
    return <StepLoadingSpinner />;
  }

  if (!entry) {
    return (
      <div className="space-y-6 pb-6">
        <StepHeader
          currentStep={3}
          totalSteps={DOCKING_TOTAL_STEPS}
          title="Docking"
          error={error || (entryError ? getErrorMessage(entryError, 'Docking details not found') : null)}
        />
        <div className="flex items-center justify-between gap-4 rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-900">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Docking details not found</span>
          </div>
          <Button variant="outline" onClick={() => navigate(DOCKING_ROUTES.newEntry)}>
            Fill Details
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      <StepHeader
        currentStep={3}
        totalSteps={DOCKING_TOTAL_STEPS}
        title="Docking"
        error={error}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Paperclip className="h-5 w-5" />
            Photo & Documents
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-3">
            {UPLOAD_PANELS.map((panel) => (
              <DocumentUploadPanel
                key={panel.type}
                panel={panel}
                disabled={isReadOnly || uploadAttachment.isPending || Boolean(uploadingType)}
                isUploading={uploadingType === panel.type}
                uploadingMessage={uploadingMessage}
                attachments={attachments.filter((attachment) => attachment.attachment_type === panel.type)}
                onUpload={handleUpload}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <section className="space-y-4 border-t pt-6">
        <h3 className="flex items-center gap-2 text-xl font-semibold">
          <FileText className="h-5 w-5" />
          Upload Notes
        </h3>
        <div className="space-y-2">
          <Label htmlFor="sales-dispatch-attachment-notes">Notes</Label>
          <Textarea
            id="sales-dispatch-attachment-notes"
            value={notes}
            disabled={isReadOnly}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Optional note saved with newly uploaded files"
            rows={4}
          />
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LocateFixed className="h-5 w-5" />
            Gatepass Readiness
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-3">
          <InfoItem
            label="Truck Photo Location"
            value={hasTruckPhoto ? 'Captured' : 'Required'}
          />
          <InfoItem
            label="Weighment"
            value={entry.gatepass_readiness.has_weighment ? 'Recorded' : 'Pending'}
          />
          <InfoItem
            label="SAP Items"
            value={entry.gatepass_readiness.has_items ? 'Available' : 'Missing'}
          />
        </CardContent>
      </Card>

      <StepFooter
        onPrevious={() => navigate(DOCKING_ROUTES.weighment(entryId || entry.vehicle_entry))}
        onCancel={() => navigate(DOCKING_ROUTES.dashboard)}
        onNext={handleNext}
        isSaving={previewGatepass.isPending}
        nextLabel={previewGatepass.isPending ? 'Preparing...' : 'Prepare Gatepass'}
      />
    </div>
  );
}

function DocumentUploadPanel({
  panel,
  disabled,
  isUploading,
  uploadingMessage,
  attachments,
  onUpload,
}: {
  panel: UploadPanelConfig;
  disabled: boolean;
  isUploading: boolean;
  uploadingMessage: string;
  attachments: SalesDispatchAttachment[];
  onUpload: (type: SalesDispatchAttachmentType, file: File) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await onUpload(panel.type, file);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={disabled}
        aria-busy={isUploading}
        className="flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/25 p-6 text-center transition-colors hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-60"
        onClick={() => inputRef.current?.click()}
      >
        {isUploading ? (
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        ) : (
          <Upload className="h-8 w-8 text-muted-foreground" />
        )}
        <span className="text-sm font-medium">
          {isUploading ? uploadingMessage : panel.label} {!isUploading && panel.required && <span className="text-destructive">*</span>}
        </span>
        <span className="text-xs text-muted-foreground">
          {isUploading ? 'Please wait while this file is saved.' : panel.description}
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={panel.accept}
        className="hidden"
        disabled={disabled}
        onChange={handleFileSelect}
      />

      {attachments.length > 0 ? (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <a
              key={attachment.id}
              href={resolveFileUrl(attachment.file)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-md border p-3 text-sm hover:bg-muted/50"
            >
              <FileText className="h-5 w-5 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate font-medium">
                {attachment.original_filename || attachment.file.split('/').pop() || panel.label}
              </span>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>
          ))}
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          {panel.required ? `${panel.label} is required.` : 'No file uploaded yet.'}
        </p>
      )}
    </div>
  );
}

function getBrowserPosition(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not available in this browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: roundCoordinate(position.coords.latitude),
          longitude: roundCoordinate(position.coords.longitude),
        });
      },
      () => reject(new Error('Location permission is required for truck photo upload.')),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}

function roundCoordinate(value: number) {
  return Number(value.toFixed(6));
}

function InfoItem({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{formatValue(value)}</p>
    </div>
  );
}
