import {Dispatch, ISubscriber} from 'open-observable';
import { InitialValue } from '../types/initial-value';
import { Field } from './field';

export class FieldControl<T = any> extends Field<T> {
    private defaultValue?: T;
    private _baseline?: T;

    constructor(initial: InitialValue<T>, readonly: ISubscriber<boolean>) {
        super(initial, readonly);

        this._baseline = this.current();
    }

    public next(value: Dispatch<T>) {
        super.next(value);

        this._changed.next(this.current() !== this._baseline);
        this.nextError(null);
        this.clearChildErrors();
    }

    public nextDefault(value?: T) {
        this.defaultValue = value;
        this.nextClean(value ?? this.resolveInitial());
        this.nextError(null);
        this.clearChildErrors();
    }

    public clear() {
        this.defaultValue = undefined;
        this.nextClean(this.resolveInitial());
    }

    public reset() {
        this.nextClean(this.defaultValue ?? this.resolveInitial());
        this.nextError(null);
        this.clearChildErrors();
    }

    public get initial(): InitialValue<T> {
        return this._initial;
    }

    //establishes a new clean point: the given value becomes the baseline used by changed
    private nextClean(value: T) {
        this._baseline = value;
        this.next(value);
    }

    private resolveInitial(): T {
        return typeof this._initial === 'function' ? (this._initial as () => T)() : (this._initial as T);
    }
}
