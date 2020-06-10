# Ensuring that reaching into a deeply-nested interface yields the right type—a TypeScript generics miniboss

- [Ensuring that reaching into a deeply-nested interface yields the right type—a TypeScript generics miniboss](#ensuring-that-reaching-into-a-deeply-nested-interface-yields-the-right-typea-typescript-generics-miniboss)
  - [Goal](#goal)
  - [Result](#result)
  - [Discussion](#discussion)
    - [TypeScript self-erasure](#typescript-self-erasure)
    - [All-or-nothing generics parameter inference](#all-or-nothing-generics-parameter-inference)
    - [Default generic parameters needed](#default-generic-parameters-needed)
    - [`never` extends everything](#never-extends-everything)
    - [Triggering a compiler error](#triggering-a-compiler-error)
    - [Summary of drawbacks](#summary-of-drawbacks)
  - [Alternatives](#alternatives)

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
My first complaint about my `path` above (🍌) is that I have to give it a dummy unused variable to indicate the type I wanted at the end of the path, i.e., the `{} as Props['sense']` first argument in
```ts
path({} as Props['sense'], 'sense', 10)
```
It would be so much more ergonomic if I could instead do
```ts
path<Props['sense']>('sense', 10)
```
but that won't work because of a surprising constraint in TypeScript: that *automatic inference of non-default generics parameters is all-or-nothing*, per [niieani](https://stackoverflow.com/a/38688143/500207). I can't provide the first generic type without providing the rest (`T`, `U`, et al.). Subscribe to notifications for this ["Proposal: Partial Type Argument Inference"](https://github.com/Microsoft/TypeScript/issues/26242) issue to know when this constraint is relaxed.

> Generics in Java and C++ allow one to partially define generics/template parameters and infer the rest, but in those languages, generics are a mechanism for *code generation*: these compilers degenericize code by creating one function for each combination of generic types invoked. TypeScript's generics, like all other TypeScript functionality, are solely compile-time constraints. No extra JavaScript gets generated because `path` above is called with many different types.

### Default generic parameters needed
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

**If we omit defaults,** TypeScript will infer some types, but they were crazy—for `path({} as Sense, 'sense')`, it infers the following for `U` and higher:
- `U = 0`
- `V = "partOfSpeech" | "appliesToKanji" | "appliesToKana" | "related" | "antonym" | "field" | "dialect" | "misc" | "info" | "languageSource" | "gloss"`
- `U = number | ... 28 more ... | "values"`
- `X = never`

and naturally with these types inferred, the function doesn't typecheck, despite being valid.

> Aside. I see the above list of inferred types when I hover over `path` in VS Code after removing default types.
>
> Aside the second. Generic parameter defaults were introduced in [2.3](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-3.html#generic-parameter-defaults) and its release notes describes them formally.

**If we have TypeScript in `strict` mode,** it appears we can't really pick a default other than `never`. You might think `null` or `''` might serve as placeholders for "don't care" types but these aren't keys of the `Word` interface or most types it contains.

So, with defaults for all optional generic parameters, TypeScript's inference will be guided by the arguments to `path`, and resulting generic parameters willform a path into the `Word` interface.

### `never` extends everything
With the elements of our path into the `Word` interface statically-typed, with defaults, and constrained to be descendent keys of `Word`, we're actually pretty close to a working `path`! One crucial obstacle is, how can we get the type at the end of the path? With that, we could require that `Target` extends it.

Recall, here are the constraints we use to link `Target` and the type at the end of the path:
```ts
(Target extends([X] extends [never]
                ? [W] extends [never]
                ? [V] extends [never]
                ? [U] extends [never]
                ? Word[T] : Word[T][U]
                : Word[T][U][V]
                : Word[T][U][V][W]
                : Word[T][U][V][W][X])
                  ? string
                  : never),
```
There's two pieces here: the big but lightweight piece is this ladder of ternaries, but the small but weighty piece is `[X] extends [never]`.

> My second dissatisfaction with the `path` above is how it only works five levels deep. It is readily extended to deeper (or shallower) levels, by manually altering the ternary ladder above, but I wish there was a way to do this automatically.

The ternary ladder lets us find the *last* level of the path the caller gave, i.e., in 
```ts
path({} as Props['sense'], 'sense', 10)
```
the path is `["sense", 10]` where `T="sense"` and `U=10`; `V` and the rest will be `never`. The ladder is asking,
- is `X` `never`?
  - yes
- what about `W`?
  - `never`
- ok how about `V`, is it `never`?
  - still the same
- `U`?
  - aha! Not `never`.

Once it finds the end of the given path, it can get the type at the end of that path: it's `Word[T][U]`, i.e., `Word['sense'][10]`. With that in hand, it's straightforward to constrain `Target` to extend it (or vice versa, since we want the types to be equal).

**However.** Testing for `never` can be tricky, in part because per the [`never` docs](https://www.typescriptlang.org/docs/handbook/basic-types.html#never), `never` extends (is assignable to) everything and is extended by nothing.
```ts
type NeverExtendsNever = never extends never ? 1 : 0;   // 1
type NeverExtendsString = never extends string ? 1 : 0; // 1
type StringExtendsNever = string extends never ? 1 : 0; // 0
```
So we know we can't do `never extends T`. But consider this:
```ts
type UExtendsNever<T, U = never> = U extends never ? [T] : [T, U];
type UString = UExtendsNever<number, string>; // [number, string] ✅
type UNever = UExtendsNever<number>;          // never??? ❌
```
We wanted `UNever` to be `[number]`! Why is it just flat out `never`?? Because, per [Nurbol Alpysbayev](https://stackoverflow.com/a/53984913/500207), `never` is not a naked type but rather an *empty union*. That is, just like
- `type Union2 = number | string | never` turns into `number|string` and
- `type Union1 = number | never` turns into `number`, then inductively,
- `type Union0 = never` represents the empty union, the union over no elements. 

*Therefore*, per distributive conditional types (see [docs](https://www.typescriptlang.org/docs/handbook/advanced-types.html#distributive-conditional-types)), while
- `U extends (number | string) ? Then : Else` expands to `(U extends number ? Then : Else) | (U extends string ? Then : Else)`, in contrast
- `U extends never ? Then : Else` tries to distribute the conditional over the union, but there's nothing in the union, leaving us with `never`. 

> In algebra, the equivalent would be multiplication distributing over addition: `c*(a+b) = c*a + c*b`, but if the sum (our union!) is empty, we get `c*(0) = 0`.
>
> An open question: does `never extends never` short-circuit the distribution?

The following are two ways to properly check if the `never` default parameter was encountered:
```ts
// use tuples:
type UExtendsNever2<T, U = never> = [U] extends [never] ? [T] : [T, U];
type UString2 = UExtendsNever2<number, string>; // [number, string] ✅
type UNever2 = UExtendsNever2<number>;          // [number] ✅

// use `Extract`:
type UExtendsNever3<T, U = never> = Extract<U, any> extends never ? [T] : [T, U];
type UString3 = UExtendsNever3<number, string>; // [number, string] ✅
type UNever3 = UExtendsNever3<number>;          // [number] ✅
```

`Extract` was included in [2.8](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-8.html#predefined-conditional-types) as one of several helper types for conditional types, and it strips types from the left-hand argument that also exist in the right-hand argument—a set difference. It's not *quite* clear to me why this works: `Extract<never, any>` results in `never` while `Extract<number, any>` in `number`, but somehow `Extract`'s presence prevents the unwanted distribution that `U extends never` has.

Meanwhile, [Nurbol Alpysbayev](https://stackoverflow.com/a/53984913/500207), mentioned above, recommended the more compact solution of clothing the types involved into a tuple type, which also appears to prevent an unwanted distribution of the conditional.

### Triggering a compiler error

Finally, we need a way to cause trouble if the desired `Target` type isn't at the end of the path. Recall `path`'s function signature to see how this is done:
```ts
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
) {/* elided */}
```

As detailed above,
```ts
path({} as Props['sense'], 'sense', 10)
```
results in generic parameters
- `Target = Props['sense']`
- `T = 'sense'`
- `U = 10`
- `V` etc. equal to `never`.

The ladder of ternaries gives us the type at the end of the path, specifically, `Word['sense'][10]` and we check if `Target` extends it. 

If it does, all is well: we harmlessly require the `t` argument to be of type `T&string`.

But if if doesn't, we sabotage the entire function call by requiring `t` to have type `T&never`.

This is non-ideal because the type error will point to the `t` argument, instead of the actual argument that's causing a problem. My attempts at making this more ergonomic have thus far been resisted. I first tried introducing a new template parameter, something like `Check` in 
```ts
function path3<Target,
               T extends keyof Word,
               U extends keyof Word[T] = never,
               V extends keyof Word[T][U] = never,
               W extends keyof Word[T][U][V] = never,
               X extends keyof Word[T][U][V][W] = never,
               Check = (Target extends([X] extends [never] ? [W] extends [never] ? [V] extends [never]
                                       ? [U] extends [never] ? Word[T] : Word[T][U]
                                       : Word[T][U][V]
                                       : Word[T][U][V][W]
                                       : Word[T][U][V][W][X])
                                         ? (string|number)
                                         : never)>(    
    dummy: Target,
    t: T&Check,
    u?: U&Check,
    v?: V&Check,
    w?: W&Check,
    x?: X&Check,
) {/* elided */}
```
but this backfired by confusing the generic type inference. With the above, `path({} as Props['sense'], 'sense', 10)` fails to typecheck because TypeScript incorrectly infers `U` to have type `never`, instead of `10` or `number`. I then tried duplicating the ternary ladder and the constraint on `Target` to each of the arguments (not just `T`), which completely destroyed what readability it had, but this doesn't really help because the `t` argument still gets underlined, not necessarily the argument that's actually causing the problem.

### Summary of drawbacks
So this infelicity is the third thing I don't like about `path`. There are the drawbacks so far, along with a couple more:
1. having to pass in a dummy variable as the first argument so the `Target` type can be inferred;
2. having to manually extend it to work past five levels; and
3. the type error isn't localized.
4. Note that `Word` has to be hardcoded into `path`. It's not clear how to genericize that without running into the all-or-nothing requirement for TypeScript generic type inference.
5. A more holistic problem is that when we write the following:
```ts
export const propsPaths: AllValuesString<Props> = {
  sense: path({} as Props['sense'], 'sense', 10),
  lang: path({} as Props['lang'], 'sense', 10, 'gloss', 40, 'lang'),
};
```
we have to repeat the `sense` and `lang` keys of `Props` twice, that is,
- `sense: path({} as Props['sense'] // ...` and
- `lang: path({} as Props['lang'] // ...`.

It would be nice if the paths map knew the target type it had to enforce for each key from `Props` itself.

## Alternatives
Recall we had this above:
```ts
export const propsPaths: AllValuesString<Props> = {
  sense: path({} as Props['sense'], 'sense', 10),
  lang: path({} as Props['lang'], 'sense', 10, 'gloss', 40, 'lang'),
};
```

Here's a less ergonomic approach whose one saving grace is that you don't need to pass in a dummy argument:
```ts
const path1 = ['sense', 10] as const;
const path2 = ['sense', 40, 'gloss', 10, 'lang'] as const;

export const propsPaths2: AllValuesString<Props> = {
  sense: pathi<Props['sense'], typeof path1>(path1),
  lang: pathi<Props['lang'], typeof path2>(path2),
};
```
We provide the new `pathi` function (🍓 below) with
- two generic parameters:
  - the target path, and
  - the path in an array with const assertion, introduced in [3.4](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-4.html#const-assertions), as well as
- the path array as an argument.

This is very unpleasant since it needs you to define beforehand each path array with a const assertion (or duplicate it, as a generic parameter and an argument to `pathi`), but it's needed because the path needs to exist as both a compile-time type as well as a runtime array. Since we're passing in `Target` as a generic parameter, we have to pass in the path as well, since generic parameter type inference is all-or-nothing.

Here's how this works: we need some helper types to deal with the `readonly` qualifier that the const assertion adds to the array—`readonly` prevents it from being destructured as a regular mutable array.
```ts
type Writeable<T> = {-readonly[P in keyof T]: T[P]};
type RoRw<T> = Writeable<T>|Readonly<Writeable<T>>;
```
`Writeable` is the opposite of `Readonly`, per [Nitzan Tomer](https://stackoverflow.com/a/43001581/500207). `RoRw` can take an array or a `readonly` array, and permits both mutable and `readonly` versions.

Next we have `pathi` 🍓, which uses 
- the same tuple technique above from [Nurbol Alpysbayev](https://stackoverflow.com/a/53984913/500207) to detect if `Target` extends never or not,
- a lot of `Writeable` and `RoRw` encumberances to make `readonly` and const assertions work, and finally
- a `PathToType` type that reaches into an arbitrary model with a tuple type and returns the type it finds (or `never` if it can't):
```ts
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
```
[2.8](https://www.staging-typescript.org/docs/handbook/release-notes/typescript-2-8.html#type-inference-in-conditional-types) introduced `infer`, but I didn't quite understand what they did until I began cobbling together the above. [ford04](https://stackoverflow.com/a/60067851/500207)'s comment, that `infer` introduces a new type variable on the "right-hand side" of a generic declaration, i.e., outside the `<>`, helped. Here's a toy example—
```ts
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
```
Usable inside the `extends` clause of a conditional type, `infer` asks if TypeScript can fit a type there, and if so, do something with it; otherwise, do something else.

This is used in `PathToTarget` above 🍓, where we search for the length of the `Arr` path type provided. I.e., if TypeScript can infer all three parameters in `Arr extends [infer T, infer U, infer V]`, then we know we're dealing with a 3-element path array. All that remains is to confirm that `T`, `U`, and `V` are indeed (sub)-keys of `Word` (or any arbitrary `Model` type).

I actually wrote `PathToTarget` manually above, which is very error-prone. The following debug helper replaces `never` with more specific return types to help identify where something was going awry.
```ts
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
```

While this was an interesting detour, I'm much happier with `path` 🍌, despite its shortcomings. If you have suggestions or comments, please [get in touch](https://fasiha.github.io/#contact)!