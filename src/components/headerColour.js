import { headerTone } from '../model/contrast';

/**
 * Colours the phone header bar and makes its title and icons readable on it
 * (dark on the light category colours). Desktop shows its own white top bar.
 *
 * @param {string} colour hex
 */
export function setHeaderColour(colour) {
    const header = document.getElementById('header');
    header.style.backgroundColor = colour;
    document.body.dataset.headerTone = headerTone(colour);
}
