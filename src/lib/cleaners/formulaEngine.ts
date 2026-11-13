import type { CellValue, ColumnMeta, DataRow } from '../../types/dataset';

type Token =
  | { type: 'number'; value: number }
  | { type: 'string'; value: string }
  | { type: 'boolean'; value: boolean }
  | { type: 'column'; name: string }
  | { type: 'ident'; name: string }
  | { type: 'op'; op: string }
  | { type: 'lparen' }
  | { type: 'rparen' }
  | { type: 'comma' };

type AstNode =
  | { kind: 'literal'; value: CellValue }
  | { kind: 'column'; name: string }
  | { kind: 'unary'; op: string; expr: AstNode }
  | { kind: 'binary'; op: string; left: AstNode; right: AstNode }
  | { kind: 'call'; fn: string; args: AstNode[] };

export function tokenizeFormula(formula: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const len = formula.length;

  while (i < len) {
    const ch = formula[i] ?? '';

    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    // Column reference [Column Name] or {Column Name}
    if (ch === '[' || ch === '{') {
      const closing = ch === '[' ? ']' : '}';
      const end = formula.indexOf(closing, i + 1);
      if (end === -1) {
        throw new Error(`Unclosed column reference starting with "${ch}"`);
      }
      const colName = formula.slice(i + 1, end).trim();
      if (!colName) {
        throw new Error('Empty column reference []');
      }
      tokens.push({ type: 'column', name: colName });
      i = end + 1;
      continue;
    }

    // String literal "..." or '...'
    if (ch === '"' || ch === "'") {
      const quote = ch;
      i++;
      let str = '';
      let closed = false;
      while (i < len) {
        const c = formula[i] ?? '';
        if (c === '\\' && i + 1 < len) {
          const next = formula[i + 1] ?? '';
          str += next === 'n' ? '\n' : next === 't' ? '\t' : next;
          i += 2;
          continue;
        }
        if (c === quote) {
          closed = true;
          i++;
          break;
        }
        str += c;
        i++;
      }
      if (!closed) {
        throw new Error(`Unclosed string literal starting with ${quote}`);
      }
      tokens.push({ type: 'string', value: str });
      continue;
    }

    // Number literal
    if (/\d/.test(ch) || (ch === '.' && i + 1 < len && /\d/.test(formula[i + 1] ?? ''))) {
      let numStr = '';
      while (i < len && /[\d.]/.test(formula[i] ?? '')) {
        numStr += formula[i];
        i++;
      }
      const parsed = Number(numStr);
      if (Number.isNaN(parsed)) {
        throw new Error(`Invalid number "${numStr}"`);
      }
      tokens.push({ type: 'number', value: parsed });
      continue;
    }

    // Two-character operators
    const twoChar = formula.slice(i, i + 2);
    if (['==', '!=', '<>', '<=', '>=', '&&', '||'].includes(twoChar)) {
      tokens.push({ type: 'op', op: twoChar });
      i += 2;
      continue;
    }

    // Single-character operators and punctuation
    if (['+', '-', '*', '/', '%', '&', '=', '<', '>', '!'].includes(ch)) {
      tokens.push({ type: 'op', op: ch });
      i++;
      continue;
    }

    if (ch === '(') {
      tokens.push({ type: 'lparen' });
      i++;
      continue;
    }
    if (ch === ')') {
      tokens.push({ type: 'rparen' });
      i++;
      continue;
    }
    if (ch === ',') {
      tokens.push({ type: 'comma' });
      i++;
      continue;
    }

    // Identifier (function name or boolean keyword)
    if (/[A-Za-z_]/.test(ch)) {
      let ident = '';
      while (i < len && /[A-Za-z0-9_]/.test(formula[i] ?? '')) {
        ident += formula[i];
        i++;
      }
      const upper = ident.toUpperCase();
      if (upper === 'TRUE') {
        tokens.push({ type: 'boolean', value: true });
      } else if (upper === 'FALSE') {
        tokens.push({ type: 'boolean', value: false });
      } else if (upper === 'NULL') {
        tokens.push({ type: 'string', value: '' });
      } else {
        tokens.push({ type: 'ident', name: upper });
      }
      continue;
    }

    throw new Error(`Unexpected character "${ch}" in formula`);
  }

  return tokens;
}

class FormulaParser {
  private pos = 0;
  private readonly tokens: Token[];

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): AstNode {
    if (this.tokens.length === 0) {
      throw new Error('Formula cannot be empty');
    }
    const expr = this.parseLogicalOr();
    if (this.pos < this.tokens.length) {
      throw new Error('Unexpected trailing tokens in formula');
    }
    return expr;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private consume(): Token {
    const tok = this.tokens[this.pos];
    if (!tok) throw new Error('Unexpected end of formula');
    this.pos++;
    return tok;
  }

  private matchOp(...ops: string[]): string | null {
    const tok = this.peek();
    if (tok && tok.type === 'op' && ops.includes(tok.op)) {
      this.pos++;
      return tok.op;
    }
    return null;
  }

  private parseLogicalOr(): AstNode {
    let left = this.parseLogicalAnd();
    while (true) {
      const op = this.matchOp('||');
      if (!op) break;
      const right = this.parseLogicalAnd();
      left = { kind: 'binary', op, left, right };
    }
    return left;
  }

  private parseLogicalAnd(): AstNode {
    let left = this.parseComparison();
    while (true) {
      const op = this.matchOp('&&');
      if (!op) break;
      const right = this.parseComparison();
      left = { kind: 'binary', op, left, right };
    }
    return left;
  }

  private parseComparison(): AstNode {
    let left = this.parseConcat();
    while (true) {
      const op = this.matchOp('==', '=', '!=', '<>', '<', '<=', '>', '>=');
      if (!op) break;
      const right = this.parseConcat();
      left = { kind: 'binary', op, left, right };
    }
    return left;
  }

  private parseConcat(): AstNode {
    let left = this.parseAdditive();
    while (true) {
      const op = this.matchOp('&');
      if (!op) break;
      const right = this.parseAdditive();
      left = { kind: 'binary', op, left, right };
    }
    return left;
  }

  private parseAdditive(): AstNode {
    let left = this.parseMultiplicative();
    while (true) {
      const op = this.matchOp('+', '-');
      if (!op) break;
      const right = this.parseMultiplicative();
      left = { kind: 'binary', op, left, right };
    }
    return left;
  }

  private parseMultiplicative(): AstNode {
    let left = this.parseUnary();
    while (true) {
      const op = this.matchOp('*', '/', '%');
      if (!op) break;
      const right = this.parseUnary();
      left = { kind: 'binary', op, left, right };
    }
    return left;
  }

  private parseUnary(): AstNode {
    const op = this.matchOp('-', '+', '!');
    if (op) {
      return { kind: 'unary', op, expr: this.parseUnary() };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): AstNode {
    const tok = this.peek();
    if (!tok) {
      throw new Error('Unexpected end of expression');
    }

    if (tok.type === 'number' || tok.type === 'string' || tok.type === 'boolean') {
      this.consume();
      return { kind: 'literal', value: tok.value };
    }

    if (tok.type === 'column') {
      this.consume();
      return { kind: 'column', name: tok.name };
    }

    if (tok.type === 'ident') {
      this.consume();
      const next = this.peek();
      if (!next || next.type !== 'lparen') {
        throw new Error(
          `Unknown identifier "${tok.name}". Wrap column names in brackets like [${tok.name}].`
        );
      }
      this.consume(); // '('
      const args: AstNode[] = [];
      if (this.peek()?.type !== 'rparen') {
        while (true) {
          args.push(this.parseLogicalOr());
          if (this.peek()?.type === 'comma') {
            this.consume();
          } else {
            break;
          }
        }
      }
      if (this.peek()?.type !== 'rparen') {
        throw new Error(`Expected closing ")" for function ${tok.name}()`);
      }
      this.consume();
      return { kind: 'call', fn: tok.name, args };
    }

    if (tok.type === 'lparen') {
      this.consume();
      const inner = this.parseLogicalOr();
      if (this.peek()?.type !== 'rparen') {
        throw new Error('Missing closing parenthesis ")"');
      }
      this.consume();
      return inner;
    }

    throw new Error('Invalid expression syntax');
  }
}

function toNum(val: CellValue): number | null {
  if (typeof val === 'number') return Number.isFinite(val) ? val : null;
  if (typeof val === 'boolean') return val ? 1 : 0;
  if (val === null || val === undefined) return null;
  const cleaned = val.trim().replace(/,/g, '');
  if (cleaned === '') return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function toStr(val: CellValue): string {
  if (val === null || val === undefined) return '';
  return String(val);
}

function toBool(val: CellValue): boolean {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val !== 0;
  if (val === null || val === undefined) return false;
  const lower = val.trim().toLowerCase();
  return lower !== '' && lower !== 'false' && lower !== '0';
}

export interface CompiledFormula {
  evaluate: (row: DataRow) => CellValue;
}

/**
 * Compiles a formula expression once against the dataset's columns so it can be
 * evaluated rapidly across thousands of rows.
 */
export function compileFormula(expression: string, columns: ColumnMeta[]): CompiledFormula {
  const tokens = tokenizeFormula(expression);
  const ast = new FormulaParser(tokens).parse();

  // Build exact and case-insensitive column name -> id lookup
  const exactMap = new Map<string, string>();
  const lowerMap = new Map<string, string>();
  for (const col of columns) {
    exactMap.set(col.name, col.id);
    exactMap.set(col.name.trim(), col.id);
    lowerMap.set(col.name.trim().toLowerCase(), col.id);
  }

  const resolveColumnId = (colRef: string): string => {
    const exact = exactMap.get(colRef);
    if (exact) return exact;
    const ci = lowerMap.get(colRef.toLowerCase());
    if (ci) return ci;
    throw new Error(`Column "[${colRef}]" does not exist in dataset`);
  };

  // Validate all referenced columns upfront
  const validateAst = (node: AstNode): void => {
    if (node.kind === 'column') {
      resolveColumnId(node.name);
    } else if (node.kind === 'unary') {
      validateAst(node.expr);
    } else if (node.kind === 'binary') {
      validateAst(node.left);
      validateAst(node.right);
    } else if (node.kind === 'call') {
      for (const arg of node.args) validateAst(arg);
    }
  };
  validateAst(ast);

  const evalNode = (node: AstNode, row: DataRow): CellValue => {
    switch (node.kind) {
      case 'literal':
        return node.value;
      case 'column': {
        const colId = resolveColumnId(node.name);
        return row.cells[colId] ?? null;
      }
      case 'unary': {
        const val = evalNode(node.expr, row);
        if (node.op === '!') return !toBool(val);
        const n = toNum(val);
        if (n === null) return null;
        return node.op === '-' ? -n : n;
      }
      case 'binary': {
        if (node.op === '&&') return toBool(evalNode(node.left, row)) && toBool(evalNode(node.right, row));
        if (node.op === '||') return toBool(evalNode(node.left, row)) || toBool(evalNode(node.right, row));

        const l = evalNode(node.left, row);
        const r = evalNode(node.right, row);

        if (node.op === '&') {
          return toStr(l) + toStr(r);
        }

        if (node.op === '+') {
          const ln = toNum(l);
          const rn = toNum(r);
          if (ln !== null && rn !== null && l !== '' && r !== '') {
            return Number((ln + rn).toFixed(10));
          }
          return toStr(l) + toStr(r);
        }

        if (['-', '*', '/', '%'].includes(node.op)) {
          const ln = toNum(l);
          const rn = toNum(r);
          if (ln === null || rn === null) return null;
          if (node.op === '-') return Number((ln - rn).toFixed(10));
          if (node.op === '*') return Number((ln * rn).toFixed(10));
          if (node.op === '/') return rn === 0 ? null : Number((ln / rn).toFixed(10));
          if (node.op === '%') return rn === 0 ? null : ln % rn;
        }

        if (['==', '=', '!=', '<>', '<', '<=', '>', '>='].includes(node.op)) {
          const ln = toNum(l);
          const rn = toNum(r);
          if (ln !== null && rn !== null && l !== '' && r !== '') {
            if (node.op === '==' || node.op === '=') return ln === rn;
            if (node.op === '!=' || node.op === '<>') return ln !== rn;
            if (node.op === '<') return ln < rn;
            if (node.op === '<=') return ln <= rn;
            if (node.op === '>') return ln > rn;
            if (node.op === '>=') return ln >= rn;
          }
          const ls = toStr(l);
          const rs = toStr(r);
          if (node.op === '==' || node.op === '=') return ls === rs;
          if (node.op === '!=' || node.op === '<>') return ls !== rs;
          if (node.op === '<') return ls < rs;
          if (node.op === '<=') return ls <= rs;
          if (node.op === '>') return ls > rs;
          if (node.op === '>=') return ls >= rs;
        }
        return null;
      }
      case 'call': {
        const fn = node.fn;
        if (fn === 'IF') {
          const cond = evalNode(node.args[0] ?? { kind: 'literal', value: false }, row);
          return toBool(cond)
            ? evalNode(node.args[1] ?? { kind: 'literal', value: '' }, row)
            : evalNode(node.args[2] ?? { kind: 'literal', value: '' }, row);
        }
        const evaluatedArgs = node.args.map((a) => evalNode(a, row));
        switch (fn) {
          case 'CONCAT':
            return evaluatedArgs.map(toStr).join('');
          case 'UPPER':
            return toStr(evaluatedArgs[0] ?? '').toUpperCase();
          case 'LOWER':
            return toStr(evaluatedArgs[0] ?? '').toLowerCase();
          case 'TRIM':
            return toStr(evaluatedArgs[0] ?? '').trim();
          case 'LEN':
            return toStr(evaluatedArgs[0] ?? '').length;
          case 'REPLACE': {
            const target = toStr(evaluatedArgs[0] ?? '');
            const search = toStr(evaluatedArgs[1] ?? '');
            const replacement = toStr(evaluatedArgs[2] ?? '');
            return search ? target.split(search).join(replacement) : target;
          }
          case 'COALESCE': {
            for (const val of evaluatedArgs) {
              if (val !== null && val !== undefined && toStr(val).trim() !== '') {
                return val;
              }
            }
            return null;
          }
          case 'ROUND': {
            const n = toNum(evaluatedArgs[0] ?? null);
            if (n === null) return null;
            const decimals = toNum(evaluatedArgs[1] ?? 0) ?? 0;
            const factor = Math.pow(10, Math.max(0, Math.min(10, Math.trunc(decimals))));
            return Math.round(n * factor) / factor;
          }
          case 'ABS': {
            const n = toNum(evaluatedArgs[0] ?? null);
            return n === null ? null : Math.abs(n);
          }
          case 'FLOOR': {
            const n = toNum(evaluatedArgs[0] ?? null);
            return n === null ? null : Math.floor(n);
          }
          case 'CEIL': {
            const n = toNum(evaluatedArgs[0] ?? null);
            return n === null ? null : Math.ceil(n);
          }
          case 'MIN': {
            const nums = evaluatedArgs.map(toNum).filter((n): n is number => n !== null);
            return nums.length > 0 ? Math.min(...nums) : null;
          }
          case 'MAX': {
            const nums = evaluatedArgs.map(toNum).filter((n): n is number => n !== null);
            return nums.length > 0 ? Math.max(...nums) : null;
          }
          default:
            throw new Error(`Unsupported function "${fn}()"` );
        }
      }
    }
  };

  return {
    evaluate: (row: DataRow): CellValue => evalNode(ast, row),
  };
}
