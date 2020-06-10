
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

interface Props {
  sense: Sense;
  lang: string;
}

const hardcoded = {sense: ['sense', 10].join('.'), lang: ['sense', 10, 'gloss', 40, 'lang'].join('.')};

type AllValuesString<T> = Required<{[key in keyof T]: string}>;

export const propsPaths: AllValuesString<Props> = {
  sense: path({} as Props['sense'], 'sense', 10),
  lang: path({} as Props['lang'], 'sense', 10, 'gloss', 40, 'lang'),
};

// 🍌
function path<Target,
              T extends keyof Word,
              U extends keyof Word[T] = never,
              V extends keyof Word[T][U] = never,
              W extends keyof Word[T][U][V] = never,
              X extends keyof Word[T][U][V][W] = never>(
    dummy: Target,
    t: T&(Target extends([X] extends [never]
                         ? [W] extends [never]
                         ? [V] extends [never]
                         ? [U] extends [never]
                         ? Word[T] : Word[T][U]
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


type NeverExtendsNever = never extends never ? 1 : 0;   // 1
type NeverExtendsString = never extends string ? 1 : 0; // 1
type StringExtendsNever = string extends never ? 1 : 0; // 0

type UExtendsNever<T, U = never> = U extends never ? [T] : [T, U];
type UString = UExtendsNever<number, string>; // [number, string] ✅
type UNever = UExtendsNever<number>;          // never??? ❌

// use tuples:
type UExtendsNever2<T, U = never> = [U] extends [never] ? [T] : [T, U];
type UString2 = UExtendsNever2<number, string>; // [number, string] ✅
type UNever2 = UExtendsNever2<number>;          // [number] ✅

// use `Extract`:
type UExtendsNever3<T, U = never> = Extract<U, any> extends never ? [T] : [T, U];
type UString3 = UExtendsNever3<number, string>; // [number, string] ✅
type UNever3 = UExtendsNever3<number>;          // [number] ✅

const path1 = ['sense', 10] as const;
const path2 = ['sense', 40, 'gloss', 10, 'lang'] as const;

export const propsPaths2: AllValuesString<Props> = {
  sense: pathi<Props['sense'], typeof path1>(path1),
  lang: pathi<Props['lang'], typeof path2>(path2),
};

type Writeable<T> = {-readonly[P in keyof T]: T[P]};
type RoRw<T> = Writeable<T>|Readonly<Writeable<T>>;

// 🍓
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
            ? (T extends keyof Model ? U extends keyof Model[T] ? V extends keyof Model[T][U] ? W extends keyof Model[T][U][V] ? X extends keyof Model[T][U][V][W] ? Model[T][U][V][W][X] : never : never : never : never : never)
            : never;

type Len<T> =
    T extends [] 
      ? 0 
      : T extends [infer U]
        ? 1 
        : T extends [infer U, infer U] 
          ? 2 
          : 'lots';
type len1 = Len<['hi']>;                    // 1
type len2 = Len<[number, string, boolean]>; // "lots"

type debug1 = PathToTypeDebug<['sense', 40, 'gloss', 10, 'lang'], Word>;     // string
type debug2 = PathToTypeDebug<['sense', 40, 'gloss', 10, '❌'], Word>;       // 'e1'
type debug3 = PathToTypeDebug<['sense', '❌', 'gloss', 10, 'lang'], Word>;   // 'e4'
type debug4 = PathToTypeDebug<[], Word>;                                     // 'f'

type PathToTypeDebug<Arr, Model> =
    Arr extends [infer T]
    ? (T extends keyof Model ? Model[T] : 'a1')
    : Arr extends [infer T, infer U]
      ? (T extends keyof Model ? U extends keyof Model[T] ? Model[T][U] : 'b1' : 'b2')
      : Arr extends [infer T, infer U, infer V]
        ? (T extends keyof Model ? U extends keyof Model[T] ? V extends keyof Model[T][U] ? Model[T][U][V] : 'c1' : 'c2' : 'c3')
        : Arr extends [infer T, infer U, infer V, infer W]
          ? (T extends keyof Model ? U extends keyof Model[T] ? V extends keyof Model[T][U] ? W extends keyof Model[T][U][V] ? Model[T][U][V][W] : 'd1' : 'd2' : 'd3' : 'd4')
          : Arr extends [infer T, infer U, infer V, infer W, infer X]
            ? (T extends keyof Model ? U extends keyof Model[T] ? V extends keyof Model[T][U] ? W extends keyof Model[T][U][V] ? X extends keyof Model[T][U][V][W] ? Model[T][U][V][W][X] : 'e1' : 'e2' : 'e3' : 'e4' : 'e5')
            : 'f';

