import { createContext } from 'react';
import { FormControl } from '../other/form-options/form-control';

export const FormContext = createContext<FormControl>(null as unknown as any);
