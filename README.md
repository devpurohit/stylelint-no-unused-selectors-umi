# stylelint-no-unused-selectors

## Concepts

`stylelint-no-unused-selectors-umi` is a [stylelint](https://github.com/stylelint/stylelint) rule to disallow unused CSS selectors for UMI projects.

It works best with component-oriented applications where views are built on top of a lot of small components, each of which contains a template file (e.g., js or ts) and its corresponding scoped CSS file (e.g., CSS Modules or PostCSS with BEM).

Assuming your component consists of following files:

```
FooComponent
├── index.js
├── FooComponent.js
└── FooComponent.css
```

when `stylelint-no-unused-selectors-umi` runs on FooComponent.css, it extracts `class`es and `id`s from FooComponent.js and detects unused CSS rules.

## Features

If you'd like to jump into code, you can find [our examples in the repository](https://github.com/nodaguti/stylelint-no-unused-selectors/tree/master/examples) that are close to real-world situations.

With the built-in plugins, it supports

- HTML via [stylelint-no-unused-selectors-plugin-html](https://github.com/nodaguti/stylelint-no-unused-selectors/tree/master/src/plugins/stylelint-no-unused-selectors-plugin-html)
- React components written in pure JavaScript, JSX, flow-typed JSX, JSX + future syntaxes in TC39 proposals via [stylelint-no-unused-selectors-plugin-jsx](https://github.com/nodaguti/stylelint-no-unused-selectors/tree/master/src/plugins/stylelint-no-unused-selectors-plugin-jsx)
- React components written in TypeScript via [stylelint-no-unused-selectors-plugin-tsx](https://github.com/nodaguti/stylelint-no-unused-selectors/tree/master/src/plugins/stylelint-no-unused-selectors-plugin-tsx)
- [CSS Modules](https://github.com/css-modules/css-modules)
- Basic usages of [`classnames`](https://github.com/JedWatson/classnames) package

See [the documentations of built-in plugins](#built-in-plugins) for more details.

## Installation

```
yarn add stylelint stylelint-no-unused-selectors-umi
```

## Usage

It works as a [stylelint](https://github.com/stylelint/stylelint) rule, and its plugin name is `plugin/no-unused-selectors-umi`. An example configuration of stylelint would look like:

```
{
  "plugins": [
    "stylelint-no-unused-selectors-umi"
  ],
  "rules": {
    "plugin/no-unused-selectors-umi": true
  }
}
```

See [stylelint's documentation](https://github.com/stylelint/stylelint#getting-started) for more details.
