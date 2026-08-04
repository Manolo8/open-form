import { GlobalObservable, useSubscriber } from 'open-observable';
import React from 'react';
import { act, render, fireEvent, waitFor } from '@testing-library/react';
import { Form } from '../../components/form';
import { FormControl } from '../../other/form-control';
import { useField } from '../use-field';
import { useForm } from '../use-form';
import { useFormResolver } from '../use-form-resolver';
import { useFormSuccessResolver } from '../use-form-success-resolver';

it('should block the submit when the resolver resolves false', async () => {
    // Arrange

    const content = { control: null as any };
    const onSubmit = jest.fn();
    const resolver = jest.fn(() => Promise.resolve(false));

    render(
        <Wrapper>
            <TestForm onControl={(control) => (content.control = control)} onSubmit={onSubmit}>
                <ResolverChild resolver={resolver} />
            </TestForm>
        </Wrapper>
    );

    await waitFor(() => expect(content.control).not.toBe(null));

    // Act

    await act(async () => {
        await content.control.submit();
    });

    // Assert

    expect(resolver).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
});

it('should allow the submit when the resolver resolves true', async () => {
    // Arrange

    const content = { control: null as any };
    const onSubmit = jest.fn();
    const resolver = jest.fn(() => Promise.resolve(true));

    render(
        <Wrapper>
            <TestForm onControl={(control) => (content.control = control)} onSubmit={onSubmit}>
                <ResolverChild resolver={resolver} />
            </TestForm>
        </Wrapper>
    );

    await waitFor(() => expect(content.control).not.toBe(null));

    // Act

    await act(async () => {
        await content.control.submit();
    });

    // Assert

    expect(resolver).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledTimes(1);
});

it('should deregister the resolver when the component unmounts', async () => {
    // Arrange

    const content = { control: null as any };
    const onSubmit = jest.fn();
    const resolver = jest.fn(() => Promise.resolve(false));

    const output = render(
        <Wrapper>
            <TestForm onControl={(control) => (content.control = control)} onSubmit={onSubmit}>
                <ResolverChild resolver={resolver} />
            </TestForm>
        </Wrapper>
    );

    await act(async () => {
        await content.control.submit();
    });

    expect(onSubmit).not.toHaveBeenCalled();

    // Act

    output.rerender(
        <Wrapper>
            <TestForm onControl={(control) => (content.control = control)} onSubmit={onSubmit} />
        </Wrapper>
    );

    await act(async () => {
        await content.control.submit();
    });

    // Assert

    expect(resolver).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledTimes(1);
});

it('should keep exactly one registration even when the resolver identity changes on every render', async () => {
    // Arrange

    const content = { control: null as any };
    const onSubmit = jest.fn();
    const resolver = jest.fn(() => Promise.resolve(true));

    const output = render(
        <Wrapper>
            <TestForm onControl={(control) => (content.control = control)} onSubmit={onSubmit}>
                <ResolverChild resolver={() => resolver()} />
            </TestForm>
        </Wrapper>
    );

    // Act

    // useFormResolver deps are [resolver], so a fresh inline arrow re-registers on every render
    output.rerender(
        <Wrapper>
            <TestForm onControl={(control) => (content.control = control)} onSubmit={onSubmit}>
                <ResolverChild resolver={() => resolver()} />
            </TestForm>
        </Wrapper>
    );

    output.rerender(
        <Wrapper>
            <TestForm onControl={(control) => (content.control = control)} onSubmit={onSubmit}>
                <ResolverChild resolver={() => resolver()} />
            </TestForm>
        </Wrapper>
    );

    await act(async () => {
        await content.control.submit();
    });

    // Assert

    expect(resolver).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledTimes(1);
});

it('should move a stable resolver to a new control when the control prop changes', async () => {
    // Arrange

    const content = { a: null as any, b: null as any };
    const onSubmitA = jest.fn();
    const onSubmitB = jest.fn();

    const output = render(
        <Wrapper>
            <TwoControlForm
                which='a'
                resolver={blockingResolver}
                onSubmitA={onSubmitA}
                onSubmitB={onSubmitB}
                onControls={(a, b) => Object.assign(content, { a, b })}
            />
        </Wrapper>
    );

    await act(async () => {
        await content.a.submit();
    });

    expect(onSubmitA).not.toHaveBeenCalled();

    // Act

    output.rerender(
        <Wrapper>
            <TwoControlForm
                which='b'
                resolver={blockingResolver}
                onSubmitA={onSubmitA}
                onSubmitB={onSubmitB}
                onControls={(a, b) => Object.assign(content, { a, b })}
            />
        </Wrapper>
    );

    // Assert

    // the resolver follows the control: B is now blocked...
    await act(async () => {
        await content.b.submit();
    });

    expect(onSubmitB).not.toHaveBeenCalled();

    // ...and A was released instead of being blocked forever
    await act(async () => {
        await content.a.submit();
    });

    expect(onSubmitA).toHaveBeenCalledTimes(1);
});

it('should move a stable success resolver to a new control when the control prop changes', async () => {
    // Arrange

    const content = { a: null as any, b: null as any };
    const successResolver = jest.fn();

    const output = render(
        <Wrapper>
            <TwoControlForm
                which='a'
                successResolver={successResolver}
                onSubmitA={() => ({ id: 'a' })}
                onSubmitB={() => ({ id: 'b' })}
                onControls={(a, b) => Object.assign(content, { a, b })}
            />
        </Wrapper>
    );

    await act(async () => {
        await content.a.submit();
    });

    expect(successResolver).toHaveBeenCalledTimes(1);

    // Act

    output.rerender(
        <Wrapper>
            <TwoControlForm
                which='b'
                successResolver={successResolver}
                onSubmitA={() => ({ id: 'a' })}
                onSubmitB={() => ({ id: 'b' })}
                onControls={(a, b) => Object.assign(content, { a, b })}
            />
        </Wrapper>
    );

    // Assert

    await act(async () => {
        await content.b.submit();
    });

    expect(successResolver).toHaveBeenCalledTimes(2);
    expect(successResolver.mock.calls[1][1]).toEqual({ id: 'b' });

    // the old control no longer carries the success resolver

    await act(async () => {
        await content.a.submit();
    });

    expect(successResolver).toHaveBeenCalledTimes(2);
});

it('should register a stable resolver exactly once per control across many renders', async () => {
    // Arrange

    const content = { a: null as any, b: null as any };
    const resolver = jest.fn(() => Promise.resolve(true));
    const onSubmitA = jest.fn();
    const onSubmitB = jest.fn();

    const renderWith = (which: 'a' | 'b') =>
        output.rerender(
            <Wrapper>
                <TwoControlForm
                    which={which}
                    resolver={resolver}
                    onSubmitA={onSubmitA}
                    onSubmitB={onSubmitB}
                    onControls={(a, b) => Object.assign(content, { a, b })}
                />
            </Wrapper>
        );

    const output = render(
        <Wrapper>
            <TwoControlForm
                which='a'
                resolver={resolver}
                onSubmitA={onSubmitA}
                onSubmitB={onSubmitB}
                onControls={(a, b) => Object.assign(content, { a, b })}
            />
        </Wrapper>
    );

    // Act

    renderWith('b');
    renderWith('a');
    renderWith('a');
    renderWith('b');

    await act(async () => {
        await content.b.submit();
    });

    // Assert

    // one registration on B, none left over on A
    expect(resolver).toHaveBeenCalledTimes(1);
    expect(onSubmitB).toHaveBeenCalledTimes(1);

    await act(async () => {
        await content.a.submit();
    });

    expect(resolver).toHaveBeenCalledTimes(1);
    expect(onSubmitA).toHaveBeenCalledTimes(1);
});

it('should call the success resolver with (input, output) after a successful submit', async () => {
    // Arrange

    const content = { control: null as any };
    const successResolver = jest.fn();

    const output = render(
        <Wrapper>
            <TestForm onControl={(control) => (content.control = control)} onSubmit={() => ({ id: 123 })}>
                <SuccessResolverChild resolver={successResolver} />
            </TestForm>
        </Wrapper>
    );

    fireEvent.change(output.getByTestId('principal'), { target: { value: 'test' } });

    await waitFor(() => expect((output.getByTestId('principal') as HTMLInputElement).value).toBe('test'));

    // Act

    await act(async () => {
        await content.control.submit();
    });

    // Assert

    expect(successResolver).toHaveBeenCalledTimes(1);
    expect(successResolver.mock.calls[0][0]).toEqual({ principal: 'test' });
    expect(successResolver.mock.calls[0][1]).toEqual({ id: 123 });
});

it('should deregister the success resolver when the component unmounts', async () => {
    // Arrange

    const content = { control: null as any };
    const successResolver = jest.fn();

    const output = render(
        <Wrapper>
            <TestForm onControl={(control) => (content.control = control)} onSubmit={() => ({ id: 123 })}>
                <SuccessResolverChild resolver={successResolver} />
            </TestForm>
        </Wrapper>
    );

    await act(async () => {
        await content.control.submit();
    });

    expect(successResolver).toHaveBeenCalledTimes(1);

    // Act

    output.rerender(
        <Wrapper>
            <TestForm onControl={(control) => (content.control = control)} onSubmit={() => ({ id: 123 })} />
        </Wrapper>
    );

    await act(async () => {
        await content.control.submit();
    });

    // Assert

    expect(successResolver).toHaveBeenCalledTimes(1);
});

const blockingResolver = () => Promise.resolve(false);

function Wrapper({ children }: { children: React.ReactNode }) {
    return <GlobalObservable>{children}</GlobalObservable>;
}

function TestInputField({ name }: { name: string }) {
    const field = useField(name, '');

    const value = useSubscriber(field);

    return <input data-testid={name} value={value} onChange={(e) => field.next(e.target.value)} />;
}

function ResolverChild({ resolver }: { resolver: () => Promise<boolean> }) {
    useFormResolver(resolver);

    return null;
}

function SuccessResolverChild({ resolver }: { resolver: (input: any, output: any) => void }) {
    useFormSuccessResolver(resolver);

    return null;
}

interface TestFormProps {
    children?: React.ReactNode;
    onControl?: (control: FormControl<any, any>) => void;
    onSubmit?: (input: any) => any;
}

function TestForm({ children, onControl, onSubmit }: TestFormProps) {
    const [, control] = useForm((input: any) => onSubmit?.(input));

    onControl?.(control);

    return (
        <Form control={control}>
            <TestInputField name='principal' />
            {children}
        </Form>
    );
}

interface TwoControlFormProps {
    which: 'a' | 'b';
    resolver?: () => Promise<boolean>;
    successResolver?: (input: any, output: any) => void;
    onSubmitA: (input: any) => any;
    onSubmitB: (input: any) => any;
    onControls: (a: FormControl<any, any>, b: FormControl<any, any>) => void;
}

function TwoControlForm({ which, resolver, successResolver, onSubmitA, onSubmitB, onControls }: TwoControlFormProps) {
    const [, controlA] = useForm((input: any) => onSubmitA(input));
    const [, controlB] = useForm((input: any) => onSubmitB(input));

    onControls(controlA, controlB);

    return (
        <Form control={which === 'a' ? controlA : controlB}>
            {resolver && <ResolverChild resolver={resolver} />}
            {successResolver && <SuccessResolverChild resolver={successResolver} />}
        </Form>
    );
}
