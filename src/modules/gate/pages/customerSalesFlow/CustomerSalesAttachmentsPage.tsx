import { AlertCircle, ExternalLink, FileText, Paperclip, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { StepFooter, StepHeader } from '@/modules/gate/components';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Label,
  Textarea,
} from '@/shared/components/ui';

import {
  CUSTOMER_RETURN_KEY,
  type CustomerFlowEntry,
  type CustomerFlowValue,
  findCustomerFlowEntry,
  updateCustomerFlowEntry,
} from './customerSalesFlow.storage';

const ATTACHMENTS_CONFIG = {
  storageKey: CUSTOMER_RETURN_KEY,
  title: 'Customer Return In',
  previousPath: '/gate/customer-return/new',
  dashboardPath: '/gate/customer-return',
  completeStatus: 'PENDING_QC',
  completeLabel: 'Complete Return In',
  successMessage: 'Customer return gate-in completed',
  missingMessage: 'Customer return details not found',
} as const;

function getRawString(entry: CustomerFlowEntry, key: string) {
  const value = entry.values[key];
  return typeof value === 'string' ? value : '';
}

function parseFileNames(value?: CustomerFlowValue) {
  if (typeof value !== 'string' || !value.trim()) return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }

  return [];
}

export default function CustomerSalesAttachmentsPage() {
  const config = ATTACHMENTS_CONFIG;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const entryId = searchParams.get('entryId') || '';
  const [entry, setEntry] = useState<CustomerFlowEntry | null>(() => (
    entryId ? findCustomerFlowEntry(config.storageKey, entryId) : null
  ));
  const [attachmentNotes, setAttachmentNotes] = useState(() => (
    entry ? getRawString(entry, 'attachmentNotes') : ''
  ));
  const [remarks, setRemarks] = useState(() => (entry ? getRawString(entry, 'remarks') : ''));
  const [fileNames, setFileNames] = useState<string[]>(() => (
    entry ? parseFileNames(entry.values.attachmentFileNames) : []
  ));
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentStep = 2;
  const totalSteps = 2;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setFileNames((current) => Array.from(new Set([
      ...current,
      ...files.map((file) => file.name),
    ])));
    setError(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (fileName: string) => {
    setFileNames((current) => current.filter((name) => name !== fileName));
  };

  const handleComplete = () => {
    if (!entry) {
      setError(config.missingMessage);
      return;
    }

    if (entry.status === 'CANCELLED') {
      setError('This entry is cancelled and cannot be completed');
      return;
    }

    const now = new Date().toISOString();
    const updatedEntry = updateCustomerFlowEntry(config.storageKey, entry.id, (current) => ({
      ...current,
      status: config.completeStatus,
      values: {
        ...current.values,
        attachmentFileNames: JSON.stringify(fileNames),
        attachmentNotes,
        remarks,
      },
      updatedAt: now,
    }));

    if (!updatedEntry) {
      setError('Failed to save attachments');
      return;
    }

    setEntry(updatedEntry);
    toast.success(config.successMessage);
    navigate(config.dashboardPath);
  };

  if (!entry) {
    return (
      <div className="space-y-6 pb-6">
        <StepHeader currentStep={currentStep} totalSteps={totalSteps} title={config.title} error={error} />
        <div className="flex items-center justify-between gap-4 rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-900">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">{config.missingMessage}</span>
          </div>
          <Button variant="outline" onClick={() => navigate(config.previousPath)}>
            Fill Details
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      <StepHeader currentStep={currentStep} totalSteps={totalSteps} title={config.title} error={error} />

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
            className="flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 text-center transition-colors hover:border-primary/50"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-10 w-10 text-muted-foreground" />
            <span className="text-sm font-medium">
              Click to add files
            </span>
            <span className="text-xs text-muted-foreground">
              Images, invoices, delivery notes, LR, e-way bill, and other documents
            </span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />

          {fileNames.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {fileNames.map((fileName) => (
                <div key={fileName} className="flex items-center gap-3 rounded-md border p-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium" title={fileName}>
                    {fileName}
                  </span>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveFile(fileName)}
                    aria-label={`Remove ${fileName}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              No files added yet. You can skip this page if there are no attachments.
            </p>
          )}
        </CardContent>
      </Card>

      <section className="space-y-4 border-t pt-6">
        <h3 className="flex items-center gap-2 text-xl font-semibold">
          <FileText className="h-5 w-5" />
          Remarks
        </h3>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="customer-return-attachment-notes">Attachment Notes</Label>
            <Textarea
              id="customer-return-attachment-notes"
              value={attachmentNotes}
              onChange={(event) => setAttachmentNotes(event.target.value)}
              placeholder="Document details, file references, or missing document notes"
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer-return-remarks">Remarks</Label>
            <Textarea
              id="customer-return-remarks"
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              placeholder="Optional notes"
              rows={4}
            />
          </div>
        </div>
      </section>

      <StepFooter
        onPrevious={() => navigate(`${config.previousPath}?entryId=${encodeURIComponent(entry.id)}`)}
        onCancel={() => navigate(config.dashboardPath)}
        onNext={handleComplete}
        nextLabel={config.completeLabel}
      />
    </div>
  );
}
