import { AlertCircle, Camera, FileText, Paperclip, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import {
  useCompleteSalesDispatchGateOut,
  useSalesDispatchGateOut,
  useUploadSalesDispatchAttachments,
} from '@/modules/gate/api';
import { StepFooter, StepHeader } from '@/modules/gate/components';
import { Button, Card, CardContent, CardHeader, CardTitle, Label, Textarea } from '@/shared/components/ui';

function getApiErrorMessage(error: unknown, fallback: string) {
  const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
  return detail || fallback;
}

function fileNameFromUrl(value?: string | null) {
  if (!value) return '';
  return decodeURIComponent(value.split('/').pop() || value);
}

export default function SalesDispatchAttachmentsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const entryId = Number(searchParams.get('entryId') || 0) || null;
  const { data: entry, isLoading } = useSalesDispatchGateOut(entryId);
  const uploadMutation = useUploadSalesDispatchAttachments();
  const completeMutation = useCompleteSalesDispatchGateOut();
  const [dockPhoto, setDockPhoto] = useState<File | null>(null);
  const [gatepassDocument, setGatepassDocument] = useState<File | null>(null);
  const [attachmentNotes, setAttachmentNotes] = useState('');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState<string | null>(null);
  const dockPhotoRef = useRef<HTMLInputElement>(null);
  const gatepassRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!entry) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Attachment form follows the loaded entry.
    setAttachmentNotes(entry.attachment_notes || '');
    setRemarks(entry.remarks || '');
  }, [entry]);

  const isSaving = uploadMutation.isPending || completeMutation.isPending;

  const handleComplete = async () => {
    if (!entry) {
      setError('Sales dispatch details not found');
      return;
    }

    if (!dockPhoto && !entry.dock_photo) {
      setError('Dock photo is required before completing sales dispatch.');
      return;
    }
    if (!gatepassDocument && !entry.gatepass_document) {
      setError('Gatepass document is required before completing sales dispatch.');
      return;
    }

    try {
      if (dockPhoto || gatepassDocument || attachmentNotes !== entry.attachment_notes || remarks !== entry.remarks) {
        await uploadMutation.mutateAsync({
          id: entry.id,
          data: {
            dock_photo: dockPhoto,
            gatepass_document: gatepassDocument,
            attachment_notes: attachmentNotes,
            remarks,
          },
        });
      }
      const completed = await completeMutation.mutateAsync(entry.id);
      toast.success('Sales dispatch gate-out completed');
      navigate(`/gate/sales-dispatch/${completed.id}`);
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Failed to complete sales dispatch.'));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 pb-6">
        <StepHeader currentStep={3} totalSteps={3} title="Sales Dispatch Out" error={null} />
        <div className="rounded-md border p-6 text-sm text-muted-foreground">Loading dispatch entry...</div>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="space-y-6 pb-6">
        <StepHeader currentStep={3} totalSteps={3} title="Sales Dispatch Out" error={error} />
        <div className="flex items-center justify-between gap-4 rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-900">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Sales dispatch details not found</span>
          </div>
          <Button variant="outline" onClick={() => navigate('/gate/sales-dispatch/new')}>
            Fill Details
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      <StepHeader currentStep={3} totalSteps={3} title="Sales Dispatch Out" error={error} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Paperclip className="h-5 w-5" />
            Attachments
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          <UploadTile
            icon={<Camera className="h-8 w-8 text-muted-foreground" />}
            title="Dock Photo"
            required
            selectedName={dockPhoto?.name || fileNameFromUrl(entry.dock_photo)}
            onClick={() => dockPhotoRef.current?.click()}
          />
          <UploadTile
            icon={<FileText className="h-8 w-8 text-muted-foreground" />}
            title="Gatepass Document"
            required
            selectedName={gatepassDocument?.name || fileNameFromUrl(entry.gatepass_document)}
            onClick={() => gatepassRef.current?.click()}
          />
          <input
            ref={dockPhotoRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              setDockPhoto(event.target.files?.[0] || null);
              setError(null);
            }}
          />
          <input
            ref={gatepassRef}
            type="file"
            className="hidden"
            onChange={(event) => {
              setGatepassDocument(event.target.files?.[0] || null);
              setError(null);
            }}
          />
        </CardContent>
      </Card>

      <section className="space-y-4 border-t pt-6">
        <h3 className="flex items-center gap-2 text-xl font-semibold">
          <FileText className="h-5 w-5" />
          Remarks
        </h3>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="sales-dispatch-attachment-notes">Attachment Notes</Label>
            <Textarea
              id="sales-dispatch-attachment-notes"
              value={attachmentNotes}
              onChange={(event) => setAttachmentNotes(event.target.value)}
              placeholder="Document details, file references, or missing document notes"
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sales-dispatch-remarks">Remarks</Label>
            <Textarea
              id="sales-dispatch-remarks"
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              placeholder="Optional notes"
              rows={4}
            />
          </div>
        </div>
      </section>

      <StepFooter
        onPrevious={() => navigate(`/gate/sales-dispatch/new/weighment?entryId=${entry.id}`)}
        onCancel={() => navigate('/gate/sales-dispatch')}
        onNext={handleComplete}
        isSaving={isSaving}
        nextLabel={isSaving ? 'Completing...' : 'Complete Dispatch'}
      />
    </div>
  );
}

function UploadTile({
  icon,
  title,
  required,
  selectedName,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  required?: boolean;
  selectedName?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="flex min-h-[180px] w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 text-center transition-colors hover:border-primary/50"
      onClick={onClick}
    >
      {icon}
      <span className="text-sm font-medium">
        {title}
        {required ? <span className="ml-1 text-destructive">*</span> : null}
      </span>
      <span className="max-w-full truncate text-xs text-muted-foreground">
        {selectedName || 'Click to upload'}
      </span>
      <Upload className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}
