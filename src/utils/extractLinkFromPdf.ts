
// Lightweight PDF URL extractor: scans raw bytes for http(s) URLs.
// Works well for MyDesigns PDFs without adding heavy dependencies.
export async function extractLinkFromPdfFile(file: File): Promise<string | null> {
  try {
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    // Convert to a permissive ASCII-ish string so URLs survive intact.
    let text = '';
    for (let i = 0; i < bytes.length; i++) {
      const c = bytes[i];
      // keep visible ASCII, replace others with space
      text += (c >= 9 && c <= 126) ? String.fromCharCode(c) : ' ';
    }
    // Remove common PDF literal noise like parentheses wrappers
    text = text.replace(/\((https?:\\\/\\\/[^)\s<>\"']+)\)/gi, '$1');
    // Find all http/https urls
    const re = /(https?:\/\/[^\s<>()"']+)/ig;
    const matches = text.match(re) || [];
    // Filter out known non-download boilerplate
    const filtered = matches.filter(u => !/w3\.org|adobe\.com\/xmp|pdfaid\.org|pdfa|schema\.org/i.test(u));
    return filtered[0] || matches[0] || null;
  } catch (err) {
    console.error('[extractLinkFromPdfFile] failed', err);
    return null;
  }
}
