import { QRCodeSVG } from 'qrcode.react';
import { type CSSProperties, forwardRef } from 'react';

import { LABEL_HEIGHT, LABEL_WIDTH } from './labelPrint';

export interface BoxLabelData {
  type: string;
  id: number;
  barcode: string;
  qr_payload: string;
  pallet_id?: string;
  box_number?: number | null;
  box_count?: number | null;
  item_code: string;
  item_name: string;
  batch_number: string;
  qty: string;
  uom: string;
  mfg_date: string;
  exp_date: string;
  production_line: string;
  warehouse: string;
  g_weight?: string;
  n_weight?: string;
}

interface BoxLabelProps {
  data: BoxLabelData;
}

const EMPTY_VALUE = '-';
const LABEL_BORDER = '0.2mm solid #111';
const OUTER_BORDER = '0.3mm solid #000';
const TEXT_WEIGHT = 600;
const EMPHASIS_WEIGHT = 700;
const HEADER_WEIGHT = 800;

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
  fontWeight: EMPHASIS_WEIGHT,
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
        borderTop: LABEL_BORDER,
        borderRight: LABEL_BORDER,
        padding: '0.45mm 0.8mm',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          fontSize: '5.4px',
          fontWeight: TEXT_WEIGHT,
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
          fontWeight: strong ? EMPHASIS_WEIGHT : TEXT_WEIGHT,
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

const BoxLabel = forwardRef<HTMLDivElement, BoxLabelProps>(({ data }, ref) => {
  const qrValue = data.qr_payload || data.barcode;
  const itemName = compactText(data.item_name || data.item_code);
  const boxSequence =
    data.box_number && data.box_count ? `${data.box_number}/${data.box_count}` : 'ITEM';
  const fields: LabelField[] = [
    { label: 'Batch', value: compactText(data.batch_number) },
    { label: 'Qty', value: joinValue(formatNumber(data.qty), data.uom), strong: true },
    { label: 'Mfg', value: formatDate(data.mfg_date) },
    { label: 'Exp', value: formatDate(data.exp_date) },
    { label: 'Warehouse', value: compactText(data.warehouse) },
    { label: 'Line', value: compactText(data.production_line) },
    { label: 'G.Wt', value: formatNumber(data.g_weight) },
    { label: 'N.Wt', value: formatNumber(data.n_weight) },
  ];

  return (
    <div
      ref={ref}
      className="barcode-label bg-white text-black"
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
        border: OUTER_BORDER,
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
            gridTemplateColumns: '11mm 1fr 13mm',
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
              borderRight: '0.2mm solid #fff',
              fontSize: '9.5px',
              fontWeight: HEADER_WEIGHT,
              lineHeight: 1,
              letterSpacing: 0,
            }}
          >
            BOX
          </div>
          <div
            style={{
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              padding: '0 1mm',
              fontSize: '10.5px',
              fontWeight: HEADER_WEIGHT,
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
              borderLeft: '0.2mm solid #fff',
              fontSize: '8px',
              fontWeight: HEADER_WEIGHT,
              lineHeight: 1,
            }}
          >
            {boxSequence}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            minWidth: 0,
            borderBottom: LABEL_BORDER,
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
          borderLeft: OUTER_BORDER,
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
            borderTop: OUTER_BORDER,
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
              fontWeight: TEXT_WEIGHT,
              lineHeight: 1,
              color: '#333',
              textTransform: 'uppercase',
            }}
          >
            Scan / Box Code
          </div>
          <div
            style={{
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontFamily: 'Consolas, monospace',
              fontSize: '6.8px',
              fontWeight: EMPHASIS_WEIGHT,
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

BoxLabel.displayName = 'BoxLabel';

export default BoxLabel;
