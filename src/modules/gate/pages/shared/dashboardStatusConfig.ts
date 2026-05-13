import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  type LucideIcon,
  XCircle,
} from 'lucide-react';

interface StatusConfigItem {
  label: string;
  color: string;
  bgColor: string;
  icon: LucideIcon;
}

export interface DashboardStatusConfig {
  statusOrder: string[];
  statusConfig: Record<string, StatusConfigItem>;
  gridCols: string;
}

export const DEFAULT_STATUS_CONFIG: DashboardStatusConfig = {
  statusOrder: ['draft', 'in_progress', 'completed'],
  statusConfig: {
    DRAFT: {
      label: 'Draft',
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
      icon: FileText,
    },
    IN_PROGRESS: {
      label: 'In Progress',
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
      icon: Clock,
    },
    COMPLETED: {
      label: 'Completed',
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
      icon: CheckCircle2,
    },
  },
  gridCols: 'grid-cols-3',
};

export const RAW_MATERIAL_STATUS_CONFIG: DashboardStatusConfig = {
  statusOrder: ['draft', 'in_progress', 'qc_completed', 'completed', 'cancelled', 'rejected'],
  statusConfig: {
    DRAFT: {
      label: 'Draft',
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
      icon: FileText,
    },
    IN_PROGRESS: {
      label: 'In Progress',
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
      icon: Clock,
    },
    QC_COMPLETED: {
      label: 'QC Completed',
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
      icon: CheckCircle2,
    },
    COMPLETED: {
      label: 'Completed',
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
      icon: CheckCircle2,
    },
    CANCELLED: {
      label: 'Cancelled',
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
      icon: XCircle,
    },
    REJECTED: {
      label: 'Rejected',
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
      icon: AlertCircle,
    },
  },
  gridCols: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
};
