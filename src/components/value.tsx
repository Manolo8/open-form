import { Dispatch, useSubscriber } from 'open-observable';
import React, { ReactElement, VFC } from 'react';
import { useField } from '../hooks/use-field';
import { InitialValue } from '../types/initial-value';
import { ModelExpSelector } from '../types/model-exp-selector';

type Render<T> = (
    value: T,
    setValue: (value: Dispatch<T>) => void,
    error: string | string[] | null
) => ReactElement | undefined | null | void | boolean;

type Props = {
    name: string;
    render: Render<any>;
    defaultValue?: InitialValue;
};

export const Value: VFC<Props> = ({ name, render, defaultValue }) => {
    const field = useField(name, defaultValue);

    const value = useSubscriber(field);
    const error = useSubscriber(field.error);

    return render(value, field.next, error) ?? (null as any);
};

export const value = <T, P extends keyof T>(
    model: ModelExpSelector<T>,
    selector: P | [P, T[P]],
    render: Render<T[P]>
) => {
    if (!Array.isArray(selector)) {
        return <Value name={selector as string} render={render} />;
    } else {
        return <Value name={selector[0] as string} render={render} defaultValue={selector[1]} />;
    }
};
