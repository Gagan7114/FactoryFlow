import { QRCodeSVG } from 'qrcode.react';
import { forwardRef } from 'react';

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
}

interface PalletLabelProps {
  data: PalletLabelData;
}

const PalletLabel = forwardRef<HTMLDivElement, PalletLabelProps>(({ data }, ref) => {
  const qrValue = data.qr_payload || data.barcode;
  const textStyle = {
    fontFamily: '"Courier New", Consolas, monospace',
    fontSize: '7.7px',
    fontWeight: 800,
    lineHeight: '1.12',
    letterSpacing: 0,
    textTransform: 'uppercase',
  } as const;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(2);
    return `${dd}/${mm}/${yy}`;
  };

  const rowStyle = {
    minWidth: 0,
    display: 'grid',
    gridTemplateColumns: '25mm 2mm 1fr',
    alignItems: 'baseline',
    overflow: 'hidden',
    textAlign: 'left',
    ...textStyle,
  } as const;

  const valueStyle = {
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  } as const;

  return (
    <div
      ref={ref}
      className="barcode-label bg-white text-black font-sans"
      style={{
        width: LABEL_WIDTH,
        height: LABEL_HEIGHT,
        padding: '1mm 2mm',
        boxSizing: 'border-box',
        backgroundColor: '#fff',
        color: '#000',
        overflow: 'hidden',
        fontFamily: '"Courier New", Consolas, monospace',
        lineHeight: 1,
        display: 'grid',
        gridTemplateColumns: '1fr 34mm',
        columnGap: '1.6mm',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          display: 'flex',
          minWidth: 0,
          height: '100%',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '0.45mm',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            overflow: 'hidden',
            textAlign: 'left',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            ...textStyle,
          }}
        >
          JIVO WELLNESS
        </div>

        <div
          style={{
            overflow: 'hidden',
            textAlign: 'left',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            ...textStyle,
          }}
        >
          {data.item_name || data.item_code}
        </div>

        {[
          ['LABEL TYPE', 'PALLET'],
          ['PALLET ID', data.barcode],
          ['BOXES', `${data.box_count}/${data.max_box_count || data.box_count}`],
          ['QUANTITY', `${data.total_qty} ${data.uom}`],
          ['ITEM CODE', data.item_code],
          ['BATCH NUMBER', data.batch_number],
          ['MANUFACTURE DATE', formatDate(data.mfg_date)],
          ['EXPIRY DATE', formatDate(data.exp_date)],
          ['WAREHOUSE', data.warehouse],
          ['BARCODE', data.barcode],
        ].map(([label, value]) => (
          <div key={label} style={rowStyle}>
            <span>{label}</span>
            <span>:</span>
            <span style={valueStyle}>{value}</span>
          </div>
        ))}
      </div>

      <div
        style={{
          minWidth: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ backgroundColor: '#fff' }}>
          <QRCodeSVG
            value={qrValue}
            size={132}
            level="M"
            includeMargin={false}
            style={{ width: '32mm', height: '32mm', display: 'block' }}
          />
        </div>
      </div>
    </div>
  );
});

PalletLabel.displayName = 'PalletLabel';

export default PalletLabel;
