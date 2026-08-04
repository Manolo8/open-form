import { isFormSubmitInput, setFormSubmitInput } from '../form-submit-input';

describe('form-submit-input', () => {
    it('should round-trip the mark on an object', () => {
        const input = { value: 1 };

        expect(isFormSubmitInput(input)).toBe(false);

        setFormSubmitInput(input);

        expect(isFormSubmitInput(input)).toBe(true);
    });

    it('should mark arrays too (arrays are objects)', () => {
        const input: any[] = [];

        setFormSubmitInput(input);

        expect(isFormSubmitInput(input)).toBe(true);
    });

    it('should return false for an unmarked object', () => {
        expect(isFormSubmitInput({})).toBe(false);
    });

    it('should return false for null', () => {
        // `typeof null === 'object'`, but the explicit null guard rejects it.
        expect(isFormSubmitInput(null)).toBe(false);
    });

    it.each([
        ['a string', 'value'],
        ['a number', 1],
        ['undefined', undefined],
        ['a boolean', true],
        ['a function', () => undefined],
    ])('should return false for %s', (_label, value) => {
        expect(isFormSubmitInput(value)).toBe(false);
    });

    it('should be a safe no-op when marking null', () => {
        expect(() => setFormSubmitInput(null)).not.toThrow();
        expect(isFormSubmitInput(null)).toBe(false);
    });

    it.each([
        ['a string', 'value'],
        ['a number', 1],
        ['undefined', undefined],
        ['a boolean', true],
    ])('should be a safe no-op when marking %s', (_label, value) => {
        expect(() => setFormSubmitInput(value)).not.toThrow();
        expect(isFormSubmitInput(value)).toBe(false);
    });

    it('should be a no-op for functions, which stay unmarked', () => {
        // `typeof fn === 'function'`, so the guard rejects it even though a
        // WeakSet would accept a function.
        const fn = () => undefined;

        setFormSubmitInput(fn);

        expect(isFormSubmitInput(fn)).toBe(false);
    });

    it('should not add any own property to the marked object', () => {
        const input = { value: 1 };

        setFormSubmitInput(input);

        expect(Object.keys(input)).toEqual(['value']);
        expect(Object.getOwnPropertyNames(input)).toEqual(['value']);
        expect(Object.getOwnPropertySymbols(input)).toEqual([]);
        expect(JSON.stringify(input)).toBe('{"value":1}');
    });

    it('should not survive a spread copy', () => {
        const input = { value: 1 };

        setFormSubmitInput(input);

        const copy = { ...input };

        expect(isFormSubmitInput(copy)).toBe(false);
        expect(isFormSubmitInput(input)).toBe(true);
    });

    it('should keep marks independent between two structurally equal objects', () => {
        const a = { value: 1 };
        const b = { value: 1 };

        setFormSubmitInput(a);

        expect(isFormSubmitInput(a)).toBe(true);
        expect(isFormSubmitInput(b)).toBe(false);
    });

    it('should be idempotent', () => {
        const input = {};

        setFormSubmitInput(input);
        setFormSubmitInput(input);

        expect(isFormSubmitInput(input)).toBe(true);
    });
});
