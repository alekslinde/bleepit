export interface NormalizeOptions {
  /** Map leet-speak (`@`→`a`, `0`→`o`, …). Default `true`. */
  leet?: boolean;
  /** Strip diacritics via NFKD (`é`→`e`, `ü`→`u`). Default `true`. */
  stripDiacritics?: boolean;
}

export interface CheckerOptions extends NormalizeOptions {
  /** ISO language codes to load from built-in lists. Default `['en']`. */
  languages?: string[];
  /** Extra words (any language / script — the engine is unicode-aware). */
  customWords?: string[];
  /** Words that must never be flagged, matched against the enclosing word. */
  whitelist?: string[];
  /** Only match on word boundaries (avoids the Scunthorpe problem). Default `true`. */
  wholeWord?: boolean;
}

export interface Match {
  /** Normalized dictionary word that matched. */
  word: string;
  /** Start offset in the original string (UTF-16 code units). */
  start: number;
  /** End offset in the original string, inclusive (UTF-16 code units). */
  end: number;
}
