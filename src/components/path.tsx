import { useSubscriberEffect, useSubscriberSelector } from 'open-observable';
import React, { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { useField } from '../hooks/use-field';
import { Field } from '../other/field';
import FieldProviderFromArraySubscriber from '../other/field-provider-from-array-subscriber';
import FieldProviderFromObjectSubscriber from '../other/field-provider-from-object-subscriber';
import { FieldContext } from '../state/field-context';
import { ModelExpSelector } from '../types/model-exp-selector';

type Props<T, TKey extends keyof T> = T[TKey] extends any[]
    ? {
          path: TKey;
          model: ModelExpSelector<T>;
          children: (model: ModelExpSelector<T[TKey][number]>) => ReactNode;
          keySelector: (selector: T[TKey][number], index: number) => string | number;
      }
    : {
          path: TKey;
          model: ModelExpSelector<T>;
          children: (model: ModelExpSelector<T[TKey]>) => ReactNode;
          keySelector?: null;
      };

export default function Path<T, TKey extends keyof T>(props: Props<T, TKey>) {
    const name = props.path as unknown as string;

    const parentField = useField<T[TKey]>(name);

    return props.keySelector ? (
        <PathArray
            field={parentField as any}
            render={props.children}
            model={props.model as any}
            keySelector={props.keySelector}
        />
    ) : (
        <PathObject field={parentField as any} render={props.children} model={props.model as any} />
    );
}

interface PathArrayProps<T> {
    field: Field<T>;
    model: ModelExpSelector<T>;
    render: (model: ModelExpSelector<T>) => ReactNode;
    keySelector: (selector: T, index: number) => string | number;
}

function PathArray<T>({ field, render, keySelector, model }: PathArrayProps<T>): any {
    const [keys, setKeys] = useState<(string | number)[]>([]);

    useSubscriberEffect(
        field,
        useCallback(
            (value) => {
                setTimeout(() => {
                    setKeys((old) => {
                        if (!Array.isArray(value)) return [];

                        const newKeys = value.map((item, index) => keySelector(item, index));

                        const isChanged =
                            newKeys.length !== old.length || newKeys.some((key, index) => key !== old[index]);

                        return isChanged ? newKeys : old;
                    });
                }, 0);
            },
            [field]
        )
    );

    return keys.map((key, index) => (
        <PathArrayItem key={key} field={field as any} index={index} render={render} model={model as any} />
    ));
}

interface PathArrayItemProps<T> {
    field: Field<T[]>;
    index: number;
    render: (model: ModelExpSelector<T>) => ReactNode;
    model: ModelExpSelector<T>;
}

function PathArrayItem<T>({ field, index, render, model }: PathArrayItemProps<T>) {
    const memo = useMemo(
        () => new FieldProviderFromArraySubscriber<T>(field, field.readonly, field.next as any, index),
        [field]
    );

    useEffect(() => () => memo.destroy(), [memo]);

    return <FieldContext.Provider value={memo as any}>{render(model)}</FieldContext.Provider>;
}

interface PathObjectProps<T> {
    field: Field<T>;
    model: ModelExpSelector<T>;
    render: (model: ModelExpSelector<T>) => ReactNode;
}

function PathObject<T>({ field, render, model }: PathObjectProps<T>) {
    const memo = useMemo(() => new FieldProviderFromObjectSubscriber<T>(field, field.readonly, field.next), [field]);

    useEffect(() => () => memo.destroy(), [memo]);

    return <FieldContext.Provider value={memo as any}>{render(model)}</FieldContext.Provider>;
}
