import { listen, useGlobalObservable } from 'open-observable';
import React, { FormEvent, forwardRef, HTMLAttributes, useEffect, useRef, useState } from 'react';
import { formConfigKey } from '../other/form-config-key';
import { FormControl } from '../other/form-control';
import { FormContext } from '../state/form-context';
import { dualRef } from '../util/dual-ref';

type Props = Omit<HTMLAttributes<HTMLFormElement>, 'onSubmit' | 'onReset'> & {
    control: FormControl<any, any>;
};

export const Form = forwardRef<HTMLFormElement, Props>(({ children, control, ...rest }, forwardedRef) => {
    const ref = useRef<HTMLFormElement>(null);
    const config = useGlobalObservable(formConfigKey);

    useEffect(() => control.cleanup, [control]);

    const submit = (event: FormEvent) => {
        control.submit();
        event.preventDefault();
    }

    const reset = (event: FormEvent) => {
        control.reset();
        event.preventDefault();
    }

    return (
        <FormContext.Provider value={control}>
            <form ref={dualRef(ref, forwardedRef)} onSubmit={submit} onReset={reset} {...rest}>
                {listen(
                    config,
                    (config) => config.loadingComponent && config.loadingComponent(control.loading, control.submitting)
                )}
                {children}
            </form>
        </FormContext.Provider>
    );
});
