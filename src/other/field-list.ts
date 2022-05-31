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

        for (const key in object) {
            this.getOrCreate(key).nextDefault(object[key]);
            oldNames.delete(key);
        }

        oldNames.forEach((x) => this.getOrCreate(x).clear());
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
            const value = field.current();

            if (value === null) continue;

            building[key] = value;
        }

        return building;
    }

    public error(errors: Record<string, FieldError>): void {
        for (let entry of Object.entries(errors)) this.getOrCreate(entry[0], undefined).nextError(entry[1]);
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

        if (initial && controller.current() === undefined) controller.next(initial);

        return controller;
    }

    private create(name: string, initial: InitialValue | undefined): FieldControl {
        const field = (this._fields[name] = new FieldControl(initial));

        field.changed.subscribe((value, prev) =>
            this._changes.next((old) => (value && !prev ? old + 1 : !value && prev ? old - 1 : old))
        );

        field.subscribe((value, oldValue) => {
            this._lastChange.next({ name, value, oldValue });
        });

        return field;
    }
}
