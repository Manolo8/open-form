import { createContext } from 'react';
import { FormControl } from '../other/form-control';

export const FormContext = createContext<FormControl<any, any>>(null as unknown as any);
