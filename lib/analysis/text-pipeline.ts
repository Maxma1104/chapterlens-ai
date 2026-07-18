export type ManuscriptChunk = {
  id: string;
  index: number;
  text: string;
  start: number;
  end: number;
};

type SegmentOptions = {
  maxCharacters?: number;
  overlapCharacters?: number;
};

export function segmentManuscript(
  source: string,
  options: SegmentOptions = {},
): ManuscriptChunk[] {
  const maxCharacters = options.maxCharacters ?? 6_000;
  const overlapCharacters = Math.min(
    options.overlapCharacters ?? 300,
    Math.floor(maxCharacters / 3),
  );
  const chunks: ManuscriptChunk[] = [];
  let start = 0;

  while (start < source.length) {
    const hardEnd = Math.min(source.length, start + maxCharacters);
    let end = hardEnd;

    if (hardEnd < source.length) {
      const minimumBreak = start + Math.floor(maxCharacters * 0.6);
      const paragraphBreak = source.lastIndexOf("\n\n", hardEnd);
      const sentenceBreak = source.lastIndexOf(". ", hardEnd);
      if (paragraphBreak >= minimumBreak) end = paragraphBreak + 2;
      else if (sentenceBreak >= minimumBreak) end = sentenceBreak + 2;
    }

    chunks.push({
      id: `chunk-${chunks.length + 1}`,
      index: chunks.length,
      text: source.slice(start, end),
      start,
      end,
    });
    if (end >= source.length) break;
    start = Math.max(start + 1, end - overlapCharacters);
  }

  return chunks;
}

export function rankEvidenceChunks(
  chunks: ManuscriptChunk[],
  terms: string[],
): ManuscriptChunk[] {
  const normalizedTerms = [...new Set(terms.map((term) => term.trim().toLocaleLowerCase()).filter(Boolean))];
  return [...chunks].sort((left, right) => {
    const score = (chunk: ManuscriptChunk) => {
      const haystack = chunk.text.toLocaleLowerCase();
      return normalizedTerms.reduce(
        (total, term) => total + (haystack.includes(term) ? 1 : 0),
        0,
      );
    };
    return score(right) - score(left) || left.index - right.index;
  });
}

export function formatChunksForModel(chunks: ManuscriptChunk[]): string {
  return chunks
    .map(
      (chunk) =>
        `<source_chunk id="${chunk.id}" start="${chunk.start}" end="${chunk.end}">\n${chunk.text}\n</source_chunk>`,
    )
    .join("\n\n");
}
