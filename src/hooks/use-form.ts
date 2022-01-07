import { ModelExpSelector } from '../types/model-exp-selector';
import { FormHandler } from '../types/form-handler';
import { useMemo } from 'react';
import { nameof } from 'ts-simple-nameof';

export const useForm = <TInput, TOutput>(
    submit: FormHandler<TInput, TOutput>['submit'],
    options: Omit<FormHandler<TInput, TOutput>, 'submit'>
): [ModelExpSelector<TInput>, FormHandler<TInput, TOutput>] => {
    return useMemo(() => [nameof, { submit, ...options }], []);
};
