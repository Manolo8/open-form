import { InitialValue } from '../../types/initial-value';
import { Dispatch, ISubscriber, Observable } from 'open-observable';
import { FieldError } from '../../types/field-error';

export class Field<T = any> {
    protected _initial: InitialValue<T>;
    protected _error: Observable<FieldError>;
    protected _changed: Observable<boolean>;
    protected _value: Observable<T>;

    constructor(initial: InitialValue<T>) {
        this._initial = initial;
        this._value = new Observable<T>(initial);
        this._error = new Observable<FieldError>(null);
        this._changed = new Observable<boolean>(false);

        this.next = this.next.bind(this);
    }

    public get error(): ISubscriber<FieldError> {
        return this._error.asSubscriber();
    }

    public get changed(): ISubscriber<boolean> {
        return this._changed.asSubscriber();
    }

    public get value(): ISubscriber<T> {
        return this._value.asSubscriber();
    }

    public next(value: Dispatch<T>) {
        this._value.next(value);
    }
}
