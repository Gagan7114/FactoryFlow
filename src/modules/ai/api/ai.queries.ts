import { useMutation } from '@tanstack/react-query';

import { aiApi } from './ai.api';

export const useAskAssistant = () =>
  useMutation({
    mutationFn: aiApi.askAssistant,
  });
