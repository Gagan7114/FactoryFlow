import { AlertCircle, ExternalLink, FileText, Paperclip, Upload } from 'lucide-react';
import { type ChangeEvent, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import {
  type GateAttachment,
  useEmptyVehicleGateIn,
  useGateAttachments,
  useUploadAttachment,
} from '@/modules/gate/api';
import { StepFooter, StepHeader, StepLoadingSpinner } from '@/modules/gate/components';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';
import { getErrorMessage, resolveFileUrl } from '@/shared/utils';

import {
  EMPTY_VEHICLE_IN_ROUTES,
  EMPTY_VEHICLE_IN_TOTAL_STEPS,
  getGateInId,
} from './emptyVehicleInRoutes';

export default function EmptyVehicleInAttachmentsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const gateInId = getGateInId(searchParams);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');

  const {
    data: entry,
    isLoading: isEntryLoading,
    error: entryError,
  } = useEmptyVehicleGateIn(gateInId);
  const vehicleEntryId = entry?.vehicle_entry || null;
  const { data: attachments = [], isLoading: isAttachmentsLoading } =
    useGateAttachments(vehicleEntryId);
  const uploadAttachment = useUploadAttachment(vehicleEntryId || 0);

  const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !vehicleEntryId) return;

    setError('');
    for (const file of Array.from(files)) {
      try {
        await uploadAttachment.mutateAsync(file);
        toast.success(`${file.name} uploaded`);
      } catch (uploadError) {
        setError(getErrorMessage(uploadError, `Failed to upload ${file.name}`));
        break;
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (isEntryLoading || isAttachmentsLoading) return <StepLoadingSpinner />;

  if (!gateInId || !entry) {
    return (
      <div className="space-y-6 pb-6">
        <StepHeader
          currentStep={3}
          totalSteps={EMPTY_VEHICLE_IN_TOTAL_STEPS}
          title="Empty Vehicle In"
          error={error || (entryError ? getErrorMessage(entryError, 'Entry not found') : null)}
        />
        <div className="flex items-center justify-between gap-4 rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-900">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Empty vehicle entry details not found</span>
          </div>
          <Button variant="outline" onClick={() => navigate(EMPTY_VEHICLE_IN_ROUTES.details())}>
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
        totalSteps={EMPTY_VEHICLE_IN_TOTAL_STEPS}
        title="Empty Vehicle In"
        error={error || null}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Paperclip className="h-5 w-5" />
            Attachments
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <button
            type="button"
            disabled={uploadAttachment.isPending}
            className="flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 text-center transition-colors hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-10 w-10 text-muted-foreground" />
            <span className="text-sm font-medium">
              {uploadAttachment.isPending ? 'Uploading...' : 'Upload files'}
            </span>
            <span className="text-xs text-muted-foreground">
              Vehicle photo, document scan, PDF, or other supporting file
            </span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />

          {attachments.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {attachments.map((attachment) => (
                <AttachmentLink key={attachment.id} attachment={attachment} />
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              No attachments uploaded yet.
            </p>
          )}
        </CardContent>
      </Card>

      <StepFooter
        onPrevious={() => navigate(EMPTY_VEHICLE_IN_ROUTES.weighment(gateInId))}
        onCancel={() => navigate(EMPTY_VEHICLE_IN_ROUTES.dashboard)}
        onNext={() => navigate(EMPTY_VEHICLE_IN_ROUTES.review(gateInId))}
        isSaving={uploadAttachment.isPending}
        nextLabel="Review"
      />
    </div>
  );
}

function AttachmentLink({ attachment }: { attachment: GateAttachment }) {
  const url = resolveFileUrl(attachment.file);
  const fileName = attachment.file_name || attachment.file.split('/').pop() || 'Attachment';

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-md border p-3 text-sm hover:bg-muted/50"
    >
      <FileText className="h-5 w-5 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate font-medium">{fileName}</span>
      <ExternalLink className="h-4 w-4 text-muted-foreground" />
    </a>
  );
}
