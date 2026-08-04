import { Observable } from 'open-observable';
import { FieldControl } from '../field-control';
import FieldProviderFromObjectSubscriber from '../field-provider-from-object-subscriber';

type Person = {
    name: string;
    age: number;
    city: string;
    address: { street: string };
};

const readonly = () => new Observable<boolean>(false).asSubscriber();

/**
 * Mirrors how `PathObject` (src/components/path.tsx:108) wires the provider:
 * `new FieldProviderFromObjectSubscriber(field, field.readonly, field.next)`.
 */
function setup(initial?: any) {
    const parent = new FieldControl<any>(initial, readonly());
    const provider = new FieldProviderFromObjectSubscriber<Person>(parent, parent.readonly, parent.next);

    return { parent, provider };
}

describe('FieldProviderFromObjectSubscriber', () => {
    describe('field()', () => {
        it('should be create the field on the first call and return the same instance afterwards', () => {
            const { provider } = setup(undefined);

            const first = provider.field('name');
            const second = provider.field('name');

            expect(first).toBeInstanceOf(FieldControl);
            expect(second).toBe(first);
        });

        it('should be honor the initial argument on creation and ignore it on later calls', () => {
            const { provider } = setup(undefined);

            const field = provider.field('name', 'John');

            expect(field.current()).toBe('John');
            expect((field as FieldControl<string>).initial).toBe('John');

            // the field already exists, so the second `initial` is simply dropped
            const again = provider.field('name', 'Mary');

            expect(again).toBe(field);
            expect(again.current()).toBe('John');
        });

        it('should be push the initial value of a brand new field up to the parent', () => {
            const { parent, provider } = setup(undefined);

            provider.field('name', 'John');

            expect(parent.current()).toEqual({ name: 'John' });
        });

        it('should be create and populate one field per key of the parent value on construction', () => {
            const { provider } = setup({ name: 'John', age: 30 });

            expect(provider.field('name').current()).toBe('John');
            expect(provider.field('age').current()).toBe(30);
        });
    });

    describe('child -> parent', () => {
        it('should be push a new object up with the changed key while preserving the other keys', () => {
            const { parent, provider } = setup({ name: 'John', age: 30 });

            const before = parent.current();

            provider.field('name').next('Jane');

            expect(parent.current()).toEqual({ name: 'Jane', age: 30 });
            expect(parent.current()).not.toBe(before);
        });

        it('should be not emit a new parent object when the child is set to the same value', () => {
            const { parent, provider } = setup({ name: 'John', age: 30 });

            const name = provider.field('name');

            name.next('Jane');

            const afterChange = parent.current();

            // Observable.next short circuits on identity, so the child never notifies again
            name.next('Jane');

            expect(parent.current()).toBe(afterChange);

            // and the guard inside onFieldChange keeps the identity even when called directly
            provider.onFieldChange('name', 'Jane');

            expect(parent.current()).toBe(afterChange);
        });

        it('should be build a fresh object when the parent value is not an object', () => {
            const { parent, provider } = setup('not-an-object');

            provider.field('name').next('John');

            expect(parent.current()).toEqual({ name: 'John' });
        });
    });

    describe('parent -> child', () => {
        it('should be update existing fields, create fields for new keys and reset absent ones', () => {
            const { parent, provider } = setup({ name: 'John', age: 30 });

            const name = provider.field('name');
            const age = provider.field('age');

            parent.next({ name: 'Bob', city: 'NY' });

            expect(name.current()).toBe('Bob');
            expect(provider.field('city').current()).toBe('NY');

            // `age` is absent from the new object, so it is reset to its initial value
            expect(age.current()).toBeUndefined();

            // resetting `age` does not add an `age: undefined` key back to the parent, because
            // onFieldChange compares `newValue[name] !== value` and both sides are undefined
            expect(parent.current()).toStrictEqual({ name: 'Bob', city: 'NY' });
        });

        it('should be reset every child when the parent is set to null', () => {
            const { parent, provider } = setup({ name: 'John', age: 30 });

            const name = provider.field('name');
            const age = provider.field('age');

            parent.next(null);

            expect(name.current()).toBeUndefined();
            expect(age.current()).toBeUndefined();

            // ACTUAL BEHAVIOUR (see report): resetting the first field re-enters onFieldChange while
            // `_current` is still null, which rebuilds an object and pushes it back to the parent,
            // so the parent never stays null.
            expect(parent.current()).toStrictEqual({ name: undefined });
            expect(Object.keys(parent.current())).toEqual(['name']);
        });

        it('should be reset every child when the parent is set to undefined', () => {
            const { parent, provider } = setup({ name: 'John', age: 30 });

            const name = provider.field('name');
            const age = provider.field('age');

            parent.next(undefined);

            expect(name.current()).toBeUndefined();
            expect(age.current()).toBeUndefined();
            expect(parent.current()).toStrictEqual({ name: undefined });
        });

        it('should be reset every child when the parent is set to a string', () => {
            const { parent, provider } = setup({ name: 'John', age: 30 });

            const name = provider.field('name');
            const age = provider.field('age');

            parent.next('hello');

            expect(name.current()).toBeUndefined();
            expect(age.current()).toBeUndefined();
            expect(parent.current()).toStrictEqual({ name: undefined });
        });

        it('should be reset every child when the parent is set to a number', () => {
            const { parent, provider } = setup({ name: 'John', age: 30 });

            const name = provider.field('name');
            const age = provider.field('age');

            parent.next(42);

            expect(name.current()).toBeUndefined();
            expect(age.current()).toBeUndefined();
            expect(parent.current()).toStrictEqual({ name: undefined });
        });

        it('should be not loop back into the children when the parent emission came from a child', () => {
            const { parent, provider } = setup({ name: 'John', age: 30 });

            const name = provider.field('name');
            const age = provider.field('age');

            const ageEmissions: unknown[] = [];

            age.subscribe((value) => ageEmissions.push(value), true);

            name.next('Jane');

            expect(parent.current()).toEqual({ name: 'Jane', age: 30 });
            expect(ageEmissions).toHaveLength(0);

            // `parent.current()` is exactly the object the provider stored in `_current`,
            // so replaying it is short circuited by `newValue === this._current`
            provider.onParentFieldChange(parent.current());

            expect(ageEmissions).toHaveLength(0);
            expect(age.current()).toBe(30);
        });
    });

    describe('onParentFieldChildError', () => {
        it('should be place a flat error on the matching child field', () => {
            const { parent, provider } = setup({ name: 'John' });

            const name = provider.field('name');

            parent.nextChildError('name', 'required');

            expect(name.error.current()).toBe('required');
        });

        it('should be forward a dotted key as a child error of the first segment', () => {
            const { parent, provider } = setup({});

            const address = provider.field('address');

            parent.nextChildError('address.street', 'bad');

            expect(address.childError.current()).toEqual({ street: 'bad' });
            expect(address.error.current()).toBeNull();
        });

        it('should be clear errors and child errors of the fields missing from the error map', () => {
            const { parent, provider } = setup({});

            const name = provider.field('name');
            const address = provider.field('address');

            parent.nextChildError('name', 'required');
            parent.nextChildError('address.street', 'bad');

            expect(name.error.current()).toBe('required');
            expect(address.childError.current()).toEqual({ street: 'bad' });

            // an empty error map handles no key at all, so everything is cleared
            parent.clearChildErrors();

            expect(name.error.current()).toBeNull();
            expect(address.error.current()).toBeNull();
            expect(address.childError.current()).toEqual({});
        });

        it('should be create the field when the error targets an unknown key', () => {
            const { parent, provider } = setup({});

            parent.nextChildError('name', 'required');

            expect(provider.field('name').error.current()).toBe('required');

            parent.clearChildErrors();
            parent.nextChildError('address.street', 'bad');

            expect(provider.field('address').childError.current()).toEqual({ street: 'bad' });
        });
    });

    describe('destroy()', () => {
        it('should be stop receiving parent value changes', () => {
            const { parent, provider } = setup({ name: 'John', age: 30 });

            const name = provider.field('name');

            provider.destroy();

            parent.next({ name: 'Bob', age: 99 });

            expect(name.current()).toBe('John');
        });

        it('should be stop receiving parent child errors', () => {
            const { parent, provider } = setup({ name: 'John' });

            const name = provider.field('name');

            provider.destroy();

            parent.nextChildError('name', 'required');

            expect(name.error.current()).toBeNull();
        });
    });
});
