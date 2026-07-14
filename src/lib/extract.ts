const HASHTAG_RE = /#[\p{L}\p{N}_]+/gu;
const WORD_RE = /[\p{L}\p{N}]{3,}/gu;
const MIN_TAG_LEN = 3;

// Comprehensive Stop Words & Instagram filler words list to filter out grammar words
const STOP_WORDS = new Set([
  'about', 'above', 'after', 'again', 'against', 'all', 'also', 'and', 'any', 'are', 'aren',
  'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'can', 'cannot',
  'could', 'did', 'does', 'doing', 'down', 'during', 'each', 'few', 'follow', 'for', 'from',
  'further', 'had', 'has', 'have', 'having', 'her', 'here', 'hers', 'herself', 'him', 'himself',
  'his', 'how', 'into', 'its', 'itself', 'just', 'like', 'likes', 'comment', 'comments', 'link',
  'more', 'most', 'my', 'myself', 'nor', 'not', 'off', 'once', 'only', 'other', 'ought',
  'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'should', 'some', 'such',
  'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they',
  'this', 'those', 'through', 'too', 'under', 'until', 'very', 'was', 'were', 'what', 'when',
  'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'would', 'you', 'your', 'yours',
  'yourself', 'yourselves', 'photo', 'video', 'reels', 'instagram', 'june', 'july', 'august',
  'september', 'october', 'november', 'december', 'january', 'february', 'march', 'april',
  'may', 'quot', 'amp', 'http', 'https', 'com', 'www', 'net', 'org', 'make', 'want', 'know',
  'need', 'take', 'come', 'think', 'look', 'people', 'time', 'first', 'way', 'new', 'day',
  'man', 'thing', 'give', 'well', 'good', 'even', 'back', 'there', 'use', 'find', 'here', 'many'
]);

/**
 * Decodes HTML entities and strips Instagram alt text boilerplate ("25K likes, 897 comments - user on Date: ")
 */
export function unescapeHtml(str: string): string {
  if (!str) return '';

  // Decode standard HTML entities
  let decoded = str
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x2019;/g, "'")
    .replace(/&#x201c;/g, '"')
    .replace(/&#x201d;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x[0-9a-fA-F]+;/g, (m) => {
      try {
        const code = parseInt(m.slice(3, -1), 16);
        return String.fromCodePoint(code);
      } catch {
        return '';
      }
    })
    .replace(/&#[0-9]+;/g, (m) => {
      try {
        const code = parseInt(m.slice(2, -1), 10);
        return String.fromCodePoint(code);
      } catch {
        return '';
      }
    });

  // Strip Instagram alt text header prefix e.g., "25K likes, 897 comments - username on June 24, 2026: &quot;..."
  decoded = decoded.replace(/^[\d,KkM.\s]+likes,?\s+[\d,KkM.\s]+comments\s+-\s+[^:]+:\s*"?/, '');
  decoded = decoded.replace(/^"?|"?$/g, '').trim();

  return decoded;
}

/**
 * Parses creator handle from Instagram alt text.
 * e.g. "25K likes, 897 comments - _ashishnnandal on June 24, 2026: ..." -> "_ashishnnandal"
 */
export function extractCreatorFromAlt(altText: string): string {
  if (!altText) return '';
  const m = altText.match(/[\d,KkM.\s]+comments\s+-\s+([A-Za-z0-9_.]+)\s+on\s+/i);
  return m ? m[1] : '';
}

export function extractHashtags(caption: string): string[] {
  const clean = unescapeHtml(caption);
  const out = new Set<string>();
  for (const m of clean.matchAll(HASHTAG_RE)) {
    const tag = m[0].slice(1).toLowerCase();
    if (tag.length >= 2 && !STOP_WORDS.has(tag)) {
      out.add(tag);
    }
  }
  return [...out];
}

/**
 * Extracts meaningful topic nouns and hashtags from captions, excluding grammar/stop words.
 */
export function extractTags(caption: string): string[] {
  const clean = unescapeHtml(caption);
  const out = new Set<string>();

  // 1. Always prioritize hashtags
  for (const m of clean.matchAll(HASHTAG_RE)) {
    const tag = m[0].slice(1).toLowerCase();
    if (tag.length >= 2 && !STOP_WORDS.has(tag)) {
      out.add(tag);
    }
  }

  // 2. Extract words, filtering out numbers, stop words, and short filler words
  for (const m of clean.matchAll(WORD_RE)) {
    const w = m[0].toLowerCase();
    if (w.length >= MIN_TAG_LEN && !STOP_WORDS.has(w) && !/^\d+$/.test(w)) {
      out.add(w);
    }
  }

  return [...out];
}
