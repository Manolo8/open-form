import { useGlobalObservable } from 'open-observable';
import { useEffect, VFC } from 'react';
import { formConfigKey } from '../other/form-config-key';
import { FormConfigType } from '../types/form-config-type';

export const FormConfig: VFC<FormConfigType> = (props) => {
    const _config = useGlobalObservable(formConfigKey);

    useEffect(() => _config.next(props), [props]);

    return null;
};
