import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { SalesPlanningRequirementAnalysisResponse } from '../types';

interface SalesPlanningRequirementAnalysisProps {
  analysis?: SalesPlanningRequirementAnalysisResponse;
}

export function SalesPlanningRequirementAnalysis({
  analysis,
}: SalesPlanningRequirementAnalysisProps) {
  const [expanded, setExpanded] = useState(false);
  if (!analysis) return null;

  return (
    <Card>
      <CardHeader
        className="cursor-pointer pb-3 transition-colors hover:bg-muted/20"
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={() => setExpanded((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setExpanded((current) => !current);
          }
        }}
      >
        <CardTitle className="flex items-center justify-between text-sm font-medium">
          Procedure Output Analysis
          <ChevronDown
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform',
              expanded && 'rotate-180',
            )}
          />
        </CardTitle>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-4 p-4 pt-0">
          <div className="grid gap-3 text-sm md:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Procedure</p>
              <p className="font-medium">{analysis.procedure_name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">PostgreSQL table</p>
              <p className="font-medium">{analysis.postgres_table.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Scheduler</p>
              <p className="font-medium">
                Monthly day {analysis.scheduler.default_cron.day} at{' '}
                {String(analysis.scheduler.default_cron.hour).padStart(2, '0')}:
                {String(analysis.scheduler.default_cron.minute).padStart(2, '0')}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                    SAP Column
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                    HANA Type
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                    PostgreSQL Column
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                    Meaning
                  </th>
                </tr>
              </thead>
              <tbody>
                {analysis.procedure_output.map((column) => (
                  <tr key={`${column.hana_column}-${column.mapped_column}`} className="border-b">
                    <td className="px-4 py-2 font-mono text-xs">{column.hana_column}</td>
                    <td className="px-4 py-2">{column.hana_type}</td>
                    <td className="px-4 py-2 font-mono text-xs">{column.mapped_column}</td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {column.business_meaning}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
