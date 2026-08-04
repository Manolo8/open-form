const submitInputs = new WeakSet<object>();

export const isFormSubmitInput = (input: any) => {
    return typeof input === 'object' && input !== null && submitInputs.has(input);
};

export const setFormSubmitInput = (input: any) => {
    if (typeof input !== 'object' || input === null) return;

    submitInputs.add(input);
};
