import { Observable } from 'open-observable';
import { FieldList } from '../field-list';
import { FieldControl } from '../field-control';

const makeList = () => new FieldList(new Observable(false));

//field() is typed as Field but always returns the underlying FieldControl
const control = (list: FieldList, name: string, initial?: any): FieldControl =>
    list.field(name, initial) as FieldControl;

it('should create a field only once and return the very same instance', function () {
    const list = makeList();

    const first = list.field('name', 1);
    const second = list.field('name', 2);

    expect(second).toBe(first);
    //the second initial is ignored because the current value is not undefined
    expect(first.current()).toBe(1);
    expect(list.fields).toEqual(['name']);
});

it('should apply the given initial value only when the existing field holds undefined', function () {
    const list = makeList();

    const field = control(list, 'name', undefined);

    expect(field.current()).toBeUndefined();

    const again = control(list, 'name', 5);

    expect(again).toBe(field);
    expect(field.current()).toBe(5);

    //side effect: the value went through FieldControl.next, and the baseline is the
    //field _initial (undefined), so the field is now considered changed
    expect(field.changed.current()).toBe(true);
    expect(list.changes.current()).toBe(1);

    //once it holds a value the initial argument is ignored again
    control(list, 'name', 99);

    expect(field.current()).toBe(5);
});

it('should list the field names in insertion order', function () {
    const list = makeList();

    list.field('z', 1);
    list.field('a', 2);
    list.field('m', 3);

    expect(list.fields).toEqual(['z', 'a', 'm']);

    //asking again does not re-order
    list.field('z', 1);

    expect(list.fields).toEqual(['z', 'a', 'm']);
});

it('should only list the fields that have an error subscriber', function () {
    const list = makeList();

    const a = list.field('a', 1);
    const b = list.field('b', 2);
    const c = list.field('c', 3);

    expect(list.fieldsHandlingErrors).toEqual([]);

    const cleanupB = b.error.subscribe(() => undefined);

    expect(list.fieldsHandlingErrors).toEqual(['b']);

    //a childError subscriber does not count as an error handler
    c.childError.subscribe(() => undefined);

    expect(list.fieldsHandlingErrors).toEqual(['b']);

    a.error.subscribe(() => undefined);

    expect(list.fieldsHandlingErrors).toEqual(['a', 'b']);

    cleanupB();

    expect(list.fieldsHandlingErrors).toEqual(['a']);
});

it('should set a default for every key of the object given to fromObject', function () {
    const list = makeList();

    const a = control(list, 'a', 1);

    list.fromObject({ a: 10, c: 30 });

    const c = control(list, 'c');

    expect(a.current()).toBe(10);
    expect(a.changed.current()).toBe(false);
    expect(c.current()).toBe(30);
    expect(c.changed.current()).toBe(false);
    expect(list.changes.current()).toBe(0);

    //the value coming from the object became the new default used by reset
    a.next(1);

    expect(a.changed.current()).toBe(true);

    a.reset();

    expect(a.current()).toBe(10);
});

it('should clear the fields that are missing from the object given to fromObject', function () {
    const list = makeList();

    const a = control(list, 'a', 1);
    const b = control(list, 'b', 2);

    list.fromObject({ a: 10, b: 20 });

    expect(b.current()).toBe(20);

    list.fromObject({ a: 11 });

    //b was absent, so it was cleared: back to its own initial value
    expect(b.current()).toBe(2);
    expect(b.changed.current()).toBe(false);
    //the field is kept in the map, it is not removed
    expect(list.fields).toEqual(['a', 'b']);

    //the previous default (20) was dropped by clear, reset goes to the initial value
    b.next(77);
    b.reset();

    expect(b.current()).toBe(2);
});

it('should send every field back to its initial value when fromObject receives undefined', function () {
    const list = makeList();

    let factoryCalls = 0;

    const a = control(list, 'a', 1);
    const lazy = control(list, 'lazy', () => {
        factoryCalls++;
        return 7;
    });

    expect(factoryCalls).toBe(1);

    a.next(5);
    lazy.next(8);

    a.nextError('boom');
    a.nextChildError('street', 'invalid');

    list.fromObject(undefined);

    expect(a.current()).toBe(1);
    expect(lazy.current()).toBe(7);
    //the factory is invoked once on construction and once by the clear branch of
    //fromObject; the changed baseline never re-invokes it
    expect(factoryCalls).toBe(2);
    expect(a.error.current()).toBeNull();
    expect(a.childError.current()).toEqual({});
    expect(a.changed.current()).toBe(false);
    expect(list.changes.current()).toBe(0);
});

it('should drop the stored default when fromObject receives undefined', function () {
    //regression: the clear branch of fromObject used to push the *initial* value without
    //dropping the default, so the field stayed changed and reset resurrected the old data
    const list = makeList();

    const b = control(list, 'b', 1);

    list.fromObject({ b: 5 });

    expect(b.current()).toBe(5);
    expect(b.changed.current()).toBe(false);

    list.fromObject(undefined);

    expect(b.current()).toBe(1);
    expect(b.changed.current()).toBe(false);
    expect(list.changes.current()).toBe(0);

    //the default was dropped, so reset lands on the initial value again
    b.next(77);
    b.reset();

    expect(b.current()).toBe(1);
});

it('should clear the child errors of every field when fromObject receives undefined', function () {
    const list = makeList();

    const a = control(list, 'a', 1);

    list.fromObject({ a: 5 });

    a.nextError('boom');
    a.nextChildError('street', 'invalid');

    list.fromObject(undefined);

    expect(a.error.current()).toBeNull();
    expect(a.childError.current()).toEqual({});
});

it('should build a plain object skipping only the fields holding undefined', function () {
    const list = makeList();

    list.field('a', 1);
    list.field('nul', null);
    list.field('undef', undefined);
    list.field('empty', '');
    list.field('zero', 0);
    list.field('bool', false);

    const result = list.toObject();

    //`null` is an explicit value and is sent; `undefined` means never set and is omitted
    expect(Object.keys(result)).toEqual(['a', 'nul', 'empty', 'zero', 'bool']);
    expect(result.a).toBe(1);
    expect(result.nul).toBeNull();
    expect(result.empty).toBe('');
    expect(result.zero).toBe(0);
    expect(result.bool).toBe(false);
    expect('undef' in result).toBe(false);
});

it('should keep a field that becomes null after being created with a value', function () {
    const list = makeList();

    const a = control(list, 'a', 1);

    expect(list.toObject()).toEqual({ a: 1 });

    a.next(null);

    expect('a' in list.toObject()).toBe(true);
    expect(list.toObject().a).toBeNull();
});

it('should skip a field that becomes undefined after being created with a value', function () {
    const list = makeList();

    const a = control(list, 'a', 1);

    expect(list.toObject()).toEqual({ a: 1 });

    a.next(undefined);

    expect('a' in list.toObject()).toBe(false);
});

it('should reset every field of the list', function () {
    const list = makeList();

    const a = control(list, 'a', 1);
    const b = control(list, 'b', 'x');

    list.fromObject({ a: 10, b: 'y' });

    a.next(99);
    b.next('zzz');

    expect(list.changes.current()).toBe(2);

    list.reset();

    expect(a.current()).toBe(10);
    expect(b.current()).toBe('y');
    expect(a.changed.current()).toBe(false);
    expect(b.changed.current()).toBe(false);
    expect(list.changes.current()).toBe(0);
});

it('should set a flat error on the matching field', function () {
    const list = makeList();

    const name = control(list, 'name', '');

    list.error({ name: 'required' });

    expect(name.error.current()).toBe('required');

    list.error({ name: ['too short', 'invalid'] });

    expect(name.error.current()).toEqual(['too short', 'invalid']);
});

it('should route a dotted error key to the child error of the parent field', function () {
    const list = makeList();

    const address = control(list, 'address', undefined);

    list.error({ 'address.street': 'invalid', 'address.city': 'required' });

    expect(address.error.current()).toBeNull();
    expect(address.childError.current()).toEqual({ street: 'invalid', city: 'required' });
});

it('should split a dotted error key only on the first dot', function () {
    const list = makeList();

    list.error({ 'a.b.c': 'deep' });

    const a = control(list, 'a');

    expect(list.fields).toEqual(['a']);
    expect(a.childError.current()).toEqual({ 'b.c': 'deep' });
});

it('should create the field when an error targets an unknown name', function () {
    const list = makeList();

    list.error({ unknown: 'oops', 'other.child': 'nested' });

    expect(list.fields).toEqual(['unknown', 'other']);

    const unknown = control(list, 'unknown');
    const other = control(list, 'other');

    expect(unknown.current()).toBeUndefined();
    expect(unknown.error.current()).toBe('oops');
    expect(other.childError.current()).toEqual({ child: 'nested' });
});

it('should count how many fields are dirty', function () {
    const list = makeList();

    const a = control(list, 'a', 1);
    const b = control(list, 'b', 2);

    expect(list.changes.current()).toBe(0);

    a.next(10);

    expect(list.changes.current()).toBe(1);

    //a stays dirty, further changes must not double count
    a.next(11);
    a.next(12);

    expect(list.changes.current()).toBe(1);

    b.next(20);

    expect(list.changes.current()).toBe(2);

    a.next(1);

    expect(list.changes.current()).toBe(1);

    b.next(2);

    expect(list.changes.current()).toBe(0);
});

it('should decrement the changes counter when a field goes back to its default', function () {
    const list = makeList();

    const a = control(list, 'a', 1);

    list.fromObject({ a: 10 });

    expect(list.changes.current()).toBe(0);

    a.next(1);

    expect(list.changes.current()).toBe(1);

    a.next(10);

    expect(list.changes.current()).toBe(0);
});

it('should emit the last change with the name of the field that changed', function () {
    const list = makeList();

    expect(list.lastChange.current()).toEqual({ name: '', value: '', oldValue: '' });

    //regression: creating a field must not emit, the subscription ignores the first call
    const a = control(list, 'a', 1);

    expect(list.lastChange.current()).toEqual({ name: '', value: '', oldValue: '' });

    a.next(2);

    expect(list.lastChange.current()).toEqual({ name: 'a', value: 2, oldValue: 1 });

    const b = control(list, 'b', 'x');

    //creating another field leaves the previous emission untouched
    expect(list.lastChange.current()).toEqual({ name: 'a', value: 2, oldValue: 1 });

    b.next('y');

    expect(list.lastChange.current()).toEqual({ name: 'b', value: 'y', oldValue: 'x' });

    a.next(3);

    expect(list.lastChange.current()).toEqual({ name: 'a', value: 3, oldValue: 2 });

    //a next that does not change the value emits nothing
    a.next(3);

    expect(list.lastChange.current()).toEqual({ name: 'a', value: 3, oldValue: 2 });
});

it('should emit the last change when the list resets a field', function () {
    const list = makeList();

    const a = control(list, 'a', 1);
    const b = control(list, 'b', 2);

    a.next(10);
    b.next(20);

    list.reset();

    //reset walks the map in insertion order, so the last emission comes from b
    expect(list.lastChange.current()).toEqual({ name: 'b', value: 2, oldValue: 20 });
});
