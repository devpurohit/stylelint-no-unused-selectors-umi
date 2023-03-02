import { Undefinable } from 'option-t/lib/Undefinable';
import { Result } from 'postcss';
import stylelint from 'stylelint';

import { DeepPartial } from './types/deep-partial';

export interface PluginSetting {
  test: string;
  plugin: string;
  options?: unknown;
}

export interface Options {
  resolve: {
    documents: string[];
  };
  plugins: PluginSetting[];
}

const optionsSchema = {
  resolve: {
    documents: [(a: unknown): boolean => typeof a === 'string'],
  },
  plugins: [
    (p: unknown): boolean =>
      typeof p === 'object' && p !== null && 'test' in p && 'plugin' in p,
  ],
};

const defaultOptions: Options = {
  resolve: {
    documents: ['{cssDir}/{cssName}.js'],
  },
  plugins: [
    {
      test: '\\.js?$',
      plugin: 'stylelint-no-unused-selectors-plugin-jsx',
      options: {
        sourceType: 'module',
        plugins: ['jsx', 'flow'],
      },
    },
  ],
};

export function normaliseOptions(
  result: Result,
  ruleName: string,
  options: Undefinable<DeepPartial<Options>>,
): Undefinable<Options> {
  const areOptionsValid = stylelint.utils.validateOptions(result, ruleName, {
    actual: options,
    possible: optionsSchema,
    optional: true,
  });

  if (!areOptionsValid) {
    return;
  }

  const mergedOpts = Object.assign(defaultOptions, options);
  return mergedOpts;
}
