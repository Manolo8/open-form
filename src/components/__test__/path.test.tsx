import { GlobalObservable, useSubscriber } from 'open-observable';
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { useField } from '../../hooks/use-field';
import { useForm } from '../../hooks/use-form';
import { Form } from '../form';
import Path from '../path';

it('should render Path component correctly to PathObject', async () => {
    // Arrange

    const content = { callbackValue: null as any };

    const output = render(
        <Wrapper>
            <TestObjectComponent callback={(output) => (content.callbackValue = output)} />
        </Wrapper>
    );

    // Act

    await waitFor(() => expect(output.container.querySelectorAll('input').length).toBe(4));

    const inputs = output.container.querySelectorAll('input');

    fireEvent.change(inputs[0], { target: { value: 'test' } });
    fireEvent.change(inputs[1], { target: { value: 'test1' } });
    fireEvent.change(inputs[2], { target: { value: 'test2' } });
    fireEvent.change(inputs[3], { target: { value: 'test3' } });

    fireEvent.click(output.getByText('Submit'));

    // Assert

    await waitFor(() => expect(content.callbackValue).not.toBe(null));

    expect(content.callbackValue.sub.field1).toBe('test1');
    expect(content.callbackValue.sub.field2).toBe('test2');
    expect(content.callbackValue.sub.evendeep.field3).toBe('test3');
});

it('should render Path component correctly to PathArray', async () => {
    // Arrange

    const content = { callbackValue: null as any };

    const output = render(
        <Wrapper>
            <TestArrayComponent callback={(output) => (content.callbackValue = output)} />
        </Wrapper>
    );

    // Act

    //wait for button Add
    await waitFor(() => expect(output.getByText('Add')).not.toBe(null));

    fireEvent.click(output.getByText('Add'));
    fireEvent.click(output.getByText('Add'));

    //wait for inputs
    await waitFor(() => expect(output.container.querySelectorAll('input').length).toBe(7));

    const inputs = output.container.querySelectorAll('input');

    fireEvent.change(inputs[0], { target: { value: 'test' } });
    fireEvent.change(inputs[1], { target: { value: 'test1' } });
    fireEvent.change(inputs[2], { target: { value: 'test2' } });
    fireEvent.change(inputs[3], { target: { value: 'test3' } });
    fireEvent.change(inputs[4], { target: { value: 'test4' } });
    fireEvent.change(inputs[5], { target: { value: 'test5' } });
    fireEvent.change(inputs[6], { target: { value: 'test6' } });

    fireEvent.click(output.getByText('Submit'));

    // Assert

    await waitFor(() => expect(content.callbackValue).not.toBe(null));

    expect(content.callbackValue.principal).toBe('test');
    expect(content.callbackValue.sub[0].field1).toBe('test1');
    expect(content.callbackValue.sub[0].field2).toBe('test2');
    expect(content.callbackValue.sub[0].evendeep.field3).toBe('test3');
    expect(content.callbackValue.sub[1].field1).toBe('test4');
    expect(content.callbackValue.sub[1].field2).toBe('test5');
    expect(content.callbackValue.sub[1].evendeep.field3).toBe('test6');
});

function Wrapper({ children }: { children: React.ReactNode }) {
    return <GlobalObservable>{children}</GlobalObservable>;
}

function TestInputField({ name }: { name: string }) {
    const field = useField(name, '');

    const value = useSubscriber(field);

    return <input value={value} onChange={(e) => field.next(e.target.value)} />;
}

interface TestObjectComponentProps {
    callback: (data: {
        sub: { field1: string; field2: string; evendeep: { field3: string } };
        principal: string;
    }) => void;
}

function TestObjectComponent({ callback }: TestObjectComponentProps) {
    const [model, control] = useForm(callback);

    return (
        <Form control={control}>
            <TestInputField name={model('principal')} />
            <Path model={model} path='sub'>
                {(submodel) => (
                    <>
                        <TestInputField name={submodel('field1')} />
                        <TestInputField name={submodel('field2')} />
                        <Path model={submodel} path='evendeep'>
                            {(evenDeepModel) => <TestInputField name={evenDeepModel('field3')} />}
                        </Path>
                    </>
                )}
            </Path>
            <button type='submit'>Submit</button>
        </Form>
    );
}

interface TestArrayComponentProps {
    callback: (data: {
        principal: string;
        sub: { field1: string; field2: string; evendeep: { field3: string } }[];
    }) => void;
}

function TestArrayComponent({ callback }: TestArrayComponentProps) {
    const [model, control] = useForm(callback);

    function add() {
        control.field('sub').next((old) => [...old??[], { field1: '', field2: '', evendeep: { field3: '' } }]);
    }

    return (
        <Form control={control}>
            <TestInputField name={model('principal')} />
            <Path model={model} path='sub' keySelector={(_, index) => index}>
                {(submodel) => (
                    <>
                        <TestInputField name={submodel('field1')} />
                        <TestInputField name={submodel('field2')} />
                        <Path model={submodel} path='evendeep'>
                            {(evenDeepModel) => <TestInputField name={evenDeepModel('field3')} />}
                        </Path>
                    </>
                )}
            </Path>

            <button type='button' onClick={add}>
                Add
            </button>
            <button type='submit'>Submit</button>
        </Form>
    );
}
