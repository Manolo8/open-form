import { IFormConfigure } from './i-form-configure';
import { IConfigurator } from 'open-observable';

export type FormHandler<TInput, TOutput> = {
    submit: (input: TInput) => Promise<TOutput> | TOutput;
    configurator: (configurator: IConfigurator<IFormConfigure<TInput, TOutput>>) => void;
};
