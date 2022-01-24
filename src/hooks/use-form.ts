import { ModelExpSelector } from '../types/model-exp-selector';
import { useMemo } from 'react';
import { nameof } from 'ts-simple-nameof';
import { IConfigurator } from 'open-observable';
import { IFormConfigure } from '../types/i-form-configure';
import { FormHandler } from '../types/form-handler';

export const useForm = <TInput, TOutput>(
    submit: (input: TInput) => Promise<TOutput> | TOutput,
    configurator: (configurator: IConfigurator<IFormConfigure<TInput, TOutput>>) => void
): [ModelExpSelector<TInput>, FormHandler<TInput, TOutput>] => {
    return useMemo(() => [nameof, { submit, configurator }], []);
};
