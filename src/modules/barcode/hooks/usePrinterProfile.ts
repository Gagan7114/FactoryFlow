import { useEffect, useState } from 'react';

import { DEFAULT_THERMAL_PRINTER_NAME, type LabelPrintMode } from '../components/labelPrint';

const PRINTER_NAME_KEY = 'barcode.printerName';
const PRINT_MODE_KEY = 'barcode.printMode';

const isPrintMode = (value: string | null): value is LabelPrintMode => value === 'TSC_DA310_100X40';

export function usePrinterProfile() {
  const [printerName, setPrinterName] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_THERMAL_PRINTER_NAME;
    return window.localStorage.getItem(PRINTER_NAME_KEY) || DEFAULT_THERMAL_PRINTER_NAME;
  });
  const [printMode, setPrintMode] = useState<LabelPrintMode>(() => {
    if (typeof window === 'undefined') return 'TSC_DA310_100X40';
    const storedMode = window.localStorage.getItem(PRINT_MODE_KEY);
    return isPrintMode(storedMode) ? storedMode : 'TSC_DA310_100X40';
  });

  useEffect(() => {
    window.localStorage.setItem(PRINTER_NAME_KEY, printerName);
  }, [printerName]);

  useEffect(() => {
    window.localStorage.setItem(PRINT_MODE_KEY, printMode);
  }, [printMode]);

  return {
    printerName,
    printMode,
    setPrinterName,
    setPrintMode,
  };
}
