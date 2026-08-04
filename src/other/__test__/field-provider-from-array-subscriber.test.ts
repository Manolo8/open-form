import { Observable } from 'open-observable';
import { FieldControl } from '../field-control';
import FieldProviderFromArraySubscriber from '../field-provider-from-array-subscriber';

type Item = {
    a: any;
    b: any;
};

const readonly = () => new Observable<boolean>(false).asSubscriber();

/**
 * Mirrors how `PathArrayItem` (src/components/path.tsx:92) wires the provider:
 * `new FieldProviderFromArraySubscriber(field, field.readonly, field.next, index)`.
 * Note the provider only receives an `ISubscriber<T[]>`, never a `Field`, so it has
 * no child error handling at all.
 */
function setup(initial: any, index = 0) {
    const parent = new FieldControl<any>(initial, readonly());
    const provider = new FieldProviderFromArraySubscriber<Item>(parent, parent.readonly, parent.next as any, index);

    return { parent, provider };
}

describe('FieldProviderFromArraySubscriber', () => {
    describe('field()', () => {
        it('should be create the field on the first call and return the same instance afterwards', () => {
            const { provider } = setup([{ a: 1 }]);

            const first = provider.field('a');
            const second = provider.field('a');

            expect(first).toBeInstanceOf(FieldControl);
            expect(second).toBe(first);
        });

        it('should be honor the initial argument on creation and ignore it on later calls', () => {
            const { provider } = setup([{}]);

            const field = provider.field('a', 'first');

            expect(field.current()).toBe('first');
            expect((field as FieldControl<any>).initial).toBe('first');

            const again = provider.field('a', 'second');

            expect(again).toBe(field);
            expect(again.current()).toBe('first');
        });

        it('should be seed the new field with the value already present in the item', () => {
            const { parent, provider } = setup([{ a: 1, b: 2 }]);

            const before = parent.current();

            const field = provider.field('a');

            expect(field.current()).toBe(1);
            expect(parent.current()).toBe(before);
            expect(parent.current()).toStrictEqual([{ a: 1, b: 2 }]);
            expect(Object.keys(parent.current()[0])).toEqual(['a', 'b']);
        });

        it('should be seed the new field even when the caller passes an initial value', () => {
            const { parent, provider } = setup([{ a: 1, b: 2 }]);

            const field = provider.field('b', 'ignored');

            expect(field.current()).toBe(2);
            expect(parent.current()).toStrictEqual([{ a: 1, b: 2 }]);
        });

        it('should be seed every field of the item without losing any sibling value', () => {
            const { parent, provider } = setup([{ a: 1, b: 2 }]);

            const a = provider.field('a');
            const b = provider.field('b');

            expect(a.current()).toBe(1);
            expect(b.current()).toBe(2);
            expect(parent.current()).toStrictEqual([{ a: 1, b: 2 }]);
        });

        it('should be seed from the item at the provider index only', () => {
            const { parent, provider } = setup([{ a: 1 }, { a: 2 }, { a: 3 }], 1);

            expect(provider.field('a').current()).toBe(2);
            expect(parent.current()).toStrictEqual([{ a: 1 }, { a: 2 }, { a: 3 }]);
        });

        it('should be not add the key to the item when the field is created empty', () => {
            const { parent, provider } = setup([{ a: 1 }]);

            const before = parent.current();

            provider.field('b');

            expect(parent.current()).toBe(before);
            expect(Object.keys(parent.current()[0])).toEqual(['a']);
        });

        it('should be still publish a non empty initial value into the item', () => {
            const { parent, provider } = setup([{ a: 1 }]);

            provider.field('b', 'from-initial');

            expect(parent.current()).toStrictEqual([{ a: 1, b: 'from-initial' }]);
        });
    });

    describe('child -> parent', () => {
        it('should be write the value at the provider index and leave the other indexes untouched', () => {
            const { parent, provider } = setup([{ a: 1 }, { a: 2 }, { a: 3 }], 1);

            const otherBefore = parent.current()[0];
            const lastBefore = parent.current()[2];

            provider.field('a').next('changed');

            expect(parent.current()[1]).toEqual({ a: 'changed' });
            expect(parent.current()[0]).toBe(otherBefore);
            expect(parent.current()[2]).toBe(lastBefore);
        });

        it('should be return a new array instead of mutating the old one', () => {
            const { parent, provider } = setup([{ a: 1 }]);

            const before = parent.current();
            const beforeItem = before[0];

            provider.field('a').next('changed');

            expect(parent.current()).not.toBe(before);
            expect(parent.current()[0]).not.toBe(beforeItem);
            expect(before).toEqual([{ a: 1 }]);
            expect(beforeItem).toEqual({ a: 1 });
        });

        it('should be merge the new value into the existing keys of the item', () => {
            const { parent, provider } = setup([{ a: 1, b: 2 }]);

            provider.field('b').next('changed');

            expect(parent.current()).toEqual([{ a: 1, b: 'changed' }]);
        });
    });

    describe('onFieldChange guards', () => {
        it('should be return an empty array when the parent value is not an array', () => {
            const { parent, provider } = setup(null);

            provider.field('a');

            expect(parent.current()).toEqual([]);
        });

        it('should be return the old value untouched when the index is out of range', () => {
            const { parent, provider } = setup([{ a: 1 }], 2);

            const before = parent.current();

            const field = provider.field('a');

            expect(parent.current()).toBe(before);

            field.next('changed');

            expect(parent.current()).toBe(before);
        });

        it('should be keep the array identity when the key already holds the same value', () => {
            const { parent, provider } = setup([{}]);

            const field = provider.field('a');

            field.next(5);

            const before = parent.current();

            expect(before).toEqual([{ a: 5 }]);

            // the field itself would short circuit, so exercise the guard directly
            provider.onFieldChange('a', 5);

            expect(parent.current()).toBe(before);
        });
    });

    describe('onParentFieldChange', () => {
        it('should be reset every field when the parent is set to null', () => {
            const { parent, provider } = setup([{}]);

            const a = provider.field('a');

            a.next('value');

            parent.next(null);

            expect(a.current()).toBeUndefined();

            // ACTUAL BEHAVIOUR (see report): the reset re-enters onFieldChange while the parent
            // value is null, and the `!Array.isArray(old)` guard replaces it with an empty array.
            expect(parent.current()).toEqual([]);
        });

        it('should be ignore an array shorter than or equal to the index', () => {
            const { parent, provider } = setup([{}, {}], 1);

            const a = provider.field('a');

            a.next('value');

            parent.next([{ a: 'ignored' }]);

            expect(a.current()).toBe('value');
        });

        it('should be do nothing when the item at the index is referentially unchanged', () => {
            const item = { a: 1 };
            const { parent, provider } = setup([item, { b: 1 }]);

            const a = provider.field('a');

            a.next('local');

            const emissions: unknown[] = [];

            a.subscribe((value) => emissions.push(value), true);

            // same reference at index 0, only the sibling item changed
            parent.next([parent.current()[0], { b: 2 }]);

            expect(emissions).toHaveLength(0);
            expect(a.current()).toBe('local');
        });

        it('should be update the existing fields and reset the ones missing from the new item', () => {
            const { parent, provider } = setup([{}]);

            const a = provider.field('a');
            const b = provider.field('b');

            a.next('old-a');
            b.next('old-b');

            parent.next([{ a: 'new-a' }]);

            expect(a.current()).toBe('new-a');
            expect(b.current()).toBeUndefined();

            // resetting `b` must not reintroduce the key the new item does not have
            expect(parent.current()).toStrictEqual([{ a: 'new-a' }]);
            expect(Object.keys(parent.current()[0])).toEqual(['a']);
        });

        it('should be not create fields for keys it has never seen', () => {
            const { parent, provider } = setup([{}]);

            const a = provider.field('a');

            parent.next([{ a: 1, b: 2 }]);

            expect(a.current()).toBe(1);

            // the array provider still skips unknown keys (the object provider creates them),
            // but creating `b` later must pick up the value already in the item instead of
            // wiping it
            const before = parent.current();

            expect(provider.field('b').current()).toBe(2);
            expect(parent.current()).toBe(before);
            expect(parent.current()).toStrictEqual([{ a: 1, b: 2 }]);
        });

        it('should be seed a field created after the item arrived from the parent', () => {
            const { parent, provider } = setup([]);

            parent.next([{ a: 'from-parent' }]);

            const a = provider.field('a');

            expect(a.current()).toBe('from-parent');
            expect(parent.current()).toStrictEqual([{ a: 'from-parent' }]);
        });
    });

    describe('destroy()', () => {
        it('should be stop receiving parent value changes', () => {
            const { parent, provider } = setup([{}]);

            const a = provider.field('a');

            a.next('value');

            provider.destroy();

            parent.next([{ a: 'from-parent' }]);

            expect(a.current()).toBe('value');
        });
    });
});
