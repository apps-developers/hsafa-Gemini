import type { ComputeExecution } from '../types';

type Token =
  | { type: 'number'; value: number }
  | { type: 'string'; value: string }
  | { type: 'identifier'; value: string }
  | { type: 'op'; value: string }
  | { type: 'paren'; value: '(' | ')' }
  | { type: 'comma' }
  | { type: 'question' }
  | { type: 'colon' }
  | { type: 'eof' };

function tokenStringValue(token: Token): string | undefined {
  switch (token.type) {
    case 'number':
      return String(token.value);
    case 'string':
      return token.value;
    case 'identifier':
      return token.value;
    case 'op':
      return token.value;
    case 'paren':
      return token.value;
    default:
      return undefined;
  }
}

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  const isWs = (c: string) => /\s/.test(c);
  const isDigit = (c: string) => /[0-9]/.test(c);
  const isIdentStart = (c: string) => /[A-Za-z_]/.test(c);
  const isIdent = (c: string) => /[A-Za-z0-9_]/.test(c);

  while (i < expr.length) {
    const c = expr[i]!;
    if (isWs(c)) {
      i++;
      continue;
    }

    if (c === '(' || c === ')') {
      tokens.push({ type: 'paren', value: c });
      i++;
      continue;
    }

    if (c === ',') {
      tokens.push({ type: 'comma' });
      i++;
      continue;
    }

    if (c === '?') {
      tokens.push({ type: 'question' });
      i++;
      continue;
    }

    if (c === ':') {
      tokens.push({ type: 'colon' });
      i++;
      continue;
    }

    if (c === '"' || c === "'") {
      const quote = c;
      i++;
      let out = '';
      while (i < expr.length) {
        const ch = expr[i]!;
        if (ch === '\\') {
          const next = expr[i + 1];
          if (next == null) break;
          out += next;
          i += 2;
          continue;
        }
        if (ch === quote) {
          i++;
          break;
        }
        out += ch;
        i++;
      }
      tokens.push({ type: 'string', value: out });
      continue;
    }

    const two = expr.slice(i, i + 2);
    if (['&&', '||', '==', '!=', '>=', '<='].includes(two)) {
      tokens.push({ type: 'op', value: two });
      i += 2;
      continue;
    }

    if (['+', '-', '*', '/', '%', '>', '<', '!'].includes(c)) {
      tokens.push({ type: 'op', value: c });
      i++;
      continue;
    }

    if (isDigit(c) || (c === '.' && isDigit(expr[i + 1] ?? ''))) {
      let j = i;
      while (j < expr.length && (isDigit(expr[j]!) || expr[j] === '.')) j++;
      const raw = expr.slice(i, j);
      const num = Number(raw);
      if (!Number.isFinite(num)) throw new Error(`Invalid number literal: ${raw}`);
      tokens.push({ type: 'number', value: num });
      i = j;
      continue;
    }

    if (isIdentStart(c)) {
      let j = i;
      while (j < expr.length && isIdent(expr[j]!)) j++;
      tokens.push({ type: 'identifier', value: expr.slice(i, j) });
      i = j;
      continue;
    }

    throw new Error(`Unexpected character in expression: ${c}`);
  }

  tokens.push({ type: 'eof' });
  return tokens;
}

class Parser {
  private idx = 0;
  constructor(private readonly tokens: Token[], private readonly ctx: Record<string, unknown>) {}

  private peek(): Token {
    return this.tokens[this.idx] ?? { type: 'eof' };
  }

  private consume(): Token {
    const t = this.peek();
    this.idx++;
    return t;
  }

  private expect(type: Token['type'], value?: string): Token {
    const t = this.consume();
    if (t.type !== type) throw new Error(`Expected ${type} but got ${t.type}`);
    if (value != null && tokenStringValue(t) !== value) throw new Error(`Expected ${value}`);
    return t;
  }

  parseExpression(): unknown {
    return this.parseTernary();
  }

  private parseTernary(): unknown {
    const cond = this.parseOr();
    if (this.peek().type === 'question') {
      this.consume();
      const tExpr = this.parseExpression();
      this.expect('colon');
      const fExpr = this.parseExpression();
      return this.toBoolean(cond) ? tExpr : fExpr;
    }
    return cond;
  }

  private parseOr(): unknown {
    let left = this.parseAnd();
    while (true) {
      const t = this.peek();
      if (t.type !== 'op' || t.value !== '||') break;
      this.consume();
      const right = this.parseAnd();
      left = this.toBoolean(left) || this.toBoolean(right);
    }
    return left;
  }

  private parseAnd(): unknown {
    let left = this.parseEquality();
    while (true) {
      const t = this.peek();
      if (t.type !== 'op' || t.value !== '&&') break;
      this.consume();
      const right = this.parseEquality();
      left = this.toBoolean(left) && this.toBoolean(right);
    }
    return left;
  }

  private parseEquality(): unknown {
    let left = this.parseRelational();
    while (true) {
      const t = this.peek();
      if (t.type !== 'op' || !['==', '!='].includes(t.value)) break;
      const op = this.consume().type === 'op' ? (t.value as string) : '';
      const right = this.parseRelational();
      left = op === '==' ? left === right : left !== right;
    }
    return left;
  }

  private parseRelational(): unknown {
    let left = this.parseAdditive();
    while (true) {
      const t = this.peek();
      if (t.type !== 'op' || !['>=', '<=', '>', '<'].includes(t.value)) break;
      const op = this.consume().type === 'op' ? (t.value as string) : '';
      const right = this.parseAdditive();
      const l = this.toNumber(left);
      const r = this.toNumber(right);
      switch (op) {
        case '>':
          left = l > r;
          break;
        case '<':
          left = l < r;
          break;
        case '>=':
          left = l >= r;
          break;
        case '<=':
          left = l <= r;
          break;
      }
    }
    return left;
  }

  private parseAdditive(): unknown {
    let left = this.parseMultiplicative();
    while (true) {
      const t = this.peek();
      if (t.type !== 'op' || !['+', '-'].includes(t.value)) break;
      const op = this.consume().type === 'op' ? (t.value as string) : '';
      const right = this.parseMultiplicative();
      if (op === '+') {
        if (typeof left === 'string' || typeof right === 'string') {
          left = String(left) + String(right);
        } else {
          left = this.toNumber(left) + this.toNumber(right);
        }
      } else {
        left = this.toNumber(left) - this.toNumber(right);
      }
    }
    return left;
  }

  private parseMultiplicative(): unknown {
    let left = this.parseUnary();
    while (true) {
      const t = this.peek();
      if (t.type !== 'op' || !['*', '/', '%'].includes(t.value)) break;
      const op = this.consume().type === 'op' ? (t.value as string) : '';
      const right = this.parseUnary();
      const l = this.toNumber(left);
      const r = this.toNumber(right);
      switch (op) {
        case '*':
          left = l * r;
          break;
        case '/':
          left = l / r;
          break;
        case '%':
          left = l % r;
          break;
      }
    }
    return left;
  }

  private parseUnary(): unknown {
    const t = this.peek();
    if (t.type === 'op' && ['!', '-'].includes(t.value)) {
      const op = this.consume().type === 'op' ? t.value : '';
      const v = this.parseUnary();
      return op === '!' ? !this.toBoolean(v) : -this.toNumber(v);
    }
    return this.parsePrimary();
  }

  private parsePrimary(): unknown {
    const t = this.peek();

    if (t.type === 'number') {
      this.consume();
      return t.value;
    }

    if (t.type === 'string') {
      this.consume();
      return t.value;
    }

    if (t.type === 'identifier') {
      const name = t.value;
      this.consume();

      const next = this.peek();
      if (next.type === 'paren' && next.value === '(') {
        this.consume();
        const args: unknown[] = [];
        const close = this.peek();
        if (!(close.type === 'paren' && close.value === ')')) {
          while (true) {
            args.push(this.parseExpression());
            if (this.peek().type === 'comma') {
              this.consume();
              continue;
            }
            break;
          }
        }
        this.expect('paren', ')');
        return this.callFunction(name, args);
      }

      return this.ctx[name];
    }

    if (t.type === 'paren' && t.value === '(') {
      this.consume();
      const v = this.parseExpression();
      this.expect('paren', ')');
      return v;
    }

    throw new Error(`Unexpected token: ${t.type}`);
  }

  private callFunction(name: string, args: unknown[]): unknown {
    switch (name) {
      case 'round': {
        const n = this.toNumber(args[0]);
        const digits = args.length > 1 ? this.toNumber(args[1]) : 0;
        const factor = Math.pow(10, digits);
        return Math.round(n * factor) / factor;
      }
      case 'min':
        return Math.min(...args.map((a) => this.toNumber(a)));
      case 'max':
        return Math.max(...args.map((a) => this.toNumber(a)));
      case 'sum':
        return args.reduce<number>((acc, a) => acc + this.toNumber(a), 0);
      case 'avg': {
        if (args.length === 0) return 0;
        return args.reduce<number>((acc, a) => acc + this.toNumber(a), 0) / args.length;
      }
      default:
        throw new Error(`Unsupported function: ${name}`);
    }
  }

  private toNumber(v: unknown): number {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
    return Number(v);
  }

  private toBoolean(v: unknown): boolean {
    return Boolean(v);
  }
}

function buildContext(input: unknown): Record<string, unknown> {
  const obj = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};

  const data = obj.data && typeof obj.data === 'object' && !Array.isArray(obj.data) ? (obj.data as Record<string, unknown>) : {};
  const params =
    obj.parameters && typeof obj.parameters === 'object' && !Array.isArray(obj.parameters)
      ? (obj.parameters as Record<string, unknown>)
      : {};

  return { ...data, ...params };
}

export async function executeCompute(execution: ComputeExecution, input: unknown): Promise<unknown> {
  const started = Date.now();
  const ctx = buildContext(input);

  const tokens = tokenize(execution.expression);
  const parser = new Parser(tokens, ctx);
  const result = parser.parseExpression();

  return {
    success: true,
    result,
    operation: execution.operation,
    metadata: { executionTime: Date.now() - started },
  };
}
