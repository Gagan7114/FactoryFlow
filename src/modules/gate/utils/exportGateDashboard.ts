import type { DateRange } from '@/core/store/filtersSlice';
import type { GateEntryTypeConfig } from '@/modules/gate/constants/gateEntryTypes';
import {
  compactExportValue,
  createFilterMetadata,
  createRecordSheet,
  type DashboardExcelRecord,
  downloadExcelWorkbook,
} from '@/shared/utils';

export interface GateDashboardExportStat {
  label: string;
  value: number;
}

export interface GateDashboardExportStats {
  stats: GateDashboardExportStat[];
  isLoading?: boolean;
}

interface ExportGateDashboardOptions {
  entryTypes: GateEntryTypeConfig[];
  statsByEntryType: Record<string, GateDashboardExportStats | undefined>;
  dateRange: DateRange;
  searchTerm: string;
}

const directionLabels: Record<GateEntryTypeConfig['direction'], string> = {
  in: 'Gate In',
  out: 'Gate Out',
  return: 'Gate In',
};

export function exportGateDashboard({
  entryTypes,
  statsByEntryType,
  dateRange,
  searchTerm,
}: ExportGateDashboardOptions): void {
  const entryTypeRows = entryTypes.map((entryType) =>
    toEntryTypeRow(entryType, statsByEntryType[entryType.id]),
  );
  const summaryRows = entryTypes.flatMap((entryType) =>
    toSummaryRows(entryType, statsByEntryType[entryType.id]),
  );

  const sheets = [
    createRecordSheet('Gate Types', entryTypeRows),
    createRecordSheet('Status Summary', summaryRows),
  ].filter((sheet): sheet is NonNullable<typeof sheet> => Boolean(sheet));

  downloadExcelWorkbook({
    fileName: `Gate_Management_${dateRange.from || 'all'}_${dateRange.to || 'all'}.xlsx`,
    metadata: [
      ...createFilterMetadata(
        {
          from_date: dateRange.from,
          to_date: dateRange.to,
          search: searchTerm.trim(),
        },
        {
          from_date: 'From Date',
          to_date: 'To Date',
          search: 'Search',
        },
      ),
      { label: 'Exported Entry Types', value: entryTypes.length },
    ],
    sheets,
  });
}

function toEntryTypeRow(
  entryType: GateEntryTypeConfig,
  stats?: GateDashboardExportStats,
): DashboardExcelRecord {
  return {
    'Entry Type': entryType.title,
    Direction: directionLabels[entryType.direction],
    Mode: entryType.vehicleMode === 'vehicle' ? 'Vehicle' : 'Non Vehicle',
    Description: entryType.description,
    'Requires Weighment': entryType.requiresWeighment ? 'Yes' : 'No',
    'Requires Gatepass': entryType.requiresGatepass ? 'Yes' : 'No',
    Stats: stats?.isLoading
      ? 'Loading'
      : compactExportValue(stats?.stats.map((stat) => `${stat.label}: ${stat.value}`).join(', ')),
  };
}

function toSummaryRows(
  entryType: GateEntryTypeConfig,
  stats?: GateDashboardExportStats,
): DashboardExcelRecord[] {
  if (!stats?.stats.length) {
    return [
      {
        'Entry Type': entryType.title,
        Direction: directionLabels[entryType.direction],
        Metric: 'No stats',
        Value: '-',
      },
    ];
  }

  return stats.stats.map((stat) => ({
    'Entry Type': entryType.title,
    Direction: directionLabels[entryType.direction],
    Metric: stat.label,
    Value: stat.value,
  }));
}
