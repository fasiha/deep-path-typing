# Ensuring that reaching into a deeply-nested interface yields the right type—a TypeScript generics miniboss

## Goal

To start out, consider a deeply-nested data modeling interface that many projects have. This is is [my](https://github.com/fasiha/jmdict-simplified-node) TypeScript model of the [JMDict-simplified](https://github.com/scriptin/jmdict-simplified) data representing a Japanese-to-English dictionary.

You don't need to understand anything about this particular example, just that it's hierarchical and deep. I picked this because I was familiar with it, and because it was more nested than Pokedex.
```ts
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
```

Next, as frequently happens, I have a small interface that might refer to some interfaces defined above. This often pops up in UI (React calls these "props", i.e., "properties"), where a big Thing that knows about the entire dictionary's data wants to give a tiny slice of that data to a smaller Thing. Here's that props interface:
```ts
interface Props {
  sense: Sense;
  lang: string;
}
```

Now. The final piece is a mapping, **from** the same keys as my props interface above **to** a string that I might need to send to a database to fetch the actual data that matches the props interface above. A hardcoded paths map might be:
```ts
const hardcoded = {sense: ['sense', 10].join('.'), lang: ['sense', 10, 'gloss', 40, 'lang'].join('.')};
```

So the question is, how much can TypeScript protect me?

Can TypeScript prevent me from accidentally mapping the `sense` prop, which should give me a `Sense`, to `id`, which would give me a string?

Can it make sure I don't map the `sense` prop to just `sense`, which would give me an *array* of senses?

How about giving me nice code-completion in my editor (IntelliSense)?

Can I finally learn what `infer`, introduced in TypeScript [2.8](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-8.html#type-inference-in-conditional-types), does?

## Result
Here's what I came up with: a `path` function that lets me do the following:
```ts
type AllValuesString<T> = Required<{[key in keyof T]: string}>;

export const propsPaths: AllValuesString<Props> = {
  sense: path({} as Props['sense'], 'sense', 10),
  lang: path({} as Props['lang'], 'sense', 10, 'gloss', 40, 'lang'),
};
```
The `path` function appears to take a dummy object that we pretend is something else—recall that `Props['sense']` has type `Sense` while `Props['lang']` has type `string`. This part is kind of icky 😥. But then we give `path` a list of strings and numbers needed to construct, e.g., `sense.10` or `sense.10.gloss.40.lang`.

> `AllValuesString` is just a helper type that ensures that my `sensePropsPaths` object has all the keys that the `Props` interface defines, with string values. That part's not important.

Here's what `path` looks like—
```ts
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
```

## Discussion

```ts

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
```