import { useFormControl } from './use-form-control';
import { useEffect } from 'react';

export const useFormResolver = (resolver: () => Promise<boolean>) => {
    const control = useFormControl();

    useEffect(() => control.addResolver(resolver), []);
};
