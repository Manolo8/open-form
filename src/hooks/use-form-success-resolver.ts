import { useFormControl } from './use-form-control';
import { useEffect } from 'react';

/**
 * Runs the resolver after every successful submit.
 *
 * The callback receives `(input, output)` — the reverse of the `setSuccess` configurator, which receives
 * `(output, input)`. The difference is deliberate: both orders are the published contract of their API.
 */
export const useFormSuccessResolver = <TInput, TOutput>(resolver: (input: TInput, output: TOutput) => void) => {
    const control = useFormControl();

    useEffect(() => control.addSuccessResolver(resolver), [resolver, control]);
};
