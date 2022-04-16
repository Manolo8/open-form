import { useEffect, useRef, useState } from 'react';
import { nameof } from 'ts-simple-nameof';
import { IConfigurator, Configurator, useGlobalObservable } from 'open-observable';
import { ModelExpSelector } from '../types/model-exp-selector';
import { IFormConfigure } from '../types/i-form-configure';
import { FormControl } from '../other/form-control';
import { formConfigKey } from '../other/form-config-key';

export const useForm = <TInput, TOutput>(
    submit: (input: TInput) => Promise<TOutput> | TOutput,
    configure?: (configurator: IConfigurator<IFormConfigure<TInput, TOutput>>) => void
): [ModelExpSelector<TInput>, FormControl<TInput, TOutput>] => {
    const config = useGlobalObservable(formConfigKey);

    const ref = useRef<(input: TInput) => Promise<TOutput> | TOutput>(submit);

    ref.current = submit;

    const [{ form, configurator }] = useState(() => {
        const form = new FormControl(ref, config);
        const configurator = new Configurator(form);

        return { form, configurator };
    });

    useEffect(() => {
        configure?.(configurator);
    }, [configure, configurator]);

    useEffect(() => () => configurator.reset(), [configure]);

    return [nameof, form];
};
