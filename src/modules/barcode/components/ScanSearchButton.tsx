import { Camera, CameraOff, ScanBarcode } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui';

import { useScanner } from '../hooks/useScanner';

interface ScanSearchButtonProps {
  onScan: (barcode: string) => void;
  label?: string;
}

export default function ScanSearchButton({ onScan, label = 'Scan' }: ScanSearchButtonProps) {
  const [open, setOpen] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleScan = (barcode: string) => {
    const trimmed = barcode.trim();
    if (!trimmed) return;
    onScan(trimmed);
    setManualInput('');
    setOpen(false);
  };

  const { isScanning, error, elementId, startScanning, stopScanning } = useScanner({
    onScan: handleScan,
    debounceMs: 1500,
  });

  useEffect(() => {
    if (open) {
      window.setTimeout(() => inputRef.current?.focus(), 50);
      return;
    }
    if (isScanning) {
      stopScanning();
    }
  }, [isScanning, open, stopScanning]);

  const submitManualScan = () => handleScan(manualInput);

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <ScanBarcode className="h-4 w-4 mr-1" />
        {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Scan for Search</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Scan or type barcode
              </label>
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  className="flex-1 border rounded px-3 py-2 text-sm font-mono"
                  value={manualInput}
                  onChange={(event) => setManualInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      submitManualScan();
                    }
                  }}
                  placeholder="Scan barcode or type manually..."
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
                  Use Camera
                </Button>
              ) : (
                <Button type="button" variant="outline" size="sm" onClick={stopScanning}>
                  <CameraOff className="h-4 w-4 mr-1" />
                  Stop Camera
                </Button>
              )}
            </div>

            {error && <p className="text-sm text-destructive text-center">{error}</p>}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
