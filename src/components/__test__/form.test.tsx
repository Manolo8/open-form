import { GlobalObservable, ISubscriber, useSubscriber } from 'open-observable';
import React, { createRef } from 'react';
import { act, render, fireEvent, waitFor } from '@testing-library/react';
import { useField } from '../../hooks/use-field';
import { useForm } from '../../hooks/use-form';
import { FormControl } from '../../other/form-control';
import { Form } from '../form';
import { FormConfig } from '../form-config';

afterEach(() => {
    jest.restoreAllMocks();
});

it('should call control.submit and prevent the default when the form is submitted', async () => {
    // Arrange

    const submit = jest.spyOn(FormControl.prototype, 'submit').mockImplementation(() => Promise.resolve());

    const output = render(
        <Wrapper>
            <TestForm>
                <TestInputField name='principal' />
                <button type='submit'>Submit</button>
            </TestForm>
        </Wrapper>
    );

    const form = output.container.querySelector('form') as HTMLFormElement;

    // Act

    const notPrevented = fireEvent.submit(form);

    // Assert

    expect(submit).toHaveBeenCalledTimes(1);
    expect(notPrevented).toBe(false);
});

it('should call control.reset and restore the field values when a reset button is clicked', async () => {
    // Arrange

    const reset = jest.spyOn(FormControl.prototype, 'reset');

    const output = render(
        <Wrapper>
            <TestForm>
                <TestInputField name='principal' />
                <button type='reset'>Reset</button>
            </TestForm>
        </Wrapper>
    );

    const input = output.getByTestId('principal') as HTMLInputElement;

    fireEvent.change(input, { target: { value: 'changed' } });

    await waitFor(() => expect(input.value).toBe('changed'));

    // Act

    fireEvent.click(output.getByText('Reset'));

    // Assert

    expect(reset).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(input.value).toBe(''));
});

it('should prevent the default of the reset event', async () => {
    // Arrange

    const reset = jest.spyOn(FormControl.prototype, 'reset');

    const output = render(
        <Wrapper>
            <TestForm>
                <TestInputField name='principal' />
            </TestForm>
        </Wrapper>
    );

    const form = output.container.querySelector('form') as HTMLFormElement;

    // Act

    const notPrevented = fireEvent.reset(form);

    // Assert

    expect(reset).toHaveBeenCalledTimes(1);
    expect(notPrevented).toBe(false);
});

it('should render the configured loadingComponent and follow the loading state', async () => {
    // Arrange

    const content = { control: null as any };

    const output = render(
        <Wrapper>
            <FormConfig loadingComponent={loadingComponent} />
            <TestForm onControl={(control) => (content.control = control)}>
                <TestInputField name='principal' />
            </TestForm>
        </Wrapper>
    );

    await waitFor(() => expect(output.getByTestId('loading').textContent).toBe('idle'));

    let deferred: (value: any) => void = () => undefined;

    const pending = new Promise<any>((resolve) => (deferred = resolve));

    // Act

    let loading: Promise<void> = Promise.resolve();

    act(() => {
        loading = content.control.load(pending);
    });

    // Assert

    await waitFor(() => expect(output.getByTestId('loading').textContent).toBe('loading'));

    await act(async () => {
        deferred({ principal: 'loaded' });
        await loading;
    });

    await waitFor(() => expect(output.getByTestId('loading').textContent).toBe('idle'));
    expect((output.getByTestId('principal') as HTMLInputElement).value).toBe('loaded');
});

it('should not render the loadingComponent when disableLoading is set', async () => {
    // Arrange

    const output = render(
        <Wrapper>
            <FormConfig loadingComponent={loadingComponent} />
            <TestForm disableLoading>
                <TestInputField name='principal' />
            </TestForm>
        </Wrapper>
    );

    // Act

    await waitFor(() => expect(output.getByTestId('principal')).not.toBe(null));

    // Assert

    expect(output.queryByTestId('loading')).toBe(null);
});

it('should forward the ref to the underlying form element', async () => {
    // Arrange

    const forwarded = createRef<HTMLFormElement>();

    // Act

    const output = render(
        <Wrapper>
            <TestForm formRef={forwarded}>
                <TestInputField name='principal' />
            </TestForm>
        </Wrapper>
    );

    // Assert

    expect(forwarded.current).not.toBe(null);
    expect(forwarded.current!.tagName).toBe('FORM');
    expect(forwarded.current).toBe(output.container.querySelector('form'));
});

it('should call control.cleanup when unmounted', async () => {
    // Arrange

    const cleanup = jest.spyOn(FormControl.prototype, 'cleanup');

    const output = render(
        <Wrapper>
            <TestForm>
                <TestInputField name='principal' />
            </TestForm>
        </Wrapper>
    );

    await waitFor(() => expect(output.container.querySelectorAll('input').length).toBe(1));

    expect(cleanup).not.toHaveBeenCalled();

    // Act

    output.unmount();

    // Assert

    expect(cleanup).toHaveBeenCalled();
});

function Wrapper({ children }: { children: React.ReactNode }) {
    return <GlobalObservable>{children}</GlobalObservable>;
}

function TestInputField({ name }: { name: string }) {
    const field = useField(name, '');

    const value = useSubscriber(field);

    return <input data-testid={name} value={value} onChange={(e) => field.next(e.target.value)} />;
}

function LoadingProbe({ loading, submitting }: { loading: ISubscriber<boolean>; submitting: ISubscriber<boolean> }) {
    const isLoading = useSubscriber(loading);
    const isSubmitting = useSubscriber(submitting);

    return <span data-testid='loading'>{isLoading ? 'loading' : isSubmitting ? 'submitting' : 'idle'}</span>;
}

// kept at module scope so FormConfig never publishes a changing loadingComponent identity
const loadingComponent = (loading: ISubscriber<boolean>, submitting: ISubscriber<boolean>) => (
    <LoadingProbe loading={loading} submitting={submitting} />
);

interface TestFormProps {
    children?: React.ReactNode;
    disableLoading?: boolean;
    formRef?: React.Ref<HTMLFormElement>;
    onControl?: (control: FormControl<any, any>) => void;
}

function TestForm({ children, disableLoading, formRef, onControl }: TestFormProps) {
    const [, control] = useForm(() => undefined);

    onControl?.(control);

    return (
        <Form control={control} disableLoading={disableLoading} ref={formRef}>
            {children}
        </Form>
    );
}
