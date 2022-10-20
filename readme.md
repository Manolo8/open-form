
# open-form

An observable form lib 



This lib depends on open-observable

## Recommendations
We recommend other libs from the 'open' universe.

 - [open-observable](https://github.com/Manolo8/open-observable)
 - [open-http](https://github.com/Manolo8/open-http)
## Installation

with npm

```bash
  npm install open-form
```
Or with yarn
```bash
  yarn add open-form
```

## Setup 

In the index.js file, wrap your components with GlobalObservable to recognize the observables

``` javascript
root.render(
    <React.StrictMode>
        <GlobalObservable>
            <App />
        </GlobalObservable>
    </React.StrictMode>
);
```
## Usage/Examples

### Form

```tsx
import { Form, useForm } from 'm-open-form';
import { TextBlock } from '../components/form/TextBlock';
import { Person } from './types.d';

const Contact = () => {
    const handleSubmit = (person: Person) => {
        console.log('person', person); //{name: 'john', email: 'john@mail.com', __FORM_SUBMIT_CHECK: true}
    };

    const [model, form] = useForm(handleSubmit);

    return (
        <div>
            <h1>Contact</h1>

            <Form control={form}>
                <TextBlock type='text' name={model('name')} label='Name' />
                <TextBlock type='email' name={model('email')} label='E-mail' />

                <button type='submit'>Send</button>
            </Form>
        </div>
    );
};

export default Contact;

```

### Field / TextBlock



```tsx
import { useField } from 'm-open-form';
import { useSubscriber } from 'open-observable';

type Props = {
    label: string;
    name: string;
} & JSX.IntrinsicElements['input'];

export const TextBlock = ({ label, name, ...rest }: Props) => {
    const field$ = useField<string>(name);

    const fieldValue = useSubscriber(field$);

    return (
        <label>
            {label}:
            <input onChange={(x) => field$.next(x.target.value)} value={fieldValue} name={name} {...rest}></input>
        </label>
    );
};

```### Hooks

* useForm
* useField
* useFormControl
* useFormResolver
* useFormSuccessResolver
* useFormLock
* useIsFormLocked
