import { Observable } from 'open-observable';
import { FieldControl } from '../field-control';

it('should check the is changed property of field-controller', function () {
    const field = new FieldControl(1, new Observable(false));

    expect(field.current()).toBe(1);
    expect(field.changed.current()).toBeFalsy();

    field.next(2);

    expect(field.changed.current()).toBeTruthy();

    field.next(1);

    expect(field.changed.current()).toBeFalsy();
});

it('should check the is changed property of field-controller when default value is changed', function () {
    const field = new FieldControl(1, new Observable(false));

    field.nextDefault(2);

    expect(field.changed.current()).toBeFalsy();

    field.next(1);

    expect(field.changed.current()).toBeTruthy();
});

it('should expose the raw initial value through the initial getter', function () {
    const field = new FieldControl(1, new Observable(false));

    expect(field.initial).toBe(1);

    const factory = () => 5;
    const lazyField = new FieldControl(factory, new Observable(false));

    //the getter returns the factory itself, not the resolved value
    expect(lazyField.initial).toBe(factory);
    expect(lazyField.current()).toBe(5);
});

it('should drop the stored default value when clear is called', function () {
    const field = new FieldControl(1, new Observable(false));

    field.nextDefault(2);

    expect(field.current()).toBe(2);

    field.clear();

    expect(field.current()).toBe(1);
    expect(field.changed.current()).toBeFalsy();

    field.next(9);

    expect(field.changed.current()).toBeTruthy();

    //the default was dropped by clear, so reset falls back to the initial value
    field.reset();

    expect(field.current()).toBe(1);
    expect(field.changed.current()).toBeFalsy();
});

it('should reset to the default value when one was set, otherwise to the initial value', function () {
    const withDefault = new FieldControl(1, new Observable(false));

    withDefault.nextDefault(2);
    withDefault.next(7);

    expect(withDefault.changed.current()).toBeTruthy();

    withDefault.reset();

    expect(withDefault.current()).toBe(2);
    expect(withDefault.changed.current()).toBeFalsy();

    const withoutDefault = new FieldControl(1, new Observable(false));

    withoutDefault.next(7);
    withoutDefault.reset();

    expect(withoutDefault.current()).toBe(1);
    expect(withoutDefault.changed.current()).toBeFalsy();
});

it('should clear the field error and the child errors on reset', function () {
    const field = new FieldControl(1, new Observable(false));

    field.nextDefault(2);
    field.nextError('boom');
    field.nextChildError('street', 'invalid');

    expect(field.error.current()).toBe('boom');
    expect(field.childError.current()).toEqual({ street: 'invalid' });

    field.reset();

    expect(field.error.current()).toBeNull();
    expect(field.childError.current()).toEqual({});
});

it('should clear the field error and the child errors on next', function () {
    const field = new FieldControl(1, new Observable(false));

    field.nextError('boom');
    field.nextChildError('street', 'invalid');

    field.next(2);

    expect(field.error.current()).toBeNull();
    expect(field.childError.current()).toEqual({});

    field.nextError('boom again');
    field.nextChildError('street', 'invalid again');

    //even a next that does not actually change the value still clears the errors
    field.next(2);

    expect(field.current()).toBe(2);
    expect(field.error.current()).toBeNull();
    expect(field.childError.current()).toEqual({});
});

it('should not re-invoke the initial factory on every next', function () {
    let calls = 0;

    const field = new FieldControl(() => {
        calls++;
        return 5;
    }, new Observable(false));

    //once for the Observable constructor, the resolved value is kept as the baseline
    expect(calls).toBe(1);
    expect(field.current()).toBe(5);
    expect(field.changed.current()).toBeFalsy();

    field.next(6);

    expect(calls).toBe(1);
    expect(field.changed.current()).toBeTruthy();

    field.next(5);

    expect(calls).toBe(1);
    expect(field.changed.current()).toBeFalsy();

    //the factory is invoked again only to build the new value of a clean point
    field.reset();

    expect(calls).toBe(2);
    expect(field.current()).toBe(5);
    expect(field.changed.current()).toBeFalsy();
});

it('should fall back to the initial value when nextDefault receives undefined', function () {
    const field = new FieldControl(1, new Observable(false));

    field.nextDefault(5);

    expect(field.current()).toBe(5);
    expect(field.changed.current()).toBeFalsy();

    field.nextDefault(undefined);

    expect(field.current()).toBe(1);
    expect(field.changed.current()).toBeFalsy();

    //the default was really removed, so the baseline is the initial value again
    field.next(5);

    expect(field.changed.current()).toBeTruthy();
});

it('should mark an object field as changed when a deep-equal but new object is pushed', function () {
    //the changed baseline uses !==, so it is a reference comparison by design.
    //A structurally identical but newly allocated object/array counts as a change.
    const initial = { a: 1 };
    const field = new FieldControl(initial, new Observable(false));

    expect(field.changed.current()).toBeFalsy();

    field.next({ a: 1 });

    expect(field.current()).toEqual(initial);
    expect(field.changed.current()).toBeTruthy();

    //only putting the very same reference back clears the changed flag
    field.next(initial);

    expect(field.changed.current()).toBeFalsy();
});

it('should mark an array field as changed when a deep-equal but new array is pushed', function () {
    const initial: number[] = [];
    const field = new FieldControl(initial, new Observable(false));

    field.next([]);

    expect(field.current()).toEqual([]);
    expect(field.changed.current()).toBeTruthy();

    field.next(initial);

    expect(field.changed.current()).toBeFalsy();
});

it('should clear the changed flag on reset when the initial factory returns a new object every call', function () {
    //regression for the baseline that used to be recomputed by re-invoking the factory:
    //a fresh object could never match the current value, so the field stayed changed forever
    const field = new FieldControl(() => ({ a: 1 }), new Observable(false));

    expect(field.changed.current()).toBeFalsy();

    field.next({ a: 1 });

    expect(field.changed.current()).toBeTruthy();

    field.reset();

    expect(field.current()).toEqual({ a: 1 });
    expect(field.changed.current()).toBeFalsy();

    //the value pushed by reset is the new baseline, so a deep-equal copy is still a change
    field.next({ a: 1 });

    expect(field.changed.current()).toBeTruthy();
});

it('should build a fresh value from the factory on every clean point instead of sharing one', function () {
    const field = new FieldControl<{ a: number }>(() => ({ a: 1 }), new Observable(false));

    const first = field.current();

    field.next({ a: 2 });
    field.reset();

    const second = field.current();

    expect(second).toEqual({ a: 1 });
    expect(second).not.toBe(first);
    expect(field.changed.current()).toBeFalsy();

    field.next({ a: 3 });
    field.clear();

    const third = field.current();

    expect(third).toEqual({ a: 1 });
    expect(third).not.toBe(second);
    expect(field.changed.current()).toBeFalsy();
});

it('should keep the changed flag false right after a clean point built from a factory default', function () {
    //regression: nextDefault/clear/reset must all record the exact value they pushed
    const field = new FieldControl(() => ({ a: 1 }), new Observable(false));

    field.nextDefault({ a: 9 });

    expect(field.current()).toEqual({ a: 9 });
    expect(field.changed.current()).toBeFalsy();

    field.next({ a: 10 });

    expect(field.changed.current()).toBeTruthy();

    field.reset();

    //reset goes back to the stored default, which is still the baseline
    expect(field.current()).toEqual({ a: 9 });
    expect(field.changed.current()).toBeFalsy();

    field.clear();

    expect(field.current()).toEqual({ a: 1 });
    expect(field.changed.current()).toBeFalsy();
});
