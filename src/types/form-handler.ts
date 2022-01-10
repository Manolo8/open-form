import { SuccessResult } from './success-result';

export type FormHandler<TInput, TOutput> = {
    submit: (input: TInput) => Promise<TOutput> | TOutput;
    load?: () => Promise<TInput> | TInput;
    success?: (output: TOutput, input: TInput) => SuccessResult<TInput> | void;
    error?: (error: any, input: TInput) => void;
    additional?: (input: TInput) => Partial<TInput>;
    autoSubmit?: boolean | number;
};
