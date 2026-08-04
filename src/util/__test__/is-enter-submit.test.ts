import { isEnterSubmit } from '../is-enter-submit';

/**
 * Creates a real element in the jsdom document, dispatches a real `keydown`
 * KeyboardEvent on it and returns the event as it was seen by the listener
 * (so `event.target` is properly set by the DOM).
 */
const dispatchKeydownOn = (element: HTMLElement): KeyboardEvent => {
    document.body.appendChild(element);

    let captured: KeyboardEvent | null = null;

    const listener = (event: Event) => {
        captured = event as KeyboardEvent;
    };

    element.addEventListener('keydown', listener);
    element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    element.removeEventListener('keydown', listener);

    return captured as unknown as KeyboardEvent;
};

const inputEvent = (type: string): KeyboardEvent => {
    const input = document.createElement('input');
    input.setAttribute('type', type);

    return dispatchKeydownOn(input);
};

const tagEvent = (tagName: string): KeyboardEvent => {
    return dispatchKeydownOn(document.createElement(tagName) as HTMLElement);
};

describe('isEnterSubmit', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('should return true when the event has no target', () => {
        // An event that was never dispatched has `target === null`.
        const event = new KeyboardEvent('keydown', { key: 'Enter' });

        expect(event.target).toBeNull();
        expect(isEnterSubmit(event)).toBe(true);
    });

    it.each(['text', 'password', 'email', 'number', 'search', 'tel', 'url', 'week', 'checkbox', 'radio'])(
        'should return true for an input of type "%s"',
        (type) => {
            const event = inputEvent(type);

            expect((event.target as HTMLInputElement).type).toBe(type);
            expect(isEnterSubmit(event)).toBe(true);
        }
    );

    it('should return true for an input of a type outside of the submit list (falls through to the tag check)', () => {
        // 'date' is not in inputSubmitTypes, so the function falls through to the
        // tag check. 'INPUT' is not a non-submit tag, so the result is still true.
        const event = inputEvent('date');

        expect((event.target as HTMLInputElement).type).toBe('date');
        expect(isEnterSubmit(event)).toBe(true);
    });

    it('should return false for a textarea', () => {
        expect(isEnterSubmit(tagEvent('textarea'))).toBe(false);
    });

    it('should return false for a button', () => {
        expect(isEnterSubmit(tagEvent('button'))).toBe(false);
    });

    it('should return false for an anchor', () => {
        expect(isEnterSubmit(tagEvent('a'))).toBe(false);
    });

    it('should return false for a content editable element', () => {
        const div = document.createElement('div');
        div.setAttribute('contenteditable', 'true');

        // jsdom does not implement `HTMLElement.isContentEditable` (it is
        // `undefined` even with the contenteditable attribute set), so the flag is
        // defined explicitly here to exercise the real browser behaviour.
        Object.defineProperty(div, 'isContentEditable', { value: true, configurable: true });

        expect(isEnterSubmit(dispatchKeydownOn(div))).toBe(false);
    });

    it('should return true for a plain div (jsdom leaves isContentEditable undefined)', () => {
        const div = document.createElement('div');

        expect(div.isContentEditable).toBeUndefined();
        expect(isEnterSubmit(dispatchKeydownOn(div))).toBe(true);
    });

    it('should return true for a select', () => {
        expect(isEnterSubmit(tagEvent('select'))).toBe(true);
    });
});
