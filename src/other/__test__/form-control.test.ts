import { FormControl } from '../form-control';
import { RefObject } from 'react';
import { FormSubmitHandle } from '../../types/form-submit-handle';
import { isFormSubmitInput } from '../form-submit-input';
import { Observable } from 'open-observable';
import { FormConfigType } from '../../types/form-config-type';
import { LastChange } from '../../types/last-change';
import { enhacedNameof } from '../enhaced-nameof';

type CreatePerson = {
    name: string;
    lastName: string;
    age: number;
    country: 'BR' | 'US';
};

type PersonCreated = {
    id: 123;
};

type CreateCompany = {
    name: string;
    address: { street: string; city: string };
};

const person: CreatePerson = {
    name: 'John',
    lastName: 'Doe',
    age: 30,
    country: 'US',
};

const createRef = (
    handle: FormSubmitHandle<CreatePerson, PersonCreated> | null
): RefObject<FormSubmitHandle<CreatePerson, PersonCreated>> =>
    ({ current: handle } as RefObject<FormSubmitHandle<CreatePerson, PersonCreated>>);

const createTranslator = (translate: (error: any) => any) =>
    new Observable<FormConfigType>({ errorTranslate: translate }).asSubscriber();

// submit() is fire-and-forget in a few code paths (auto submit); this drains the
// microtask queue so the awaited chain inside submit() has a chance to finish.
const flushMicrotasks = async () => {
    for (let index = 0; index < 20; index++) await Promise.resolve();
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
        expect(onSuccessMock).toHaveBeenCalledWith({ id: 123 }, {});
    });

    it('should be mark the submitted input without mutating it', async () => {
        const onSubmit = (person: CreatePerson): PersonCreated => ({ id: 123 });

        const onSubmitMock = jest.fn(onSubmit);

        const ref: RefObject<FormSubmitHandle<CreatePerson, PersonCreated>> = { current: onSubmitMock };

        const form = new FormControl(ref);

        await form.submit();

        const input = onSubmitMock.mock.calls[0][0];

        expect(isFormSubmitInput(input)).toBe(true);
        expect(Object.prototype.hasOwnProperty.call(input, '__FORM_SUBMIT_CHECK')).toBe(false);
    });

    describe('submit guards', () => {
        it('should not submit while the form is locked', async () => {
            const onSubmitMock = jest.fn((): PersonCreated => ({ id: 123 }));
            const form = new FormControl(createRef(onSubmitMock));

            form.lock(true);

            await form.submit();

            expect(onSubmitMock).not.toHaveBeenCalled();
            expect(form.locks.current()).toBe(1);
        });

        it('should submit again once every lock is released', async () => {
            const onSubmitMock = jest.fn((): PersonCreated => ({ id: 123 }));
            const form = new FormControl(createRef(onSubmitMock));

            form.lock(true);
            await form.submit();
            expect(onSubmitMock).not.toHaveBeenCalled();

            form.lock(false);
            expect(form.locks.current()).toBe(0);

            await form.submit();
            expect(onSubmitMock).toHaveBeenCalledTimes(1);
        });

        it('should clamp the lock counter at zero instead of going negative', () => {
            const form = new FormControl(createRef(() => ({ id: 123 })));

            const seen: number[] = [];
            form.locks.subscribe((value) => seen.push(value));

            form.lock(false);
            form.lock(false);

            expect(form.locks.current()).toBe(0);
            // the observable only emits on change, so the clamped writes are not published
            expect(seen).toEqual([0]);
        });

        it('should not submit when the submit handle ref is empty', async () => {
            const form = new FormControl(createRef(null));

            const submitting: boolean[] = [];
            form.submitting.subscribe((value) => submitting.push(value));

            await form.submit();

            expect(submitting).toEqual([false]);
        });

        it('should not submit twice while a submit is in flight', async () => {
            let resolveHandle!: (value: PersonCreated) => void;
            const pending = new Promise<PersonCreated>((resolve) => {
                resolveHandle = resolve;
            });

            const onSubmitMock = jest.fn(() => pending);
            const form = new FormControl(createRef(onSubmitMock));

            const first = form.submit();
            const second = form.submit();

            resolveHandle({ id: 123 });

            await Promise.all([first, second]);

            expect(onSubmitMock).toHaveBeenCalledTimes(1);
            expect(form.submitting.current()).toBe(false);
        });
    });

    describe('resolvers', () => {
        it('should block the submit when a resolver resolves false', async () => {
            const onSubmitMock = jest.fn((): PersonCreated => ({ id: 123 }));
            const form = new FormControl(createRef(onSubmitMock));

            form.addResolver(async () => false);

            const submitting: boolean[] = [];
            form.submitting.subscribe((value) => submitting.push(value));

            await form.submit();

            expect(onSubmitMock).not.toHaveBeenCalled();
            expect(submitting).toEqual([false, true, false]);
        });

        it('should submit when every resolver resolves true', async () => {
            const onSubmitMock = jest.fn((): PersonCreated => ({ id: 123 }));
            const form = new FormControl(createRef(onSubmitMock));

            form.addResolver(async () => true);
            form.addResolver(async () => true);

            await form.submit();

            expect(onSubmitMock).toHaveBeenCalledTimes(1);
        });

        it('should remove the resolver through the returned cleanup callback', async () => {
            const onSubmitMock = jest.fn((): PersonCreated => ({ id: 123 }));
            const form = new FormControl(createRef(onSubmitMock));

            const cleanup = form.addResolver(async () => false);

            await form.submit();
            expect(onSubmitMock).not.toHaveBeenCalled();

            cleanup();

            await form.submit();
            expect(onSubmitMock).toHaveBeenCalledTimes(1);
        });

        it('should not remove another resolver when a cleanup callback is called twice', async () => {
            const onSubmitMock = jest.fn((): PersonCreated => ({ id: 123 }));
            const form = new FormControl(createRef(onSubmitMock));

            const cleanup = form.addResolver(async () => true);

            //the blocking resolver is registered last, so an unguarded splice(-1, 1) would drop it
            form.addResolver(async () => false);

            cleanup();
            cleanup();

            await form.submit();

            expect(onSubmitMock).not.toHaveBeenCalled();
        });

        it('should return null from toObject(true) when a resolver fails', async () => {
            const form = new FormControl(createRef(() => ({ id: 123 })));
            form.field('name', 'John');

            form.addResolver(async () => false);

            expect(await form.toObject(true)).toBeNull();
        });

        it('should return the object from toObject(true) when every resolver passes', async () => {
            const form = new FormControl(createRef(() => ({ id: 123 })));
            form.field('name', 'John');

            form.addResolver(async () => true);

            expect(await form.toObject(true)).toEqual({ name: 'John' });
        });

        it('should ignore resolvers when toObject is called without the flag', async () => {
            const resolver = jest.fn(async () => false);
            const form = new FormControl(createRef(() => ({ id: 123 })));
            form.field('name', 'John');

            form.addResolver(resolver);

            expect(await form.toObject()).toEqual({ name: 'John' });
            expect(await form.toObject(false)).toEqual({ name: 'John' });
            expect(resolver).not.toHaveBeenCalled();
        });
    });

    describe('setAdditional', () => {
        it('should send the value returned by the additional callback to the handler', async () => {
            const onSubmitMock = jest.fn((): PersonCreated => ({ id: 123 }));
            const form = new FormControl(createRef(onSubmitMock));

            form.field('name', 'John');
            form.setAdditional((input) => ({ ...input, country: 'BR' } as CreatePerson));

            await form.submit();

            expect(onSubmitMock).toHaveBeenCalledWith({ name: 'John', country: 'BR' });
        });
    });

    describe('handleSuccess', () => {
        const buildLoadedForm = async (onSubmitMock: jest.Mock) => {
            const form = new FormControl(createRef(onSubmitMock));

            form.field('name', '');
            form.field('lastName', '');

            await form.load({ name: 'John', lastName: 'Doe' });

            return form;
        };

        it('should push every field back to its initial value on the Clear action', async () => {
            const onSubmitMock = jest.fn((): PersonCreated => ({ id: 123 }));
            const form = await buildLoadedForm(onSubmitMock);

            form.setSuccess(() => ({ action: 'Clear' }));

            await form.submit();

            expect(await form.toObject()).toEqual({ name: '', lastName: '' });
            expect(form.changes.current()).toBe(0);
            expect(form.field('name').changed.current()).toBe(false);
        });

        it('should drop the loaded default on the Clear action so a later reset does not resurrect it', async () => {
            const onSubmitMock = jest.fn((): PersonCreated => ({ id: 123 }));
            const form = await buildLoadedForm(onSubmitMock);

            expect(await form.toObject()).toEqual({ name: 'John', lastName: 'Doe' });

            form.setSuccess(() => ({ action: 'Clear' }));

            await form.submit();

            expect(await form.toObject()).toEqual({ name: '', lastName: '' });

            // regression: the stale default used to survive the clear and come back on reset
            form.reset();

            expect(await form.toObject()).toEqual({ name: '', lastName: '' });
        });

        it('should push every field back to the loaded value on the Reset action', async () => {
            const onSubmitMock = jest.fn((): PersonCreated => ({ id: 123 }));
            const form = await buildLoadedForm(onSubmitMock);

            form.field('name').next('Changed');
            form.setSuccess(() => ({ action: 'Reset' }));

            await form.submit();

            expect(onSubmitMock).toHaveBeenCalledWith({ name: 'Changed', lastName: 'Doe' });
            expect(await form.toObject()).toEqual({ name: 'John', lastName: 'Doe' });
        });

        it('should apply the provided value on the Set action', async () => {
            const onSubmitMock = jest.fn((): PersonCreated => ({ id: 123 }));
            const form = await buildLoadedForm(onSubmitMock);

            form.setSuccess(() => ({ action: 'Set', value: { name: 'Jane' } }));

            await form.submit();

            // fields missing from the Set payload are cleared back to their initial value
            expect(await form.toObject()).toEqual({ name: 'Jane', lastName: '' });
        });

        it('should leave the fields untouched when the success callback returns nothing', async () => {
            const onSubmitMock = jest.fn((): PersonCreated => ({ id: 123 }));
            const form = await buildLoadedForm(onSubmitMock);

            form.field('name').next('Changed');
            form.setSuccess(() => undefined);

            await form.submit();

            expect(await form.toObject()).toEqual({ name: 'Changed', lastName: 'Doe' });
        });
    });

    describe('addSuccessResolver', () => {
        it('should call the success resolver with (input, output)', async () => {
            const onSubmitMock = jest.fn((): PersonCreated => ({ id: 123 }));
            const successResolver = jest.fn();
            const onSuccess = jest.fn();

            const form = new FormControl(createRef(onSubmitMock));
            form.field('name', 'John');

            form.addSuccessResolver(successResolver);
            form.setSuccess(onSuccess);

            await form.submit();

            // NOTE: the argument order is inverted between the two hooks.
            // form-control.ts:232 calls success resolvers with (input, output)
            // while form-control.ts:236 calls setSuccess with (output, input).
            expect(successResolver).toHaveBeenCalledWith({ name: 'John' }, { id: 123 });
            expect(onSuccess).toHaveBeenCalledWith({ id: 123 }, { name: 'John' });
        });

        it('should call the success resolver even when no success callback is registered', async () => {
            const successResolver = jest.fn();
            const form = new FormControl(createRef(() => ({ id: 123 })));

            form.addSuccessResolver(successResolver);

            await form.submit();

            expect(successResolver).toHaveBeenCalledTimes(1);
        });

        it('should deregister the success resolver through the returned cleanup callback', async () => {
            const successResolver = jest.fn();
            const form = new FormControl(createRef(() => ({ id: 123 })));

            const cleanup = form.addSuccessResolver(successResolver);

            await form.submit();
            expect(successResolver).toHaveBeenCalledTimes(1);

            cleanup();

            await form.submit();
            expect(successResolver).toHaveBeenCalledTimes(1);
        });

        it('should not remove another success resolver when a cleanup callback is called twice', async () => {
            const survivor = jest.fn();
            const form = new FormControl(createRef(() => ({ id: 123 })));

            const cleanup = form.addSuccessResolver(jest.fn());

            //the survivor is registered last, so an unguarded splice(-1, 1) would drop it
            form.addSuccessResolver(survivor);

            cleanup();
            cleanup();

            await form.submit();

            expect(survivor).toHaveBeenCalledTimes(1);
        });
    });

    describe('handleError', () => {
        const throwing = () => {
            throw { message: 'boom' };
        };

        it('should translate the thrown error and apply it to the fields', async () => {
            const errorTranslate = jest.fn(() => ({ name: 'Name is required' }));
            const form = new FormControl(createRef(throwing as any), createTranslator(errorTranslate));

            form.field('name', '');

            const errors: any[] = [];
            form.field('name').error.subscribe((value) => errors.push(value));

            await form.submit();

            expect(errorTranslate).toHaveBeenCalledWith({ message: 'boom' });
            expect(errors).toEqual([null, 'Name is required']);
        });

        it('should call the error callback with the input and the translated errors', async () => {
            const errorTranslate = jest.fn(() => ({ name: 'Name is required' }));
            const onError = jest.fn(() => ({ lastName: 'Last name is required' }));

            const form = new FormControl(createRef(throwing as any), createTranslator(errorTranslate));

            form.field('name', 'John');
            form.field('lastName', 'Doe');
            form.setError(onError as any);

            await form.submit();

            expect(onError).toHaveBeenCalledWith({ name: 'John', lastName: 'Doe' }, { name: 'Name is required' });
            expect(form.field('lastName').error.current()).toBe('Last name is required');
        });

        it('should release submitting and never reject when the handler throws', async () => {
            const form = new FormControl(createRef(throwing as any), createTranslator(() => ({ name: 'nope' })));

            const submitting: boolean[] = [];
            form.submitting.subscribe((value) => submitting.push(value));

            await expect(form.submit()).resolves.toBeUndefined();

            expect(submitting).toEqual([false, true, false]);
            expect(form.submitting.current()).toBe(false);
        });

        it('should call the error callback with undefined errors when no translator is configured', async () => {
            const onError = jest.fn(() => undefined);
            const form = new FormControl(createRef(throwing as any));

            form.field('name', 'John');
            form.setError(onError as any);

            await form.submit();

            expect(onError).toHaveBeenCalledWith({ name: 'John' }, undefined);
            expect(form.field('name').error.current()).toBeNull();
        });
    });

    describe('load', () => {
        it('should accept a plain object', async () => {
            const form = new FormControl(createRef(() => ({ id: 123 })));

            await form.load({ name: 'John' });

            expect(await form.toObject()).toEqual({ name: 'John' });
        });

        it('should accept a factory returning a plain object', async () => {
            const form = new FormControl(createRef(() => ({ id: 123 })));

            await form.load(() => ({ name: 'John' }));

            expect(await form.toObject()).toEqual({ name: 'John' });
        });

        it('should accept a factory returning a promise', async () => {
            const form = new FormControl(createRef(() => ({ id: 123 })));

            await form.load(async () => ({ name: 'John' }));

            expect(await form.toObject()).toEqual({ name: 'John' });
        });

        it('should keep loading true while the promise is pending', async () => {
            const form = new FormControl(createRef(() => ({ id: 123 })));

            let resolveLoad!: (value: Partial<CreatePerson>) => void;
            const pending = new Promise<Partial<CreatePerson>>((resolve) => {
                resolveLoad = resolve;
            });

            const loading: boolean[] = [];
            form.loading.subscribe((value) => loading.push(value));

            const promise = form.load(pending);

            expect(form.loading.current()).toBe(true);

            resolveLoad({ name: 'John' });
            await promise;

            expect(form.loading.current()).toBe(false);
            expect(loading).toEqual([false, true, false]);
        });

        it('should release loading and propagate the rejection', async () => {
            const form = new FormControl(createRef(() => ({ id: 123 })));

            await expect(form.load(Promise.reject(new Error('boom')))).rejects.toThrow('boom');

            expect(form.loading.current()).toBe(false);
        });

        it('should drop fields missing from the second load back to their initial value', async () => {
            const form = new FormControl(createRef(() => ({ id: 123 })));

            form.field('name', '');
            form.field('lastName', '');

            await form.load({ name: 'John', lastName: 'Doe' });
            expect(await form.toObject()).toEqual({ name: 'John', lastName: 'Doe' });

            await form.load({ name: 'Jane' });
            expect(await form.toObject()).toEqual({ name: 'Jane', lastName: '' });
        });
    });

    describe('reset', () => {
        it('should restore the loaded defaults instead of the initial values', async () => {
            const form = new FormControl(createRef(() => ({ id: 123 })));

            form.field('name', '');
            form.field('lastName', '');

            await form.load({ name: 'John', lastName: 'Doe' });

            form.field('name').next('Changed');
            expect(await form.toObject()).toEqual({ name: 'Changed', lastName: 'Doe' });

            form.reset();

            expect(await form.toObject()).toEqual({ name: 'John', lastName: 'Doe' });
        });

        it('should clear the field errors', async () => {
            const form = new FormControl(createRef(() => ({ id: 123 })));

            form.field('name', '');
            await form.load({ name: 'John' });

            form.field('name').nextError('Name is required');
            form.field('name').nextChildError('deep', 'nope');

            form.reset();

            expect(form.field('name').error.current()).toBeNull();
            expect(form.field('name').childError.current()).toEqual({});
        });
    });

    describe('setReadonly', () => {
        it('should be reflected by fields created before and after the call', () => {
            const form = new FormControl(createRef(() => ({ id: 123 })));

            const before = form.field('name', '');

            form.setReadonly(true);

            const after = form.field('lastName', '');

            expect(form.readonly.current()).toBe(true);
            expect(before.readonly.current()).toBe(true);
            expect(after.readonly.current()).toBe(true);

            form.setReadonly(false);

            expect(before.readonly.current()).toBe(false);
            expect(after.readonly.current()).toBe(false);
        });
    });

    describe('loadError', () => {
        it('should route the errors through the translator when translate is true', () => {
            const errorTranslate = jest.fn(() => ({ name: 'Translated' }));
            const form = new FormControl(createRef(() => ({ id: 123 })), createTranslator(errorTranslate));

            form.field('name', '');

            form.loadError({ translate: true, errors: { raw: 'payload' } });

            expect(errorTranslate).toHaveBeenCalledWith({ raw: 'payload' });
            expect(form.field('name').error.current()).toBe('Translated');
        });

        it('should apply the errors raw when translate is false', () => {
            const errorTranslate = jest.fn(() => ({ name: 'Translated' }));
            const form = new FormControl(createRef(() => ({ id: 123 })), createTranslator(errorTranslate));

            form.field('name', '');

            form.loadError({ translate: false, errors: { name: 'Raw error' } });

            expect(errorTranslate).not.toHaveBeenCalled();
            expect(form.field('name').error.current()).toBe('Raw error');
        });

        it('should route dotted keys to the child error of the parent field', () => {
            const form = new FormControl<CreateCompany, unknown>({ current: null } as any);

            form.loadError({
                translate: false,
                errors: { 'address.street': 'Street is required' },
            });

            expect(form.field('address').childError.current()).toEqual({ street: 'Street is required' });
            expect(form.field('address').error.current()).toBeNull();
        });
    });

    describe('setAutoSubmit', () => {
        beforeEach(() => jest.useFakeTimers());
        afterEach(() => jest.useRealTimers());

        it('should submit on a field change when no delay is configured', async () => {
            const onSubmitMock = jest.fn((): PersonCreated => ({ id: 123 }));
            const form = new FormControl(createRef(onSubmitMock));

            form.field('name', '');
            form.setAutoSubmit({});

            await flushMicrotasks();

            // regression: registering the auto submit must not replay the current lastChange
            expect(onSubmitMock).not.toHaveBeenCalled();

            form.field('name').next('Jane');
            await flushMicrotasks();

            expect(onSubmitMock).toHaveBeenCalledTimes(1);
            expect(onSubmitMock).toHaveBeenCalledWith({ name: 'Jane' });
        });

        it('should not submit when a field is created after the auto submit is registered', async () => {
            const onSubmitMock = jest.fn((): PersonCreated => ({ id: 123 }));
            const form = new FormControl(createRef(onSubmitMock));

            form.setAutoSubmit({});

            // regression: creating a field used to emit a lastChange and auto submit
            form.field('name', '');
            form.field('lastName', '');

            await flushMicrotasks();

            expect(onSubmitMock).not.toHaveBeenCalled();

            form.field('name').next('Jane');
            await flushMicrotasks();

            expect(onSubmitMock).toHaveBeenCalledTimes(1);
        });

        it('should not arm the debounce when a field is created after the auto submit is registered', async () => {
            const onSubmitMock = jest.fn((): PersonCreated => ({ id: 123 }));
            const form = new FormControl(createRef(onSubmitMock));

            form.setAutoSubmit({ delay: 100 });

            form.field('name', '');

            jest.advanceTimersByTime(500);
            await flushMicrotasks();

            expect(onSubmitMock).not.toHaveBeenCalled();
        });

        it('should debounce rapid changes into a single submit when a delay is configured', async () => {
            const onSubmitMock = jest.fn((): PersonCreated => ({ id: 123 }));
            const form = new FormControl(createRef(onSubmitMock));

            form.field('name', '');
            form.setAutoSubmit({ delay: 100 });

            form.field('name').next('J');
            form.field('name').next('Ja');
            form.field('name').next('Jane');

            await flushMicrotasks();
            expect(onSubmitMock).not.toHaveBeenCalled();

            jest.advanceTimersByTime(100);
            await flushMicrotasks();

            expect(onSubmitMock).toHaveBeenCalledTimes(1);
            expect(onSubmitMock).toHaveBeenCalledWith({ name: 'Jane' });
        });

        it('should call the check predicate with (nameof, name, value, oldValue) and honour a veto', async () => {
            const onSubmitMock = jest.fn((): PersonCreated => ({ id: 123 }));
            const check = jest.fn(() => false);

            const form = new FormControl(createRef(onSubmitMock));

            form.field('name', '');
            form.setAutoSubmit({ check });

            await flushMicrotasks();
            // registering the auto submit does not replay the current lastChange
            expect(check).not.toHaveBeenCalled();

            form.field('name').next('Jane');
            await flushMicrotasks();

            expect(check).toHaveBeenCalledWith(enhacedNameof, 'name', 'Jane', '');
            expect(onSubmitMock).not.toHaveBeenCalled();
        });

        it('should disable a previously registered auto submit when called with false', async () => {
            const onSubmitMock = jest.fn((): PersonCreated => ({ id: 123 }));
            const form = new FormControl(createRef(onSubmitMock));

            form.field('name', '');
            form.setAutoSubmit({});

            await flushMicrotasks();
            onSubmitMock.mockClear();

            form.setAutoSubmit(false);

            form.field('name').next('Jane');
            await flushMicrotasks();

            expect(onSubmitMock).not.toHaveBeenCalled();
        });

        it('should replace instead of stacking when called twice', () => {
            const form = new FormControl(createRef(() => ({ id: 123 })));

            form.field('name', '');

            const submitSpy = jest.spyOn(form, 'submit').mockImplementation(async () => {});

            form.setAutoSubmit({});
            form.setAutoSubmit({});

            submitSpy.mockClear();

            form.field('name').next('Jane');

            expect(submitSpy).toHaveBeenCalledTimes(1);
        });

        it('should unsubscribe and clear the pending timeout on cleanup', async () => {
            const onSubmitMock = jest.fn((): PersonCreated => ({ id: 123 }));
            const form = new FormControl(createRef(onSubmitMock));

            form.field('name', '');
            form.setAutoSubmit({ delay: 100 });

            form.field('name').next('Jane');

            form.cleanup();

            jest.advanceTimersByTime(500);
            await flushMicrotasks();

            expect(onSubmitMock).not.toHaveBeenCalled();

            form.field('name').next('John');
            jest.advanceTimersByTime(500);
            await flushMicrotasks();

            expect(onSubmitMock).not.toHaveBeenCalled();
        });
    });

    describe('observable getters', () => {
        it('should increment changes when a field goes dirty and decrement when it returns', () => {
            const form = new FormControl(createRef(() => ({ id: 123 })));

            form.field('name', '');
            form.field('lastName', '');

            expect(form.changes.current()).toBe(0);

            form.field('name').next('Jane');
            expect(form.changes.current()).toBe(1);

            form.field('lastName').next('Roe');
            expect(form.changes.current()).toBe(2);

            form.field('name').next('');
            expect(form.changes.current()).toBe(1);
        });

        it('should use the loaded value as the dirty baseline', async () => {
            const form = new FormControl(createRef(() => ({ id: 123 })));

            form.field('name', '');
            await form.load({ name: 'John' });

            expect(form.changes.current()).toBe(0);

            form.field('name').next('Jane');
            expect(form.changes.current()).toBe(1);

            form.field('name').next('John');
            expect(form.changes.current()).toBe(0);
        });

        it('should emit the name, value and old value on lastChange', () => {
            const form = new FormControl(createRef(() => ({ id: 123 })));

            form.field('name', '');

            const seen: LastChange[] = [];
            form.lastChange.subscribe((value) => seen.push(value), true);

            form.field('name').next('Jane');

            expect(seen).toEqual([{ name: 'name', value: 'Jane', oldValue: '' }]);
        });

        it('should list the fields in creation order', () => {
            const form = new FormControl(createRef(() => ({ id: 123 })));

            form.field('country', 'BR');
            form.field('name', '');

            expect(form.fields).toEqual(['country', 'name']);
        });

        it('should stop reporting a field in fieldsHandlingErrors once its subscription is removed', () => {
            const form = new FormControl(createRef(() => ({ id: 123 })));

            form.field('name', '');

            const cleanup = form.field('name').error.subscribe(() => {});
            expect(form.fieldsHandlingErrors).toEqual(['name']);

            cleanup();
            expect(form.fieldsHandlingErrors).toEqual([]);
        });
    });
});
