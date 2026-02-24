/**
 * ShadowTrace — RFC 8785 Canonical JSON Serializer
 *
 * Produces deterministic, byte-level reproducible output independent of V8
 * key-insertion order. This is the ONLY function used to produce the message
 * bytes fed into HMAC-SHA-256.  The server-side Python implementation MUST
 * produce an identical byte sequence for the same logical object.
 *
 * Rules (subset of RFC 8785 / JCS):
 *   • Object keys are sorted lexicographically by UTF-16 code units (matching
 *     ES2015 string comparison, which is what Array.prototype.sort uses by
 *     default with no comparator).
 *   • Arrays preserve element order.
 *   • All other types (string, number, boolean, null) use JSON.stringify.
 *   • Recursion is applied to nested objects and array elements.
 *   • No whitespace is emitted.
 */

'use strict';

function canonicalize(value) {
    if (value === null || typeof value !== 'object') {
        // Primitive: string, number, boolean, null
        return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
        const items = value.map(v => canonicalize(v));
        return '[' + items.join(',') + ']';
    }

    // Object: sort keys by UTF-16 code-unit order (deterministic across all runtimes)
    const sortedKeys = Object.keys(value).sort();
    const members = sortedKeys.map(k => {
        return JSON.stringify(k) + ':' + canonicalize(value[k]);
    });
    return '{' + members.join(',') + '}';
}

/**
 * Convenience: encode a value to canonical UTF-8 bytes (Uint8Array),
 * ready to be passed directly to crypto.subtle.sign / digest.
 */
function canonicalBytes(value) {
    return new TextEncoder().encode(canonicalize(value));
}

// ── Export ──────────────────────────────────────────────────────────
// Works as an ES module import AND as a plain <script> include.
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { canonicalize, canonicalBytes };
}
