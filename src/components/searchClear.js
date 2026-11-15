/**
 * Wires up every search field's clear button (`.searchField > input +
 * .searchClear`). CSS shows the button only while the input has text; a click
 * empties the input, tells its listeners with an `input` event, and puts the
 * cursor back so the user can keep typing.
 */
export function initSearchClearButtons() {
    document.querySelectorAll('.searchField .searchClear').forEach(button => {
        /** @type {HTMLInputElement} */
        const input = button.parentElement.querySelector('input');
        // Keep focus (and the phone's keyboard) on the input while pressing.
        button.addEventListener('mousedown', e => e.preventDefault());
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (input.value !== '') {
                input.value = '';
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
            input.focus();
        });
    });
}
