import { FieldError } from './field-error';

export type KnownFormError<T = string> = Record<keyof T, FieldError>;
