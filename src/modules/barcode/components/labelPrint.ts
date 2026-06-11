export const LABEL_WIDTH = '100mm';
export const LABEL_HEIGHT = '40mm';

export type LabelPrintMode = 'TSC_DA310_100X40';

export const DEFAULT_THERMAL_PRINTER_NAME = 'TSC DA310';

export const MONO_LABEL_TYPE_STYLES = {
  PALLET: {
    outerBorder: '0.35mm solid #000',
    identityAccentBorder: '1.3mm solid #000',
    headerBackground: '#000',
    headerColor: '#fff',
    headerBorderBottom: '0.35mm solid #000',
    scanBackground: '#fff',
    scanTextColor: '#000',
    scanTopBorder: '1mm solid #000',
  },
  BOX: {
    outerBorder: '0.35mm dashed #000',
    identityAccentBorder: '1.3mm double #000',
    headerBackground: '#fff',
    headerColor: '#000',
    headerBorderBottom: '0.45mm double #000',
    scanBackground: '#fff',
    scanTextColor: '#000',
    scanTopBorder: '0.45mm dashed #000',
  },
} as const;

const TSC_DA310_100X40_PAGE_STYLE = `
  @page {
    size: 100mm 40mm;
    margin: 0;
  }

  @media print {
    html,
    body {
      width: 100mm;
      min-height: 40mm;
      margin: 0 !important;
      padding: 0 !important;
      background: #fff !important;
      overflow: visible !important;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .barcode-print-sheet {
      width: 100mm;
      max-width: 100mm;
      margin: 0 !important;
      padding: 0 !important;
      background: #fff;
      display: block;
    }

    .barcode-label {
      width: 100mm;
      height: 40mm;
      max-width: 100mm;
      max-height: 40mm;
      margin: 0 !important;
      padding: 0 !important;
      page-break-after: always;
      break-after: page;
      page-break-inside: avoid;
      break-inside: avoid;
      overflow: hidden;
    }

    .barcode-label:last-child {
      page-break-after: auto;
      break-after: auto;
    }
  }
`;

export const getLabelPrintPageStyle = (mode: LabelPrintMode = 'TSC_DA310_100X40') => {
  void mode;
  return TSC_DA310_100X40_PAGE_STYLE;
};

export const LABEL_PRINT_PAGE_STYLE = getLabelPrintPageStyle('TSC_DA310_100X40');
