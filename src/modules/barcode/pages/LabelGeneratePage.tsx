import { Plus, Printer, Settings2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'sonner';

import { useLineConfigs, useLines } from '@/modules/production/execution/api';
import { useWMSWarehouses } from '@/modules/warehouse/api';
import type { WarehouseOption } from '@/modules/warehouse/types';
import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import { SearchableSelect } from '@/shared/components/SearchableSelect';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Label as FormLabel,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui';

import {
  useAddBoxesToPallet,
  useGenerateBoxes,
  usePallets,
  usePrintBulk,
  useProductionReleaseOil,
} from '../api';
import type { BoxLabelData } from '../components/BoxLabel';
import BoxLabel from '../components/BoxLabel';
import { DEFAULT_THERMAL_PRINTER_NAME, getLabelPrintPageStyle } from '../components/labelPrint';
import type { PalletLabelData } from '../components/PalletLabel';
import PalletLabel from '../components/PalletLabel';
import PrinterProfileControls from '../components/PrinterProfileControls';
import ScanSearchButton from '../components/ScanSearchButton';
import { usePrinterProfile } from '../hooks/usePrinterProfile';
import type { Box, LabelData, Pallet, ProductionReleaseOilRow } from '../types';

const MAX_BOX_LABELS_PER_REQUEST = 5000;

const getProductionReleaseLabel = (release: ProductionReleaseOilRow) => {
  const docNumber = release.doc_num ?? release.doc_entry ?? '';
  return `${docNumber} - ${release.item_code} - ${release.item_name}`;
};

const toPositiveNumber = (value: string) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
};

const getReleaseLabelCount = (release: ProductionReleaseOilRow) => {
  const boxCount = toPositiveNumber(release.box_count);
  if (boxCount) return String(Math.ceil(boxCount));

  const plannedQty = toPositiveNumber(release.planned_qty);
  const boxSize = toPositiveNumber(release.box_size);
  if (plannedQty && boxSize) return String(Math.ceil(plannedQty / boxSize));

  return '';
};

const getReleaseQtyPerBox = (release: ProductionReleaseOilRow) => {
  const plannedQty = toPositiveNumber(release.planned_qty);
  const boxSize = toPositiveNumber(release.box_size);
  if (boxSize) return String(boxSize);
  if (plannedQty) return String(plannedQty);
  return '';
};

const formatApiError = (err: unknown, fallback = 'Failed to print labels') => {
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  if (data && typeof data === 'object') {
    const errorData = data as Record<string, unknown>;
    if (typeof errorData.error === 'string') return errorData.error;
    if (typeof errorData.detail === 'string') return errorData.detail;

    const fieldMessages = Object.entries(errorData)
      .map(([field, value]) => {
        const message = Array.isArray(value)
          ? value.join(', ')
          : typeof value === 'string'
            ? value
            : JSON.stringify(value);
        return `${field.replaceAll('_', ' ')}: ${message}`;
      })
      .filter(Boolean)
      .join(' | ');

    if (fieldMessages) return fieldMessages;
  }

  return (err as Error)?.message || fallback;
};

export default function LabelGeneratePage() {
  const generateMutation = useGenerateBoxes();
  const addBoxesMutation = useAddBoxesToPallet();
  const printBulkMutation = usePrintBulk();
  const [palletSearch, setPalletSearch] = useState('');
  const [releaseSearch, setReleaseSearch] = useState('');
  const [scannedPalletSearch, setScannedPalletSearch] = useState('');
  const [selectedPallet, setSelectedPallet] = useState<Pallet | null>(null);
  const [selectedRelease, setSelectedRelease] = useState<ProductionReleaseOilRow | null>(null);
  const [generatedBoxes, setGeneratedBoxes] = useState<Box[]>([]);
  const [labelDataList, setLabelDataList] = useState<LabelData[]>([]);
  const { printerName, printMode, setPrinterName, setPrintMode } = usePrinterProfile();
  const printRef = useRef<HTMLDivElement>(null);

  const { data: pallets = [], isLoading: loadingPallets } = usePallets(
    palletSearch.length >= 2 ? { search: palletSearch, status: 'ACTIVE' } : { status: 'ACTIVE' },
  );
  const emptyPallets = pallets.filter((pallet) => pallet.box_count === 0);
  const {
    data: productionReleaseRows = [],
    isLoading: isProductionReleaseLoading,
    isError: isProductionReleaseError,
  } = useProductionReleaseOil(releaseSearch);

  const { data: lines = [] } = useLines(true);
  const [selectedLineId, setSelectedLineId] = useState<number | null>(null);
  const { data: lineConfigs = [] } = useLineConfigs(selectedLineId ?? undefined);

  const { data: whData } = useWMSWarehouses();
  const warehouses: WarehouseOption[] = whData?.warehouses ?? [];

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Pallet and Item Labels 100x40mm',
    ignoreGlobalStyles: true,
    pageStyle: getLabelPrintPageStyle(printMode),
  });

  const [form, setForm] = useState({
    item_code: '',
    item_name: '',
    batch_number: '',
    qty: '',
    box_count: '',
    uom: 'PCS',
    mfg_date: '',
    exp_date: '',
    warehouse: '',
    production_line: '',
    g_weight: '',
    n_weight: '',
  });

  const updateForm = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handlePalletSelect = (pallet: Pallet) => {
    setSelectedPallet(pallet);
    setGeneratedBoxes([]);
    setLabelDataList([]);
    if (!form.warehouse) updateForm('warehouse', pallet.current_warehouse);
    if (!form.production_line && pallet.production_line) {
      updateForm('production_line', pallet.production_line);
    }
  };

  const handleProductionReleaseSelect = (release: ProductionReleaseOilRow) => {
    setSelectedRelease(release);
    setGeneratedBoxes([]);
    setLabelDataList([]);
    setForm((prev) => ({
      ...prev,
      item_code: release.item_code.trim(),
      item_name: release.item_name.trim(),
      batch_number: release.batch_number.trim(),
      qty: getReleaseQtyPerBox(release),
      box_count: getReleaseLabelCount(release),
      mfg_date: release.mfg_date.trim(),
      exp_date: release.exp_date.trim(),
    }));
  };

  const handleConfigSelect = (configId: string) => {
    const config = lineConfigs.find((c) => c.id === Number(configId));
    if (!config) return;
    const lineName = lines.find((l) => l.id === selectedLineId)?.name || '';
    setForm((prev) => ({
      ...prev,
      production_line: lineName,
    }));
  };

  const validateForm = () => {
    const itemCode = form.item_code.trim();
    const batchNumber = form.batch_number.trim();
    const warehouse = form.warehouse.trim();
    const qty = Number(form.qty);
    const boxCount = Number(form.box_count);
    const missingFields = [
      !selectedPallet && 'Pallet',
      !itemCode && 'Item Code',
      !batchNumber && 'Batch Number',
      !form.qty.trim() && 'Qty per Label',
      !form.box_count.trim() && 'Items per Pallet',
      !form.mfg_date && 'Mfg Date',
      !warehouse && 'Warehouse',
    ].filter(Boolean);

    if (missingFields.length > 0) {
      toast.error(`Please fill: ${missingFields.join(', ')}`);
      return null;
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error('Qty per label must be greater than 0');
      return null;
    }
    if (!Number.isInteger(boxCount) || boxCount < 1) {
      toast.error('Items per pallet must be a whole number, like 1 or 25');
      return null;
    }
    if (boxCount > MAX_BOX_LABELS_PER_REQUEST) {
      toast.error(`Items per pallet cannot be more than ${MAX_BOX_LABELS_PER_REQUEST}`);
      return null;
    }

    return { itemCode, batchNumber, warehouse, qty, boxCount };
  };

  const handleGenerateAndPrint = async () => {
    const valid = validateForm();
    if (!valid || !selectedPallet) return;

    try {
      const boxes = await generateMutation.mutateAsync({
        item_code: valid.itemCode,
        item_name: form.item_name.trim(),
        batch_number: valid.batchNumber,
        qty: valid.qty,
        box_count: valid.boxCount,
        uom: form.uom,
        mfg_date: form.mfg_date,
        ...(form.exp_date ? { exp_date: form.exp_date } : {}),
        ...(form.g_weight ? { g_weight: Number(form.g_weight) } : {}),
        ...(form.n_weight ? { n_weight: Number(form.n_weight) } : {}),
        warehouse: valid.warehouse,
        production_line: form.production_line.trim(),
      });

      await addBoxesMutation.mutateAsync({
        palletId: selectedPallet.id,
        data: { box_ids: boxes.map((box) => box.id) },
      });

      const labels = await printBulkMutation.mutateAsync([
        {
          label_type: 'PALLET' as const,
          id: selectedPallet.id,
          printer_name: printerName.trim() || DEFAULT_THERMAL_PRINTER_NAME,
        },
        {
          label_type: 'PALLET' as const,
          id: selectedPallet.id,
          printer_name: printerName.trim() || DEFAULT_THERMAL_PRINTER_NAME,
        },
        ...boxes.map((box) => ({
          label_type: 'BOX' as const,
          id: box.id,
          printer_name: printerName.trim() || DEFAULT_THERMAL_PRINTER_NAME,
        })),
      ]);

      setGeneratedBoxes(boxes);
      setLabelDataList(labels);
      toast.success('Printing 2 pallet labels first, then item labels linked to the pallet.');
      setTimeout(() => handlePrint(), 50);
    } catch (err: unknown) {
      toast.error(formatApiError(err));
    }
  };

  return (
    <div className="space-y-6">
      <DashboardHeader title="Pallet QR Print" subtitle="Select pallet, fetch item from SAP, then print linked labels" />

      <Card>
        <CardContent className="p-4">
          <div className="mb-4 grid gap-3 border-b pb-4 lg:grid-cols-2">
            <SearchableSelect<Pallet>
              items={emptyPallets}
              isLoading={loadingPallets}
              getItemKey={(pallet) => pallet.id}
              getItemLabel={(pallet) => pallet.pallet_id}
              renderItem={(pallet) => (
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-medium">{pallet.pallet_id}</span>
                    {pallet.box_count === 0 && (
                      <Badge className="bg-amber-100 text-amber-800">EMPTY</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {pallet.box_count} labels linked | {pallet.current_warehouse}
                  </div>
                </div>
              )}
              placeholder="Search and select empty pallet..."
              label="Pallet"
              labelAction={<ScanSearchButton onScan={setScannedPalletSearch} expectedType="PALLET" />}
              scannedSearchValue={scannedPalletSearch}
              inputId="barcode-pallet-select"
              loadingText="Loading pallets..."
              emptyText="No empty pallets available"
              notFoundText="No matching empty pallet"
              value={selectedPallet?.pallet_id || ''}
              defaultDisplayText={selectedPallet?.pallet_id || ''}
              onItemSelect={handlePalletSelect}
              onClear={() => setSelectedPallet(null)}
              onSearchChange={setPalletSearch}
            />

            <SearchableSelect<ProductionReleaseOilRow>
              items={productionReleaseRows}
              isLoading={isProductionReleaseLoading}
              isError={isProductionReleaseError}
              getItemKey={(release) =>
                `${release.doc_entry ?? release.doc_num ?? ''}-${release.item_code}-${release.batch_number}`
              }
              getItemLabel={getProductionReleaseLabel}
              renderItem={(release) => (
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-medium">{release.doc_num}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {release.item_code}
                    </span>
                  </div>
                  <div className="truncate text-sm">{release.item_name}</div>
                  <div className="text-xs text-muted-foreground">
                    Planned {release.planned_qty || '0'} | Boxes {release.box_count || '0'} | Box
                    size {release.box_size || '0'}
                  </div>
                </div>
              )}
              filterFn={(release, search) => {
                const term = search.toLowerCase();
                return [
                  release.doc_num,
                  release.doc_entry,
                  release.item_code,
                  release.item_name,
                  release.batch_number,
                ]
                  .filter(Boolean)
                  .some((value) => String(value).toLowerCase().includes(term));
              }}
              placeholder="Search SAP production release..."
              label="SAP HANA Item"
              inputId="barcode-production-release-oil"
              loadingText="Loading releases..."
              emptyText="No released oil orders available"
              notFoundText="No matching release"
              errorText="Unable to load released oil orders"
              value={selectedRelease ? getProductionReleaseLabel(selectedRelease) : ''}
              defaultDisplayText={selectedRelease ? getProductionReleaseLabel(selectedRelease) : ''}
              onItemSelect={handleProductionReleaseSelect}
              onClear={() => {
                setSelectedRelease(null);
                setReleaseSearch('');
              }}
              onSearchChange={(search) => {
                const selectedLabel = selectedRelease
                  ? getProductionReleaseLabel(selectedRelease)
                  : '';
                if (search !== selectedLabel) setReleaseSearch(search);
              }}
            />
          </div>

          <div className="mb-4 flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Quick Fill from Line Configuration</span>
          </div>
          <div className="mb-4 flex flex-wrap gap-3 border-b pb-4">
            <div className="w-[200px]">
              <FormLabel className="text-xs">Production Line</FormLabel>
              <Select
                value={selectedLineId ? String(selectedLineId) : ''}
                onValueChange={(v) => setSelectedLineId(Number(v))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select line" />
                </SelectTrigger>
                <SelectContent>
                  {lines.map((line) => (
                    <SelectItem key={line.id} value={String(line.id)}>
                      {line.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedLineId && lineConfigs.length > 0 && (
              <div className="w-[300px]">
                <FormLabel className="text-xs">Configuration (SKU)</FormLabel>
                <Select onValueChange={handleConfigSelect}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select config for line only" />
                  </SelectTrigger>
                  <SelectContent>
                    {lineConfigs.map((cfg) => (
                      <SelectItem key={cfg.id} value={String(cfg.id)}>
                        {cfg.config_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Item Code *</label>
              <input
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                value={form.item_code}
                onChange={(e) => updateForm('item_code', e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Item Name</label>
              <input
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                value={form.item_name}
                onChange={(e) => updateForm('item_name', e.target.value)}
                readOnly={!!selectedRelease}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Batch Number *</label>
              <input
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                value={form.batch_number}
                onChange={(e) => updateForm('batch_number', e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Qty per Label *</label>
              <div className="mt-1 flex gap-2">
                <input
                  type="number"
                  className="flex-1 rounded border px-3 py-2 text-sm"
                  value={form.qty}
                  onChange={(e) => updateForm('qty', e.target.value)}
                />
                <select
                  className="w-24 rounded border px-2 py-2 text-sm"
                  value={form.uom}
                  onChange={(e) => updateForm('uom', e.target.value)}
                  title="Unit of Measure"
                >
                  <option value="">UOM</option>
                  <option value="PCS">PCS</option>
                  <option value="BOX">BOX</option>
                  <option value="KG">KG</option>
                  <option value="LTR">LTR</option>
                  <option value="ML">ML</option>
                  <option value="GM">GM</option>
                  <option value="NOS">NOS</option>
                  <option value="SET">SET</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Items per Pallet *
              </label>
              <input
                type="number"
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                value={form.box_count}
                onChange={(e) => updateForm('box_count', e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Mfg Date *</label>
              <input
                type="date"
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                value={form.mfg_date}
                onChange={(e) => updateForm('mfg_date', e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Exp Date</label>
              <input
                type="date"
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                value={form.exp_date}
                onChange={(e) => updateForm('exp_date', e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">G.Weight</label>
              <input
                type="number"
                step="0.01"
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                value={form.g_weight}
                onChange={(e) => updateForm('g_weight', e.target.value)}
                placeholder="Gross weight"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">N.Weight</label>
              <input
                type="number"
                step="0.01"
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                value={form.n_weight}
                onChange={(e) => updateForm('n_weight', e.target.value)}
                placeholder="Net weight"
              />
            </div>
            <div>
              <SearchableSelect<WarehouseOption>
                items={warehouses}
                isLoading={false}
                getItemKey={(wh) => wh.code}
                getItemLabel={(wh) => `${wh.code} - ${wh.name}`}
                renderItem={(wh) => (
                  <div className="flex w-full items-center gap-2">
                    <span className="font-mono text-xs font-medium">{wh.code}</span>
                    <span className="truncate text-sm">{wh.name}</span>
                  </div>
                )}
                placeholder="Search warehouse..."
                label="Warehouse"
                required
                inputId="barcode-warehouse"
                loadingText="Loading..."
                emptyText="No warehouses available"
                notFoundText="No matching warehouse"
                value={
                  form.warehouse
                    ? `${form.warehouse} - ${warehouses.find((w) => w.code === form.warehouse)?.name ?? ''}`
                    : ''
                }
                defaultDisplayText={
                  form.warehouse
                    ? `${form.warehouse} - ${warehouses.find((w) => w.code === form.warehouse)?.name ?? ''}`
                    : ''
                }
                onItemSelect={(wh) => updateForm('warehouse', wh.code)}
                onClear={() => updateForm('warehouse', '')}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Production Line</label>
              <input
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                value={form.production_line}
                onChange={(e) => updateForm('production_line', e.target.value)}
              />
            </div>
          </div>

          <div className="mt-4">
            <PrinterProfileControls
              printerName={printerName}
              printMode={printMode}
              onPrinterNameChange={setPrinterName}
              onPrintModeChange={setPrintMode}
            />
          </div>

          <div className="mt-4 flex gap-2">
            <Button
              onClick={handleGenerateAndPrint}
              disabled={
                generateMutation.isPending ||
                addBoxesMutation.isPending ||
                printBulkMutation.isPending
              }
            >
              <Plus className="h-4 w-4 mr-1" />
              {generateMutation.isPending || addBoxesMutation.isPending || printBulkMutation.isPending
                ? 'Preparing...'
                : 'Generate Linked Labels & Print'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {generatedBoxes.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">
                Linked {generatedBoxes.length} item labels to {selectedPallet?.pallet_id}
              </h3>
              <Button size="sm" onClick={() => handlePrint()}>
                <Printer className="h-4 w-4 mr-1" /> Print Again
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-2 text-left font-medium">Barcode</th>
                    <th className="p-2 text-right font-medium">Qty</th>
                    <th className="p-2 text-left font-medium">Pallet</th>
                    <th className="p-2 text-left font-medium">Warehouse</th>
                  </tr>
                </thead>
                <tbody>
                  {generatedBoxes.map((box) => (
                    <tr key={box.id} className="border-b">
                      <td className="p-2 font-mono text-xs">{box.box_barcode}</td>
                      <td className="p-2 text-right">
                        {box.qty} {box.uom}
                      </td>
                      <td className="p-2 font-mono text-xs">{selectedPallet?.pallet_id}</td>
                      <td className="p-2">{box.current_warehouse}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <div aria-hidden style={{ position: 'fixed', left: '-10000px', top: 0 }}>
        <div ref={printRef} className="barcode-print-sheet">
          {labelDataList.map((label, index) =>
            label.type === 'PALLET' ? (
              <PalletLabel key={`pallet-${label.id}-${index}`} data={label as PalletLabelData} />
            ) : (
              <BoxLabel key={`box-${label.id}-${index}`} data={label as BoxLabelData} />
            ),
          )}
        </div>
      </div>
    </div>
  );
}
