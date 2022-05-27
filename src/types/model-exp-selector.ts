import { ModelSelector } from './model-selector';

export type ModelExpSelector<E> = ((nameof: ((selector: ModelSelector<E>) => any) | keyof ModelSelector<E>) => string);