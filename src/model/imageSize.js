/**
 * A sharper copy of a cover for the full-screen view, from the sources the
 * app uses. Pure; tested in test/imageSize.test.js.
 *
 * @param {string | undefined} url the cover the page shows
 * @return {string | undefined} a larger copy (or the same URL when there is no
 *         known larger one), undefined when there is no real cover
 */
export function largeImage(url) {
    if (!url || /NoPoster/.test(url)) return undefined;
    // TMDB: /t/p/w500/... has sizes up to w780 for posters (original can be several MB)
    if (/image\.tmdb\.org\/t\/p\/w\d+\//.test(url)) return url.replace(/\/t\/p\/w\d+\//, '/t/p/w780/');
    // Apple: artwork comes in any square size
    if (/mzstatic\.com\/.*\/\d+x\d+(bb)?\.(jpg|png)$/.test(url)) return url.replace(/\/\d+x\d+(bb)?\.(jpg|png)$/, '/1200x1200bb.$2');
    // Open Library: -S / -M / -L
    if (/covers\.openlibrary\.org\/.*-[SM]\.jpg$/.test(url)) return url.replace(/-[SM]\.jpg$/, '-L.jpg');
    return url;
}
