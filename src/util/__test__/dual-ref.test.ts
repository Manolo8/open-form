import { MutableRefObject } from 'react';
import { dualRef } from '../dual-ref';

describe('dualRef', () => {
    it('should forward the node to two object refs', () => {
        const local: MutableRefObject<string | null> = { current: null };
        const forwarded: MutableRefObject<string | null> = { current: null };

        dualRef<any>(local, forwarded)('node');

        expect(local.current).toBe('node');
        expect(forwarded.current).toBe('node');
    });

    it('should forward the node to a callback ref', () => {
        const local: MutableRefObject<string | null> = { current: null };
        const forwarded = jest.fn();

        dualRef<any>(local, forwarded)('node');

        expect(local.current).toBe('node');
        expect(forwarded).toHaveBeenCalledTimes(1);
        expect(forwarded).toHaveBeenCalledWith('node');
    });

    it('should support both refs being callbacks', () => {
        const local = jest.fn();
        const forwarded = jest.fn();

        dualRef<any>(local, forwarded)('node');

        expect(local).toHaveBeenCalledWith('node');
        expect(forwarded).toHaveBeenCalledWith('node');
    });

    it('should ignore a null forwarded ref and still fill the local one', () => {
        const local: MutableRefObject<string | null> = { current: null };

        expect(() => dualRef<any>(local, null)('node')).not.toThrow();
        expect(local.current).toBe('node');
    });

    it('should ignore an undefined forwarded ref and still fill the local one', () => {
        const local: MutableRefObject<string | null> = { current: null };

        expect(() => dualRef<any>(local, undefined as any)('node')).not.toThrow();
        expect(local.current).toBe('node');
    });

    it('should forward real dom nodes and overwrite previous values (including null on unmount)', () => {
        const local: MutableRefObject<HTMLDivElement | null> = { current: null };
        const forwarded: MutableRefObject<HTMLDivElement | null> = { current: null };
        const node = document.createElement('div');

        const ref = dualRef<any>(local, forwarded);

        ref(node);

        expect(local.current).toBe(node);
        expect(forwarded.current).toBe(node);

        ref(null);

        expect(local.current).toBeNull();
        expect(forwarded.current).toBeNull();
    });

    it('should return a new function on each call', () => {
        const local: MutableRefObject<any> = { current: null };

        expect(dualRef<any>(local, null)).not.toBe(dualRef<any>(local, null));
    });
});
