import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { toast } from '@/stores/uiStore';
import { errorMessage } from '@/utils/errors';

/**
 * Wraps a service call with: loading state, error toast (never silently swallowed),
 * optional success toast, and cache invalidation.
 */
export function useServiceMutation<TVars, TResult>(
  fn: (vars: TVars) => Promise<TResult>,
  opts: {
    invalidate?: QueryKey[];
    success?: string | ((r: TResult) => string | null);
    onSuccess?: (r: TResult, vars: TVars) => void;
    silentError?: boolean;
  } = {},
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async (result, vars) => {
      await Promise.all((opts.invalidate ?? []).map((key) => qc.invalidateQueries({ queryKey: key })));
      const msg = typeof opts.success === 'function' ? opts.success(result) : opts.success;
      if (msg) toast.success(msg);
      opts.onSuccess?.(result, vars);
    },
    onError: (err) => {
      if (!opts.silentError) toast.error(errorMessage(err));
    },
  });
}
