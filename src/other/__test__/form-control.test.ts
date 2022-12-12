import { FormControl } from '../form-control';
import { RefObject } from 'react';
import { FormSubmitHandle } from '../../types/form-submit-handle';

type CreatePerson = {
    name: string;
    lastName: string;
    age: number;
    country: 'BR' | 'US';
};

type PersonCreated = {
    id: 123;
};

const person: CreatePerson = {
    name: 'John',
    lastName: 'Doe',
    age: 30,
    country: 'US',
};

describe('FormControl', () => {
    it('should be instanciate all fields', async () => {
        const onSubmit = (person: CreatePerson): PersonCreated => ({ id: 123 });

        const ref: RefObject<FormSubmitHandle<CreatePerson, PersonCreated>> = { current: onSubmit };

        const form = new FormControl(ref);
        await form.load(person);

        expect(form.fields).toHaveLength(4);
        expect(form.fields).toEqual(['name', 'lastName', 'age', 'country']);
    });

    it('should be return fieldsHandlingErrors', async () => {
        const onSubmit = (person: CreatePerson): PersonCreated => ({ id: 123 });

        const ref: RefObject<FormSubmitHandle<CreatePerson, PersonCreated>> = { current: onSubmit };

        const form = new FormControl(ref);
        await form.load(person);

        form.field('lastName').error.subscribe(() => {});
        form.field('country').error.subscribe(() => {});

        expect(form.fieldsHandlingErrors).toHaveLength(2);
        expect(form.fieldsHandlingErrors).toEqual(['lastName', 'country']);
    });

    it('should be success submit', async () => {
        const onSubmit = (person: CreatePerson): PersonCreated => ({ id: 123 });
        const onSuccess = (output: PersonCreated, input: CreatePerson) => {};

        const onSubmitMock = jest.fn(onSubmit);
        const onSuccessMock = jest.fn(onSuccess);

        const ref: RefObject<FormSubmitHandle<CreatePerson, PersonCreated>> = { current: onSubmitMock };

        const form = new FormControl(ref);
        form.setSuccess(onSuccessMock);

        await form.submit();

        expect(onSubmitMock).toHaveBeenCalledTimes(1);
        expect(onSuccessMock).toHaveBeenCalledWith({ id: 123 }, { __FORM_SUBMIT_CHECK: true });
    });
});
