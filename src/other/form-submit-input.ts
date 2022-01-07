const key = '__FORM_SUBMIT_CHECK';

export const isFormSubmitInput = (input: any) => {
    return input && input[key];
};

export const setFormSubmitInput = (input: any) => {
    if (input === undefined || input === null) return;

    input[key] = true;
};
