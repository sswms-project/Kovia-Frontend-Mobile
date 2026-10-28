import { useForm } from 'react-hook-form';
import { useFormDraft } from './use-form-draft';

/** Commands without an input form still need the same durable reconciliation marker. */
export function useCommandDraft(options: { feature: string; documentId: string; version?: string; enabled: boolean; assertCurrent: () => void }) {
  const form = useForm<Record<string, never>>({ defaultValues: {} });
  return useFormDraft({ ...options, form });
}
