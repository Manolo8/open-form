import { SetStateAction } from 'react';
import { Dispatch } from 'open-observable';

export type ModelSelector<E> = E extends SetStateAction<infer V> ? V : E extends Dispatch<infer V> ? V : E;
