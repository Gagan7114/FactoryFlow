import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button, Input, Label } from '@/shared/components/ui';
import { useDebounce } from '@/shared/hooks';

import { getDefaultProductionMovementFilters } from '../constants';

interface PositionDateRange {
  date_from: string;
  date_to: string;
}

interface ProductionMovementPositionFiltersProps {
  range: PositionDateRange;
  isFetching?: boolean;
  onRangeChange: (range: PositionDateRange) => void;
}

function isCompleteDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function ProductionMovementPositionFilters({
  range,
  isFetching,
  onRangeChange,
}: ProductionMovementPositionFiltersProps) {
  const [draft, setDraft] = useState<PositionDateRange>(range);
  const [syncedRange, setSyncedRange] = useState<PositionDateRange>(range);
  const debounced = useDebounce(draft, 500);

  // Adjust the draft when the controlled range changes externally (e.g. reset
  // from elsewhere) — the React-recommended "derive during render" pattern.
  if (range.date_from !== syncedRange.date_from || range.date_to !== syncedRange.date_to) {
    setSyncedRange(range);
    setDraft(range);
  }

  useEffect(() => {
    if (!isCompleteDate(debounced.date_from) || !isCompleteDate(debounced.date_to)) {
      return;
    }
    if (debounced.date_from === range.date_from && debounced.date_to === range.date_to) {
      return;
    }
    onRangeChange({ date_from: debounced.date_from, date_to: debounced.date_to });
  }, [debounced, range, onRangeChange]);

  function handleReset() {
    const defaults = getDefaultProductionMovementFilters();
    const reset = { date_from: defaults.date_from, date_to: defaults.date_to };
    setDraft(reset);
    onRangeChange(reset);
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="position-date-from" className="text-xs">
          From
        </Label>
        <Input
          id="position-date-from"
          type="date"
          value={draft.date_from}
          onChange={(event) =>
            setDraft((current) => ({ ...current, date_from: event.target.value }))
          }
          className="w-40"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="position-date-to" className="text-xs">
          To
        </Label>
        <Input
          id="position-date-to"
          type="date"
          value={draft.date_to}
          onChange={(event) =>
            setDraft((current) => ({ ...current, date_to: event.target.value }))
          }
          className="w-40"
        />
      </div>

      <Button variant="outline" size="sm" onClick={handleReset} className="mb-0.5">
        Reset
      </Button>

      {isFetching && (
        <div className="mb-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading...
        </div>
      )}
    </div>
  );
}
