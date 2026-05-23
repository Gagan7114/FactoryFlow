import { FileSpreadsheet, Loader2 } from 'lucide-react';

import {
  Button,
  type ButtonProps,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/components/ui';
import { cn } from '@/shared/utils';

export interface ExcelExportButtonProps extends Omit<ButtonProps, 'children' | 'onClick'> {
  onExport: () => void;
  label?: string;
  loadingLabel?: string;
  tooltip?: string;
  disabledReason?: string;
  isLoading?: boolean;
  iconOnlyOnMobile?: boolean;
}

export function ExcelExportButton({
  onExport,
  label = 'Export Excel',
  loadingLabel = 'Exporting',
  tooltip,
  disabledReason,
  isLoading = false,
  iconOnlyOnMobile = true,
  disabled,
  className,
  variant = 'outline',
  size = 'sm',
  type = 'button',
  ...buttonProps
}: ExcelExportButtonProps) {
  const isDisabled = disabled || isLoading;
  const tooltipText = tooltip ?? (isDisabled && disabledReason ? disabledReason : label);
  const accessibleLabel = isLoading ? loadingLabel : label;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex w-full sm:w-auto">
            <Button
              type={type}
              variant={variant}
              size={size}
              disabled={isDisabled}
              aria-label={accessibleLabel}
              onClick={onExport}
              className={cn('w-full sm:w-auto', className)}
              {...buttonProps}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
              )}
              <span className={cn(iconOnlyOnMobile && 'hidden sm:inline')}>
                {isLoading ? loadingLabel : label}
              </span>
            </Button>
          </span>
        </TooltipTrigger>
        {tooltipText && <TooltipContent>{tooltipText}</TooltipContent>}
      </Tooltip>
    </TooltipProvider>
  );
}
