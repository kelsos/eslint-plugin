import { AST_NODE_TYPES, type TSESLint, type TSESTree } from '@typescript-eslint/utils';
import { createEslintRule, isComposableName } from '../utils';

export const RULE_NAME = 'composable-input-flexibility';

export type MessageIds = 'preferMaybeRefOrGetter' | 'suggestMaybeRefOrGetter';

export type Options = [{ autofix?: boolean }];

function checkParamForRef(param: TSESTree.Parameter): TSESTree.TSTypeReference | undefined {
  let annotation: TSESTree.TypeNode | undefined;

  if (param.type === AST_NODE_TYPES.Identifier && param.typeAnnotation) {
    annotation = param.typeAnnotation.typeAnnotation;
  }
  else if (param.type === AST_NODE_TYPES.AssignmentPattern
    && param.left.type === AST_NODE_TYPES.Identifier
    && param.left.typeAnnotation) {
    annotation = param.left.typeAnnotation.typeAnnotation;
  }

  if (annotation?.type === AST_NODE_TYPES.TSTypeReference
    && annotation.typeName.type === AST_NODE_TYPES.Identifier
    && annotation.typeName.name === 'Ref') {
    return annotation;
  }

  return undefined;
}

function getParamName(param: TSESTree.Parameter): string | undefined {
  if (param.type === AST_NODE_TYPES.Identifier)
    return param.name;

  if (param.type === AST_NODE_TYPES.AssignmentPattern && param.left.type === AST_NODE_TYPES.Identifier)
    return param.left.name;

  return undefined;
}

/**
 * A parameter reference is a write when it is reassigned via `set(param, …)`,
 * `param.value = …` (including compound assignments) or an update expression
 * such as `param.value++`. A getter passed via `MaybeRefOrGetter` is not
 * writable, so such a parameter must stay a `Ref` and should not be flagged.
 */
function isWriteReference(reference: TSESLint.Scope.Reference): boolean {
  const { identifier } = reference;
  const parent = identifier.parent;

  // set(param, …)
  if (parent.type === AST_NODE_TYPES.CallExpression) {
    return parent.callee.type === AST_NODE_TYPES.Identifier
      && parent.callee.name === 'set'
      && parent.arguments[0] === identifier;
  }

  // param.value on the left of an assignment or in an update expression
  if (parent.type === AST_NODE_TYPES.MemberExpression
    && parent.object === identifier
    && !parent.computed
    && parent.property.type === AST_NODE_TYPES.Identifier
    && parent.property.name === 'value') {
    const grandparent = parent.parent;
    if (grandparent.type === AST_NODE_TYPES.AssignmentExpression)
      return grandparent.left === parent;

    return grandparent.type === AST_NODE_TYPES.UpdateExpression;
  }

  return false;
}

function isWrittenParam(scope: TSESLint.Scope.Scope, name: string): boolean {
  const variable = scope.variables.find(candidate => candidate.name === name);
  return variable?.references.some(isWriteReference) ?? false;
}

export default createEslintRule<Options, MessageIds>({
  create(context) {
    const autofix = context.options[0]?.autofix ?? false;

    return {
      FunctionDeclaration: (node: TSESTree.FunctionDeclaration) => {
        if (!node.id || !isComposableName(node.id.name) || !node.body)
          return;

        checkParams(node.params, node);
      },
      VariableDeclarator: (node: TSESTree.VariableDeclarator) => {
        if (node.id.type !== AST_NODE_TYPES.Identifier || !isComposableName(node.id.name))
          return;

        if (node.init?.type === AST_NODE_TYPES.ArrowFunctionExpression
          || node.init?.type === AST_NODE_TYPES.FunctionExpression) {
          checkParams(node.init.params, node.init);
        }
      },
    };

    function checkParams(params: TSESTree.Parameter[], fn: TSESTree.FunctionLike) {
      const scope = context.sourceCode.getScope(fn);

      for (const param of params) {
        const refType = checkParamForRef(param);
        if (!refType)
          continue;

        // Escape hatch: a parameter written back to must stay a writable Ref.
        const name = getParamName(param);
        if (name && isWrittenParam(scope, name))
          continue;

        context.report({
          ...(autofix
            ? {
                fix(fixer) {
                  return fixer.replaceText(refType.typeName, 'MaybeRefOrGetter');
                },
              }
            : {
                suggest: [{
                  fix(fixer) {
                    return fixer.replaceText(refType.typeName, 'MaybeRefOrGetter');
                  },
                  messageId: 'suggestMaybeRefOrGetter',
                }],
              }),
          messageId: 'preferMaybeRefOrGetter',
          node: refType,
        });
      }
    }
  },
  defaultOptions: [{ autofix: false }],
  meta: {
    docs: {
      description: 'Prefer MaybeRefOrGetter over Ref for composable parameters',
      recommendation: 'stylistic',
    },
    fixable: 'code',
    hasSuggestions: true,
    messages: {
      preferMaybeRefOrGetter: 'Use MaybeRefOrGetter<T> instead of Ref<T> for composable parameters to increase input flexibility.',
      suggestMaybeRefOrGetter: 'Replace Ref<T> with MaybeRefOrGetter<T>.',
    },
    schema: [
      {
        additionalProperties: false,
        properties: {
          autofix: {
            default: false,
            description: 'Enable auto-fix. When disabled, the fix is available as a suggestion.',
            type: 'boolean',
          },
        },
        type: 'object',
      },
    ],
    type: 'suggestion',
  },
  name: RULE_NAME,
});
