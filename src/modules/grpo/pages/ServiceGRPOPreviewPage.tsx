import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  Paperclip,
  RefreshCw,
  ShieldX,
  Truck,
  X,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import type { ApiError } from '@/core/api/types';
import type { Vendor } from '@/modules/gate/api/po/po.api';
import { VendorSelect } from '@/modules/gate/components';
import { SearchableSelect } from '@/shared/components';
import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  NativeSelect,
  SelectOption,
  Textarea,
} from '@/shared/components/ui';

import { usePostServiceGRPO, useServiceGRPOOptions, useServiceGRPOPreview } from '../api';
import { ExtraChargesSection } from '../components';
import { DEFAULT_BRANCH_ID, GRPO_STATUS } from '../constants';
import type {
  ExtraCharge,
  PostServiceGRPOResponse,
  ServiceGRPOBranchOption,
  ServiceGRPOGLAccountOption,
  ServiceGRPOLocationOption,
  ServiceGRPOProjectOption,
  ServiceGRPOSACCodeOption,
  ServiceGRPOTaxCodeOption,
} from '../types';

interface ServiceFormState {
  vendorCode: string;
  branchId: number;
  serviceDescription: string;
  amount: number;
  unitPrice: number;
  taxCode: string;
  glAccount: string;
  placeOfSupply: string;
  effectiveMonth: string;
  budgetDeliveryPoint: string;
  locationCode: number | null;
  locationName: string;
  sacEntry: number | null;
  sacCode: string;
  productVariety: string;
  totalLitres: number | null;
  invoiceNumber: string;
  ewayBill: string;
  invoiceWeight: number | null;
  invoiceAmount: number | null;
  vendorRef: string;
  comments: string;
  extraCharges: ExtraCharge[];
  attachments: File[];
  docDate: string;
  docDueDate: string;
  taxDate: string;
  shouldRoundoff: boolean;
}

interface ServiceFormDraft {
  planId: number;
  value: ServiceFormState;
}

const today = () => new Date().toISOString().slice(0, 10);

const FALLBACK_BRANCH_OPTIONS: ServiceGRPOBranchOption[] = [1, 2, 3, 4, 5].map((id) => ({
  branch_id: id,
  branch_name: `Branch ${id}`,
}));

const FALLBACK_TAX_CODE_OPTIONS: ServiceGRPOTaxCodeOption[] = [
  { tax_code: 'GST0', tax_name: 'GST 0%', rate: 0 },
  { tax_code: 'GST5', tax_name: 'GST 5%', rate: 5 },
  { tax_code: 'GST12', tax_name: 'GST 12%', rate: 12 },
  { tax_code: 'GST18', tax_name: 'GST 18%', rate: 18 },
  { tax_code: 'IGST5', tax_name: 'IGST 5%', rate: 5 },
  { tax_code: 'IGST12', tax_name: 'IGST 12%', rate: 12 },
  { tax_code: 'IGST18', tax_name: 'IGST 18%', rate: 18 },
];

const parseAmount = (value?: string | number | null) => {
  const amount = typeof value === 'number' ? value : parseFloat(value || '0');
  return Number.isFinite(amount) ? amount : 0;
};

const parseNullableAmount = (value?: string | number | null) => {
  if (value === null || value === undefined || value === '') return null;
  const amount = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(amount) ? amount : null;
};

const monthInputValue = (dateStr?: string | null) => (dateStr ? dateStr.slice(0, 7) : '');

const monthPayloadValue = (month: string) => (month ? month : null);

const formatCurrency = (amount: number) =>
  amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

const parseTaxPercent = (taxCode?: string | null): number => {
  if (!taxCode) return 0;
  const match = taxCode.match(/@(\d+(?:\.\d+)?)$/);
  return match ? parseFloat(match[1]) : 0;
};

const findDefaultTaxCode = (options: ServiceGRPOTaxCodeOption[]) => {
  const exact = options.find((tax) => tax.tax_code.toUpperCase() === 'GST05R');
  if (exact) return exact.tax_code;
  return options.find((tax) => /gst\s*0?5r/i.test(`${tax.tax_code} ${tax.tax_name}`))?.tax_code || '';
};

const findDefaultSac = (
  options: ServiceGRPOSACCodeOption[],
  productVariety: string,
  defaultEntry?: number | null,
  defaultCode?: string,
) => {
  const byEntry = options.find((sac) => sac.sac_entry === defaultEntry);
  if (byEntry) return byEntry;

  const byCode = options.find((sac) => sac.sac_code === defaultCode);
  if (byCode) return byCode;

  const preferredCodes = productVariety.toLowerCase().includes('beverage')
    ? ['996812']
    : ['9967', '9965'];
  return options.find((sac) => preferredCodes.some((code) => sac.sac_code.startsWith(code))) || null;
};

const findDefaultLocation = (
  options: ServiceGRPOLocationOption[],
  defaultCode?: number | null,
  defaultName?: string,
) => {
  const byCode = options.find((location) => location.location_code === defaultCode);
  if (byCode) return byCode;

  const normalizedDefault = (defaultName || '').toLowerCase();
  const byName = normalizedDefault
    ? options.find((location) => location.location_name.toLowerCase() === normalizedDefault)
    : null;
  if (byName) return byName;

  return (
    options.find((location) => /haryana|hr/i.test(`${location.location_name} ${location.state}`)) ||
    null
  );
};

export default function ServiceGRPOPreviewPage() {
  const navigate = useNavigate();
  const { dispatchPlanId } = useParams<{ dispatchPlanId: string }>();
  const planId = dispatchPlanId ? parseInt(dispatchPlanId, 10) : null;

  const { data: preview, isLoading, error, refetch } = useServiceGRPOPreview(planId);
  const {
    data: serviceOptions,
    isLoading: isOptionsLoading,
    isError: isOptionsError,
  } = useServiceGRPOOptions(true);
  const postServiceGRPO = usePostServiceGRPO();

  const [formDraft, setFormDraft] = useState<ServiceFormDraft | null>(null);
  const [apiErrors, setApiErrors] = useState<Record<string, string>>({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [successResult, setSuccessResult] = useState<PostServiceGRPOResponse | null>(null);

  const apiError = error as ApiError | null;
  const isPermissionError = apiError?.status === 403;

  const branchOptions =
    serviceOptions?.branches && serviceOptions.branches.length > 0
      ? serviceOptions.branches
      : FALLBACK_BRANCH_OPTIONS;
  const taxCodeOptions =
    serviceOptions?.tax_codes && serviceOptions.tax_codes.length > 0
      ? serviceOptions.tax_codes
      : FALLBACK_TAX_CODE_OPTIONS;
  const glAccountOptions = serviceOptions?.gl_accounts ?? [];
  const sacOptions = serviceOptions?.sac_codes ?? [];
  const locationOptions = serviceOptions?.locations ?? [];
  const projectOptions = serviceOptions?.projects ?? [];

  const defaultForm = useMemo<ServiceFormState | null>(() => {
    if (!preview) return null;
    const date = preview.dispatch_date || today();
    const productVariety = preview.default_product_variety || '';
    const defaultSac = findDefaultSac(
      sacOptions,
      productVariety,
      preview.default_sac_entry,
      preview.default_sac_code,
    );
    const defaultLocation = findDefaultLocation(
      locationOptions,
      preview.default_location_code,
      preview.default_location_name,
    );
    const amount = parseAmount(preview.default_amount);
    return {
      vendorCode: '',
      branchId: DEFAULT_BRANCH_ID,
      serviceDescription: preview.default_service_description,
      amount,
      unitPrice: amount,
      taxCode: findDefaultTaxCode(taxCodeOptions),
      glAccount: '',
      placeOfSupply: preview.default_place_of_supply || 'HR',
      effectiveMonth: monthInputValue(preview.default_effective_month),
      budgetDeliveryPoint: preview.default_budget_delivery_point || '',
      locationCode: defaultLocation?.location_code ?? null,
      locationName: defaultLocation?.location_name || preview.default_location_name || '',
      sacEntry: defaultSac?.sac_entry ?? preview.default_sac_entry ?? null,
      sacCode: defaultSac?.sac_code || preview.default_sac_code || '',
      productVariety,
      totalLitres: parseNullableAmount(preview.default_total_litres),
      invoiceNumber: preview.invoice_number || preview.sap_invoice_doc_num || '',
      ewayBill: preview.eway_bill || '',
      invoiceWeight: parseNullableAmount(preview.invoice_weight),
      invoiceAmount: parseNullableAmount(preview.invoice_amount),
      vendorRef: preview.bilty_no || preview.sap_invoice_doc_num || '',
      comments: '',
      extraCharges: [],
      attachments: [],
      docDate: date,
      docDueDate: date,
      taxDate: date,
      shouldRoundoff: true,
    };
  }, [locationOptions, preview, sacOptions, taxCodeOptions]);

  const currentPlanId = preview?.dispatch_plan_id ?? null;
  const form =
    formDraft && formDraft.planId === currentPlanId ? formDraft.value : defaultForm;

  const updateCurrentForm = useCallback(
    (updater: (current: ServiceFormState) => ServiceFormState) => {
      setFormDraft((prev) => {
        if (!currentPlanId || !defaultForm) return prev;
        const base = prev?.planId === currentPlanId ? prev.value : defaultForm;
        return {
          planId: currentPlanId,
          value: updater(base),
        };
      });
    },
    [currentPlanId, defaultForm],
  );

  const updateFormField = useCallback(
    <K extends keyof ServiceFormState>(field: K, value: ServiceFormState[K]) => {
      updateCurrentForm((current) => ({ ...current, [field]: value }));
      setApiErrors((prev) => {
        if (!prev[field]) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      });
    },
    [updateCurrentForm],
  );

  const updateSac = (sac: ServiceGRPOSACCodeOption | null) => {
    updateCurrentForm((current) => ({
      ...current,
      sacEntry: sac?.sac_entry ?? null,
      sacCode: sac?.sac_code || '',
    }));
    setApiErrors((prev) => {
      if (!prev.sacEntry) return prev;
      const next = { ...prev };
      delete next.sacEntry;
      return next;
    });
  };

  const updateLocation = (location: ServiceGRPOLocationOption | null) => {
    updateCurrentForm((current) => ({
      ...current,
      locationCode: location?.location_code ?? null,
      locationName: location?.location_name || '',
    }));
    setApiErrors((prev) => {
      if (!prev.locationCode) return prev;
      const next = { ...prev };
      delete next.locationCode;
      return next;
    });
  };

  const updateProject = (project: ServiceGRPOProjectOption | null) => {
    updateFormField('budgetDeliveryPoint', project?.project_code || '');
  };

  const addAttachments = (files: FileList) => {
    updateCurrentForm((current) => ({
      ...current,
      attachments: [...current.attachments, ...Array.from(files)],
    }));
    setApiErrors((prev) => {
      if (!prev.attachments) return prev;
      const next = { ...prev };
      delete next.attachments;
      return next;
    });
  };

  const removeAttachment = (index: number) => {
    updateCurrentForm((current) => ({
      ...current,
      attachments: current.attachments.filter((_, fileIndex) => fileIndex !== index),
    }));
  };

  const calcTotal = useCallback(() => {
    if (!form) return 0;
    const lineTax = (form.amount * parseTaxPercent(form.taxCode)) / 100;
    const chargesTotal = form.extraCharges.reduce((sum, charge) => {
      const amount = charge.amount || 0;
      return sum + amount + (amount * parseTaxPercent(charge.tax_code)) / 100;
    }, 0);
    return form.amount + lineTax + chargesTotal;
  }, [form]);

  const validatePost = () => {
    if (!form || !preview) return false;
    const errors: Record<string, string> = {};

    if (!preview.is_ready_for_grpo) {
      errors.general = 'This dispatch plan is not ready for Service GRPO posting.';
    }
    if (!form.vendorCode.trim()) {
      errors.vendorCode = 'SAP vendor code is required';
    }
    if (!form.branchId) {
      errors.branchId = 'Branch ID is required';
    }
    if (!form.serviceDescription.trim()) {
      errors.serviceDescription = 'Service description is required';
    }
    if (form.amount <= 0) {
      errors.amount = 'Amount must be greater than zero';
    }
    if (!form.glAccount.trim()) {
      errors.glAccount = 'G/L account is required for service GRPO';
    }
    if (!form.placeOfSupply.trim()) {
      errors.placeOfSupply = 'Place of supply is required';
    }
    if (!form.effectiveMonth) {
      errors.effectiveMonth = 'Effective month is required';
    }
    if (!form.locationCode) {
      errors.locationCode = 'Location is required';
    }
    if (!form.sacEntry) {
      errors.sacEntry = 'SAC is required';
    }
    if (!form.productVariety.trim()) {
      errors.productVariety = 'Variety is required';
    }
    if (!form.vendorRef.trim()) {
      errors.vendorRef = 'Vendor reference is required';
    }
    if (form.attachments.length === 0) {
      errors.attachments = 'At least one attachment is required';
    }

    setApiErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePostClick = () => {
    if (validatePost()) {
      setShowConfirm(true);
    }
  };

  const handleConfirmPost = async () => {
    if (!form || !preview) return;

    try {
      setApiErrors({});
      const result = await postServiceGRPO.mutateAsync({
        dispatch_plan_id: preview.dispatch_plan_id,
        vendor_code: form.vendorCode,
        branch_id: form.branchId,
        service_description: form.serviceDescription,
        amount: form.amount,
        unit_price: form.unitPrice || form.amount,
        tax_code: form.taxCode || undefined,
        gl_account: form.glAccount || undefined,
        place_of_supply: form.placeOfSupply || undefined,
        effective_month: monthPayloadValue(form.effectiveMonth),
        budget_delivery_point: form.budgetDeliveryPoint || undefined,
        location_code: form.locationCode,
        location_name: form.locationName || undefined,
        sac_entry: form.sacEntry,
        sac_code: form.sacCode || undefined,
        product_variety: form.productVariety || undefined,
        total_litres: form.totalLitres,
        invoice_number: form.invoiceNumber || undefined,
        eway_bill: form.ewayBill || undefined,
        invoice_weight: form.invoiceWeight,
        invoice_amount: form.invoiceAmount,
        comments: form.comments || undefined,
        vendor_ref: form.vendorRef || undefined,
        extra_charges: form.extraCharges.length > 0 ? form.extraCharges : undefined,
        attachments: form.attachments.length > 0 ? form.attachments : undefined,
        doc_date: form.docDate || undefined,
        doc_due_date: form.docDueDate || undefined,
        tax_date: form.taxDate || undefined,
        should_roundoff: form.shouldRoundoff || undefined,
      });
      setShowConfirm(false);
      setSuccessResult(result);
    } catch (err) {
      setShowConfirm(false);
      const postError = err as ApiError;
      setApiErrors({ general: postError.message || 'Failed to post Service GRPO' });
    }
  };

  const billNo = preview?.sap_invoice_doc_num || preview?.sap_invoice_doc_entry || '';
  const estimatedTotal = calcTotal();

  return (
    <div className="space-y-6 pb-32">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => navigate('/dispatch/bilty-grpo/pending')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-3xl font-bold tracking-tight">
              {billNo || 'Service GRPO Preview'}
            </h2>
          </div>
          <p className="text-muted-foreground">
            Review transport booking details and post the service GRPO to SAP
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="w-full sm:w-auto">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {isPermissionError && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-destructive/50 bg-destructive/5">
          <ShieldX className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-destructive">Permission Denied</p>
            <p className="text-sm text-muted-foreground mt-1">
              {apiError?.message || 'You do not have permission to preview Service GRPO.'}
            </p>
          </div>
        </div>
      )}

      {error && !isPermissionError && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/10">
          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-yellow-800 dark:text-yellow-400">Failed to Load</p>
            <p className="text-sm text-muted-foreground mt-1">
              {apiError?.message || 'An error occurred while loading preview data.'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      )}

      {apiErrors.general && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-destructive/50 bg-destructive/5">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{apiErrors.general}</p>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center h-48">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {!isLoading && !error && preview && (
        <>
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">Booking Status</p>
                  <p className="text-sm font-medium">{preview.booking_status}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Vehicle</p>
                  <p className="text-sm font-medium">{preview.vehicle_no || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Transporter</p>
                  <p className="text-sm font-medium">{preview.transporter_name || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Driver</p>
                  <p className="text-sm font-medium">{preview.driver_name || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Dispatch Date</p>
                  <p className="text-sm font-medium">{formatDate(preview.dispatch_date)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Bilty</p>
                  <p className="text-sm font-medium">{preview.bilty_no || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Bilty Date</p>
                  <p className="text-sm font-medium">{formatDate(preview.bilty_date)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Booked Freight</p>
                  <p className="text-sm font-medium">
                    {formatCurrency(parseAmount(preview.total_freight || preview.freight))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {preview.grpo_status === GRPO_STATUS.POSTED && (
            <div className="flex items-start gap-3 p-4 rounded-lg border border-green-500/50 bg-green-50 dark:bg-green-900/10">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-green-800 dark:text-green-400">
                  Service GRPO already posted
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  SAP Document Number: {preview.sap_doc_num}
                </p>
              </div>
            </div>
          )}

          {form && (
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Service GRPO Posting</h3>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <VendorSelect
                    value={form.vendorCode}
                    label="SAP Vendor"
                    required
                    placeholder="Search transporter / vendor"
                    error={apiErrors.vendorCode}
                    onChange={(vendor: Vendor | null) =>
                      updateFormField('vendorCode', vendor?.vendor_code || '')
                    }
                  />
                  <div className="space-y-1">
                    <Label className="text-xs">
                      Branch ID <span className="text-destructive">*</span>
                    </Label>
                    <NativeSelect
                      value={form.branchId ? String(form.branchId) : ''}
                      onChange={(e) =>
                        updateFormField('branchId', parseInt(e.target.value, 10) || 0)
                      }
                      placeholder="Select branch"
                      className={`h-8 text-sm${apiErrors.branchId ? ' border-destructive' : ''}`}
                    >
                      {branchOptions.map((branch) => (
                        <SelectOption key={branch.branch_id} value={String(branch.branch_id)}>
                          {branch.branch_name} ({branch.branch_id})
                        </SelectOption>
                      ))}
                    </NativeSelect>
                    {apiErrors.branchId && (
                      <p className="text-xs text-destructive">{apiErrors.branchId}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">
                      Vendor Reference <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={form.vendorRef}
                      onChange={(e) => updateFormField('vendorRef', e.target.value)}
                      placeholder="Bilty / transporter bill number"
                      className={`h-8 text-sm${apiErrors.vendorRef ? ' border-destructive' : ''}`}
                    />
                    {apiErrors.vendorRef && (
                      <p className="text-xs text-destructive">{apiErrors.vendorRef}</p>
                    )}
                  </div>
                  <div className="space-y-1 lg:col-span-2">
                    <Label className="text-xs">
                      Service Description <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={form.serviceDescription}
                      onChange={(e) => updateFormField('serviceDescription', e.target.value)}
                      className={`h-8 text-sm${
                        apiErrors.serviceDescription ? ' border-destructive' : ''
                      }`}
                    />
                    {apiErrors.serviceDescription && (
                      <p className="text-xs text-destructive">{apiErrors.serviceDescription}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">
                      Amount <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      value={form.amount || ''}
                      onChange={(e) =>
                        updateFormField('amount', parseFloat(e.target.value) || 0)
                      }
                      className={`h-8 text-sm${apiErrors.amount ? ' border-destructive' : ''}`}
                    />
                    {apiErrors.amount && (
                      <p className="text-xs text-destructive">{apiErrors.amount}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Unit Price</Label>
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      value={form.unitPrice || ''}
                      onChange={(e) =>
                        updateFormField('unitPrice', parseFloat(e.target.value) || 0)
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                  <SearchableSelect<ServiceGRPOTaxCodeOption>
                    value={form.taxCode}
                    items={taxCodeOptions}
                    isLoading={isOptionsLoading && !serviceOptions?.tax_codes?.length}
                    isError={isOptionsError && taxCodeOptions.length === 0}
                    label="Tax Code"
                    placeholder="Select tax code"
                    inputId="service-grpo-tax-code"
                    inputClassName="h-8 text-sm"
                    getItemKey={(tax) => tax.tax_code}
                    getItemLabel={(tax) => `${tax.tax_name} (${tax.tax_code})`}
                    filterFn={(tax, search) =>
                      tax.tax_code.toLowerCase().includes(search.toLowerCase()) ||
                      tax.tax_name.toLowerCase().includes(search.toLowerCase())
                    }
                    renderItem={(tax) => (
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{tax.tax_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {tax.tax_code}
                          {tax.rate != null ? ` - ${tax.rate}%` : ''}
                        </span>
                      </div>
                    )}
                    loadingText="Loading tax codes..."
                    emptyText="No tax codes available"
                    notFoundText="No tax codes found"
                    onItemSelect={(tax) => updateFormField('taxCode', tax.tax_code)}
                    onClear={() => updateFormField('taxCode', '')}
                  />
                  <SearchableSelect<ServiceGRPOSACCodeOption>
                    value={form.sacEntry ? String(form.sacEntry) : ''}
                    items={sacOptions}
                    isLoading={isOptionsLoading}
                    isError={isOptionsError && sacOptions.length === 0}
                    error={apiErrors.sacEntry}
                    label="SAC"
                    required
                    placeholder="Search SAC"
                    inputId="service-grpo-sac"
                    inputClassName="h-8 text-sm"
                    getItemKey={(sac) => sac.sac_entry}
                    getItemLabel={(sac) => `${sac.sac_code} - ${sac.sac_name}`}
                    filterFn={(sac, search) =>
                      sac.sac_code.toLowerCase().includes(search.toLowerCase()) ||
                      sac.sac_name.toLowerCase().includes(search.toLowerCase())
                    }
                    renderItem={(sac) => (
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{sac.sac_code}</span>
                        <span className="text-xs text-muted-foreground">{sac.sac_name}</span>
                      </div>
                    )}
                    loadingText="Loading SAC codes..."
                    emptyText="No SAC codes available"
                    notFoundText="No SAC codes found"
                    onItemSelect={updateSac}
                    onClear={() => updateSac(null)}
                  />
                  <SearchableSelect<ServiceGRPOGLAccountOption>
                    value={form.glAccount}
                    items={glAccountOptions}
                    isLoading={isOptionsLoading}
                    isError={isOptionsError && glAccountOptions.length === 0}
                    error={apiErrors.glAccount}
                    label="G/L Account"
                    required
                    placeholder="Search expense account"
                    inputId="service-grpo-gl-account"
                    inputClassName="h-8 text-sm"
                    getItemKey={(account) => account.account_code}
                    getItemLabel={(account) =>
                      `${account.account_name} (${account.account_code})`
                    }
                    filterFn={(account, search) =>
                      account.account_code.toLowerCase().includes(search.toLowerCase()) ||
                      account.account_name.toLowerCase().includes(search.toLowerCase())
                    }
                    renderItem={(account) => (
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{account.account_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {account.account_code}
                        </span>
                      </div>
                    )}
                    loadingText="Loading G/L accounts..."
                    emptyText="No G/L accounts available"
                    notFoundText="No G/L accounts found"
                    onItemSelect={(account) =>
                      updateFormField('glAccount', account.account_code)
                    }
                    onClear={() => updateFormField('glAccount', '')}
                  />
                  <SearchableSelect<ServiceGRPOLocationOption>
                    value={form.locationCode ? String(form.locationCode) : ''}
                    items={locationOptions}
                    isLoading={isOptionsLoading}
                    isError={isOptionsError && locationOptions.length === 0}
                    error={apiErrors.locationCode}
                    label="Location"
                    required
                    placeholder="Select location"
                    inputId="service-grpo-location"
                    inputClassName="h-8 text-sm"
                    getItemKey={(location) => location.location_code}
                    getItemLabel={(location) =>
                      `${location.location_name}${location.state ? ` (${location.state})` : ''}`
                    }
                    filterFn={(location, search) =>
                      `${location.location_name} ${location.state}`
                        .toLowerCase()
                        .includes(search.toLowerCase())
                    }
                    loadingText="Loading locations..."
                    emptyText="No locations available"
                    notFoundText="No locations found"
                    onItemSelect={updateLocation}
                    onClear={() => updateLocation(null)}
                  />
                  <SearchableSelect<ServiceGRPOProjectOption>
                    value={form.budgetDeliveryPoint}
                    items={projectOptions}
                    isLoading={isOptionsLoading}
                    isError={isOptionsError && projectOptions.length === 0}
                    label="Budget / Delivery Point"
                    placeholder="Select budget/project"
                    inputId="service-grpo-project"
                    inputClassName="h-8 text-sm"
                    getItemKey={(project) => project.project_code}
                    getItemLabel={(project) =>
                      `${project.project_code} - ${project.project_name}`
                    }
                    filterFn={(project, search) =>
                      `${project.project_code} ${project.project_name}`
                        .toLowerCase()
                        .includes(search.toLowerCase())
                    }
                    loadingText="Loading projects..."
                    emptyText="No projects available"
                    notFoundText="No projects found"
                    onItemSelect={updateProject}
                    onClear={() => updateProject(null)}
                  />
                  <div className="space-y-1">
                    <Label className="text-xs">
                      Place of Supply <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={form.placeOfSupply}
                      onChange={(e) => updateFormField('placeOfSupply', e.target.value)}
                      className={`h-8 text-sm${
                        apiErrors.placeOfSupply ? ' border-destructive' : ''
                      }`}
                    />
                    {apiErrors.placeOfSupply && (
                      <p className="text-xs text-destructive">{apiErrors.placeOfSupply}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">
                      Effective Month <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="month"
                      value={form.effectiveMonth}
                      onChange={(e) => updateFormField('effectiveMonth', e.target.value)}
                      className={`h-8 text-sm${
                        apiErrors.effectiveMonth ? ' border-destructive' : ''
                      }`}
                    />
                    {apiErrors.effectiveMonth && (
                      <p className="text-xs text-destructive">{apiErrors.effectiveMonth}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">
                      Variety <span className="text-destructive">*</span>
                    </Label>
                    <NativeSelect
                      value={form.productVariety}
                      onChange={(e) => updateFormField('productVariety', e.target.value)}
                      placeholder="Select variety"
                      className={`h-8 text-sm${
                        apiErrors.productVariety ? ' border-destructive' : ''
                      }`}
                    >
                      <SelectOption value="Oil">Oil</SelectOption>
                      <SelectOption value="Beverage">Beverage</SelectOption>
                    </NativeSelect>
                    {apiErrors.productVariety && (
                      <p className="text-xs text-destructive">{apiErrors.productVariety}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Total Litre</Label>
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      value={form.totalLitres ?? ''}
                      onChange={(e) =>
                        updateFormField('totalLitres', parseNullableAmount(e.target.value))
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Invoice Number</Label>
                    <Input
                      value={form.invoiceNumber}
                      onChange={(e) => updateFormField('invoiceNumber', e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">E-way Bill</Label>
                    <Input
                      value={form.ewayBill}
                      onChange={(e) => updateFormField('ewayBill', e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Invoice Weight (Charged Kgs)</Label>
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      value={form.invoiceWeight ?? ''}
                      onChange={(e) =>
                        updateFormField('invoiceWeight', parseNullableAmount(e.target.value))
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Invoice Amount</Label>
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      value={form.invoiceAmount ?? ''}
                      onChange={(e) =>
                        updateFormField('invoiceAmount', parseNullableAmount(e.target.value))
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Posting Date</Label>
                    <Input
                      type="date"
                      value={form.docDate}
                      onChange={(e) => updateFormField('docDate', e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Due Date</Label>
                    <Input
                      type="date"
                      value={form.docDueDate}
                      onChange={(e) => updateFormField('docDueDate', e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tax Date</Label>
                    <Input
                      type="date"
                      value={form.taxDate}
                      onChange={(e) => updateFormField('taxDate', e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Comments</Label>
                  <Textarea
                    value={form.comments}
                    onChange={(e) => updateFormField('comments', e.target.value)}
                    placeholder="Optional remarks"
                    className="min-h-20 text-sm"
                  />
                </div>

                <div className="border-t pt-4">
                  <ExtraChargesSection
                    charges={form.extraCharges}
                    onChange={(charges) => updateFormField('extraCharges', charges)}
                  />
                </div>

                <div className="border-t pt-4 space-y-2">
                  <Label className="text-sm font-medium">
                    Attachments <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.multiple = true;
                        input.accept = '.pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx';
                        input.onchange = (event) => {
                          const files = (event.target as HTMLInputElement).files;
                          if (files && files.length > 0) {
                            addAttachments(files);
                          }
                        };
                        input.click();
                      }}
                    >
                      <Paperclip className="h-3.5 w-3.5" />
                      Choose Files
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      PDF, PNG, JPG, DOC, XLS accepted
                    </span>
                  </div>
                  {form.attachments.length > 0 && (
                    <div className="space-y-1">
                      {form.attachments.map((file, index) => (
                        <div
                          key={`${file.name}-${index}`}
                          className="flex items-center gap-2 text-sm p-1.5 rounded bg-muted/40 border"
                        >
                          <Paperclip className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="truncate flex-1">{file.name}</span>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {(file.size / 1024).toFixed(0)} KB
                          </span>
                          <button
                            type="button"
                            className="p-0.5 hover:bg-muted rounded"
                            onClick={() => removeAttachment(index)}
                          >
                            <X className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {apiErrors.attachments && (
                    <p className="text-xs text-destructive">{apiErrors.attachments}</p>
                  )}
                </div>

                <div className="border-t pt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      id="roundoff-service"
                      type="checkbox"
                      checked={form.shouldRoundoff}
                      onChange={(e) => updateFormField('shouldRoundoff', e.target.checked)}
                      className="h-4 w-4 rounded border-input accent-primary"
                    />
                    <Label htmlFor="roundoff-service" className="text-sm cursor-pointer">
                      Auto Round Off
                    </Label>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Estimated Total</p>
                      <p className="text-sm font-semibold">{formatCurrency(estimatedTotal)}</p>
                    </div>
                    <Button onClick={handlePostClick} disabled={postServiceGRPO.isPending}>
                      {postServiceGRPO.isPending ? 'Posting...' : 'Post Service GRPO'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Dialog open={showConfirm} onOpenChange={() => setShowConfirm(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Service GRPO Posting</DialogTitle>
            <DialogDescription>Review the details below before posting to SAP.</DialogDescription>
          </DialogHeader>
          {form && preview && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Dispatch Bill</span>
                <span className="font-medium">{billNo}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Vendor Code</span>
                <span className="font-medium">{form.vendorCode}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Service</span>
                <span className="font-medium text-right">{form.serviceDescription}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-medium">{formatCurrency(form.amount)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">G/L Account</span>
                <span className="font-medium">{form.glAccount}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">SAC</span>
                <span className="font-medium">{form.sacCode || '-'}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Location</span>
                <span className="font-medium">{form.locationName || '-'}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Place of Supply</span>
                <span className="font-medium">{form.placeOfSupply || '-'}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Attachments</span>
                <span className="font-medium">{form.attachments.length} file(s)</span>
              </div>
              <div className="border-t pt-3 flex justify-between gap-4">
                <span className="font-semibold">Estimated Total</span>
                <span className="font-semibold">{formatCurrency(estimatedTotal)}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmPost} disabled={postServiceGRPO.isPending}>
              {postServiceGRPO.isPending ? 'Posting...' : 'Confirm Post'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!successResult} onOpenChange={() => setSuccessResult(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Success
            </DialogTitle>
            <DialogDescription>Service GRPO posted successfully to SAP.</DialogDescription>
          </DialogHeader>
          {successResult && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">SAP Document Number</span>
                <span className="font-semibold">{successResult.sap_doc_num}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">SAP DocEntry</span>
                <span className="font-semibold">{successResult.sap_doc_entry}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Value</span>
                <span className="font-semibold">
                  {formatCurrency(successResult.sap_doc_total || 0)}
                </span>
              </div>
              {successResult.attachments && successResult.attachments.length > 0 && (
                <div className="border-t pt-2 flex items-center gap-2 text-green-600">
                  <FileText className="h-3.5 w-3.5" />
                  <span>{successResult.attachments.length} attachment(s) linked</span>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setSuccessResult(null);
                navigate('/dispatch/bilty-grpo/history');
              }}
            >
              View History
            </Button>
            <Button
              className="w-full"
              onClick={() => {
                setSuccessResult(null);
                refetch();
              }}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
