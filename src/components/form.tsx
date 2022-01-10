import { listen, useGlobalObservable } from 'open-observable';
import React, { forwardRef, HTMLAttributes, useEffect, useRef, useState } from 'react';
import { formConfigKey } from '../other/form-config-key';
import { FormControl } from '../other/form-options/form-control';
import { FormContext } from '../state/form-context';
import { FormHandler } from '../types/form-handler';
import { dualRef } from '../util/dual-ref';
import { isEnterSubmit } from '../util/is-enter-submit';
import { isSubmitEnabled } from '../util/is-submit-enabled';

type Props = { handler: FormHandler<any, any> } & HTMLAttributes<HTMLDivElement>;

export const Form = forwardRef<HTMLDivElement, Props>(({ children, handler, ...rest }, forwardedRef) => {
    const ref = useRef<HTMLDivElement>(null);
    const handlerRef = useRef<FormHandler<any, any>>(handler);
    const config = useGlobalObservable(formConfigKey);

    handlerRef.current = handler;

    const [form] = useState(() => new FormControl(handlerRef, config.asSubscriber()));

    useEffect(() => {
        if (handler.autoSubmit === undefined) return;

        let timeoutId = 0;

        const cleanSubscriber = form.totalChanges.subscribe(() => {
            clearTimeout(timeoutId);

            setTimeout(() => form.submit(), typeof handler.autoSubmit === 'number' ? handler.autoSubmit : 0);
        });

        return () => {
            cleanSubscriber();
            clearTimeout(timeoutId);
        };
    }, [handler]);

    useEffect(() => {
        form.load();

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
