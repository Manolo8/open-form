import { ForwardedRef, MutableRefObject } from 'react';

export const dualRef = <E>(val: MutableRefObject<E> | ForwardedRef<E>, val2: MutableRefObject<E> | ForwardedRef<E>) => {
    return (ref: E) => {
        [val, val2].forEach((x) => {
            if (typeof x === 'function') {
                x(ref);
            } else if (x) {
                x.current = ref;
            }
        });
    };
};
