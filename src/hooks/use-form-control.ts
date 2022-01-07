import { useContext } from 'react';
import { FormControl } from '../other/form-options/form-control';
import { FormContext } from '../state/form-context';

export const useFormControl = (): FormControl => {
    return useContext(FormContext);
};
