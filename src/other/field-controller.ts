import { Field } from './field';
import { InitialValue } from '../types/initial-value';
import { FieldError } from '../types/field-error';
import { Dispatch } from 'open-observable';

export class FieldController<T = any> extends Field<T> {
    private defaultValue?: T;

    constructor(initial: InitialValue<T>) {
        super(initial);
    }

    public next(value: Dispatch<T>) {
        super.next(value);
        this._changed.next(value !== (this.defaultValue === undefined ? this._initial : this.defaultValue));
    }

    public nextDefault(value?: T) {
        this.defaultValue = value;
        this.next(value ?? this._initial);
        this.nextError(null);
    }

    public nextError(error: FieldError) {
        this._error.next(error);
    }

    public clear() {
        this.defaultValue = undefined;
        this.next(this._initial);
    }

    public reset() {
        this.next(this.defaultValue ?? this._initial);
        this.nextError(null);
    }

    public get initial(): InitialValue<T> {
        return this._initial;
    }
}
