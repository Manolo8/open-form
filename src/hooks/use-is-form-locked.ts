import { ISubscriber, useSubscriberSelectorAsSubscriber } from 'open-observable';
import { useFormControl } from './use-form-control';
import { useCallback } from 'react';

export function useIsFormLocked(): ISubscriber<boolean> {
    const control = useFormControl();

    return useSubscriberSelectorAsSubscriber(
        control.locks,
        useCallback((x) => x !== 0, [])
    );
}