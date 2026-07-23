import { RuleTester } from 'eslint';
import vueParser from 'vue-eslint-parser';
import rule, { RULE_NAME } from '../../src/rules/no-shared-pinia';

const tester = new RuleTester({
  languageOptions: {
    parser: vueParser,
    parserOptions: {
      ecmaVersion: 2021,
      parser: '@typescript-eslint/parser',
      sourceType: 'module',
    },
  },
});

tester.run(RULE_NAME, rule, {
  invalid: [
    // setActivePinia(createPinia()) directly in the describe body
    {
      code: `
        describe('useThing', () => {
          setActivePinia(createPinia());
          it('a', () => {});
          it('b', () => {});
        });
      `,
      errors: [{ messageId: 'sharedPinia' }],
      filename: 'thing.spec.ts',
    },
    // instance assigned to a variable in the describe body
    {
      code: `
        describe('useThing', () => {
          const pinia = createCustomPinia();
          setActivePinia(pinia);
          it('a', () => {});
        });
      `,
      errors: [{ messageId: 'sharedPinia' }],
      filename: 'thing.spec.ts',
    },
    // createTestingPinia shared in the describe body
    {
      code: `
        describe('Component', () => {
          const pinia = createTestingPinia();
          it('renders', () => {});
        });
      `,
      errors: [{ messageId: 'sharedPinia' }],
      filename: 'component.test.ts',
    },
    // a beforeEach that only re-activates the SAME instance is still shared
    {
      code: `
        describe('useThing', () => {
          const pinia = createPinia();
          beforeEach(() => setActivePinia(pinia));
          it('a', () => {});
        });
      `,
      errors: [{ messageId: 'sharedPinia' }],
      filename: 'thing.spec.ts',
    },
    // module top-level creation
    {
      code: `
        setActivePinia(createPinia());
        describe('useThing', () => {
          it('a', () => {});
        });
      `,
      errors: [{ messageId: 'sharedPinia' }],
      filename: 'thing.spec.ts',
    },
    // describe.only variant is still a describe body
    {
      code: `
        describe.only('useThing', () => {
          setActivePinia(createPinia());
          it('a', () => {});
        });
      `,
      errors: [{ messageId: 'sharedPinia' }],
      filename: 'thing.spec.ts',
    },
    // vitest `suite` alias and a plain function callback
    {
      code: `
        suite('useThing', function () {
          setActivePinia(createPinia());
          it('a', () => {});
        });
      `,
      errors: [{ messageId: 'sharedPinia' }],
      filename: 'thing.spec.ts',
    },
    // a child beforeEach does NOT protect a parent-scoped creation
    {
      code: `
        describe('outer', () => {
          setActivePinia(createPinia());
          it('direct', () => {});
          describe('inner', () => {
            beforeEach(() => setActivePinia(createPinia()));
            it('a', () => {});
          });
        });
      `,
      errors: [{ messageId: 'sharedPinia' }],
      filename: 'thing.spec.ts',
    },
    // beforeAll does not make it per-test; body creation still flagged
    {
      code: `
        describe('useThing', () => {
          const pinia = createPinia();
          beforeAll(() => setActivePinia(pinia));
          it('a', () => {});
        });
      `,
      errors: [{ messageId: 'sharedPinia' }],
      filename: 'thing.spec.ts',
    },
  ],
  valid: [
    // fresh instance per test in beforeEach
    {
      code: `
        describe('useThing', () => {
          beforeEach(() => setActivePinia(createCustomPinia()));
          it('a', () => {});
          it('b', () => {});
        });
      `,
      filename: 'thing.spec.ts',
    },
    // creation inside beforeEach block body
    {
      code: `
        describe('useThing', () => {
          beforeEach(() => {
            setActivePinia(createPinia());
          });
          it('a', () => {});
        });
      `,
      filename: 'thing.spec.ts',
    },
    // describe-body creation IS present but a beforeEach re-creates a fresh one
    {
      code: `
        describe('useThing', () => {
          let pinia = createPinia();
          beforeEach(() => {
            pinia = createPinia();
            setActivePinia(pinia);
          });
          it('a', () => {});
        });
      `,
      filename: 'thing.spec.ts',
    },
    // variable declared in describe body, but created fresh inside beforeEach
    {
      code: `
        describe('useThing', () => {
          let pinia: Pinia;
          beforeEach(() => {
            pinia = createPinia();
            setActivePinia(pinia);
          });
          it('a', () => {});
        });
      `,
      filename: 'thing.spec.ts',
    },
    // creation inside an it callback
    {
      code: `
        describe('useThing', () => {
          it('a', () => {
            setActivePinia(createPinia());
          });
        });
      `,
      filename: 'thing.spec.ts',
    },
    // not a test file: rule does not apply
    {
      code: `
        describe('useThing', () => {
          setActivePinia(createPinia());
          it('a', () => {});
        });
      `,
      filename: 'thing.ts',
    },
    // inner describe has its own beforeEach; outer beforeEach re-creates fresh
    {
      code: `
        describe('outer', () => {
          beforeEach(() => setActivePinia(createPinia()));
          describe('inner', () => {
            it('a', () => {});
          });
        });
      `,
      filename: 'thing.spec.ts',
    },
    // an ancestor beforeEach protects a creation in a nested describe body
    {
      code: `
        describe('outer', () => {
          beforeEach(() => setActivePinia(createPinia()));
          describe('inner', () => {
            const pinia = createTestingPinia();
            it('a', () => {});
          });
        });
      `,
      filename: 'thing.spec.ts',
    },
    // a top-level beforeEach protects a describe-body creation
    {
      code: `
        beforeEach(() => setActivePinia(createPinia()));
        describe('useThing', () => {
          const pinia = createTestingPinia();
          it('a', () => {});
        });
      `,
      filename: 'thing.spec.ts',
    },
  ],
});
