import { useContext } from 'react';
import { Field } from '../other/field';
import { FieldContext } from '../state/field-context';
import { FormContext } from '../state/form-context';
import { InitialValue } from '../types/initial-value';

export const useField = <T>(name: string, initial?: InitialValue<T>): Field<T> => {
    const form = useContext(FormContext);
    const fieldContext = useContext(FieldContext);

    return (fieldContext ?? form).field(name, initial);
};
