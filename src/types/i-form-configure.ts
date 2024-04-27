import { LoadError } from '../types/load-error';
import { SuccessResult } from './success-result';
import { KnownFormError } from './known-form-error';
import { AutoSubmitOptions } from './auto-submit-options';

export interface IFormConfigure<TInput, TOutput> {
    setSuccess(callback: (output: TOutput, input: TInput) => SuccessResult<TInput> | void): void;

    setError(callback: (input: TInput, error?: KnownFormError<TInput>) => void): void | KnownFormError<TInput>;

    setAdditional(callback: (input: TInput) => Partial<TInput>): void;

    setAutoSubmit(value: AutoSubmitOptions<TInput>): void;

    setReadonly(value: boolean): void;

    load(value: Partial<TInput> | Promise<Partial<TInput>> | (() => Partial<TInput> | Promise<Partial<TInput>>)): void;

    loadError(errors: LoadError): void;
}
