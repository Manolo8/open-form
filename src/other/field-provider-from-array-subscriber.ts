import { ISubscriber } from 'open-observable';
import IFieldProvider from '../types/i-field-provider';
import { InitialValue } from '../types/initial-value';
import { Field } from './field';
import { FieldControl } from './field-control';

export default class FieldProviderFromArraySubscriber<T> implements IFieldProvider<T> {
    private _fields: Map<string, FieldControl<any>> = new Map();
    private readonly _destroyCallbacks: (() => void)[] = [];

    private _current?: T[];

    constructor(
        _subscriber: ISubscriber<T[]>,
        private readonly _readonly: ISubscriber<boolean>,
        private readonly _next: (value: (old: T[]) => void) => void,
        private readonly _index: number
    ) {
        this.field = this.field.bind(this);
        this.createField = this.createField.bind(this);
        this.onFieldChange = this.onFieldChange.bind(this);
        this.onParentFieldChange = this.onParentFieldChange.bind(this);
        this.destroy = this.destroy.bind(this);

        this._current = _subscriber.current();

        this._destroyCallbacks.push(_subscriber.subscribe(this.onParentFieldChange));
    }

    field<TType extends keyof T>(name: TType, initial?: InitialValue): Field<T[TType]> {
        return (this._fields.get(name as unknown as string) as Field<T[TType]>) ?? this.createField(name, initial);
    }

    createField<TType extends keyof T>(name: TType, initial?: InitialValue): Field<T[TType]> {
        const field = new FieldControl<T[TType]>(initial, this._readonly);

        this._fields.set(name as unknown as string, field);

        field.subscribe((value) => this.onFieldChange(name as unknown as string, value));

        return field;
    }

    onParentFieldChange(newValue: T[]) {
        if (newValue === this._current) {
            return;
        }

        const old = this._current;

        this._current = newValue;

        if (newValue.length <= this._index || (old && newValue[this._index] === old[this._index])) {
            return;
        }

        const newValueItem = newValue[this._index] as Record<string, any>;

        const notUsedKeys = new Set<string>(this._fields.keys());

        for (const name in newValueItem) {
            notUsedKeys.delete(name);

            if (!this._fields.has(name)) {
                continue;
            }

            const field = this._fields.get(name) as FieldControl<any>;

            field.next(newValueItem[name]);
        }

        notUsedKeys.forEach((name) => {
            this._fields.get(name)?.reset();
        });
    }

    onFieldChange(name: string, value: any) {
        this._next((old) => {
            if (!Array.isArray(old)) {
                return [];
            }

            if (old.length <= this._index) {
                return old;
            }

            const oldValues = old[this._index] as Record<string, any>;

            if (name in oldValues && oldValues[name] === value) {
                return old;
            }

            const newValues = [...old];

            newValues[this._index] = { ...oldValues, [name]: value } as T;

            this._current = newValues;

            return newValues;
        });
    }

    destroy() {
        this._destroyCallbacks.forEach((callback) => callback());
    }
}
