import { FieldList } from './field-list';
import { InitialValue } from '../types/initial-value';
import { FormError } from '../types/form-error';
import { ISubscriber, Observable } from 'open-observable';
import { FormConfigType } from '../types/form-config-type';
import { setFormSubmitInput } from './form-submit-input';
import { IFormConfigure } from '../types/i-form-configure';
import { SuccessResult } from '../types/success-result';
import { KnownFormError } from '../types/known-form-error';
import { LastChange } from '../types/last-change';
import { AutoSubmitOptions } from '../types/auto-submit-options';
import { CleanupCallback } from 'open-observable/build/types/cleanup-callback';
import { RefObject } from 'react';
import { enhacedNameof } from './enhaced-nameof';

export class FormControl<TInput, TOutput> implements IFormConfigure<TInput, TOutput> {
    private readonly _errorTranslator: ISubscriber<FormConfigType>;
    private readonly _fields: FieldList;
    private readonly _loading: Observable<boolean>;
    private readonly _submitting: Observable<boolean>;

    private _submit: RefObject<(input: TInput) => Promise<TOutput> | TOutput>;
    private _success?: (output: TOutput, input: TInput) => void | SuccessResult<TInput>;
    private _error?: (input: TInput, formErrors?: KnownFormError<TInput>) => KnownFormError<TInput> | void;
    private _additional?: (input: TInput) => TInput;
    private _autoSubmitCleanup?: () => void;
    private _resolvers: (() => Promise<boolean>)[];
    private _successResolvers: ((input: TInput, output: TOutput) => void)[];

    constructor(
        submit: RefObject<(input: TInput) => Promise<TOutput> | TOutput>,
        errorTranslator: ISubscriber<FormConfigType>
    ) {
        this._submit = submit;
        this._errorTranslator = errorTranslator;
        this._fields = new FieldList();
        this._loading = new Observable<boolean>(false);
        this._submitting = new Observable<boolean>(false);
        this._resolvers = [];
        this._successResolvers = [];

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

    public setError(callback: (input: TInput, error?: KnownFormError<TInput>) => KnownFormError<TInput> | void): void {
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
                const result = options.check?.(enhacedNameof, name, value, oldValue) ?? true;

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

        const resolver = Promise.resolve(value).then((data) => {
            if (!data) return this._loading.next(false);

            return this._fields.fromObject(data);
        });

        resolver.then(() => {
            setTimeout(() => this._loading.next(false), 100);
        });
    }

    public cleanup() {
        this._autoSubmitCleanup?.();
    }

    public addResolver(resolver: () => Promise<boolean>): CleanupCallback {
        this._resolvers.push(resolver);

        return () => this._resolvers.splice(this._resolvers.indexOf(resolver), 1);
    }

    public addSuccessResolver(resolver: (input: TInput, output: TOutput) => void): CleanupCallback {
        this._successResolvers.push(resolver);

        return () => this._successResolvers.splice(this._successResolvers.indexOf(resolver), 1);
    }

    public field(name: keyof TInput, initial?: InitialValue) {
        return this._fields.field(name as string, initial);
    }

    public async submit() {
        if (this._loading.current() || this._submitting.current()) return;

        const submit = this._submit.current;

        if (!submit) return;

        this._submitting.next(true);

        const success = await this.resolve();

        if (!success) {
            this._submitting.next(false);
            return;
        }

        let input = this._fields.toObject() as TInput;

        if (this._additional) input = this._additional(input);

        setFormSubmitInput(input);

        try {
            const output = await submit(input);
            this.handleSuccess(output, input);
        } catch (exception) {
            this.handleError(exception, input);
        } finally {
            this._submitting.next(false);
        }
    }

    public get submitting(): ISubscriber<boolean> {
        return this._submitting.asSubscriber();
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
        this._successResolvers.forEach((x) => x(input, output));

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
        const translator = this._errorTranslator.current();
        const translated = translator.errorTranslate?.(error) ?? undefined;

        if (translated) this._fields.error(translated);

        if (this._error) {
            const output = this._error(input, translated as KnownFormError<any>);

            if (output) this._fields.error(output);
        }
    }

    private resolve(): Promise<boolean> {
        const resolvers = this._resolvers.map((x) => x());

        if (!resolvers.length) return Promise.resolve(true);

        return Promise.all(resolvers).then((x) => !x.includes(false));
    }
}
