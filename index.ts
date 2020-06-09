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

interface Props {
  sense: Sense;
  lang: string;
}

type AllValuesString<T> = Required<{[key in keyof T]: string}>;

export const propsPaths: AllValuesString<Props> = {
  sense: path({} as Props['sense'], 'sense', 10),
  lang: path({} as Props['lang'], 'sense', 40, 'gloss', 10, 'lang'),
};

const path1 = ['sense', 10] as ['sense', 10];
const path2 = ['sense', 10] as const;
export const propsPaths2: AllValuesString<Props> = {
  sense: pathi<Props['sense'], typeof path1>(path1),
  lang: path({} as Props['lang'], 'sense', 40, 'gloss', 10, 'lang'),
};

type Writeable<T> = {
  -readonly[P in keyof T]: T[P]
};
type par = PathToType<typeof path1, Word>;
type PathToType<Arr, Model> =
    Arr extends [infer T] ? (T extends keyof Model ? Model[T] : never)
                          : Arr extends [infer T, infer U]
                                            ? (T extends keyof Model
                                               ? U extends keyof Model[T] ? Model[T][U] : never
                                               : never)
                                            : Arr extends [infer T, infer U, infer V]
                                                              ? (T extends keyof Model
                                                                 ? U extends keyof Model[T]
                                                                 ? V extends keyof Model[T][U]
                                                                                 ? Model[T][U][V]
                                                                                 : never
                                                                 : never
                                                                 : never)
                                                              : never;
type PathToType2<Arr, Model> =
    Arr extends [infer T]
                    ? (T extends keyof Model ? Model[T] : ['a', never])
                    : Arr extends [infer T, infer U]
                                      ? (T extends keyof Model
                                         ? U extends keyof Model[T] ? Model[T][U] : ['b1', never]
                                         : ['b2', never])
                                      : Arr extends [infer T, infer U, infer V]
                                                        ? (T extends keyof Model
                                                           ? U extends keyof Model[T]
                                                           ? V extends keyof Model[T][U]
                                                                           ? Model[T][U][V]
                                                                           : ['c1', never]
                                                           : ['c2', never]
                                                           : ['c3', never])
                                                        : ['d', never];

function pathi<Target, Arr>(
    path: Arr&([Target] extends [PathToType<Arr, Word>] ? (string | number)[] : never)) {
  return path.join('.');
}

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

// DEBUG!
type PathDebug<Target, T extends keyof Word, U extends keyof Word[T] = never, V extends
                   keyof Word[T][U] = never, W extends keyof Word[T][U][V] = never,
                                                       X extends keyof Word[T][U][V][W] = never> =
    [
      (Extract<X, string|number> extends never ? Extract<W, string|number> extends never
       ? Extract<V, string|number> extends never
       ? Extract<U, string|number> extends never ? Word[T] : Word[T][U]
       : Word[T][U][V]
       : Word[T][U][V][W]
       : Word[T][U][V][W][X]),
    ];
type foo = PathDebug<Props['sense'], 'sense', never, never, never, never>;
type foo2 = PathDebug<Props['sense'], 'id', never, never, never, never>;
type bar = never extends Props['sense'] ? 1 : 0;
type bar2 = Props['sense'] extends never ? 1 : 0;

type q = 'id' extends string ? 1 : 0;                            // 1
type q2 = string extends 'id' ? 1 : 0;                           // 0
type q3 = never extends(string|number) ? 1 : 0;                  // 1
type q4 = never extends never ? 1 : 0;                           // 1
type q5 = (string|number) extends never ? 1 : 0;                 // 0
type q6 = (string|number) extends 'id' ? 1 : 0;                  // 0 :(
type q7 = Extract<string, 'id'>;                                 // never
type q7b = Extract<'id', string|number>;                         // id!!!!!!!!!!!!!!!!!!!!!!!!!
type q7c = Extract<never, string|number>;                        // never
type q7b2 = Extract<'id', string|number> extends never ? 1 : 0;  // 0
type q7c2 = Extract<never, string|number> extends never ? 1 : 0; // 1

type q8 = Extract<never, string>; // never
type q9 = NonNullable<never>;     // never
type q10 = NonNullable<string>;   // string