import { GlobalObservable, useSubscriber } from 'open-observable';
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { useField } from '../../hooks/use-field';
import { useForm } from '../../hooks/use-form';
import { useFormControl } from '../../hooks/use-form-control';
import { FormControl } from '../../other/form-control';
import { FormFilter } from '../form-filter';

afterEach(() => {
    jest.restoreAllMocks();
});

it('should render a data-form div and provide the control through context', async () => {
    // Arrange

    const content = { rendered: null as any, context: null as any };

    const output = render(
        <Wrapper>
            <TestFilter onControl={(control) => (content.rendered = control)}>
                <ContextProbe onControl={(control) => (content.context = control)} />
                <TestInputField name='principal' />
            </TestFilter>
        </Wrapper>
    );

    // Act

    await waitFor(() => expect(content.context).not.toBe(null));

    // Assert

    const div = output.container.querySelector('div[data-form]');

    expect(div).not.toBe(null);
    expect(content.context).toBe(content.rendered);
    expect(div!.querySelectorAll('input').length).toBe(1);
});

it('should call submit when a submit button inside is clicked', async () => {
    // Arrange

    const submit = jest.spyOn(FormControl.prototype, 'submit').mockImplementation(() => Promise.resolve());

    const output = render(
        <Wrapper>
            <TestFilter>
                <button type='submit'>Submit</button>
            </TestFilter>
        </Wrapper>
    );

    // Act

    fireEvent.click(output.getByText('Submit'));

    // Assert

    expect(submit).toHaveBeenCalledTimes(1);
});

it('should call reset when a reset button inside is clicked', async () => {
    // Arrange

    const reset = jest.spyOn(FormControl.prototype, 'reset');

    const output = render(
        <Wrapper>
            <TestFilter>
                <TestInputField name='principal' />
                <button type='reset'>Reset</button>
            </TestFilter>
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

it('should ignore a button that is neither submit nor reset and let the event bubble', async () => {
    // Arrange

    const submit = jest.spyOn(FormControl.prototype, 'submit').mockImplementation(() => Promise.resolve());
    const reset = jest.spyOn(FormControl.prototype, 'reset').mockImplementation(() => undefined);
    const outside = jest.fn();

    document.addEventListener('click', outside);

    const output = render(
        <Wrapper>
            <TestFilter>
                <button type='button'>Plain</button>
            </TestFilter>
        </Wrapper>
    );

    // Act

    fireEvent.click(output.getByText('Plain'));

    // Assert

    expect(submit).not.toHaveBeenCalled();
    expect(reset).not.toHaveBeenCalled();
    // the handler returns before stopPropagation, so the click still reaches the document
    expect(outside).toHaveBeenCalledTimes(1);

    document.removeEventListener('click', outside);
});

it('should ignore a click that does not land inside a button', async () => {
    // Arrange

    const submit = jest.spyOn(FormControl.prototype, 'submit').mockImplementation(() => Promise.resolve());
    const reset = jest.spyOn(FormControl.prototype, 'reset').mockImplementation(() => undefined);
    const outside = jest.fn();

    document.addEventListener('click', outside);

    const output = render(
        <Wrapper>
            <TestFilter>
                <span>Just text</span>
                <button type='submit'>Submit</button>
            </TestFilter>
        </Wrapper>
    );

    // Act

    fireEvent.click(output.getByText('Just text'));

    // Assert

    expect(submit).not.toHaveBeenCalled();
    expect(reset).not.toHaveBeenCalled();
    expect(outside).toHaveBeenCalledTimes(1);

    document.removeEventListener('click', outside);
});

it('should not submit for a disabled submit button and let the event bubble', async () => {
    // Arrange

    const submit = jest.spyOn(FormControl.prototype, 'submit').mockImplementation(() => Promise.resolve());
    const outside = jest.fn();

    document.addEventListener('click', outside);

    const output = render(
        <Wrapper>
            <TestFilter>
                <button type='submit' disabled>
                    Submit
                </button>
            </TestFilter>
        </Wrapper>
    );

    // Act

    fireEvent.click(output.getByText('Submit'));

    // Assert

    expect(submit).not.toHaveBeenCalled();
    // the disabled check runs before stopPropagation/preventDefault, so a disabled button stays
    // inert and the click still reaches an ancestor listener
    expect(outside).toHaveBeenCalledTimes(1);
    expect(outside.mock.calls[0][0].defaultPrevented).toBe(false);

    document.removeEventListener('click', outside);
});

it('should not reset for a disabled reset button and let the event bubble', async () => {
    // Arrange

    const reset = jest.spyOn(FormControl.prototype, 'reset').mockImplementation(() => undefined);
    const outside = jest.fn();

    document.addEventListener('click', outside);

    const output = render(
        <Wrapper>
            <TestFilter>
                <button type='reset' disabled>
                    Reset
                </button>
            </TestFilter>
        </Wrapper>
    );

    // Act

    fireEvent.click(output.getByText('Reset'));

    // Assert

    expect(reset).not.toHaveBeenCalled();
    expect(outside).toHaveBeenCalledTimes(1);
    expect(outside.mock.calls[0][0].defaultPrevented).toBe(false);

    document.removeEventListener('click', outside);
});

it('should still stop and prevent the event for an enabled submit button', async () => {
    // Arrange

    const submit = jest.spyOn(FormControl.prototype, 'submit').mockImplementation(() => Promise.resolve());
    const outside = jest.fn();

    document.addEventListener('click', outside);

    const output = render(
        <Wrapper>
            <TestFilter>
                <button type='submit'>Submit</button>
            </TestFilter>
        </Wrapper>
    );

    // Act

    fireEvent.click(output.getByText('Submit'));

    // Assert

    expect(submit).toHaveBeenCalledTimes(1);
    expect(outside).not.toHaveBeenCalled();

    document.removeEventListener('click', outside);
});

it('should still stop and prevent the event for an enabled reset button', async () => {
    // Arrange

    const reset = jest.spyOn(FormControl.prototype, 'reset').mockImplementation(() => undefined);
    const outside = jest.fn();

    document.addEventListener('click', outside);

    const output = render(
        <Wrapper>
            <TestFilter>
                <button type='reset'>Reset</button>
            </TestFilter>
        </Wrapper>
    );

    // Act

    fireEvent.click(output.getByText('Reset'));

    // Assert

    expect(reset).toHaveBeenCalledTimes(1);
    expect(outside).not.toHaveBeenCalled();

    document.removeEventListener('click', outside);
});

it('should resolve the button through closest when a nested element is clicked', async () => {
    // Arrange

    const submit = jest.spyOn(FormControl.prototype, 'submit').mockImplementation(() => Promise.resolve());

    const output = render(
        <Wrapper>
            <TestFilter>
                <button type='submit'>
                    <span>Inner</span>
                </button>
            </TestFilter>
        </Wrapper>
    );

    // Act

    fireEvent.click(output.getByText('Inner'));

    // Assert

    expect(submit).toHaveBeenCalledTimes(1);
});

it('should submit on Enter inside a text input when an enabled submit button exists', async () => {
    // Arrange

    const submit = jest.spyOn(FormControl.prototype, 'submit').mockImplementation(() => Promise.resolve());

    const output = render(
        <Wrapper>
            <TestFilter>
                <TestInputField name='principal' />
                <button type='submit'>Submit</button>
            </TestFilter>
        </Wrapper>
    );

    // Act

    fireEvent.keyDown(output.getByTestId('principal'), { key: 'Enter' });

    // Assert

    expect(submit).toHaveBeenCalledTimes(1);
});

it('should not submit on Enter inside a textarea', async () => {
    // Arrange

    const submit = jest.spyOn(FormControl.prototype, 'submit').mockImplementation(() => Promise.resolve());

    const output = render(
        <Wrapper>
            <TestFilter>
                <textarea data-testid='notes' defaultValue='' />
                <button type='submit'>Submit</button>
            </TestFilter>
        </Wrapper>
    );

    // Act

    fireEvent.keyDown(output.getByTestId('notes'), { key: 'Enter' });

    // Assert

    expect(submit).not.toHaveBeenCalled();
});

it('should not submit on Enter when the only submit button is disabled', async () => {
    // Arrange

    const submit = jest.spyOn(FormControl.prototype, 'submit').mockImplementation(() => Promise.resolve());
    const outside = jest.fn();

    document.addEventListener('keydown', outside);

    const output = render(
        <Wrapper>
            <TestFilter>
                <TestInputField name='principal' />
                <button type='submit' disabled>
                    Submit
                </button>
            </TestFilter>
        </Wrapper>
    );

    // Act

    fireEvent.keyDown(output.getByTestId('principal'), { key: 'Enter' });

    // Assert

    expect(submit).not.toHaveBeenCalled();
    // the keydown path gates on isSubmitEnabled *before* stopping the event, so it never swallows it
    expect(outside).toHaveBeenCalledTimes(1);
    expect(outside.mock.calls[0][0].defaultPrevented).toBe(false);

    document.removeEventListener('keydown', outside);
});

it('should do nothing for a key other than Enter', async () => {
    // Arrange

    const submit = jest.spyOn(FormControl.prototype, 'submit').mockImplementation(() => Promise.resolve());
    const outside = jest.fn();

    document.addEventListener('keydown', outside);

    const output = render(
        <Wrapper>
            <TestFilter>
                <TestInputField name='principal' />
                <button type='submit'>Submit</button>
            </TestFilter>
        </Wrapper>
    );

    // Act

    fireEvent.keyDown(output.getByTestId('principal'), { key: 'a' });

    // Assert

    expect(submit).not.toHaveBeenCalled();
    expect(outside).toHaveBeenCalledTimes(1);

    document.removeEventListener('keydown', outside);
});

it('should submit the real field values through the control when clicking submit', async () => {
    // Arrange

    const content = { callbackValue: null as any };

    const output = render(
        <Wrapper>
            <TestFilter onSubmit={(input) => (content.callbackValue = input)}>
                <TestInputField name='principal' />
                <button type='submit'>Submit</button>
            </TestFilter>
        </Wrapper>
    );

    // Act

    fireEvent.change(output.getByTestId('principal'), { target: { value: 'test' } });
    fireEvent.click(output.getByText('Submit'));

    // Assert

    await waitFor(() => expect(content.callbackValue).not.toBe(null));

    expect(content.callbackValue.principal).toBe('test');
});

it('should call control.cleanup when unmounted', async () => {
    // Arrange

    const cleanup = jest.spyOn(FormControl.prototype, 'cleanup');

    const output = render(
        <Wrapper>
            <TestFilter>
                <TestInputField name='principal' />
            </TestFilter>
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

function ContextProbe({ onControl }: { onControl: (control: FormControl<any, any>) => void }) {
    const control = useFormControl();

    onControl(control);

    return null;
}

interface TestFilterProps {
    children?: React.ReactNode;
    onSubmit?: (input: any) => void;
    onControl?: (control: FormControl<any, any>) => void;
}

function TestFilter({ children, onSubmit, onControl }: TestFilterProps) {
    const [, control] = useForm((input: any) => onSubmit?.(input));

    onControl?.(control);

    return <FormFilter control={control}>{children}</FormFilter>;
}
