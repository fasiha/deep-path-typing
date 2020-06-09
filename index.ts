// Hand-written interfaces for
// https://github.com/scriptin/jmdict-simplified 3.0.1
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

interface Props {
  sense: Sense;
  lang: string;
}

type AllValuesString<T> = Required<{[key in keyof T]: string}>;

export const propsPaths: AllValuesString<Props> = {
  sense: path({} as Props['sense'], 'sense', 10),
  lang: path({} as Props['lang'], 'sense', 40, 'gloss', 10, 'lang'),
};

const path1 = ['sense', 10] as const;
const path2 = ['sense', 40, 'gloss', 10, 'lang'] as const;
export const propsPaths2: AllValuesString<Props> = {
  sense: pathi<Props['sense'], typeof path1>(path1),
  lang: pathi<Props['lang'], typeof path2>(path2),
};

type Writeable<T> = {
  -readonly[P in keyof T]: T[P]
};
type RoRw<T> = Writeable<T>|Readonly<Writeable<T>>;

function pathi<Target, Arr>(path: Arr&(
    [Target] extends [PathToType<Writeable<Arr>, Word>] ? RoRw<(string | number)[]>: never)) {
  return path.join('.');
}

type PathToType<Arr, Model> =
    Arr extends [infer T]
    ? (T extends keyof Model ? Model[T] : never)
    : Arr extends [infer T, infer U]
      ? (T extends keyof Model ? U extends keyof Model[T] ? Model[T][U] : never : never)
      : Arr extends [infer T, infer U, infer V]
        ? (T extends keyof Model ? U extends keyof Model[T] ? V extends keyof Model[T][U] ? Model[T][U][V] : never : never : never)
        : Arr extends [infer T, infer U, infer V, infer W]
          ? (T extends keyof Model ? U extends keyof Model[T] ? V extends keyof Model[T][U] ? W extends keyof Model[T][U][V] ? Model[T][U][V][W] : never : never : never : never)
          : Arr extends [infer T, infer U, infer V, infer W, infer X]
            ? (T extends keyof Model ? U extends keyof Model[T] ? V extends keyof Model[T][U] ? W extends keyof Model[T][U][V] ? X extends keyof Model[T][U][V][W] ? Model[T][U][V][W][X]:never : never : never : never : never)
            : never;

// Helper type to debug
type par = PathToType2<Writeable<typeof path2>, Word>;
type PathToType2<Arr, Model> =
    Arr extends [infer T]
    ? (T extends keyof Model ? Model[T] : 'a1')
    : Arr extends [infer T, infer U]
      ? (T extends keyof Model ? U extends keyof Model[T] ? Model[T][U] : 'b1' : 'b2')
      : Arr extends [infer T, infer U, infer V]
        ? (T extends keyof Model ? U extends keyof Model[T] ? V extends keyof Model[T][U] ? Model[T][U][V] : 'c1' : 'c2' : 'c3')
        : Arr extends [infer T, infer U, infer V, infer W]
          ? (T extends keyof Model ? U extends keyof Model[T] ? V extends keyof Model[T][U] ? W extends keyof Model[T][U][V] ? Model[T][U][V][W] : 'd1' : 'd2' : 'd3' : 'd4')
          : Arr extends [infer T, infer U, infer V, infer W, infer X]
            ? (T extends keyof Model ? U extends keyof Model[T] ? V extends keyof Model[T][U] ? W extends keyof Model[T][U][V] ? X extends keyof Model[T][U][V][W] ? Model[T][U][V][W][X]:'e1' : 'e2' : 'e3' : 'e4' : 'e5')
            : 'f';

type par = PathToType2<Writeable<typeof path2>, Word>;

function path<Target, T extends keyof Word, U extends keyof Word[T] = never, V extends
                  keyof Word[T][U] = never, W extends keyof Word[T][U][V] = never,
                                                      X extends keyof Word[T][U][V][W] = never>(
    dummy: Target,
    t: T&(Target extends(Extract<X, string|number> extends never
                         ? Extract<W, string|number> extends never
                         ? Extract<V, string|number> extends never
                         ? Extract<U, string|number> extends never ? Word[T] : Word[T][U]
                         : Word[T][U][V]
                         : Word[T][U][V][W]
                         : Word[T][U][V][W][X])
                            ? string
                            : never),
    u?: U,
    v?: V,
    w?: W,
    x?: X,
) {
  return [t, u, v, w, x].filter(x => typeof x !== 'undefined').join('.');
}
