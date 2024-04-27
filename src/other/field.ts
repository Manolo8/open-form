import { InitialValue } from '../types/initial-value';
import { ISubscriber, Observable } from 'open-observable';
import { FieldError } from '../types/field-error';

export class Field<T = any> extends Observable<T> {
    protected _error: Observable<FieldError>;
    protected _changed: Observable<boolean>;
    protected _disabled: Observable<boolean>;
    protected _readonly: ISubscriber<boolean>;
    protected _initial: InitialValue<T>;

    constructor(initial: InitialValue<T>, readonly: ISubscriber<boolean>) {
        super(initial);
        this._initial = initial;
        this._readonly = readonly;
        
        this._error = new Observable<FieldError>(null);
        this._changed = new Observable<boolean>(false);
        this._disabled = new Observable<boolean>(false);

        this.next = this.next.bind(this);
    }

    public get changed(): ISubscriber<boolean> {
        return this._changed.asSubscriber();
    }

    public get disabled(): ISubscriber<boolean> {
        return this._disabled.asSubscriber();
    }

    public get readonly(): ISubscriber<boolean> {
        return this._readonly;
    }

    public nextError(error: FieldError) {
        this._error.next(error);
    }

    public nextDisabled(disabled: boolean) {
        this._disabled.next(disabled);
    }

    public get error(): ISubscriber<FieldError> {
        return this._error.asSubscriber();
    }

    hasErrorHandler(): boolean {
        return this._error.watchingCount() > 0;
    }
}
