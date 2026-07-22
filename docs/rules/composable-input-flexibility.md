---
title: '@rotki/composable-input-flexibility'
description: Prefer MaybeRefOrGetter over Ref for composable parameters
since: v1.3.0
---

# @rotki/composable-input-flexibility

> Prefer MaybeRefOrGetter over Ref for composable parameters

- :black_nib:️ The `--fix` option on the [command line](http://eslint.org/docs/user-guide/command-line-interface#fix) can automatically fix some of the problems reported by this rule.

## :book: Rule Details

This rule reports `Ref<T>` type annotations on composable parameters and suggests using `MaybeRefOrGetter<T>` for greater input flexibility.

<eslint-code-block fix>

<!-- eslint-skip -->

```ts
/* eslint @rotki/composable-input-flexibility: "error" */

// ✓ GOOD
function useCounter(value: MaybeRefOrGetter<number>) {
  return { count: 0 };
}

// ✗ BAD
function useCounter(value: Ref<number>) {
  return { count: 0 };
}
```

</eslint-code-block>

## :white_check_mark: Written-back parameters are exempt

A `MaybeRefOrGetter<T>` may be a plain getter, which is **not writable**. So a parameter
that the composable writes back to must stay a `Ref<T>`, and the rule does not flag it.
A parameter is considered written when it is reassigned via `set(param, …)`,
`param.value = …` (including compound assignments), or an update expression such as
`param.value++`.

<!-- eslint-skip -->

```ts
/* eslint @rotki/composable-input-flexibility: "error" */

// ✓ GOOD — `state` is written back, so a Ref is required and it is not flagged
function useToggle(state: Ref<boolean>) {
  function toggle() {
    set(state, !get(state));
  }
  return { toggle };
}
```

This means no inline `eslint-disable` is needed for writable parameters: only genuinely
read-only `Ref<T>` parameters — where a getter would work just as well — are reported.

## :wrench: Options

```json
{
  "@rotki/composable-input-flexibility": ["error", { "autofix": false }]
}
```

### `autofix`

- Type: `boolean`
- Default: `false`

When `true`, enables auto-fix via the `--fix` CLI flag. When `false` (default), the fix is available only as an editor suggestion.

## :rocket: Version

This rule was introduced in `@rotki/eslint-plugin` v1.3.0

## :mag: Implementation

- [Rule source](https://github.com/rotki/eslint-plugin/blob/master/src/rules/composable-input-flexibility.ts)
- [Test source](https://github.com/rotki/eslint-plugin/tree/master/tests/rules/composable-input-flexibility.ts)
