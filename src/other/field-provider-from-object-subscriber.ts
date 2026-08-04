import { ISubscriber } from 'open-observable';
import IFieldProvider from '../types/i-field-provider';
import { InitialValue } from '../types/initial-value';
import { Field } from './field';
import { FieldControl } from './field-control';
import { FieldError } from '../types/field-error';

export default class FieldProviderFromObjectSubscriber<T> implements IFieldProvider<T> {
    private readonly _fields: Map<string, FieldControl<any>> = new Map();
    private readonly _destroyCallbacks: (() => void)[] = [];

    private _current?: T;

    constructor(
        _parentField: Field<T>,
        private readonly _readonly: ISubscriber<boolean>,
        private readonly _next: (value: T) => void
    ) {
        this.field = this.field.bind(this);
        this.createField = this.createField.bind(this);
        this.onFieldChange = this.onFieldChange.bind(this);
        this.onParentFieldChange = this.onParentFieldChange.bind(this);
        this.onParentFieldChildError = this.onParentFieldChildError.bind(this);
        this.destroy = this.destroy.bind(this);

        this._destroyCallbacks.push(_parentField.subscribe(this.onParentFieldChange));
        this._destroyCallbacks.push(_parentField.childError.subscribe(this.onParentFieldChildError));
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

    onParentFieldChange(newValue: T) {
        if (newValue === this._current) return;

        this._current = newValue;

        if (newValue == null || typeof newValue !== 'object') {
            this._fields.forEach((field) => field.reset());

            return;
        }

        const usedKeys = new Set<string>();

        for (const name in newValue) {
            const field = this.field(name);

            usedKeys.add(name);

            field.next(newValue[name]);
        }

        this._fields.forEach((field, name) => {
            if (!usedKeys.has(name)) {
                field.reset();
            }
        });
    }

    onFieldChange(name: string, value: any) {
        const current = this._current;

        let newValue: any = current;

        if (newValue == null || typeof newValue !== 'object') {
            newValue = { [name]: value } as T;
        } else if (newValue[name] !== value) {
            newValue = { ...newValue, [name]: value };
        }

        if (newValue !== current) {
            this._current = newValue;
            this._next(newValue);
        }
    }

    onParentFieldChildError(errors: Record<string, FieldError>) {
        const handledKeys = new Set<string>();

        for (const [path, error] of Object.entries(errors)) {
            const indexOfDot = path.indexOf('.');

            if (indexOfDot > -1) {
                const parent = path.substring(0, indexOfDot);
                const child = path.substring(indexOfDot + 1);

                const field = this.field(parent as any, undefined);

                field.nextChildError(child, error);

                handledKeys.add(parent);
            } else {
                const field = this.field(path as any, undefined);

                field.nextError(error);

                handledKeys.add(path);
            }
        }

        this._fields.forEach((field, name) => {
            if (!handledKeys.has(name)) {
                field.nextError(null);
                field.clearChildErrors();
            }
        });
    }

    destroy() {
        this._destroyCallbacks.forEach((callback) => callback());
    }
}
