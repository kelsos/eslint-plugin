---
title: '@rotki/no-shared-pinia'
description: disallow a Pinia instance shared across tests via `describe`-body or module scope
since: v1.5.0
---

# @rotki/no-shared-pinia

> disallow a Pinia instance shared across tests via `describe`-body or module scope

- :star: The `"extends": "plugin:@rotki/recommended"` property in a configuration file enables this rule.

## :book: Rule Details

A Pinia instance created **once in the `describe` body** (or at module scope) is reused by every `it` in that suite. Because the instance is shared, a store mutated in one test is still mutated in the next: specs pass in file order but fail (or pass for the wrong reason) under `--sequence.shuffle`. This is a real, latent, order-dependent bug class.

The safe pattern is a **fresh instance per test**: `setActivePinia(createPinia())` (or the repo's `createCustomPinia()` helper) inside `beforeEach`, not in the `describe` body.

This rule only runs on test files (`*.spec.ts` / `*.test.ts` by default). It reports when a tracked factory (`createPinia`, `createCustomPinia`, `createTestingPinia`) is called directly in a `describe` body or at module scope and there is **no** `beforeEach` in the same suite that re-creates a fresh instance. Only `beforeEach` clears the report: a `beforeAll` runs once, and a `beforeEach` that merely re-activates the same shared instance still leaks state.

The rule tracks where the factory is **called**, not where the variable is declared. A `let pinia` binding in the `describe` body whose `createX()` assignment happens inside `beforeEach` is fine.

<!-- eslint-skip -->

```ts
/* eslint @rotki/no-shared-pinia: "error" */

// ✗ BAD: shared across every test, state bleeds
describe('useThing', () => {
  setActivePinia(createPinia());
  it('a', () => {
    /* mutates store */
  });
  it('b', () => {
    /* sees a's mutation */
  });
});

// ✗ BAD: a beforeEach that re-activates the SAME instance is still shared
describe('useThing', () => {
  const pinia = createPinia();
  beforeEach(() => setActivePinia(pinia));
  it('a', () => {});
});

// ✓ GOOD: fresh instance per test
describe('useThing', () => {
  beforeEach(() => setActivePinia(createCustomPinia()));
  it('a', () => {});
  it('b', () => {});
});
```

Some shared instances are intentional (singleton composables under test via `createSharedComposable`, module-level singletons). For those, opt out with an inline disable:

<!-- eslint-skip -->

```ts
describe('useSingleton', () => {
  // eslint-disable-next-line @rotki/no-shared-pinia -- intentional singleton under test
  setActivePinia(createPinia());
  it('a', () => {});
});
```

## :gear: Options

```json
{
  "@rotki/no-shared-pinia": [
    "error",
    {
      "factories": ["createPinia", "createCustomPinia", "createTestingPinia"],
      "testFilePattern": "\\.(spec|test)\\.[cm]?[jt]sx?$"
    }
  ]
}
```

### `factories` (string[])

The creation calls to track. Default `["createPinia", "createCustomPinia", "createTestingPinia"]`.

### `testFilePattern` (string)

A regular-expression source string matched against the file name to decide whether a file is a test file. Files that do not match are ignored. Default `"\\.(spec|test)\\.[cm]?[jt]sx?$"`.

## :rocket: Version

This rule was introduced in `@rotki/eslint-plugin` v1.5.0

## :mag: Implementation

- [Rule source](https://github.com/rotki/eslint-plugin/blob/master/src/rules/no-shared-pinia.ts)
- [Test source](https://github.com/rotki/eslint-plugin/tree/master/tests/rules/no-shared-pinia.ts)
