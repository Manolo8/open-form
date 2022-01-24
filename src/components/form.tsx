import { listen, useGlobalObservable } from 'open-observable';
import React, { forwardRef, HTMLAttributes, useEffect, useRef, useState } from 'react';
import { formConfigKey } from '../other/form-config-key';
import { FormControl } from '../other/form-control';
import { FormContext } from '../state/form-context';
import { FormHandler } from '../types/form-handler';
import { dualRef } from '../util/dual-ref';
import { isEnterSubmit } from '../util/is-enter-submit';
import { isSubmitEnabled } from '../util/is-submit-enabled';
import { Configurator } from 'open-observable';

type Props = { handler: FormHandler<any, any> } & HTMLAttributes<HTMLDivElement>;

export const Form = forwardRef<HTMLDivElement, Props>(({ children, handler, ...rest }, forwardedRef) => {
    const ref = useRef<HTMLDivElement>(null);
    const handlerRef = useRef<(input: any) => Promise<any> | any>(handler.submit);
    const config = useGlobalObservable(formConfigKey);

    handlerRef.current = handler.submit;

    const [{ form, configurator }] = useState(() => {
        const form = new FormControl(handlerRef, config.asSubscriber());
        const configurator = new Configurator(form);

        return { form, configurator };
    });

    useEffect(() => {
        handler.configurator(configurator);

        return () => configurator.reset();
    }, [handler.configurator]);

    useEffect(() => form.cleanup, [form]);

    useEffect(() => {
        const element = ref.current;

        if (!element) return;

        const keydown = (event: KeyboardEvent) => {
            if (event.key !== 'Enter') return;

            if (!isEnterSubmit(event)) return;

            if (!isSubmitEnabled(ref.current, event.target)) return;

            form.submit();
            event.stopPropagation();
            event.preventDefault();
        };

        element.addEventListener('keydown', keydown);

        return () => element.removeEventListener('keydown', keydown);
    }, [form]);

    return (
        <FormContext.Provider value={form}>
            <div ref={dualRef(ref, forwardedRef)} data-form={true} {...rest}>
                {listen(config, (config) => config.loadingComponent && config.loadingComponent(form.loading))}
                {children}
            </div>
        </FormContext.Provider>
    );
});
