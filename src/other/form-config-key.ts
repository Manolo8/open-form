import { GlobalObservableKey } from 'open-observable';
import { FormConfigType } from '../types/form-config-type';

export const formConfigKey = new GlobalObservableKey<FormConfigType>('form-config-key', {});
