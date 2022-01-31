import { FieldList } from './field-list';
import { InitialValue } from '../types/initial-value';
import { FormError } from '../types/form-error';
import { ISubscriber, Observable } from 'open-observable';
import { FormConfigType } from '../types/form-config-type';
import { setFormSubmitInput } from './form-submit-input';
import { IFormConfigure } from '../types/i-form-configure';
import { SuccessResult } from '../types/success-result';
import { KnownFormError } from '../types/known-form-error';
import { RefObject } from 'react';
import { LastChange } from '../types/last-change';
import { AutoSubmitOptions } from '../types/auto-submit-options';
import { nameof } from 'ts-simple-nameof';
import { CleanupCallback } from 'open-observable/build/types/cleanup-callback';

export class FormControl<TInput, TOutput> implements IFormConfigure<TInput, TOutput> {
    private readonly _errorTranslator: ISubscriber<FormConfigType>;
    private readonly _fields: FieldList;
    private readonly _loading: Observable<boolean>;

    private _submit: RefObject<(input: TInput) => Promise<TOutput> | TOutput>;
    private _success?: (output: TOutput, input: TInput) => void | SuccessResult<TInput>;
    private _error?: (input: TInput, formErrors?: KnownFormError) => void;
    private _additional?: (input: TInput) => TInput;
    private _autoSubmitCleanup?: () => void;
    private _resolvers: (() => Promise<boolean>)[];

    constructor(
        submit: RefObject<(input: TInput) => Promise<TOutput> | TOutput>,
        errorTranslator: ISubscriber<FormConfigType>
    ) {
        this._submit = submit;
        this._errorTranslator = errorTranslator;
        this._fields = new FieldList();
        this._loading = new Observable<boolean>(false);
        this._resolvers = [];

        this.setAdditional = this.setAdditional.bind(this);
        this.setError = this.setError.bind(this);
        this.setAutoSubmit = this.setAutoSubmit.bind(this);
        this.setSuccess = this.setSuccess.bind(this);
        this.cleanup = this.cleanup.bind(this);
        this.load = this.load.bind(this);
        this.field = this.field.bind(this);
        this.submit = this.submit.bind(this);
        this.reset = this.reset.bind(this);
        this.handleSuccess = this.handleSuccess.bind(this);
        this.handleError = this.handleError.bind(this);
        this.addResolver = this.addResolver.bind(this);
    }

    public setSuccess(callback: (output: TOutput, input: TInput) => void | SuccessResult<TInput>): void {
        this._success = callback;
    }

    public setError(callback: (input: TInput, error?: KnownFormError) => void): void {
        this._error = callback;
    }

    public setAdditional(callback: (input: TInput) => TInput): void {
        this._additional = callback;
    }

    public setAutoSubmit(options: AutoSubmitOptions<TInput>): void {
        this._autoSubmitCleanup?.();
        this._autoSubmitCleanup = undefined;

        if (options !== false) {
            let intervalId = 0;

            const cleanup = this._fields.lastChange.subscribe(({ name, value, oldValue }) => {
                const result = options.check?.(nameof, name, value, oldValue) ?? true;

                if (result) {
                    if (options.delay) intervalId = setTimeout(() => this.submit(), options.delay);
                    else this.submit();
                }
            });

            this._autoSubmitCleanup = () => {
                cleanup();
                clearInterval(intervalId);
            };
        }
    }

    public load(value: Partial<TInput> | Promise<Partial<TInput>>) {
        this._loading.next(true);

        Promise.resolve(value).then((value) => {
            this._loading.next(false);
            this._fields.fromObject(value);
        });
    }

    public cleanup() {
        this._autoSubmitCleanup?.();
    }

    public addResolver(resolver: () => Promise<boolean>): CleanupCallback {
        this._resolvers.push(resolver);

        return () => this._resolvers.splice(this._resolvers.indexOf(resolver), 1);
    }

    public field(name: string, initial?: InitialValue) {
        return this._fields.field(name, initial);
    }

    public submit() {
        if (this._loading.current()) return;

        const submit = this._submit.current;

        if (!submit) return;

        this._loading.next(true);

        this.resolve().then((value) => {
            if (!value) {
                this._loading.next(false);
                return;
            }
            let input = this._fields.toObject() as TInput;

            if (this._additional) input = this._additional(input);

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

    public get lastChange(): ISubscriber<LastChange> {
        return this._fields.lastChange;
    }

    private handleSuccess(output: TOutput, input: TInput) {
        if (!this._success) return;

        const result = this._success(output, input);

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

    private handleError(error: FormError, input: TInput) {
        const translator = this._errorTranslator?.current();
        const translated = translator.errorTranslate?.(error) ?? undefined;

        if (translated) this._fields.error(translated);

        if (this._error) this._error(input, translated);
    }

    private resolve(): Promise<boolean> {
        const resolvers = this._resolvers.map((x) => x());

        if (!resolvers.length) return Promise.resolve(true);

        return Promise.all(resolvers).then((x) => !x.find((y) => !y));
    }
}
