/* Data structure for the planned HSK 3.0 track (docs/hsk3-plan.md). Nothing in the app reads these yet. */
interface Hsk3Source { doc: string; page?: number; url?: string }
interface Hsk3Word {
  id: string;            // "h3-4-0123": level 4, row 123 in the syllabus order; never reused
  hanzi: string;
  pinyin: string;        // tone marks, as in the syllabus
  level: 1 | 2 | 3 | 4 | 5 | 6;
  pos?: string;
  vi: string;
  en: string;
  example?: { zh: string; py: string; vi: string; en: string };
  ref?: string;          // id of the same word already in the app (d07-04, k228, h5-0103 …) so progress carries over
  src: Hsk3Source;       // where the row comes from (syllabus page)
  checked: boolean;      // false until a teacher has reviewed it
}
interface Hsk3Char { char: string; pinyin: string; level: 1 | 2 | 3 | 4 | 5 | 6; src: Hsk3Source }
interface Hsk3Grammar {
  id: string;            // "h3g-4-07"
  code: string;          // numbering used in the syllabus grammar outline
  level: 1 | 2 | 3 | 4 | 5 | 6;
  title: { zh: string; vi: string; en: string };
  pattern: string;
  examples: { zh: string; py: string; vi: string; en: string }[];
  src: Hsk3Source;
  checked: boolean;
}
interface Hsk3Part { minutes: number; questions?: number; verified: boolean; src: Hsk3Source }
interface Hsk3Format { level: 1 | 2 | 3 | 4 | 5 | 6; written: Hsk3Part; speaking?: Hsk3Part; cumulativeWords?: { n: number; verified: boolean; src: Hsk3Source } }
