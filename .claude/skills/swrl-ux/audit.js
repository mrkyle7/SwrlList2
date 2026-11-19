// Swrl List UX audit: paste into Playwright as `await page.evaluate(AUDIT)` on
// any screen (scroll and call again to cover a long page). Returns what breaks
// the rules in SKILL.md: text under 13px, contrast under 4.5:1 (3:1 for large
// text), tap targets under 44px, and how many button styles are on screen.
// Known false positive: text over the swrl page's image header (the image is a
// background, so the colour behind the text is guessed from an ancestor).
// eslint-disable-next-line no-unused-vars
const AUDIT = () => {
  const parse = c => { const m = c.match(/[\d.]+/g); return m ? m.map(Number) : [0, 0, 0, 0]; };
  const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const bgOf = el => {
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.backgroundImage !== 'none' && !cs.backgroundImage.startsWith('linear')) return null;
      const c = parse(cs.backgroundColor);
      if (c.length < 4 || c[3] > 0.5) return c.slice(0, 3);
    }
    return [255, 255, 255];
  };
  const visible = e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.opacity !== '0' && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; };
  const name = e => (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/).filter(c => c !== 'hidden').slice(0, 2).join('.') : '') || e.tagName.toLowerCase();
  const text = e => (e.innerText || e.value || e.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 28);
  const out = { small: [], tap: [], contrast: [], buttonStyles: new Set() };
  document.querySelectorAll('body *').forEach(e => {
    if (!visible(e)) return;
    if (![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return;
    const cs = getComputedStyle(e); const size = parseFloat(cs.fontSize); const weight = Number(cs.fontWeight);
    if (size < 13) out.small.push(`${name(e)} "${text(e)}" ${size}px`);
    const bg = bgOf(e); if (!bg) return;
    const r = ratio(parse(cs.color).slice(0, 3), bg);
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    if (r < (large ? 3 : 4.5)) out.contrast.push(`${name(e)} "${text(e)}" ${r.toFixed(2)}:1 (${cs.color} on rgb(${bg.join(',')}), ${size}px/${weight})`);
  });
  document.querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea, [role=button], label[for], .swrlerChip, img.swrlButton').forEach(e => {
    if (!visible(e)) return;
    if (e.tagName === 'INPUT' && ['radio', 'checkbox'].includes(e.type)) return; // their labels are the target
    if (e.tagName === 'A' && e.closest('p') && e.closest('p').innerText.length > e.innerText.length + 10) return; // a link inside a sentence
    const r = e.getBoundingClientRect();
    if (r.height < 43.5 || r.width < 43.5) out.tap.push(`${name(e)} "${text(e)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
    if (e.tagName === 'BUTTON' || e.getAttribute('role') === 'button') {
      const cs = getComputedStyle(e);
      out.buttonStyles.add(`${cs.backgroundColor}|${cs.borderTopWidth} ${cs.borderTopColor}|r${cs.borderTopLeftRadius}`);
    }
  });
  return { ...out, buttonStyles: out.buttonStyles.size };
};

// Rows that must line up (card buttons, page toggles, tabs): every visible
// child the same top and height, icons on one line.
// eslint-disable-next-line no-unused-vars
const ROWS = (selector) => [...document.querySelectorAll(selector)].map(row => {
  const items = [...row.children].filter(e => !e.classList.contains('hidden') && getComputedStyle(e).display !== 'none');
  const r = items.map(e => e.getBoundingClientRect());
  const icons = items.map(e => { const i = e.tagName === 'IMG' ? e : e.querySelector('img, svg'); return i ? Math.round(i.getBoundingClientRect().top) : null; });
  return {
    aligned: new Set(r.map(x => Math.round(x.top))).size === 1 && new Set(r.map(x => Math.round(x.height))).size === 1 && new Set(icons).size === 1,
    labels: items.map(e => e.innerText.replace(/\n/g, ' ').trim())
  };
});
