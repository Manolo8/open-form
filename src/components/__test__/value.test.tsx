import { GlobalObservable } from 'open-observable';
import React from 'react';
import { act, render, fireEvent, waitFor } from '@testing-library/react';
import { useForm } from '../../hooks/use-form';
import { FormControl } from '../../other/form-control';
import { ModelExpSelector } from '../../types/model-exp-selector';
import { Form } from '../form';
import { Value, value } from '../value';
import { ValueChange, valueChange } from '../value-change';

it('should render through the render prop and write back through setValue', async () => {
    // Arrange

    const output = render(
        <Wrapper>
            <TestForm>
                <Value
                    name='principal'
                    defaultValue=''
                    render={(current, setValue) => (
                        <input
                            data-testid='principal'
                            value={current}
                            onChange={(event) => setValue(event.target.value)}
                        />
                    )}
                />
                <Value name='principal' render={(current) => <span data-testid='mirror'>{current}</span>} />
            </TestForm>
        </Wrapper>
    );

    const input = output.getByTestId('principal') as HTMLInputElement;

    // Act

    fireEvent.change(input, { target: { value: 'written' } });

    // Assert

    await waitFor(() => expect(input.value).toBe('written'));
    expect(output.getByTestId('mirror').textContent).toBe('written');
});

it('should expose the field error through the third render argument', async () => {
    // Arrange

    const content = { control: null as any };

    const output = render(
        <Wrapper>
            <TestForm onControl={(control) => (content.control = control)}>
                <Value
                    name='principal'
                    defaultValue=''
                    render={(current, setValue, error) => (
                        <input
                            data-testid='principal'
                            value={current}
                            data-error={error === null ? 'none' : String(error)}
                            onChange={(event) => setValue(event.target.value)}
                        />
                    )}
                />
            </TestForm>
        </Wrapper>
    );

    const input = output.getByTestId('principal') as HTMLInputElement;

    expect(input.getAttribute('data-error')).toBe('none');

    // Act

    act(() => content.control.field('principal').nextError('boom'));

    // Assert

    await waitFor(() => expect(input.getAttribute('data-error')).toBe('boom'));

    // changing the value clears the error (FieldControl.next calls nextError(null))
    act(() => {
        fireEvent.change(input, { target: { value: 'fixed' } });
    });

    await waitFor(() => expect(input.getAttribute('data-error')).toBe('none'));
});

it('should render nothing when the render prop returns undefined', async () => {
    // Arrange / Act

    const output = render(
        <Wrapper>
            <TestForm>
                <span data-testid='marker'>marker</span>
                <Value name='principal' render={() => undefined} />
            </TestForm>
        </Wrapper>
    );

    // Assert

    await waitFor(() => expect(output.getByTestId('marker')).not.toBe(null));

    const form = output.container.querySelector('form') as HTMLFormElement;

    expect(form.textContent).toBe('marker');
});

it('should apply the defaultValue to the field', async () => {
    // Arrange / Act

    const output = render(
        <Wrapper>
            <TestForm>
                <Value
                    name='principal'
                    defaultValue='defaulted'
                    render={(current) => <span data-testid='out'>{current}</span>}
                />
            </TestForm>
        </Wrapper>
    );

    // Assert

    await waitFor(() => expect(output.getByTestId('out').textContent).toBe('defaulted'));
});

it('should build a Value from the value() factory with a plain selector', async () => {
    // Arrange

    const output = render(
        <Wrapper>
            <TestForm>
                {(model) => (
                    <>
                        {value(model, 'principal', (current) => <span data-testid='out'>{current ?? 'empty'}</span>)}
                        <Value
                            name='principal'
                            render={(current, setValue) => (
                                <input
                                    data-testid='principal'
                                    value={current ?? ''}
                                    onChange={(event) => setValue(event.target.value)}
                                />
                            )}
                        />
                    </>
                )}
            </TestForm>
        </Wrapper>
    );

    expect(output.getByTestId('out').textContent).toBe('empty');

    // Act

    fireEvent.change(output.getByTestId('principal'), { target: { value: 'written' } });

    // Assert

    // the plain string selector is resolved through model(), which round-trips a string unchanged,
    // so the built Value is bound to the 'principal' field
    await waitFor(() => expect(output.getByTestId('out').textContent).toBe('written'));
});

it('should build a Value from the value() factory with a lambda selector', async () => {
    // Arrange

    const output = render(
        <Wrapper>
            <TestForm>
                {(model) => (
                    <>
                        {value<{ principal: string }, 'principal'>(model, (x) => x.principal, (current) => (
                            <span data-testid='out'>{current ?? 'empty'}</span>
                        ))}
                        <Value
                            name='principal'
                            render={(current, setValue) => (
                                <input
                                    data-testid='principal'
                                    value={current ?? ''}
                                    onChange={(event) => setValue(event.target.value)}
                                />
                            )}
                        />
                    </>
                )}
            </TestForm>
        </Wrapper>
    );

    expect(output.getByTestId('out').textContent).toBe('empty');

    // Act

    fireEvent.change(output.getByTestId('principal'), { target: { value: 'written' } });

    // Assert

    // the lambda is resolved through model() into the 'principal' field name
    await waitFor(() => expect(output.getByTestId('out').textContent).toBe('written'));
});

it('should build a Value from the value() factory with a [lambda, defaultValue] tuple', async () => {
    // Arrange / Act

    const output = render(
        <Wrapper>
            <TestForm>
                {(model) => (
                    <>
                        {value<{ principal: string }, 'principal'>(
                            model,
                            [(x) => x.principal, 'defaulted'],
                            (current) => <span data-testid='out'>{current ?? 'empty'}</span>
                        )}
                        <Value name='principal' render={(current) => <span data-testid='mirror'>{current}</span>} />
                    </>
                )}
            </TestForm>
        </Wrapper>
    );

    // Assert

    await waitFor(() => expect(output.getByTestId('out').textContent).toBe('defaulted'));

    // the lambda resolved to the 'principal' field, so the default landed there
    expect(output.getByTestId('mirror').textContent).toBe('defaulted');
});

it('should build a Value from the value() factory with a [selector, defaultValue] tuple', async () => {
    // Arrange / Act

    const output = render(
        <Wrapper>
            <TestForm>
                {(model) =>
                    value(model, ['principal', 'defaulted'] as any, (current) => (
                        <span data-testid='out'>{current}</span>
                    ))
                }
            </TestForm>
        </Wrapper>
    );

    // Assert

    await waitFor(() => expect(output.getByTestId('out').textContent).toBe('defaulted'));
});

it('should call onChange on mount and on every change and render nothing', async () => {
    // Arrange

    const onChange = jest.fn();

    const output = render(
        <Wrapper>
            <TestForm>
                <ValueChange name='principal' defaultValue='initial' onChange={onChange} />
                <Value
                    name='principal'
                    render={(current, setValue) => (
                        <input
                            data-testid='principal'
                            value={current}
                            onChange={(event) => setValue(event.target.value)}
                        />
                    )}
                />
            </TestForm>
        </Wrapper>
    );

    await waitFor(() => expect(onChange).toHaveBeenCalledWith('initial'));

    const input = output.getByTestId('principal') as HTMLInputElement;

    // Act

    fireEvent.change(input, { target: { value: 'changed' } });

    // Assert

    await waitFor(() => expect(onChange).toHaveBeenCalledWith('changed'));
    expect(onChange).toHaveBeenCalledTimes(2);

    // ValueChange itself renders nothing: the only markup is the Value input
    const form = output.container.querySelector('form') as HTMLFormElement;

    expect(form.querySelectorAll('*').length).toBe(1);
});

it('should build a ValueChange from the valueChange() factory with a lambda selector', async () => {
    // Arrange

    const onChange = jest.fn();

    // Act

    render(
        <Wrapper>
            <TestForm>
                {(model) => valueChange<{ principal: string }, any>(model, (x) => x.principal, onChange)}
            </TestForm>
        </Wrapper>
    );

    // Assert

    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    expect(onChange).toHaveBeenCalledWith(undefined);
});

it('should build a ValueChange from the valueChange() factory with a [selector, defaultValue] tuple', async () => {
    // Arrange

    const onChange = jest.fn();

    // Act

    render(
        <Wrapper>
            <TestForm>
                {(model) =>
                    valueChange<{ principal: string }, any>(model, [(x) => x.principal, 'defaulted'], onChange)
                }
            </TestForm>
        </Wrapper>
    );

    // Assert

    await waitFor(() => expect(onChange).toHaveBeenCalledWith('defaulted'));
});

function Wrapper({ children }: { children: React.ReactNode }) {
    return <GlobalObservable>{children}</GlobalObservable>;
}

interface TestFormProps {
    children?: React.ReactNode | ((model: ModelExpSelector<any>) => React.ReactNode);
    onControl?: (control: FormControl<any, any>) => void;
}

function TestForm({ children, onControl }: TestFormProps) {
    const [model, control] = useForm(() => undefined);

    onControl?.(control);

    return <Form control={control}>{typeof children === 'function' ? children(model) : children}</Form>;
}
