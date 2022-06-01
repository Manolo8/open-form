import { useContext } from 'react';
import { FormControl } from '../other/form-control';
import { FormContext } from '../state/form-context';

export function useFormControl<TInput = any, TOutput = any>(): FormControl<TInput, TOutput> {
    return useContext(FormContext);
}
