const CSP_RE = /(?:^|[;,])\s*(?:script-src(-elem)?|(d)efault-src)(\s+[^;,]+)/g;
const NONCE_RE = /'nonce-([-+/=\w]+)'/;
const UNSAFE_INLINE = "'unsafe-inline'";

/**
 * Extracts MV3-relevant script CSP behavior from a response CSP header value.
 * @param {string} value
 * @returns {{ nonce?: string, forceContent?: boolean } | undefined}
 */
export function analyzeCspForInject(value) {
  let match;
  let scriptSrc;
  let scriptElemSrc;
  let defaultSrc;
  let extracted = '';
  CSP_RE.lastIndex = 0;
  while ((match = CSP_RE.exec(value))) {
    extracted += match[0];
    if (match[2]) defaultSrc = match[3];
    else if (match[1]) scriptElemSrc = match[3];
    else scriptSrc = match[3];
  }
  if (!extracted) return;
  const nonceMatch = extracted.match(NONCE_RE);
  if (nonceMatch) {
    return { nonce: nonceMatch[1] };
  }
  const forceContent =
    !!(scriptSrc && !scriptSrc.includes(UNSAFE_INLINE)
    || scriptElemSrc && !scriptElemSrc.includes(UNSAFE_INLINE)
    || !scriptSrc && !scriptElemSrc && defaultSrc && !defaultSrc.includes(UNSAFE_INLINE));
  if (forceContent) {
    return { forceContent: true };
  }
}
