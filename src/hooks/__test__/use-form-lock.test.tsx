import { GlobalObservable, ISubscriber, Observable, useSubscriber } from 'open-observable';
import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { Form } from '../../components/form';
import { FormControl } from '../../other/form-control';
import { useForm } from '../use-form';
import { useFormControl } from '../use-form-control';
import { useFormLock } from '../use-form-lock';
import { useIsFormLocked } from '../use-is-form-locked';

it('should lock the control while useFormLock(true) is mounted and block submit', async () => {
    // Arrange

    const content = { control: null as any };
    const onSubmit = jest.fn();

    const output = render(
        <Wrapper>
            <TestForm onControl={(control) => (content.control = control)} onSubmit={onSubmit} lock lockValue />
        </Wrapper>
    );

    // Act

    await waitFor(() => expect(output.getByTestId('locks').textContent).toBe('1'));

    await act(async () => {
        await content.control.submit();
    });

    // Assert

    expect(onSubmit).not.toHaveBeenCalled();
});

it('should release the lock when the component using useFormLock(true) unmounts', async () => {
    // Arrange

    const content = { control: null as any };
    const onSubmit = jest.fn();

    const output = render(
        <Wrapper>
            <TestForm onControl={(control) => (content.control = control)} onSubmit={onSubmit} lock lockValue />
        </Wrapper>
    );

    await waitFor(() => expect(output.getByTestId('locks').textContent).toBe('1'));

    // Act

    output.rerender(
        <Wrapper>
            <TestForm onControl={(control) => (content.control = control)} onSubmit={onSubmit} lockValue />
        </Wrapper>
    );

    // Assert

    await waitFor(() => expect(output.getByTestId('locks').textContent).toBe('0'));

    await act(async () => {
        await content.control.submit();
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
});

it('should not lock the control when useFormLock(false) is used', async () => {
    // Arrange

    const content = { control: null as any };
    const onSubmit = jest.fn();

    const output = render(
        <Wrapper>
            <TestForm onControl={(control) => (content.control = control)} onSubmit={onSubmit} lock lockValue={false} />
        </Wrapper>
    );

    // Act

    await waitFor(() => expect(output.getByTestId('locks').textContent).toBe('0'));

    await act(async () => {
        await content.control.submit();
    });

    // Assert

    expect(onSubmit).toHaveBeenCalledTimes(1);
});

it('should follow an ISubscriber<boolean> pushing true and false', async () => {
    // Arrange

    const source = new Observable<boolean>(false);

    const output = render(
        <Wrapper>
            <TestForm lock lockValue={source.asSubscriber()} />
        </Wrapper>
    );

    await waitFor(() => expect(output.getByTestId('locks').textContent).toBe('0'));

    // Act / Assert

    act(() => source.next(true));

    await waitFor(() => expect(output.getByTestId('locks').textContent).toBe('1'));

    act(() => source.next(false));

    await waitFor(() => expect(output.getByTestId('locks').textContent).toBe('0'));
});

it('should release the lock when unmounting while an ISubscriber<boolean> is locked', async () => {
    // Arrange

    const source = new Observable<boolean>(false);

    const output = render(
        <Wrapper>
            <TestForm lock lockValue={source.asSubscriber()} />
        </Wrapper>
    );

    await waitFor(() => expect(output.getByTestId('locks').textContent).toBe('0'));

    act(() => source.next(true));

    await waitFor(() => expect(output.getByTestId('locks').textContent).toBe('1'));

    // Act

    output.rerender(
        <Wrapper>
            <TestForm lockValue={source.asSubscriber()} />
        </Wrapper>
    );

    // Assert

    await waitFor(() => expect(output.getByTestId('locks').textContent).toBe('0'));
});

it('should reflect the lock state through useIsFormLocked', async () => {
    // Arrange

    const source = new Observable<boolean>(false);

    const output = render(
        <Wrapper>
            <TestForm lock lockValue={source.asSubscriber()} />
        </Wrapper>
    );

    await waitFor(() => expect(output.getByTestId('locked').textContent).toBe('unlocked'));

    // Act

    act(() => source.next(true));

    // Assert

    await waitFor(() => expect(output.getByTestId('locked').textContent).toBe('locked'));

    act(() => source.next(false));

    await waitFor(() => expect(output.getByTestId('locked').textContent).toBe('unlocked'));
});

it('should lock when the boolean prop flips from false to true after mount', async () => {
    // Arrange

    const content = { control: null as any };
    const onSubmit = jest.fn();

    const output = render(
        <Wrapper>
            <TestForm onControl={(control) => (content.control = control)} onSubmit={onSubmit} lock lockValue={false} />
        </Wrapper>
    );

    await waitFor(() => expect(output.getByTestId('locks').textContent).toBe('0'));

    // Act

    output.rerender(
        <Wrapper>
            <TestForm onControl={(control) => (content.control = control)} onSubmit={onSubmit} lock lockValue />
        </Wrapper>
    );

    // Assert

    await waitFor(() => expect(output.getByTestId('locks').textContent).toBe('1'));

    await act(async () => {
        await content.control.submit();
    });

    expect(onSubmit).not.toHaveBeenCalled();
});

it('should unlock when the boolean prop flips from true to false after mount', async () => {
    // Arrange

    const content = { control: null as any };
    const onSubmit = jest.fn();

    const output = render(
        <Wrapper>
            <TestForm onControl={(control) => (content.control = control)} onSubmit={onSubmit} lock lockValue />
        </Wrapper>
    );

    await waitFor(() => expect(output.getByTestId('locks').textContent).toBe('1'));

    // Act

    output.rerender(
        <Wrapper>
            <TestForm onControl={(control) => (content.control = control)} onSubmit={onSubmit} lock lockValue={false} />
        </Wrapper>
    );

    // Assert

    await waitFor(() => expect(output.getByTestId('locks').textContent).toBe('0'));

    await act(async () => {
        await content.control.submit();
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
});

it('should keep the lock counter balanced across several boolean flips and an unmount', async () => {
    // Arrange

    const content = { control: null as any };
    const onSubmit = jest.fn();

    // a sibling holds a permanent lock, so an unbalanced counter would silently unlock the form
    const renderWith = (lock: boolean, lockValue: boolean) =>
        output.rerender(
            <Wrapper>
                <TestForm
                    onControl={(control) => (content.control = control)}
                    onSubmit={onSubmit}
                    otherLock
                    lock={lock}
                    lockValue={lockValue}
                />
            </Wrapper>
        );

    const output = render(
        <Wrapper>
            <TestForm
                onControl={(control) => (content.control = control)}
                onSubmit={onSubmit}
                otherLock
                lock
                lockValue={false}
            />
        </Wrapper>
    );

    await waitFor(() => expect(output.getByTestId('locks').textContent).toBe('1'));

    // Act / Assert

    for (const [value, expected] of [
        [true, '2'],
        [false, '1'],
        [true, '2'],
        [true, '2'],
        [false, '1'],
        [false, '1'],
        [true, '2'],
    ] as [boolean, string][]) {
        renderWith(true, value);

        await waitFor(() => expect(output.getByTestId('locks').textContent).toBe(expected));
    }

    // unmounting while locked must release exactly once, leaving the sibling lock untouched
    renderWith(false, true);

    await waitFor(() => expect(output.getByTestId('locks').textContent).toBe('1'));

    await act(async () => {
        await content.control.submit();
    });

    expect(onSubmit).not.toHaveBeenCalled();

    // dropping the sibling lock finally unlocks the form
    output.rerender(
        <Wrapper>
            <TestForm onControl={(control) => (content.control = control)} onSubmit={onSubmit} lockValue={false} />
        </Wrapper>
    );

    await waitFor(() => expect(output.getByTestId('locks').textContent).toBe('0'));

    await act(async () => {
        await content.control.submit();
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
});

it('should release exactly once when a component mounted with useFormLock(true) unmounts', async () => {
    // Arrange

    const output = render(
        <Wrapper>
            <TestForm otherLock lock lockValue />
        </Wrapper>
    );

    await waitFor(() => expect(output.getByTestId('locks').textContent).toBe('2'));

    // Act

    output.rerender(
        <Wrapper>
            <TestForm otherLock lockValue />
        </Wrapper>
    );

    // Assert

    await waitFor(() => expect(output.getByTestId('locks').textContent).toBe('1'));
});

it('should stay correct when a new but equivalent subscriber is passed on every render', async () => {
    // Arrange

    const source = new Observable<boolean>(false);

    // a fresh ISubscriber object per render, backed by the same observable
    const wrap = (): ISubscriber<boolean> => ({ current: source.current, subscribe: source.subscribe });

    const renderWith = () =>
        output.rerender(
            <Wrapper>
                <TestForm otherLock lock lockValue={wrap()} />
            </Wrapper>
        );

    const output = render(
        <Wrapper>
            <TestForm otherLock lock lockValue={wrap()} />
        </Wrapper>
    );

    await waitFor(() => expect(output.getByTestId('locks').textContent).toBe('1'));

    // Act / Assert

    // resubscribing while unlocked must not leak a lock
    renderWith();
    renderWith();

    await waitFor(() => expect(output.getByTestId('locks').textContent).toBe('1'));

    act(() => source.next(true));

    await waitFor(() => expect(output.getByTestId('locks').textContent).toBe('2'));

    // resubscribing while locked must not double lock nor drop the lock
    renderWith();
    renderWith();

    await waitFor(() => expect(output.getByTestId('locks').textContent).toBe('2'));

    act(() => source.next(false));

    await waitFor(() => expect(output.getByTestId('locks').textContent).toBe('1'));

    act(() => source.next(true));

    await waitFor(() => expect(output.getByTestId('locks').textContent).toBe('2'));

    // unmounting while locked releases exactly once
    output.rerender(
        <Wrapper>
            <TestForm otherLock lockValue={wrap()} />
        </Wrapper>
    );

    await waitFor(() => expect(output.getByTestId('locks').textContent).toBe('1'));
});

function Wrapper({ children }: { children: React.ReactNode }) {
    return <GlobalObservable>{children}</GlobalObservable>;
}

function LockChild({ value }: { value: boolean | ISubscriber<boolean> }) {
    useFormLock(value);

    return null;
}

function LockObserver() {
    const control = useFormControl();

    const locks = useSubscriber(control.locks);
    const locked = useSubscriber(useIsFormLocked());

    return (
        <>
            <span data-testid='locks'>{locks}</span>
            <span data-testid='locked'>{locked ? 'locked' : 'unlocked'}</span>
        </>
    );
}

interface TestFormProps {
    lock?: boolean;
    otherLock?: boolean;
    lockValue: boolean | ISubscriber<boolean>;
    onControl?: (control: FormControl<any, any>) => void;
    onSubmit?: (input: any) => void;
}

function TestForm({ lock, otherLock, lockValue, onControl, onSubmit }: TestFormProps) {
    const [, control] = useForm((input: any) => onSubmit?.(input));

    onControl?.(control);

    return (
        <Form control={control}>
            <LockObserver />
            {otherLock && <LockChild value={true} />}
            {lock && <LockChild value={lockValue} />}
        </Form>
    );
}
