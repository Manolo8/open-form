import { enhacedNameof } from '../enhaced-nameof';

describe('enhacedNameof', () => {
    it('should return a string unchanged', () => {
        expect(enhacedNameof('name')).toBe('name');
    });

    it('should return an empty string unchanged', () => {
        expect(enhacedNameof('')).toBe('');
    });

    it('should return a dotted string unchanged', () => {
        expect(enhacedNameof('a.b.c')).toBe('a.b.c');
    });

    it('should resolve a selector lambda to the property name', () => {
        expect(enhacedNameof((x: { name: string }) => x.name)).toBe('name');
    });

    it('should resolve a nested selector to the full dotted path', () => {
        // ts-simple-nameof keeps the whole chain, it does not return only the last
        // segment.
        expect(enhacedNameof((x: { a: { b: string } }) => x.a.b)).toBe('a.b');
        expect(enhacedNameof((x: { a: { b: { c: string } } }) => x.a.b.c)).toBe('a.b.c');
    });
});
