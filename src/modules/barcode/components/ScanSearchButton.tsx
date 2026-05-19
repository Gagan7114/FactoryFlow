import { Camera, CameraOff, ScanBarcode } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui';

import { useScanner } from '../hooks/useScanner';

type ScanEntityType = 'BOX' | 'PALLET' | 'ANY';

interface ScanSearchButtonProps {
  onScan: (barcode: string) => void;
  label?: string;
  expectedType?: ScanEntityType;
}

const getExpectedLabel = (expectedType: ScanEntityType) => {
  if (expectedType === 'BOX') return 'box';
  if (expectedType === 'PALLET') return 'pallet';
  return 'barcode';
};

const parseScannedValue = (rawValue: string, expectedType: ScanEntityType) => {
  const value = rawValue.trim();
  if (!value) return { value: '', error: '' };

  try {
    const payload = JSON.parse(value) as Record<string, unknown>;
    const payloadType = String(payload.type || '').toUpperCase();

    if (payloadType === 'BOX') {
      if (expectedType === 'PALLET') {
        return { value: '', error: 'This is a box label. Please scan a pallet label.' };
      }
      return { value: String(payload.box_barcode || payload.barcode || '').trim(), error: '' };
    }

    if (payloadType === 'PALLET') {
      if (expectedType === 'BOX') {
        return { value: '', error: 'This is a pallet label. Please scan a box label.' };
      }
      return { value: String(payload.pallet_id || payload.barcode || '').trim(), error: '' };
    }
  } catch {
    // Plain 1D barcode or manually typed value.
  }

  const upperValue = value.toUpperCase();
  const isBox = upperValue.startsWith('BOX-') || upperValue.startsWith('BBOX');
  const isPallet = upperValue.startsWith('PLT-') || upperValue.startsWith('PPLT');

  if (expectedType === 'BOX' && isPallet) {
    return { value: '', error: 'This is a pallet label. Please scan a box label.' };
  }

  if (expectedType === 'PALLET' && isBox) {
    return { value: '', error: 'This is a box label. Please scan a pallet label.' };
  }

  if (expectedType === 'BOX' && !isBox && isPallet) {
    return { value: '', error: 'Please scan a box label.' };
  }

  if (expectedType === 'PALLET' && !isPallet && isBox) {
    return { value: '', error: 'Please scan a pallet label.' };
  }

  return { value, error: '' };
};

export default function ScanSearchButton({
  onScan,
  label = 'Scan',
  expectedType = 'ANY',
}: ScanSearchButtonProps) {
  const [open, setOpen] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [scanError, setScanError] = useState('');
  const autoStartedRef = useRef(false);

  const handleScan = useCallback((barcode: string) => {
    const result = parseScannedValue(barcode, expectedType);
    if (result.error) {
      setScanError(result.error);
      return;
    }
    if (!result.value) return;
    onScan(result.value);
    setManualInput('');
    setScanError('');
    setOpen(false);
  }, [expectedType, onScan]);

  const { isScanning, error, elementId, startScanning, stopScanning } = useScanner({
    onScan: handleScan,
    debounceMs: 1500,
  });

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setScanError('');
    }
    setOpen(nextOpen);
  };

  useEffect(() => {
    if (open && !autoStartedRef.current) {
      autoStartedRef.current = true;
      startScanning();
      return;
    }

    if (!open) {
      autoStartedRef.current = false;
      stopScanning();
    }
  }, [open, startScanning, stopScanning]);

  const submitManualScan = () => handleScan(manualInput);
  const expectedLabel = getExpectedLabel(expectedType);

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <ScanBarcode className="h-4 w-4 mr-1" />
        {label}
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Scan for Search</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Scan or type {expectedLabel}
              </label>
              <div className="flex gap-2">
                <input
                  className="flex-1 border rounded px-3 py-2 text-sm font-mono"
                  value={manualInput}
                  onChange={(event) => setManualInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      submitManualScan();
                    }
                  }}
                  placeholder={`Scan ${expectedLabel} or type manually...`}
                />
                <Button type="button" size="sm" disabled={!manualInput.trim()} onClick={submitManualScan}>
                  Use
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Handheld scanner will type here. Press Enter to use it in search.
              </p>
            </div>

            <div
              id={elementId}
              className="w-full max-w-md mx-auto rounded-lg overflow-hidden bg-black"
              style={{ minHeight: isScanning ? 300 : 0, display: isScanning ? 'block' : 'none' }}
            />

            <div className="flex justify-center">
              {!isScanning ? (
                <Button type="button" variant="outline" size="sm" onClick={startScanning}>
                  <Camera className="h-4 w-4 mr-1" />
                  Start Camera
                </Button>
              ) : (
                <Button type="button" variant="outline" size="sm" onClick={stopScanning}>
                  <CameraOff className="h-4 w-4 mr-1" />
                  Stop Camera
                </Button>
              )}
            </div>

            {(scanError || error) && (
              <p className="text-sm text-destructive text-center">{scanError || error}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
