import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ExcelExportButton } from '../../../components/dashboard/ExcelExportButton';

vi.mock('lucide-react', () => ({
  FileSpreadsheet: (props: any) => <svg data-testid="file-spreadsheet-icon" {...props} />,
  Loader2: (props: any) => <svg data-testid="loader-icon" {...props} />,
}));

vi.mock('@/shared/components/ui', () => ({
  Button: ({ children, onClick, className, disabled, type, ...props }: any) => (
    <button type={type} onClick={onClick} className={className} disabled={disabled} {...props}>
      {children}
    </button>
  ),
  Tooltip: ({ children }: any) => <div data-testid="tooltip-root">{children}</div>,
  TooltipContent: ({ children }: any) => <div role="tooltip">{children}</div>,
  TooltipProvider: ({ children }: any) => <>{children}</>,
  TooltipTrigger: ({ children }: any) => <>{children}</>,
}));

vi.mock('@/shared/utils', () => ({
  cn: (...inputs: unknown[]) => inputs.filter(Boolean).join(' '),
}));

describe('ExcelExportButton', () => {
  it('renders the default export label and icon', () => {
    render(<ExcelExportButton onExport={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Export Excel' })).toBeInTheDocument();
    expect(screen.getAllByText('Export Excel')).toHaveLength(2);
    expect(screen.getByTestId('file-spreadsheet-icon')).toBeInTheDocument();
  });

  it('calls onExport when clicked', () => {
    const handleExport = vi.fn();
    render(<ExcelExportButton onExport={handleExport} />);

    fireEvent.click(screen.getByRole('button', { name: 'Export Excel' }));

    expect(handleExport).toHaveBeenCalledTimes(1);
  });

  it('shows loading state and disables the button', () => {
    render(<ExcelExportButton onExport={vi.fn()} isLoading />);

    const button = screen.getByRole('button', { name: 'Exporting' });

    expect(button).toBeDisabled();
    expect(screen.getByText('Exporting')).toBeInTheDocument();
    expect(screen.getByTestId('loader-icon')).toHaveClass('animate-spin');
  });

  it('uses disabledReason as tooltip text when disabled', () => {
    render(<ExcelExportButton onExport={vi.fn()} disabled disabledReason="No rows to export" />);

    expect(screen.getByRole('button', { name: 'Export Excel' })).toBeDisabled();
    expect(screen.getByRole('tooltip')).toHaveTextContent('No rows to export');
  });

  it('can keep the label visible on mobile when requested', () => {
    render(<ExcelExportButton onExport={vi.fn()} iconOnlyOnMobile={false} />);

    const buttonLabel = screen
      .getAllByText('Export Excel')
      .find((element) => element.tagName === 'SPAN');

    expect(buttonLabel?.className).not.toContain('hidden sm:inline');
  });
});
