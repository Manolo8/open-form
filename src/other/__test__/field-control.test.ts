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
