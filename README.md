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
// 🍌
function path<Target,
              T extends keyof Word,
              U extends keyof Word[T] = never,
              V extends keyof Word[T][U] = never,
              W extends keyof Word[T][U][V] = never,
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

Examples:
- `path({} as Sense, 'sense', 0)` compiles fine, as it should.
- `path({} as Sense, 'sense')` errors because indexing `Word['sense]` leads to type `Sense[]`, *not* `Sense` as pormised. TypeScript says, "Argument of type '"sense"' is not assignable to parameter of type 'never'".
- `path('', 'id')` is also ok.
- As is `path('', 'kana', 0, 'text')`.
- Unfortunately, nothing stops you from accidentally assigning the *wrong* string to a key in your props. I.e., both `path({} as Props['lang'], 'sense', 10, 'gloss', 40, 'lang')` and `path({} as Props['lang'], 'id')` compile because both paths lead to `string`, so both can be set to `propsPaths.lang`.

## Discussion
In studying real and functional analysis, I was frequently disappointed and alarmed at the frequency with which elegant theorems were accompanied by compact proofs. Clearly, the result didn't start out as a cut jewel, and it always felt a bit dishonest that texts didn't acknowledge the failed attempts and blind alleys and surprisingly-insurmountable constraints that no doubt preceded the version they present.

> I often remind myself that Maxwell's equations, which we may have learned as four short vector differential equations that form the bedrock of all of electromagnetics—certainly one of humankind's greatest intellectual achievements—were actually established in that form by Heaviside. Maxwell published *twenty* equations in 3D coordinates. Grotesque!

The `path` function above is no jewel, but I'll try here to summarize the lessons learned coming up with it. Each heading in this section corresponds to a TypeScript feature or rule that I feel is worth remembering.

The `path` function above started with [HerringtonDarkholme](https://github.com/Microsoft/TypeScript/issues/12290#issuecomment-260909643)'s 2016 example to staticly-type deep object path getters:
```ts
function path2<A extends string, B extends string, C extends string, D>(path: [A, B, C], 
  d: {[K1 in A]: {[K2 in B]: {[K3 in C]: D}}}) {
  // ...
}
path2(['a', 'b', 'c'], {a: {b: 2}})      // error
path2(['a', 'b', 'c'], {a: {b: {c: 2}}}) // works
```
to which I
- added a constraint that the type you got when you followed the path was the type you expected, and
- moved the constraints on the path's generic parameters from outside the generics definition to inside, i.e., inside the `<`brackets`>`.

### TypeScript self-erasure
In languages like C, types actually cause different code to be generated. For example, the cast in `(char)9000` results in assembly that will actually convert `9000` to an 8-bit integer.

In contrast, when the TypeScript compiler encounters type annotations in `9000 as unknown as string` or `9000 as any`, it melts them away when emitting JavaScript—it's as if TypeScript was never there. The only time TypeScript can make itself felt is during compile-time, when it nags you that `9000 as string` doesn't make sense.

This fundamental point threads its way through much of the subsequent discussion so I mention it here.

### All-or-nothing generics parameter inference
My only complaint about my `path` above (🍌) is that I have to give it a dummy unused variable to indicate the type I wanted at the end of the path, i.e., the `{} as Props['sense']` first argument in
```ts
path({} as Props['sense'], 'sense', 10)
```
It would be so much more ergonomic if I could instead do
```ts
path<Props['sense']>('sense', 10)
```
but that won't work because of a surprising constraint in TypeScript: that ***automatic inference of generics parameters is all-or-nothing***, per [niieani](https://stackoverflow.com/a/38688143/500207). I can't provide the first generic type without providing the rest (`T`, `U`, et al.). Subscribe to notifications for this ["Proposal: Partial Type Argument Inference"](https://github.com/Microsoft/TypeScript/issues/26242) issue to know when this constraint is relaxed.

> Generics in Java and C++ allow one to partially define generics/template parameters and infer the rest, but in those languages, generics are a mechanism for *code generation*: these compilers degenericize code by creating one function for each combination of generic types invoked. TypeScript's generics, like all other TypeScript functionality, are solely compile-time constraints. No extra JavaScript gets generated because `path` above is called with many different types.

### `never` extends everything
Recall the generic types that `path` uses:
```ts
function path<Target,
              T extends keyof Word,
              U extends keyof Word[T] = never,
              V extends keyof Word[T][U] = never,
              W extends keyof Word[T][U][V] = never,
              X extends keyof Word[T][U][V][W] = never>(/* elided */) {/* elided */}
```
It turns out to be crucial to specify all optional elements of the path (generic types `U` and higher) to default to `never`.

(to be continued)

## Appendix
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