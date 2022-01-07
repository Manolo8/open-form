import { InitialValue } from '../../types/initial-value';
import { FieldController } from './field-controller';
import { Field } from './field';
import { FieldError } from '../../types/field-error';

export class FieldList {
    private readonly fields: Record<string, FieldController>;

    constructor() {
        this.fields = {};
    }

    public reset() {
        Object.values(this.fields).forEach((x) => x.reset());
    }

    public fromObject(object: any): void {
        if (object) this.extractAndClear(object);
        else this.clear();
    }

    private extractAndClear(object: any) {
        const oldNames = new Set(Object.keys(this.fields));

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
        const fields = Object.values(this.fields);

        for (const field of fields) {
            const initial = field.initial;

            field.next(typeof initial === 'function' ? initial() : initial);
            field.nextError(null);
        }
    }

    public toObject(): any {
        const building = {} as any;
        const entries = Object.entries(this.fields);

        for (const [key, field] of entries) {
            const spl = key.split('.');

            let path = building;

            if (spl.length > 1) {
                for (let i = 0; i < spl.length - 1; i++) {
                    if (!path[spl[i]]) path[spl[i]] = {};

                    path = path[spl[i]];
                }
            }

            path[spl[spl.length - 1]] = field.value.current();
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

    private getOrCreate(name: string, initial?: InitialValue): FieldController {
        return this.getAndSetInitialValue(name, initial) ?? this.create(name, initial);
    }

    private getAndSetInitialValue(name: string, initial: InitialValue): FieldController | undefined {
        const controller = this.fields[name];

        if (!controller) return undefined;

        if (initial && controller.value.current() === undefined) controller.next(initial);

        return controller;
    }

    private create(name: string, initial: InitialValue | undefined): FieldController {
        return (this.fields[name] = new FieldController(initial));
    }
}
