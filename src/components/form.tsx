import { listen, useGlobalObservable } from 'open-observable';
import React, { forwardRef, HTMLAttributes, useEffect, useRef, useState } from 'react';
import { formConfigKey } from '../other/form-config-key';
import { FormControl } from '../other/form-control';
import { FormContext } from '../state/form-context';
import { dualRef } from '../util/dual-ref';
import { isEnterSubmit } from '../util/is-enter-submit';
import { isSubmitEnabled } from '../util/is-submit-enabled';

type Props = HTMLAttributes<HTMLDivElement> & {
    control: FormControl<any, any>;
};

export const Form = forwardRef<HTMLDivElement, Props>(({ children, control: form, ...rest }, forwardedRef) => {
    const ref = useRef<HTMLDivElement>(null);
    const config = useGlobalObservable(formConfigKey);

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
