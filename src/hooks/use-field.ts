import { useContext } from 'react';
import { FormContext } from '../state/form-context';
import { InitialValue } from '../types/initial-value';
import { Field } from '../other/field';

export const useField = <T>(name: string, initial?: InitialValue<T>): Field<T> => {
    const form = useContext(FormContext);

    return form.field(name, initial);
};
