import { useContext } from 'react';
import { FormControl } from '../other/form-control';
import { FormContext } from '../state/form-context';

export const useFormControl = (): FormControl<any, any> => {
    return useContext(FormContext);
};
