import { FieldList } from './field-list';
import { InitialValue } from '../../types/initial-value';
import { RefObject } from 'react';
import { FormHandler } from '../../types/form-handler';
import { FormError } from '../../types/form-error';
import { ISubscriber, Observable } from 'open-observable';
import { FormConfigType } from '../../types/form-config-type';
import { setFormSubmitInput } from '../form-submit-input';

export class FormControl {
    private readonly _handlerRef: RefObject<FormHandler<any, any>>;
    private readonly _errorTranslator: ISubscriber<FormConfigType>;
    private readonly _fields: FieldList;
    private readonly _loading: Observable<boolean>;

    constructor(handlerRef: RefObject<FormHandler<any, any>>, errorTranslator: ISubscriber<FormConfigType>) {
        this._handlerRef = handlerRef;
        this._errorTranslator = errorTranslator;
        this._fields = new FieldList();
        this._loading = new Observable<boolean>(false);
    }

    public field(name: string, initial?: InitialValue) {
        return this._fields.field(name, initial);
    }

    public submit() {
        const handler = this._handlerRef.current;

        if (!handler) return;

        if (this._loading.current()) return;

        this._loading.next(true);

        const { submit, additional } = handler;

        let input = this._fields.toObject();

        if (additional) input = additional(input);

        setFormSubmitInput(input);

        Promise.resolve(submit(input))
            .then((output) => {
                this.handleSuccess(output, input);
                this._loading.next(false);
            })
            .catch((error) => {
                this.handleError(error, input);
                this._loading.next(false);
            });
    }

    public reset() {
        this._fields.reset();
    }

    public get loading(): ISubscriber<boolean> {
        return this._loading.asSubscriber();
    }

    public get changes(): ISubscriber<number> {
        return this._fields.changes;
    }

    public get totalChanges(): ISubscriber<number> {
        return this._fields.totalChanges;
    }

    public load() {
        const handler = this._handlerRef.current;

        if (!handler) return;

        if (this._loading.current()) return;

        const { load } = handler;

        if (!load) return;

        this._loading.next(true);

        Promise.resolve(load()).then((value) => {
            this._loading.next(false);
            this._fields.fromObject(value);
        });
    }

    private handleSuccess(output: any, input: any) {
        const handler = this._handlerRef.current;

        if (!handler) return;

        if (!handler.success) return;

        const result = handler.success(output, input);

        if (!result) return;

        switch (result.action) {
            case 'Clear':
                this._fields.fromObject(undefined);
                break;
            case 'Reset':
                this._fields.reset();
                break;
            case 'Set':
                this._fields.fromObject(result.value);
                break;
        }
    }

    private handleError(error: FormError, input: any) {
        const handler = this._handlerRef.current;

        if (!handler) return;

        const translator = this._errorTranslator?.current();
        const translated = translator.errorTranslate?.(error);

        if (translated) this._fields.error(translated);

        if (handler.error) handler.error(error, input);
    }
}
