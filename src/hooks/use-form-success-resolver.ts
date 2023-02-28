import { useFormControl } from './use-form-control';
import { useEffect } from 'react';

export const useFormSuccessResolver = <TInput, TOutput>(resolver: (input: TInput, output: TOutput) => void) => {
    const control = useFormControl();

    useEffect(() => control.addSuccessResolver(resolver), [resolver]);
};
