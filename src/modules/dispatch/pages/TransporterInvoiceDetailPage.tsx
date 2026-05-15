import { AlertCircle, ArrowLeft, FileText, RefreshCw } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import type { ApiError } from '@/core/api/types';
import { Badge, Button, Card, CardContent } from '@/shared/components/ui';

import { useTransporterInvoiceDetail } from '../api';
import type { TransporterAPInvoiceStatus } from '../types';

const statusClass = (status: TransporterAPInvoiceStatus) => {
  switch (status) {
    case 'POSTED':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    case 'FAILED':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
    case 'CANCELLED':
      return 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300';
    case 'PENDING':
    default:
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
  }
};

const formatCurrency = (value?: string | number | null) => {
  const amount = typeof value === 'number' ? value : parseFloat(value || '0');
  return (Number.isFinite(amount) ? amount : 0).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
  });
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
};

export default function TransporterInvoiceDetailPage() {
  const navigate = useNavigate();
  const { postingId } = useParams<{ postingId: string }>();
  const id = postingId ? parseInt(postingId, 10) : null;
  const { data: posting, isLoading, error, refetch } = useTransporterInvoiceDetail(id);
  const apiError = error as ApiError | null;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => navigate('/dispatch/transporter-invoices/history')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-3xl font-bold tracking-tight">
              {posting?.invoice_number || 'Transporter Invoice'}
            </h2>
          </div>
          <p className="text-muted-foreground">SAP A/P Invoice posting detail</p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {apiError && (
        <div className="flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{apiError.message || 'Failed to load transporter invoice detail.'}</span>
        </div>
      )}

      {isLoading && (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {!isLoading && posting && (
        <>
          <Card>
            <CardContent className="space-y-4 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={statusClass(posting.status)}>{posting.status}</Badge>
                {posting.sap_doc_num && (
                  <span className="text-sm text-muted-foreground">
                    SAP A/P Invoice #{posting.sap_doc_num}
                  </span>
                )}
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Fact label="Vendor" value={`${posting.vendor_name || '-'} (${posting.vendor_code})`} />
                <Fact label="Invoice Amount" value={formatCurrency(posting.invoice_amount)} />
                <Fact label="GRPO Total" value={formatCurrency(posting.selected_grpo_total)} />
                <Fact label="Difference" value={formatCurrency(posting.amount_difference)} />
                <Fact label="Branch" value={posting.branch_id} />
                <Fact label="Invoice Date" value={posting.invoice_date || '-'} />
                <Fact label="Posted At" value={formatDateTime(posting.posted_at)} />
                <Fact label="Created At" value={formatDateTime(posting.created_at)} />
              </div>
              {posting.error_message && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  {posting.error_message}
                </div>
              )}
              {posting.comments && (
                <div className="rounded-md border p-3 text-sm">
                  <p className="mb-1 font-medium">Comments</p>
                  <p className="text-muted-foreground">{posting.comments}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="border-b p-4">
                <h3 className="font-semibold">Bilty GRPO Lines</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px]">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="p-3 text-left text-sm font-medium">Bilty</th>
                      <th className="p-3 text-left text-sm font-medium">GRPO</th>
                      <th className="p-3 text-left text-sm font-medium">Description</th>
                      <th className="p-3 text-left text-sm font-medium">Tax</th>
                      <th className="p-3 text-right text-sm font-medium">Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {posting.lines.map((line) => (
                      <tr key={line.id} className="border-t">
                        <td className="p-3 text-sm">{line.bilty_no || '-'}</td>
                        <td className="p-3 text-sm">
                          {line.base_doc_num || line.base_entry} / {line.base_line}
                        </td>
                        <td className="p-3 text-sm">{line.service_description}</td>
                        <td className="p-3 text-sm">{line.tax_code || '-'}</td>
                        <td className="p-3 text-right text-sm font-medium">
                          {formatCurrency(line.line_total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-2 p-4">
              <h3 className="font-semibold">Attachments</h3>
              {posting.attachments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No attachments recorded.</p>
              ) : (
                posting.attachments.map((attachment) => (
                  <a
                    key={attachment.id}
                    href={attachment.file}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-md border p-3 text-sm hover:bg-muted/50"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{attachment.original_filename}</span>
                    </span>
                    <Badge variant="outline">{attachment.sap_attachment_status}</Badge>
                  </a>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-medium">{value}</p>
    </div>
  );
}
