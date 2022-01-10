import React, { ReactElement, VFC } from 'react';
import { useField } from '../hooks/use-field';
import { Dispatch, useSubscriber } from 'open-observable';
import { ModelExpSelector } from '../types/model-exp-selector';
import { InitialValue } from '../types/initial-value';

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

    const value = useSubscriber(field.value);
    const error = useSubscriber(field.error);

    return render(value, field.next, error) ?? (null as any);
};

export const value = <T extends {}, P extends {}>(
    model: ModelExpSelector<T>,
    selector: ((value: T) => P) | [(value: T) => P, P],
    render: Render<P>
) => {
    if (typeof selector === 'function') {
        return <Value name={model(selector)} render={render} />;
    } else {
        return <Value name={model(selector[0])} render={render} defaultValue={selector[1]} />;
    }
};
