import { InitialValue } from '../types/initial-value';
import { FieldControl } from './field-control';
import { Field } from './field';
import { FieldError } from '../types/field-error';
import { ISubscriber, Observable } from 'open-observable';
import { LastChange } from '../types/last-change';

export class FieldList {
    private readonly _fields: Record<string, FieldControl>;
    private readonly _changes: Observable<number>;
    private readonly _lastChange: Observable<LastChange>;

    constructor() {
        this._fields = {};
        this._changes = new Observable<number>(0);
        this._lastChange = new Observable({ name: '', value: '', oldValue: '' });
    }

    public reset() {
        Object.values(this._fields).forEach((x) => x.reset());
    }

    public get changes(): ISubscriber<number> {
        return this._changes.asSubscriber();
    }

    public get lastChange(): ISubscriber<LastChange> {
        return this._lastChange.asSubscriber();
    }

    public fromObject(object: any): void {
        if (object) this.extractAndClear(object);
        else this.clear();
    }

    private extractAndClear(object: any) {
        const oldNames = new Set(Object.keys(this._fields));

        this.deepExtract(oldNames, object, '');

        oldNames.forEach((x) => this.getOrCreate(x).clear());
    }

    private deepExtract(oldNames: Set<string>, object: any, path: string) {
        for (const key in object) {
            const currentPath = path ? path + '.' + key : key;
            if (typeof object[key] === 'object' && !Array.isArray(object[key])) {
                this.deepExtract(oldNames, object[key], currentPath);
            } else {
                this.getOrCreate(currentPath).nextDefault(object[key]);
                oldNames.delete(currentPath);
            }
        }
    }

    private clear() {
        const fields = Object.values(this._fields);

        for (const field of fields) {
            const initial = field.initial;

            field.next(typeof initial === 'function' ? initial() : initial);
            field.nextError(null);
        }
    }

    public toObject(): any {
        const building = {} as any;
        const entries = Object.entries(this._fields);

        for (const [key, field] of entries) {
            const value = field.value.current();

            if (value === null) continue;

            const spl = key.split('.');

            let path = building;

            if (spl.length > 1) {
                for (let i = 0; i < spl.length - 1; i++) {
                    if (!path[spl[i]]) path[spl[i]] = {};

                    path = path[spl[i]];
                }
            }

            path[spl[spl.length - 1]] = value;
        }

        return building;
    }

    public error(errors: Record<string, FieldError>): void {
        Object.entries(errors).forEach(([key, value]) => {
            this.getOrCreate(key, undefined).nextError(value);
        });
    }

    public field(name: string, defaultValue: InitialValue): Field {
        return this.getOrCreate(name, defaultValue) as Field;
    }

    private getOrCreate(name: string, initial?: InitialValue): FieldControl {
        return this.getAndSetInitialValue(name, initial) ?? this.create(name, initial);
    }

    private getAndSetInitialValue(name: string, initial: InitialValue): FieldControl | undefined {
        const controller = this._fields[name];

        if (!controller) return undefined;

        if (initial && controller.value.current() === undefined) controller.next(initial);

        return controller;
    }

    private create(name: string, initial: InitialValue | undefined): FieldControl {
        const field = (this._fields[name] = new FieldControl(initial));

        field.changed.subscribe((value, prev) =>
            this._changes.next((old) => (value && !prev ? old + 1 : !value && prev ? old - 1 : old))
        );

        field.value.subscribe((value, oldValue) => {
            this._lastChange.next({ name, value, oldValue });
        });

        return field;
    }
}
