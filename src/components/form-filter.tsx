import { Listen, useGlobalObservable } from 'open-observable';
import React, { forwardRef, HTMLAttributes, useEffect, useRef } from 'react';
import { formConfigKey } from '../other/form-config-key';
import { FormControl } from '../other/form-control';
import { FormContext } from '../state/form-context';
import { dualRef } from '../util/dual-ref';
import { isEnterSubmit } from '../util/is-enter-submit';
import { isSubmitEnabled } from '../util/is-submit-enabled';

type Props = Omit<HTMLAttributes<HTMLDivElement>, 'onSubmit' | 'onReset'> & {
    control: FormControl<any, any>;
    disableLoading?: boolean;
};

export const FormFilter = forwardRef<HTMLDivElement, Props>(
    ({ children, control, disableLoading, ...rest }, forwardedRef) => {
        const ref = useRef<HTMLDivElement>(null);
        const config = useGlobalObservable(formConfigKey);

        useEffect(() => control.cleanup, [control]);

        useEffect(() => {
            const element = ref.current;

            if (!element) return;

            const keydown = (event: KeyboardEvent) => {
                if (event.key !== 'Enter') return;

                if (!isEnterSubmit(event)) return;

                if (!isSubmitEnabled(ref.current, event.target)) return;

                control.submit();
                event.stopPropagation();
                event.preventDefault();
            };

            const click = (event: MouseEvent) => {
                const target = event.target as HTMLElement;
                const button = target?.closest('button');
                if (!button) return;

                if (!(button.type === 'submit' || button.type === 'reset')) return;

                event.stopPropagation();
                event.preventDefault();

                if (button.getAttribute('disabled') !== null) return;

                if (button.type === 'submit') control.submit();
                else if (button.type === 'reset') control.reset();
            };

            element.addEventListener('keydown', keydown);
            element.addEventListener('click', click);

            return () => {
                element.removeEventListener('keydown', keydown);
                element.removeEventListener('click', click);
            };
        }, [control]);

        return (
            <FormContext.Provider value={control}>
                <div data-form ref={dualRef(ref, forwardedRef)} {...rest}>
                    {!disableLoading && (
                        <Listen subscriber={config}>
                            {(config) =>
                                config.loadingComponent && config.loadingComponent(control.loading, control.submitting)
                            }
                        </Listen>
                    )}
                    {children}
                </div>
            </FormContext.Provider>
        );
    }
);
