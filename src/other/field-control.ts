import {Dispatch, ISubscriber} from 'open-observable';
import { InitialValue } from '../types/initial-value';
import { Field } from './field';

export class FieldControl<T = any> extends Field<T> {
    private defaultValue?: T;

    constructor(initial: InitialValue<T>, readonly: ISubscriber<boolean>) {
        super(initial, readonly);
    }

    public next(value: Dispatch<T>) {
        super.next(value);
        this._changed.next(value !== (this.defaultValue === undefined ? this._initial : this.defaultValue));
        this.nextError(null);
    }

    public nextDefault(value?: T) {
        this.defaultValue = value;
        this.next(value ?? this._initial);
        this.nextError(null);
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
