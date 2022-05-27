const isDisabled = (element: Element): boolean => {
    return element.getAttribute('disabled') !== null;
};

export const isSubmitEnabled = (element: HTMLElement | null, eventTarget: EventTarget | null): boolean => {
    if (!element) return false;

    const target = eventTarget as HTMLElement;

    if (!target) return false;

    const closest = target.closest('[data-form]');

    if (closest !== element) return false;

    const submitButtons = element.querySelectorAll('button[type=submit], input[type=submit]');

    for (let i = 0; i < submitButtons.length; i++) {
        if (!isDisabled(submitButtons[i])) return true;
    }

    return false;
};
