import { AlertCircle, CheckCircle2, Loader2, PackageSearch, Search } from 'lucide-react';
import { type FormEvent, useMemo, useState } from 'react';

import { useOpenPOByNumberSearch } from '@/modules/gate/api/po/po.queries';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@/shared/components/ui';
import { getErrorMessage, isNotFoundError } from '@/shared/utils';

function formatQuantity(value: number) {
  return value.toLocaleString('en-IN', {
    maximumFractionDigits: 3,
  });
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function PONumberLookup() {
  const [poNumber, setPoNumber] = useState('');
  const [searchedPoNumber, setSearchedPoNumber] = useState('');
  const [validationError, setValidationError] = useState('');
  const poSearch = useOpenPOByNumberSearch();

  const po = poSearch.data;
  const totalOpenQty = useMemo(() => {
    if (!po) return 0;
    return po.items.reduce((sum, item) => sum + Number(item.remaining_qty || 0), 0);
  }, [po]);

  const errorMessage = poSearch.isError
    ? isNotFoundError(poSearch.error)
      ? `No open PO found for ${searchedPoNumber}.`
      : getErrorMessage(poSearch.error, 'Unable to search PO right now.')
    : '';

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedPoNumber = poNumber.trim();

    if (!trimmedPoNumber) {
      setValidationError('Enter the complete PO number.');
      return;
    }

    setValidationError('');
    setSearchedPoNumber(trimmedPoNumber);
    poSearch.reset();
    poSearch.mutate(trimmedPoNumber);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PackageSearch className="h-5 w-5" />
          PO Search
        </CardTitle>
        <CardDescription>
          Enter the full PO number to confirm the purchase order before recording vehicle details.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={handleSearch}>
          <div className="flex-1 space-y-2">
            <Label htmlFor="rm-po-number-search">PO Number</Label>
            <Input
              id="rm-po-number-search"
              value={poNumber}
              onChange={(event) => {
                setPoNumber(event.target.value);
                setValidationError('');
                if (!poSearch.isPending) {
                  poSearch.reset();
                }
              }}
              placeholder="Enter complete PO number"
              disabled={poSearch.isPending}
            />
          </div>
          <Button type="submit" disabled={poSearch.isPending} className="sm:w-auto">
            {poSearch.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Search className="mr-2 h-4 w-4" />
            )}
            Search
          </Button>
        </form>

        {(validationError || errorMessage) && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{validationError || errorMessage}</span>
          </div>
        )}

        {po && !poSearch.isPending && (
          <div className="rounded-md border bg-muted/20 p-4">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold">{po.po_number}</h3>
                  <Badge variant="success" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Open PO Found
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {po.supplier_name} ({po.supplier_code})
                </p>
              </div>
              <div className="text-sm text-muted-foreground">
                PO Date:{' '}
                <span className="font-medium text-foreground">{formatDate(po.doc_date)}</span>
              </div>
            </div>

            <div className="grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <p className="text-muted-foreground">Items</p>
                <p className="font-semibold">{po.items.length}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Open Qty</p>
                <p className="font-semibold">{formatQuantity(totalOpenQty)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Vendor Ref</p>
                <p className="font-semibold">{po.vendor_ref || '-'}</p>
              </div>
            </div>

            {po.items.length > 0 && (
              <div className="mt-4 overflow-hidden rounded-md border bg-background">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="p-2 text-left font-medium">Item</th>
                      <th className="p-2 text-right font-medium">Open Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {po.items.slice(0, 3).map((item) => (
                      <tr key={item.line_num} className="border-t">
                        <td className="p-2">
                          <div className="font-medium">{item.item_name}</div>
                          <div className="text-xs text-muted-foreground">{item.po_item_code}</div>
                        </td>
                        <td className="p-2 text-right">
                          {formatQuantity(Number(item.remaining_qty || 0))} {item.uom}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {po.items.length > 3 && (
                  <p className="border-t p-2 text-xs text-muted-foreground">
                    +{po.items.length - 3} more item{po.items.length - 3 === 1 ? '' : 's'}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
