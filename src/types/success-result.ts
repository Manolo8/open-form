type SuccessReset<T> = {
    action: 'Reset';
};

type SuccessClear<T> = {
    action: 'Clear';
};

type SuccessSet<T> = {
    action: 'Set';
    value: Partial<T>;
};

export type SuccessResult<T> = SuccessReset<T> | SuccessClear<T> | SuccessSet<T>;
