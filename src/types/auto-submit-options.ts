import { ModelExpSelector } from './model-exp-selector';

export type AutoSubmitOptions<TInput> =
    | false
    | {
          delay?: number;
          check?: (selector: ModelExpSelector<TInput>, name: string, value: any, oldValue: any) => boolean;
      };
