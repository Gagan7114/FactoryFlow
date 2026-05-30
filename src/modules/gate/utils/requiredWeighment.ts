export interface RequiredWeighmentValues {
  grossWeight: string;
  tareWeight: string;
  weighbridgeSlipNo: string;
  firstWeighmentTime: string;
  secondWeighmentTime: string;
}

export const EMPTY_REQUIRED_WEIGHMENT: RequiredWeighmentValues = {
  grossWeight: '',
  tareWeight: '',
  weighbridgeSlipNo: '',
  firstWeighmentTime: '',
  secondWeighmentTime: '',
};

export function calculateRequiredNetWeight(values: RequiredWeighmentValues) {
  const gross = parseFloat(values.grossWeight) || 0;
  const tare = parseFloat(values.tareWeight) || 0;
  return Math.max(0, gross - tare).toFixed(3);
}

export function validateRequiredWeighment(values: RequiredWeighmentValues) {
  const gross = parseFloat(values.grossWeight);
  const tare = parseFloat(values.tareWeight);

  if (!Number.isFinite(gross) || gross <= 0) {
    return 'Gross weight is required.';
  }

  if (!Number.isFinite(tare) || tare < 0) {
    return 'Tare weight is required.';
  }

  if (tare > gross) {
    return 'Tare weight cannot be greater than gross weight.';
  }

  return '';
}

export function buildRequiredWeighmentDateTime(time: string) {
  if (!time) return undefined;
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const date = `${year}-${month}-${day}`;
  return `${date}T${time}:00`;
}
