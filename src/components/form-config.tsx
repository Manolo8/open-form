import { useGlobalObservable } from 'open-observable';
import { VFC } from 'react';
import { formConfigKey } from '../other/form-config-key';
import { FormConfigType } from '../types/form-config-type';

export const FormConfig: VFC<FormConfigType> = (props) => {
    const _config = useGlobalObservable(formConfigKey);

    _config.next(props);

    return null;
};
