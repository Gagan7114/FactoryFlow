import { useMutation } from '@tanstack/react-query';

import { customerReturnInvoiceApi } from './customerReturnInvoice.api';

export function useCustomerReturnInvoiceSearch() {
  return useMutation({
    mutationFn: (invoiceNumber: string) => customerReturnInvoiceApi.getByNumber(invoiceNumber),
  });
}
