import { ISubscriber } from 'open-observable';
import { useFormControl } from './use-form-control';
import { useEffect } from 'react';

export function useFormLock(value: boolean | ISubscriber<boolean>): void {
    const control = useFormControl();

    useEffect(() => {
        let last = false;

        const lock = (next: boolean) => {
            if (next === last) return;

            last = next;

            control.lock(next);
        };

        if (typeof value === 'boolean') {
            lock(value);

            return () => lock(false);
        }

        const unsubscribe = value.subscribe(lock);

        return () => {
            unsubscribe();
            lock(false);
        };
    }, [value, control]);
}
