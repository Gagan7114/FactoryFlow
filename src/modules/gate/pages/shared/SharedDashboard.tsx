import { ChevronRight, Plus } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { ENTRY_STATUS } from '@/config/constants';
import { useGlobalDateRange } from '@/core/store/hooks';
import { GateStatusBadge } from '@/modules/gate/components';
import { Button, Card, CardContent } from '@/shared/components/ui';

import { useVehicleEntries, useVehicleEntriesCount } from '../../api/vehicle/vehicleEntry.queries';
import { DateRangePicker } from '../../components/DateRangePicker';
import type { EntryFlowConfig } from '../../constants/entryFlowConfig';
import { getLastStep } from '../../hooks';
import { type DashboardStatusConfig,DEFAULT_STATUS_CONFIG } from './dashboardStatusConfig';

interface SharedDashboardProps {
  config: EntryFlowConfig;
  statusConfig?: DashboardStatusConfig;
}

export default function SharedDashboard({
  config,
  statusConfig = DEFAULT_STATUS_CONFIG,
}: SharedDashboardProps) {
  const navigate = useNavigate();
  const { dateRange, dateRangeAsDateObjects, setDateRange } = useGlobalDateRange();

  // Convert date range to API params
  const apiParams = useMemo(() => {
    return {
      from_date: dateRange.from,
      to_date: dateRange.to,
      entry_type: config.entryType,
    };
  }, [dateRange, config.entryType]);

  // Fetch recent entries with entry_type and date filter
  const { data: apiEntries = [], isLoading: entriesLoading } = useVehicleEntries(apiParams);

  // Fetch status counts with the same filters
  const { data: countData, isLoading: countLoading } = useVehicleEntriesCount(apiParams);

  // Transform API count response to status counts object
  const statusCounts = useMemo((): Record<string, number> => {
    const defaultCounts: Record<string, number> = {};
    statusConfig.statusOrder.forEach((key) => {
      defaultCounts[key] = 0;
    });

    if (!countData?.total_vehicle_entries) return defaultCounts;

    countData.total_vehicle_entries.forEach(
      ({ status, count }: { status: string; count: number }) => {
        const key = status.toLowerCase();
        if (key in defaultCounts) {
          defaultCounts[key] = count;
        }
      },
    );

    return defaultCounts;
  }, [countData, statusConfig.statusOrder]);

  const entries = apiEntries;
  const isLoading = entriesLoading || countLoading;

  // Get 2 most recent entries
  const recentEntries = useMemo(() => {
    return [...entries]
      .sort((a, b) => {
        const dateA = a.entry_time ? new Date(a.entry_time).getTime() : 0;
        const dateB = b.entry_time ? new Date(b.entry_time).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 2);
  }, [entries]);

  // Format date/time for display
  const formatDateTime = (dateTime?: string) => {
    if (!dateTime) return '-';
    try {
      const date = new Date(dateTime);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateTime;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{config.dashboardTitle}</h2>
          <p className="text-muted-foreground">{config.dashboardDescription}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <DateRangePicker
            date={dateRangeAsDateObjects}
            onDateChange={(date) => {
              if (date && 'from' in date) {
                setDateRange(date);
              } else {
                setDateRange(undefined);
              }
            }}
          />
          <Button
            onClick={() => navigate(`${config.routePrefix}/new`)}
            className="w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Entry
          </Button>
        </div>
      </div>

      {/* Recent Entries Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-muted-foreground">Recent Entries</h3>
          <button
            onClick={() => navigate(`${config.routePrefix}/all`)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            Show more
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-16">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : recentEntries.length === 0 ? (
          <div className="flex items-center justify-center h-16 text-sm text-muted-foreground border rounded-lg">
            No entries yet
          </div>
        ) : (
          <div className="space-y-2">
            {recentEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between px-3 py-2 rounded-md border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => {
                  const isCompleted = entry.status === ENTRY_STATUS.COMPLETED || entry.status === ENTRY_STATUS.QC_COMPLETED;
                  const step = isCompleted ? 'review' : (getLastStep(entry.id) || 'step1');
                  navigate(`${config.routePrefix}/edit/${entry.id}/${step}`);
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-medium text-sm">{entry.entry_no}</span>
                  <GateStatusBadge status={entry.status} size="xs" />
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {entry.vehicle?.vehicle_number} • {entry.driver?.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(entry.entry_time)}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status Overview Section */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Status Overview</h3>
        {isLoading ? (
          <div className="flex items-center justify-center h-24">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className={`grid ${statusConfig.gridCols} gap-3`}>
            {statusConfig.statusOrder.map((statusKey) => {
              const statusUpper = statusKey.toUpperCase();
              const sc = statusConfig.statusConfig[statusUpper];
              if (!sc) return null;

              const Icon = sc.icon;
              const count = statusCounts[statusKey] || 0;

              return (
                <Card
                  key={statusKey}
                  className={`${sc.bgColor} border cursor-pointer hover:shadow-md transition-shadow`}
                  onClick={() => navigate(`${config.routePrefix}/all?status=${statusUpper}`)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <Icon className={`h-4 w-4 ${sc.color}`} />
                      <span className={`text-xl font-bold ${sc.color}`}>{count}</span>
                    </div>
                    <p className={`mt-1 text-xs font-medium ${sc.color}`}>{sc.label}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
