import { ISubscriber } from 'open-observable';
import { useFormControl } from './use-form-control';
import { useEffect } from 'react';

export function useFormLock(value: boolean | ISubscriber<boolean>): void {
    const control = useFormControl();

    useEffect(() => {
        if (typeof value === 'boolean') {
            if (!value) return;

            control.lock(true);

            return () => control.lock(false);
        }

        let last = false;

        const unsubscribe = value.subscribe((value) => {
            if (value === last) return;

            last = value;

            control.lock(value);
        });

        return () => {
            unsubscribe();
            if (last) control.lock(false);
        };
    }, []);
}
