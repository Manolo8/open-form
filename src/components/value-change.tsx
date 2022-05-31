import React, { useEffect, VFC } from 'react';
import { useField } from '../hooks/use-field';
import { useSubscriber } from 'open-observable';
import { ModelExpSelector } from '../types/model-exp-selector';
import { InitialValue } from '../types/initial-value';

type Props = {
    name: string;
    onChange: (value: any) => void;
    defaultValue?: InitialValue;
};

export const ValueChange: VFC<Props> = ({ name, onChange, defaultValue }) => {
    const field = useField(name, defaultValue);

    const value = useSubscriber(field);

    useEffect(() => onChange(value), [value]);

    return null;
};

export const valueChange = <T extends {}, P extends {}>(
    model: ModelExpSelector<T>,
    selector: ((value: T) => P) | [(value: T) => P, P],
    onChange: (value: P) => void
) => {
    if (typeof selector === 'function') {
        return <ValueChange name={model(selector)} onChange={onChange} />;
    } else {
        return <ValueChange name={model(selector[0])} onChange={onChange} defaultValue={selector[1]} />;
    }
};
