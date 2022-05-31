import { InitialValue } from '../types/initial-value';
import { Callback, Dispatch, ISubscriber, Observable } from 'open-observable';
import { FieldError } from '../types/field-error';
import { CleanupCallback } from 'open-observable/build/types/cleanup-callback';

export class Field<T = any> implements ISubscriber<T> {
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

    public next(value: Dispatch<T>) {
        this._value.next(value);
    }

    current(): T {
        return this._value.current();
    }

    subscribe(callback: Callback<T>, ignoreFirst?: boolean): CleanupCallback {
        return this._value.subscribe(callback, ignoreFirst);
    }
}
