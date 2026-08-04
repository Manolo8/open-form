import { Observable } from 'open-observable';
import { Field } from '../field';

it('should round-trip the field error', function () {
    const field = new Field(1, new Observable(false));

    expect(field.error.current()).toBeNull();

    field.nextError('required');

    expect(field.error.current()).toBe('required');

    field.nextError(['a', 'b']);

    expect(field.error.current()).toEqual(['a', 'b']);

    field.nextError(null);

    expect(field.error.current()).toBeNull();
});

it('should merge multiple child errors into a single record', function () {
    const field = new Field(1, new Observable(false));

    expect(field.childError.current()).toEqual({});

    field.nextChildError('street', 'invalid street');

    expect(field.childError.current()).toEqual({ street: 'invalid street' });

    field.nextChildError('city', ['too short', 'unknown']);

    expect(field.childError.current()).toEqual({
        street: 'invalid street',
        city: ['too short', 'unknown'],
    });

    //re-using the same key overwrites only that key
    field.nextChildError('street', null);

    expect(field.childError.current()).toEqual({ street: null, city: ['too short', 'unknown'] });
});

it('should empty the child errors when clearChildErrors is called', function () {
    const field = new Field(1, new Observable(false));

    field.nextChildError('street', 'invalid');
    field.nextChildError('city', 'invalid');

    expect(Object.keys(field.childError.current())).toHaveLength(2);

    field.clearChildErrors();

    expect(field.childError.current()).toEqual({});
});

it('should round-trip the disabled flag', function () {
    const field = new Field(1, new Observable(false));

    expect(field.disabled.current()).toBe(false);

    field.nextDisabled(true);

    expect(field.disabled.current()).toBe(true);

    field.nextDisabled(false);

    expect(field.disabled.current()).toBe(false);
});

it('should expose the very same readonly subscriber it received and reflect later changes', function () {
    const readonly = new Observable(false);
    const field = new Field(1, readonly);

    //the getter hands back the exact instance, it is not wrapped/copied
    expect(field.readonly).toBe(readonly);
    expect(field.readonly.current()).toBe(false);

    readonly.next(true);

    expect(field.readonly.current()).toBe(true);
});

it('should report hasErrorHandler based on the amount of error subscribers', function () {
    const field = new Field(1, new Observable(false));
    const errorObservable = field.error as Observable<any>;

    expect(errorObservable.watchingCount()).toBe(0);
    expect(field.hasErrorHandler()).toBe(false);

    const cleanupFirst = field.error.subscribe(() => undefined);

    expect(errorObservable.watchingCount()).toBe(1);
    expect(field.hasErrorHandler()).toBe(true);

    const cleanupSecond = field.error.subscribe(() => undefined);

    expect(errorObservable.watchingCount()).toBe(2);
    expect(field.hasErrorHandler()).toBe(true);

    cleanupFirst();

    //still one subscriber left
    expect(errorObservable.watchingCount()).toBe(1);
    expect(field.hasErrorHandler()).toBe(true);

    cleanupSecond();

    expect(errorObservable.watchingCount()).toBe(0);
    expect(field.hasErrorHandler()).toBe(false);

    //running the same cleanup twice is a no-op, the count does not go negative
    cleanupSecond();

    expect(errorObservable.watchingCount()).toBe(0);
    expect(field.hasErrorHandler()).toBe(false);
});

it('should not consider a childError subscriber as an error handler', function () {
    const field = new Field(1, new Observable(false));

    field.childError.subscribe(() => undefined);

    expect(field.hasErrorHandler()).toBe(false);
});

it('should start with changed as false and never flip it from the base class', function () {
    const field = new Field(1, new Observable(false));

    expect(field.changed.current()).toBe(false);

    //Field.next is the plain Observable.next, it does not maintain the changed flag
    field.next(2);

    expect(field.current()).toBe(2);
    expect(field.changed.current()).toBe(false);
});

it('should resolve a function initial value on construction', function () {
    const field = new Field(() => 42, new Observable(false));

    expect(field.current()).toBe(42);
});
