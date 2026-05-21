import { QRCodeSVG } from 'qrcode.react';
import { type CSSProperties, forwardRef } from 'react';

import { LABEL_HEIGHT, LABEL_WIDTH } from './labelPrint';

export interface PalletLabelData {
  type: string;
  id: number;
  barcode: string;
  qr_payload: string;
  item_code: string;
  item_name: string;
  batch_number: string;
  box_count: number;
  max_box_count?: number;
  total_qty: string;
  uom: string;
  mfg_date: string;
  exp_date: string;
  production_line: string;
  warehouse: string;
  g_weight?: string;
  n_weight?: string;
}

interface PalletLabelProps {
  data: PalletLabelData;
}

const EMPTY_VALUE = '-';

const formatDate = (dateStr: string) => {
  if (!dateStr) return EMPTY_VALUE;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(2);
  return `${dd}/${mm}/${yy}`;
};

const formatNumber = (value?: string | number | null) => {
  if (value === null || value === undefined || value === '') return EMPTY_VALUE;
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return String(value);
  return numericValue.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: numericValue % 1 === 0 ? 0 : 2,
  });
};

const compactText = (value?: string | number | null) => {
  if (value === null || value === undefined || value === '') return EMPTY_VALUE;
  return String(value).trim() || EMPTY_VALUE;
};

const joinValue = (...parts: Array<string | number | null | undefined>) =>
  parts
    .map((part) => compactText(part))
    .filter((part) => part !== EMPTY_VALUE)
    .join(' ') || EMPTY_VALUE;

const getItemNameFontSize = (name: string) => {
  if (name.length > 74) return '9px';
  if (name.length > 54) return '10px';
  if (name.length > 34) return '10.8px';
  return '11.8px';
};

const itemNameStyle = (name: string): CSSProperties => ({
  display: '-webkit-box',
  overflow: 'hidden',
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: 2,
  wordBreak: 'break-word',
  fontSize: getItemNameFontSize(name),
  fontWeight: 900,
  lineHeight: 1.08,
  letterSpacing: 0,
  textTransform: 'uppercase',
});

interface LabelField {
  label: string;
  value: string;
  strong?: boolean;
}

function InfoCell({ label, value, strong = false }: LabelField) {
  return (
    <div
      style={{
        minWidth: 0,
        borderTop: '0.25mm solid #111',
        borderRight: '0.25mm solid #111',
        padding: '0.45mm 0.8mm',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          fontSize: '5.4px',
          fontWeight: 900,
          lineHeight: 1,
          letterSpacing: 0,
          color: '#333',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      <div
        style={{
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontSize: strong ? '9.8px' : '7.6px',
          fontWeight: strong ? 900 : 800,
          lineHeight: 1.08,
          letterSpacing: 0,
          color: '#000',
          textTransform: 'uppercase',
        }}
      >
        {value || EMPTY_VALUE}
      </div>
    </div>
  );
}

const PalletLabel = forwardRef<HTMLDivElement, PalletLabelProps>(({ data }, ref) => {
  const qrValue = data.qr_payload || data.barcode;
  const itemName = compactText(data.item_name || data.item_code);
  const boxCapacity = data.max_box_count
    ? `${data.box_count}/${data.max_box_count}`
    : data.box_count;
  const fields: LabelField[] = [
    { label: 'Batch', value: compactText(data.batch_number) },
    { label: 'Total Qty', value: joinValue(formatNumber(data.total_qty), data.uom), strong: true },
    { label: 'Boxes', value: compactText(boxCapacity) },
    { label: 'Mfg', value: formatDate(data.mfg_date) },
    { label: 'Exp', value: formatDate(data.exp_date) },
    { label: 'Warehouse', value: compactText(data.warehouse) },
    { label: 'G.Wt', value: formatNumber(data.g_weight) },
    { label: 'N.Wt', value: formatNumber(data.n_weight) },
  ];

  return (
    <div
      ref={ref}
      className="barcode-label bg-white text-black font-sans"
      style={{
        width: LABEL_WIDTH,
        height: LABEL_HEIGHT,
        padding: 0,
        boxSizing: 'border-box',
        backgroundColor: '#fff',
        color: '#000',
        overflow: 'hidden',
        fontFamily: 'Arial, Helvetica, sans-serif',
        lineHeight: 1,
        display: 'grid',
        gridTemplateColumns: '66mm 34mm',
        alignItems: 'stretch',
        border: '0.35mm solid #000',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateRows: '6.4mm 10.6mm 1fr',
          minWidth: 0,
          height: '100%',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '16mm 1fr 15mm',
            alignItems: 'center',
            backgroundColor: '#000',
            color: '#fff',
            minWidth: 0,
          }}
        >
          <div
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRight: '0.25mm solid #fff',
              fontSize: '8.8px',
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: 0,
            }}
          >
            PALLET
          </div>
          <div
            style={{
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              padding: '0 1mm',
              fontSize: '10.5px',
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: 0,
              textTransform: 'uppercase',
            }}
          >
            {compactText(data.item_code)}
          </div>
          <div
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderLeft: '0.25mm solid #fff',
              fontSize: '7.6px',
              fontWeight: 900,
              lineHeight: 1,
            }}
          >
            {boxCapacity}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            minWidth: 0,
            borderBottom: '0.25mm solid #111',
            padding: '0.8mm 1mm',
            overflow: 'hidden',
          }}
        >
          <div style={itemNameStyle(itemName)}>{itemName}</div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridAutoRows: '1fr',
            minWidth: 0,
            overflow: 'hidden',
          }}
        >
          {fields.map((field) => (
            <InfoCell key={field.label} {...field} />
          ))}
        </div>
      </div>

      <div
        style={{
          minWidth: 0,
          display: 'grid',
          gridTemplateRows: '30.5mm 1fr',
          borderLeft: '0.35mm solid #000',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#fff',
            padding: '0.8mm',
          }}
        >
          <QRCodeSVG
            value={qrValue}
            size={148}
            level="H"
            includeMargin={false}
            style={{ width: '28.2mm', height: '28.2mm', display: 'block' }}
          />
        </div>
        <div
          style={{
            minWidth: 0,
            borderTop: '0.35mm solid #000',
            padding: '0.55mm 0.8mm',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.35mm',
            textAlign: 'center',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              fontSize: '5.4px',
              fontWeight: 900,
              lineHeight: 1,
              color: '#333',
              textTransform: 'uppercase',
            }}
          >
            Scan / Pallet Code
          </div>
          <div
            style={{
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontFamily: 'Consolas, monospace',
              fontSize: '6.8px',
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: 0,
            }}
          >
            {compactText(data.barcode)}
          </div>
        </div>
      </div>
    </div>
  );
});

PalletLabel.displayName = 'PalletLabel';

export default PalletLabel;
