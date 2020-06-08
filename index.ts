// Hand-written interfaces for https://github.com/scriptin/jmdict-simplified 3.0.1
export type Tag = string;
export interface Kanji {
  common: boolean;
  text: string;
  tags: Tag[];
}
export interface Kana {
  common: boolean;
  text: string;
  tags: Tag[];
  appliesToKanji: string[];
}
export type Xref = [string, string, number]|[string, number]|[string];
export interface Source {
  lang: string;
  full: boolean;
  wasei: boolean;
  text?: string;
}
export interface Gloss {
  lang: string;
  text: string;
}
export interface Sense {
  partOfSpeech: Tag[];
  appliesToKanji: string[];
  appliesToKana: string[];
  related: Xref[];
  antonym: Xref[];
  field: Tag[];
  dialect: Tag[];
  misc: Tag[];
  info: string[];
  languageSource: Source[];
  gloss: Gloss[];
}
export interface Word {
  id: string;
  kanji: Kanji[];
  kana: Kana[];
  sense: Sense[];
}
export interface Simplified {
  version: string;
  dictDate: string;
  dictRevisions: string[];
  tags: {[k: string]: string};
  words: Word[];
}

interface SenseProps {
  sense: Sense;
  lang: string;
}
function path<Target, T extends keyof Word, U extends keyof Word[T] = null, V extends keyof Word[T][U] = null, W extends
                  keyof Word[T][U][V] = null, X extends keyof Word[T][U][V][W] = null>(
    dummy: Target,
    t: T&((X extends null ? W extends null ? V extends null ? U extends null ? Word[T] : Word[T][U]
                                                            : Word[T][U][V]
                                                            : Word[T][U][V][W]
                                                            : Word[T][U][V][W][X]) extends Target ? string : never),
    u: U = undefined,
    v: V = undefined,
    w: W = undefined,
    x: X = undefined,
) {
  return [t, 'model', u, v, w, x].filter(x => !!x).join('/');
}
type AllValuesString<T> = Required<{[key in keyof T]: string}>;

const sensePropsPaths: AllValuesString<SenseProps> = {
  sense: path({} as SenseProps['sense'], 'id'),
  lang: path({} as SenseProps['lang'], 'sense', 0, 'gloss', 0, 'lang')
};

type PathDebug<Target, T extends keyof Word, U extends keyof Word[T] = null, V extends
                   keyof Word[T][U] = null, W extends keyof Word[T][U][V] = null,
                                                      X extends keyof Word[T][U][V][W] = null> =
    [(X extends null ? W extends null ? V extends null ? U extends null ? Word[T] : Word[T][U]
                                                       : Word[T][U][V]
                                                       : Word[T][U][V][W]
                                                       : Word[T][U][V][W][X]) extends Target ? string : never];
type foo = PathDebug<SenseProps['sense'], 'id'>;
