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
  type CustomerFlowStatus,
  type CustomerFlowValue,
  findCustomerFlowEntry,
  SALES_DISPATCH_KEY,
  updateCustomerFlowEntry,
} from './customerSalesFlow.storage';

type CustomerSalesAttachmentFlow = 'dispatch' | 'return';

interface CustomerSalesAttachmentsPageProps {
  flow: CustomerSalesAttachmentFlow;
}

interface AttachmentFlowConfig {
  storageKey: string;
  title: string;
  previousPath: string;
  dashboardPath: string;
  completeStatus: CustomerFlowStatus;
  completeLabel: string;
  successMessage: string;
  missingMessage: string;
}

const FLOW_CONFIG: Record<CustomerSalesAttachmentFlow, AttachmentFlowConfig> = {
  dispatch: {
    storageKey: SALES_DISPATCH_KEY,
    title: 'Sales Dispatch Out',
    previousPath: '/dispatch/docking/new/barcode-scan',
    dashboardPath: '/dispatch/docking',
    completeStatus: 'COMPLETED',
    completeLabel: 'Complete Dispatch',
    successMessage: 'Sales dispatch gate-out completed',
    missingMessage: 'Sales dispatch details not found',
  },
  return: {
    storageKey: CUSTOMER_RETURN_KEY,
    title: 'Goods Return',
    previousPath: '/gate/customer-return/new',
    dashboardPath: '/gate/customer-return',
    completeStatus: 'PENDING_QC',
    completeLabel: 'Complete Goods Return',
    successMessage: 'Goods return gate-in completed',
    missingMessage: 'Goods return details not found',
  },
};

function getRawString(entry: CustomerFlowEntry, key: string) {
  const value = entry.values[key];
  return typeof value === 'string' ? value : '';
}

function parseFileNames(value?: CustomerFlowValue) {
  if (typeof value !== 'string' || !value.trim()) return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed))
      return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

export default function CustomerSalesAttachmentsPage({ flow }: CustomerSalesAttachmentsPageProps) {
  const config = FLOW_CONFIG[flow];
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const entryId = searchParams.get('entryId') || '';
  const [entry, setEntry] = useState<CustomerFlowEntry | null>(() =>
    entryId ? findCustomerFlowEntry(config.storageKey, entryId) : null,
  );
  const [attachmentNotes, setAttachmentNotes] = useState(() =>
    entry ? getRawString(entry, 'attachmentNotes') : '',
  );
  const [remarks, setRemarks] = useState(() => (entry ? getRawString(entry, 'remarks') : ''));
  const [gatepassFileNames, setGatepassFileNames] = useState<string[]>(() =>
    entry ? parseFileNames(entry.values.attachmentFileNames) : [],
  );
  const [invoiceFileNames, setInvoiceFileNames] = useState<string[]>(() =>
    entry ? parseFileNames(entry.values.invoiceFileNames) : [],
  );
  const [deliveryNoteFileNames, setDeliveryNoteFileNames] = useState<string[]>(() =>
    entry ? parseFileNames(entry.values.deliveryNoteFileNames) : [],
  );
  const [error, setError] = useState<string | null>(null);
  const gatepassInputRef = useRef<HTMLInputElement>(null);
  const invoiceInputRef = useRef<HTMLInputElement>(null);
  const deliveryNoteInputRef = useRef<HTMLInputElement>(null);
  const currentStep = flow === 'dispatch' ? 3 : 2;
  const totalSteps = flow === 'dispatch' ? 3 : 2;
  const requiresGatepass = flow === 'dispatch';

  const handleFileSelect = (
    event: React.ChangeEvent<HTMLInputElement>,
    setFiles: React.Dispatch<React.SetStateAction<string[]>>,
    inputRef: React.RefObject<HTMLInputElement | null>,
  ) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setFiles((current) => Array.from(new Set([...current, ...files.map((file) => file.name)])));
    setError(null);

    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleRemoveFile = (
    fileName: string,
    setFiles: React.Dispatch<React.SetStateAction<string[]>>,
  ) => {
    setFiles((current) => current.filter((name) => name !== fileName));
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

    if (flow === 'dispatch') {
      if (gatepassFileNames.length === 0) {
        setError('Gatepass document upload is required before completing sales dispatch.');
        return;
      }

      if (invoiceFileNames.length === 0) {
        setError('Invoice bill upload is required before completing sales dispatch.');
        return;
      }

      if (deliveryNoteFileNames.length === 0) {
        setError('Delivery note upload is required before completing sales dispatch.');
        return;
      }
    }

    const now = new Date().toISOString();
    const updatedEntry = updateCustomerFlowEntry(config.storageKey, entry.id, (current) => ({
      ...current,
      status: config.completeStatus,
      values: {
        ...current.values,
        attachmentFileNames: JSON.stringify(gatepassFileNames),
        invoiceFileNames: JSON.stringify(invoiceFileNames),
        deliveryNoteFileNames: JSON.stringify(deliveryNoteFileNames),
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
        <StepHeader
          currentStep={currentStep}
          totalSteps={totalSteps}
          title={config.title}
          error={error}
        />
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
      <StepHeader
        currentStep={currentStep}
        totalSteps={totalSteps}
        title={config.title}
        error={error}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Paperclip className="h-5 w-5" />
            {requiresGatepass ? 'Required Dispatch Documents' : 'Attachments'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {requiresGatepass ? (
            <div className="grid gap-5 lg:grid-cols-3">
              <DocumentUploadPanel
                label="Gatepass Document"
                description="Gatepass scan, photo, or PDF"
                required
                inputRef={gatepassInputRef}
                fileNames={gatepassFileNames}
                onFileSelect={(event) =>
                  handleFileSelect(event, setGatepassFileNames, gatepassInputRef)
                }
                onRemoveFile={(fileName) => handleRemoveFile(fileName, setGatepassFileNames)}
              />
              <DocumentUploadPanel
                label="Invoice Bill"
                description="Tax invoice or invoice copy"
                required
                inputRef={invoiceInputRef}
                fileNames={invoiceFileNames}
                onFileSelect={(event) =>
                  handleFileSelect(event, setInvoiceFileNames, invoiceInputRef)
                }
                onRemoveFile={(fileName) => handleRemoveFile(fileName, setInvoiceFileNames)}
              />
              <DocumentUploadPanel
                label="Delivery Note"
                description="Delivery note or dispatch note"
                required
                inputRef={deliveryNoteInputRef}
                fileNames={deliveryNoteFileNames}
                onFileSelect={(event) =>
                  handleFileSelect(event, setDeliveryNoteFileNames, deliveryNoteInputRef)
                }
                onRemoveFile={(fileName) => handleRemoveFile(fileName, setDeliveryNoteFileNames)}
              />
            </div>
          ) : (
            <DocumentUploadPanel
              label="Attachments"
              description="Images, invoices, delivery notes, LR, e-way bill, and other documents"
              inputRef={gatepassInputRef}
              fileNames={gatepassFileNames}
              onFileSelect={(event) =>
                handleFileSelect(event, setGatepassFileNames, gatepassInputRef)
              }
              onRemoveFile={(fileName) => handleRemoveFile(fileName, setGatepassFileNames)}
            />
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
            <Label htmlFor={`${flow}-attachment-notes`}>Attachment Notes</Label>
            <Textarea
              id={`${flow}-attachment-notes`}
              value={attachmentNotes}
              onChange={(event) => setAttachmentNotes(event.target.value)}
              placeholder="Document details, file references, or missing document notes"
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${flow}-remarks`}>Remarks</Label>
            <Textarea
              id={`${flow}-remarks`}
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              placeholder="Optional notes"
              rows={4}
            />
          </div>
        </div>
      </section>

      <StepFooter
        onPrevious={() =>
          navigate(`${config.previousPath}?entryId=${encodeURIComponent(entry.id)}`)
        }
        onCancel={() => navigate(config.dashboardPath)}
        onNext={handleComplete}
        nextLabel={config.completeLabel}
      />
    </div>
  );
}

function DocumentUploadPanel({
  label,
  description,
  required = false,
  inputRef,
  fileNames,
  onFileSelect,
  onRemoveFile,
}: {
  label: string;
  description: string;
  required?: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  fileNames: string[];
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (fileName: string) => void;
}) {
  return (
    <div className="space-y-3">
      <button
        type="button"
        className="flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/25 p-6 text-center transition-colors hover:border-primary/50"
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="h-8 w-8 text-muted-foreground" />
        <span className="text-sm font-medium">
          {label} {required && <span className="text-destructive">*</span>}
        </span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </button>

      <input ref={inputRef} type="file" multiple className="hidden" onChange={onFileSelect} />

      {fileNames.length > 0 ? (
        <div className="space-y-2">
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
                onClick={() => onRemoveFile(fileName)}
                aria-label={`Remove ${fileName}`}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          {required ? `${label} is required before completion.` : 'No files added yet.'}
        </p>
      )}
    </div>
  );
}
