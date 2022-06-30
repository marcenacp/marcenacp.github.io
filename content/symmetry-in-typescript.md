---
author: Pierre Marcenac
title: Symmetry of comparisons in TypeScript
date: 2022-04-26T10:52:59+08:00
description:
categories: ['development', 'funny', 'typescript']
---

`x === 'x'` versus `'x' === x`. The equality in TypeScript is computationnally not symmetric.

## The experiment

I imagined the following experiment:

- I generate 99,999,999 random letters from the lower-case alphabet.
- I time the evaluation of both expressions (`x === 'x'` and `'x' === x`) on those letters.

The TypeScript code is:

```typescript
const NUMBER_OF_REPETITION = 99999999;
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';
const RANDOM_SEQUENCE = Array(NUMBER_OF_REPETITION)
  .fill(undefined)
  .map(() => {
    const randomIndex = Math.floor(Math.random() * ALPHABET.length);
    return ALPHABET[randomIndex];
  });

const evaluate = (fn: (s: string) => boolean): void => {
  const times: number[] = [];
  const startTime = Date.now();
  for (let i = 0; i < NUMBER_OF_REPETITION; i++) {
    const randomLetter = RANDOM_SEQUENCE[i];
    fn(randomLetter);
  }
  const endTime = Date.now();
  console.log((endTime - startTime) / NUMBER_OF_REPETITION);
};
```

The evaluation gives me:

```typescript
evaluate((x) => x === 'x'); // 0.0000013200000132 milliseconds
evaluate((x) => 'x' === x); // 0.0000136700001367 milliseconds
```

Switching the order of the comparison slows down my code by 10. 😮

## Why though?

![Why though?](/why.jpeg)

A few other caveats on comparisons can be found [on W3School](https://www.w3schools.com/js/js_comparisons.asp) and [on MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Equality_comparisons_and_sameness).
