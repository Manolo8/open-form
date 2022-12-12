export type FormSubmitHandle<TInput, TOutput> = (input: TInput) => Promise<TOutput> | TOutput;
