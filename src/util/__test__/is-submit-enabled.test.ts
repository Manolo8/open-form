import { isSubmitEnabled } from '../is-submit-enabled';

const mount = (html: string): HTMLElement => {
    const container = document.createElement('div');
    container.setAttribute('data-form', '');
    container.innerHTML = html;

    document.body.appendChild(container);

    return container;
};

const find = (root: HTMLElement, selector: string): HTMLElement => {
    return root.querySelector(selector) as HTMLElement;
};

describe('isSubmitEnabled', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('should return false when the element is null', () => {
        const container = mount('<button type="submit">ok</button><input id="field" />');

        expect(isSubmitEnabled(null, find(container, '#field'))).toBe(false);
    });

    it('should return false when the event target is null', () => {
        const container = mount('<button type="submit">ok</button>');

        expect(isSubmitEnabled(container, null)).toBe(false);
    });

    it('should return false when the closest [data-form] is a different (nested) form container', () => {
        const outer = mount('<div data-form><button type="submit">ok</button><input id="field" /></div>');
        const inner = find(outer, '[data-form]');
        const field = find(outer, '#field');

        expect(field.closest('[data-form]')).toBe(inner);
        expect(isSubmitEnabled(outer, field)).toBe(false);
        // The inner container is the matching one, so it does resolve.
        expect(isSubmitEnabled(inner, field)).toBe(true);
    });

    it('should return false when the container has no submit buttons', () => {
        const container = mount('<button type="button">nope</button><input type="text" id="field" />');

        expect(isSubmitEnabled(container, find(container, '#field'))).toBe(false);
    });

    it('should return true when the container has an enabled button[type=submit]', () => {
        const container = mount('<button type="submit">ok</button><input type="text" id="field" />');

        expect(isSubmitEnabled(container, find(container, '#field'))).toBe(true);
    });

    it('should return true when the container has an enabled input[type=submit]', () => {
        const container = mount('<input type="submit" value="ok" /><input type="text" id="field" />');

        expect(isSubmitEnabled(container, find(container, '#field'))).toBe(true);
    });

    it('should return false when every submit button is disabled', () => {
        const container = mount(
            '<button type="submit" disabled>a</button><input type="submit" disabled /><input type="text" id="field" />'
        );

        expect(isSubmitEnabled(container, find(container, '#field'))).toBe(false);
    });

    it('should return true when at least one submit button is enabled', () => {
        const container = mount(
            '<button type="submit" disabled>a</button><button type="submit">b</button><input type="text" id="field" />'
        );

        expect(isSubmitEnabled(container, find(container, '#field'))).toBe(true);
    });

    it('should return true when the event target is the container itself', () => {
        const container = mount('<button type="submit">ok</button>');

        expect(isSubmitEnabled(container, container)).toBe(true);
    });
});
