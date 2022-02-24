---
author: Pierre Marcenac
title: Bias and Variance in Software Development
date: 2022-02-23T10:52:59+08:00
description: An analysis of how DevOps can help for better product development.
math: true
categories: ['devops', 'product', 'sre']
---

The bias-variance tradeoff is a well-known tradeoff in machine learning. It states you must find the balance between a biased artificial intelligence (AI) and a very unstable AI. You cannot achieve both simultaneously. I will draw in this post a similar parallel in product development in regards to DevOps.

Let's first recap dev's and ops' respective main objectives.

> **Ops (aka operations)**
>
> - Performance means maintaining a blazing-fast and reliable product.
>
> - Scalability means foreseeing drift in performance and anticipating performance issues to adapt to future usage.

> **Dev (aka development)**
>
> - Producing more features means iterating fast and pushing frequent changes to production.
>
> - Shipping quality means no bug goes to production and the produced code is maintainable.

That is why dev's and ops' interests are fundamentally opposed. DevOps intends to break with this antagonism to empower dev and ops teams with common objectives. However, this opposition is still a reality. In DevOps, this translates by the following competition:

- On the left side of the spectrum, devs dictate their rules. They want simple, maintainable brief code, which causes fewer bugs. It, however, results in low performance at scale.

- On the very opposite side, only ops have the last words. They want high performance, so the code complexity increases. Such products are usually more prone to bugs, and devs struggle delving into the code.

We could represent this dialectic by the following graph:

![Image](/bias-variance.png)

# Choosing between bias and variance

I defined bias and variance as follows:

- **Bias** is the difference between the expected features and the true features of the product. It is directly linked to the perception the customer has of the product.

- **Variance** is a measure of the dispersion of the product. It is directly linked to code complexity, the variety of features, the factorization of the code, etc.

It allows to differentiate 3 realms in the above graph:

- Startups have a very biased product (few features) and low variance (small product enveloppe). Both performance and product complexity can be low

- Giants have products that cover all possible features with high performance. Costs of maintenance are extremly high.

- Scaleups are in-between. They have to find the equilibrium between managing bias and variance.

As a result, the tradeoff lies between product complexity (on the dev side) and performance (on the ops side).

# Finding the perfect balance

There exist some solutions to this intrinsic problem.

### 1. Ops must provide tools to test the code against performance

Ops must advocate for performance and scalability constraints to be implemented in the code. It allows locking performant and scalable patterns by implementing them directly in the code. No deviation is allowed.

For instance, if you want your favorite ORM to avoid dangerous `SELECT *` in the code, you should embody this pattern in your code.

```typescript
type Options = {
  attributes: Exclude<string, "*">[],
};

class User:
  findAll = (options: Options) => {
    const attributes = options.?attributes ?? [];
    orm.query(`SELECT ${attributes.join(', ')} FROM users;`);
  };

// Not allowed
const users = await User.findAll({
  attributes: ['*'],
});

// Allowed
const users = await User.findAll({
  attributes: ['id'],
});
```

Such safeguard prevents developers from basic mistakes that operations already identified as dangerous in production scenarios.

### 2. Devs have to abstract performance in the code

As we saw, the quest towards performance will force developers to complexify their code, leading to increased code complexity. So it is paramount to properly architect the code to foresee those changes and encapsulate this complexity outside of the business logic.

For instance, if you manage items in an e-commerce setting, you probably want to avoid double-spending. Double-spending happens when one or more clients reach two times for the same product. A safeguard for this can be to manipulate lock entities on each product.

```typescript
class Lock {
  create = () => {
    orm.create(uuid());
  };
}

const lock = new Lock(id);
lock.create();
```

Here, adding a layer of abstraction allows swapping the implementation: maybe tomorrow, locks will be implemented as a Redis cache or as a column in a relation. So changing the code to:

```typescript
create = () => {
  redis.cache(id); // this line changed
};
```

will transparently change every occurrence of the code.

I am not saying devs should over-factorize code. However, in cases that operations already pinpointed as critical from a performance perspective, extracting the logic from the code can be an appropriate option to iterate faster towards to best, most performant solution. Such patterns split the concerns between business and performance logic.

# Conclusion

Thinking in terms of bias and variance is an interesting tool for product prioritization. Should you focus on reducing bias by producing more features or tackling variance by attacking technical debt? This is a question worth answering at every sprint, and it is a perpetual discussion to nurture between product, development, and operations.

Anyway, DevOps is now so deeply rooted in our way of thinking that it's almost history. Now it's all about DevSecOps, and security also adds up entropy to already complex projects.
