const nonSubmitTags = new Set(['TEXTAREA', 'BUTTON']);
const inputSubmitTypes = new Set(['text', 'password', 'email', 'number', 'search', 'tel', 'url', 'week']);

export const isEnterSubmit = (event: KeyboardEvent): boolean => {
    const target = event.target as HTMLElement | null;

    if (!target) return true;

    if (target.tagName === 'INPUT') {
        const type = (target as HTMLInputElement).type;

        if (inputSubmitTypes.has(type)) return true;
    }

    return !nonSubmitTags.has(target.tagName);
};
