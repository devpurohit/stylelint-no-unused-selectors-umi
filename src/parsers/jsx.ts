import { Parser as AcornParser, Node } from 'acorn';
// @ts-ignore
import acornJSX from 'acorn-jsx';
// @ts-ignore
import { simple as walkSimple } from 'acorn-walk';
// FIXME: There are lots of @ts-ignore's in this file due to the differences between
// AST of babylon (@babel/types) and that of acorn.
import {
  JSXAttribute,
  ImportDeclaration,
  MemberExpression,
  VariableDeclarator,
  CallExpression,
  Identifier,
  StringLiteral,
} from '@babel/types';
import { Undefinable } from 'option-t/lib/Undefinable';
import { andThenForUndefinable } from 'option-t/lib/Undefinable/andThen';
import PostcssSelectorParser from 'postcss-selector-parser';
// @ts-ignore
import removeFlowTypes from 'flow-remove-types';

import { Parser } from '../parser';
import { jsxWalker } from '../utils/acorn-jsx-walker';
import { isSimpleSelector } from '../utils/is-simple-selector';

const acornOptions = {
  sourceType: 'module' as const,
};

const JSXAcornParser = AcornParser.extend(acornJSX());

function extractAttributeValue(node: JSXAttribute): Undefinable<string> {
  const valueNode = node.value;

  // @ts-ignore
  if (valueNode.type !== 'Literal') {
    return;
  }

  // @ts-ignore
  return valueNode.value;
}

function extractSpecifiersFromImport(
  node: ImportDeclaration,
  predicate: (node: ImportDeclaration) => boolean,
): string[] {
  if (!predicate(node)) {
    return [];
  }

  return node.specifiers.map((specifier): string => specifier.local.name);
}

function isRequireCall(node: VariableDeclarator): boolean {
  if (!node.init || node.init.type !== 'CallExpression') {
    return false;
  }

  const callExpr = node.init as CallExpression;

  // @ts-ignore
  const funcName: string = callExpr.callee.name;
  return funcName === 'require';
}

function extractSpecifierFromRequire(
  node: VariableDeclarator,
  predicate: (node: VariableDeclarator) => boolean,
): Undefinable<string> {
  if (!predicate(node)) {
    return undefined;
  }

  // @ts-ignore
  return node.id.name;
}

function extractArgumentsFromClassnamesCall(node: CallExpression): string[] {
  const classes: string[] = [];

  node.arguments.forEach(
    (arg): void => {
      switch (arg.type) {
        // @ts-ignore
        case 'Literal': {
          const className = (arg as StringLiteral).value;
          if (className) {
            classes.push(className);
          }
          break;
        }

        case 'ObjectExpression': {
          const keys = arg.properties
            // @ts-ignore
            .map((prop): string => prop.key.value)
            .filter((key): boolean => !!key);

          classes.push(...keys);
          break;
        }
      }
    },
  );

  return classes;
}

function extractClassesAndIds(ast: Node): { classes: string[]; ids: string[] } {
  const cssModuleSpecifiers: string[] = [];
  const classNamesSpecifiers: string[] = [];
  const classes: string[] = [];
  const ids: string[] = [];

  walkSimple(
    ast,
    {
      ImportDeclaration(node: ImportDeclaration): void {
        {
          const specifiers = extractSpecifiersFromImport(
            node,
            (node): boolean => {
              return node.source.value.endsWith('.css');
            },
          );

          cssModuleSpecifiers.push(...specifiers);
        }

        {
          const specifiers = extractSpecifiersFromImport(
            node,
            (node): boolean => {
              return node.source.value === 'classnames';
            },
          );

          classNamesSpecifiers.push(...specifiers);
        }
      },

      VariableDeclarator(node: VariableDeclarator): void {
        if (!isRequireCall(node)) {
          return;
        }

        {
          const specifier = extractSpecifierFromRequire(
            node,
            (node): boolean => {
              // @ts-ignore
              const source: string = node.init.arguments[0].value;
              return !!source && source.endsWith('.css');
            },
          );

          andThenForUndefinable(
            specifier,
            (s): void => void cssModuleSpecifiers.push(s),
          );
        }

        {
          const specifier = extractSpecifierFromRequire(
            node,
            (node): boolean => {
              // @ts-ignore
              const source: string = node.init.arguments[0].value;
              return !!source && source === 'classnames';
            },
          );

          andThenForUndefinable(
            specifier,
            (s): void => void classNamesSpecifiers.push(s),
          );
        }
      },

      CallExpression(node: CallExpression): void {
        const funcName = (node.callee as Identifier).name;

        if (classNamesSpecifiers.includes(funcName)) {
          const args = extractArgumentsFromClassnamesCall(node);
          const classNames = args.map((className): string => `.${className}`);

          classes.push(...classNames);
        }
      },

      MemberExpression(node: MemberExpression): void {
        // @ts-ignore
        if (cssModuleSpecifiers.includes(node.object.name)) {
          classes.push(`.${node.property.value || node.property.name}`);
        }
      },

      JSXAttribute(node: JSXAttribute): void {
        if (node.name.name === 'className') {
          const classNames = extractAttributeValue(node);

          if (classNames) {
            const normalisedClassNames = classNames
              .split(' ')
              .filter((c): boolean => !!c)
              .map((c): string => `.${c}`);

            classes.push(...normalisedClassNames);
          }
        }

        if (node.name.name === 'id') {
          const idNames = extractAttributeValue(node);

          if (idNames) {
            const normalisedIdNames = idNames
              .split(' ')
              .filter((i): boolean => !!i)
              .map((i): string => `#${i}`);

            ids.push(...normalisedIdNames);
          }
        }
      },
    },
    jsxWalker,
  );

  return { classes, ids };
}

export class JSXParser implements Parser {
  private _ast: Undefinable<Node>;
  private _classes: string[];
  private _ids: string[];

  public constructor() {
    this._ast = undefined;
    this._classes = [];
    this._ids = [];
  }

  public parse(jsx: string): void {
    const jsxWithoutFlow = removeFlowTypes(jsx);
    const ast = JSXAcornParser.parse(jsxWithoutFlow, acornOptions);
    const { classes, ids } = extractClassesAndIds(ast);

    this._ast = ast;
    this._classes = classes;
    this._ids = ids;
  }

  public match(selectorAst: PostcssSelectorParser.Root): boolean {
    if (this._ast === undefined) {
      throw new Error('Call parse() before match().');
    }

    // Skip if the given selector is not composed of only one class or id.
    if (!isSimpleSelector(selectorAst)) {
      return true;
    }

    const selector = selectorAst.toString();

    if (this._classes.includes(selector)) {
      return true;
    }

    if (this._ids.includes(selector)) {
      return true;
    }

    return false;
  }
}
