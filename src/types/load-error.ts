import { KnownFormError } from './known-form-error';

export type LoadError =
    | {
          translate: true;
          errors: any;
      }
    | {
          translate: false;
          errors: KnownFormError;
      };