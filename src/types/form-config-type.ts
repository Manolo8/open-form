import { KnownFormError } from './known-form-error';
import { ISubscriber } from 'open-observable';

export type FormConfigType = {
    errorTranslate?: (error: any) => KnownFormError | null;
    loadingComponent?: (loading: ISubscriber<boolean>, submiting: ISubscriber<boolean>) => JSX.Element;
};
