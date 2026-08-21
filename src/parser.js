/* =============================================================================
 * parser.js: Safe math-expression parser & compiler
 * -----------------------------------------------------------------------------
 * Parses a user string like "sin(x)*y - z^2" into an AST, then either:
 *   - compiles it to a fast JS function (x,y,z,t) -> number   [compile()]
 *   - hands the AST to the autodiff module for exact derivatives [parseAST()]
 *
 *  Precedence:  + -   <   * / %   <   unary +/-   <   ^ (right assoc)
 *  Implicit multiplication ("2x", "3sin(x)", "(x+1)(x-1)") is supported;
 *  in a juxtaposed product an exponent binds to the last letter (xy^2 = x·y²).
 *  Pseudo-variables r, r2, rho, phi, theta expand into AST subtrees, and so do
 *  norms  ||a, b, …||  (Euclidean by default, selectable via setNorm; fixed
 *  variants norm/norm1/norminf/normp).  Piecewise definitions use if(c, a, b)
 *  or cases(c1, v1, …, otherwise), compiled lazily so dead branches never run.
 *  Only tokens the parser itself produces are ever compiled, so no user text
 *  is injected into generated code.
 * ========================================================================== */
(function (VF) {
  'use strict';

  /* ---- Function library (the only callables emitted / referenced) --------- */
  var H = {
    sin: Math.sin, cos: Math.cos, tan: Math.tan,
    asin: Math.asin, acos: Math.acos, atan: Math.atan,
    sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
    exp: Math.exp, sqrt: Math.sqrt, cbrt: Math.cbrt,
    abs: Math.abs, sign: Math.sign,
    floor: Math.floor, ceil: Math.ceil, round: Math.round,
    ln: Math.log, log: Math.log, log10: Math.log10, log2: Math.log2,
    atan2: Math.atan2, hypot: Math.hypot, pow: Math.pow,
    min: Math.min, max: Math.max,
    mod: function (a, b) { return ((a % b) + b) % b; },
    clamp: function (v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); },
    step: function (edge, x) { return x < edge ? 0 : 1; },
    smoothstep: function (e0, e1, x) { var u = (x - e0) / (e1 - e0); u = u < 0 ? 0 : (u > 1 ? 1 : u); return u * u * (3 - 2 * u); },
    gauss: function (x) { return Math.exp(-x * x); },
    sinc: function (x) { return x === 0 ? 1 : Math.sin(x) / x; },
    /* logical combinators for building regions from comparisons (nonzero = true) */
    and: function (a, b) { return (a !== 0 && b !== 0) ? 1 : 0; },
    or: function (a, b) { return (a !== 0 || b !== 0) ? 1 : 0; },
    not: function (a) { return a === 0 ? 1 : 0; }
  };

  var ARITY = {
    sin: 1, cos: 1, tan: 1, asin: 1, acos: 1, atan: 1,
    sinh: 1, cosh: 1, tanh: 1, exp: 1, sqrt: 1, cbrt: 1,
    abs: 1, sign: 1, floor: 1, ceil: 1, round: 1,
    ln: 1, log: 1, log10: 1, log2: 1, gauss: 1, sinc: 1,
    atan2: 2, pow: 2, mod: 2, step: 2,
    clamp: 3, smoothstep: 3,
    hypot: -1, min: -1, max: -1,
    and: 2, or: 2, not: 1,
    'if': 3, cases: -1,
    norm: -1, norm1: -1, norminf: -1, normp: -1
  };

  var CONSTS = { pi: Math.PI, PI: Math.PI, tau: 2 * Math.PI, e: Math.E, E: Math.E };
  var VARSET = { x: 1, y: 1, z: 1, t: 1 };
  var PSEUDOSET = { r: 1, r2: 1, rho: 1, phi: 1, theta: 1 };
  /* unicode superscripts -> exponent digits, so a term like x^2 can be typed with a superscript */
  var SUPER = {
    '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
    '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9'
  };

  /* ---- AST node constructors --------------------------------------------- */
  function num(v) { return { k: 'num', v: v }; }
  function vnode(name) { return { k: 'var', name: name }; }
  function neg(a) { return { k: 'neg', a: a }; }
  function bin(op, a, b) { return { k: 'bin', op: op, a: a, b: b }; }
  function cmp(op, a, b) { return { k: 'cmp', op: op, a: a, b: b }; }
  function pown(a, b) { return { k: 'pow', a: a, b: b }; }
  function calln(name, args) { return { k: 'call', name: name, args: args }; }

  function sq(n) { return bin('*', n, n); }
  function pseudoAST(name) {
    var x = vnode('x'), y = vnode('y'), z = vnode('z');
    if (name === 'r') return calln('sqrt', [bin('+', bin('+', sq(x), sq(y)), sq(z))]);
    if (name === 'r2') return bin('+', bin('+', sq(x), sq(y)), sq(z));
    if (name === 'rho') return calln('sqrt', [bin('+', sq(x), sq(y))]);
    if (name === 'phi') return calln('atan2', [y, x]);
    /* theta = acos(z / (r + eps)) */
    return calln('acos', [bin('/', z, bin('+', calln('sqrt', [bin('+', bin('+', sq(x), sq(y)), sq(z))]), num(1e-30)))]);
  }

  /* ---- norms ---------------------------------------------------------------
   * ||a, b, …|| denotes the CURRENT norm (Euclidean unless changed via
   * setNorm); norm / norm1 / norminf / normp(p, …) are fixed choices.  All of
   * them expand at parse time into elementary AST nodes, so codegen and
   * autodiff need no new primitives (∇‖·‖ is exact wherever it exists). */
  var CUR_NORM = { kind: '2', p: 2 };
  function setNorm(kind, p) { CUR_NORM = { kind: String(kind), p: isFinite(p) ? p : 2 }; }
  function getNorm() { return { kind: CUR_NORM.kind, p: CUR_NORM.p }; }

  function sumMap(comps, f) {
    var s = f(comps[0]);
    for (var i = 1; i < comps.length; i++) s = bin('+', s, f(comps[i]));
    return s;
  }
  function absn(c) { return calln('abs', [c]); }
  function normAST(comps, kind, pAst) {
    if (kind === '1') return sumMap(comps, absn);
    if (kind === 'inf') {
      if (comps.length === 1) return absn(comps[0]);
      var args = [];
      for (var i = 0; i < comps.length; i++) args.push(absn(comps[i]));
      return calln('max', args);
    }
    if (kind === 'p') return pown(sumMap(comps, function (c) { return pown(absn(c), pAst); }), bin('/', num(1), pAst));
    return calln('sqrt', [sumMap(comps, sq)]);       /* Euclidean, p = 2 */
  }

  /* ---- Tokenizer ---------------------------------------------------------- */
  function tokenize(s) {
    var toks = [], i = 0, n = s.length;
    function isDigit(c) { return c >= '0' && c <= '9'; }
    function isAlpha(c) { return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_'; }
    function isAlnum(c) { return isAlpha(c) || isDigit(c); }
    while (i < n) {
      var c = s[i];
      if (c === ' ' || c === '\t' || c === '\n' || c === '\r') { i++; continue; }
      if (isDigit(c) || (c === '.' && isDigit(s[i + 1]))) {
        var j = i;
        while (j < n && isDigit(s[j])) j++;
        if (s[j] === '.') { j++; while (j < n && isDigit(s[j])) j++; }
        if (s[j] === 'e' || s[j] === 'E') {
          var k = j + 1;
          if (s[k] === '+' || s[k] === '-') k++;
          if (isDigit(s[k])) { j = k; while (j < n && isDigit(s[j])) j++; }
        }
        toks.push({ type: 'num', value: parseFloat(s.slice(i, j)), pos: i });
        i = j; continue;
      }
      if (isAlpha(c)) {
        var a = i + 1;
        while (a < n && isAlnum(s[a])) a++;
        toks.push({ type: 'ident', value: s.slice(i, a), pos: i });
        i = a; continue;
      }
      if (SUPER[c] != null) {                       /* superscript exponent: x² -> x^2 */
        var sd = '';
        while (i < n && SUPER[s[i]] != null) { sd += SUPER[s[i]]; i++; }
        toks.push({ type: 'op', value: '^', pos: i });
        toks.push({ type: 'num', value: parseFloat(sd), pos: i });
        continue;
      }
      if (c === '<' || c === '>') {                 /* comparisons: <  <=  >  >= */
        if (s[i + 1] === '=') { toks.push({ type: 'cmp', value: c + '=', pos: i }); i += 2; }
        else { toks.push({ type: 'cmp', value: c, pos: i }); i++; }
        continue;
      }
      if (c === '=') {
        if (s[i + 1] === '=') { toks.push({ type: 'cmp', value: '==', pos: i }); i += 2; continue; }
        throw { message: "Use '==' for equality (or <, <=, >, >=)", pos: i };
      }
      if (c === '!') {
        if (s[i + 1] === '=') { toks.push({ type: 'cmp', value: '!=', pos: i }); i += 2; continue; }
        throw { message: "Unexpected '!'. Did you mean '!=' (not equal)?", pos: i };
      }
      if ('+-*/%^'.indexOf(c) >= 0) { toks.push({ type: 'op', value: c, pos: i }); i++; continue; }
      if (c === '(') { toks.push({ type: 'lparen', pos: i }); i++; continue; }
      if (c === ')') { toks.push({ type: 'rparen', pos: i }); i++; continue; }
      if (c === ',') { toks.push({ type: 'comma', pos: i }); i++; continue; }
      if (c === '|') {                              /* |x| absolute value, ||a,b|| norm */
        if (s[i + 1] === '|') { toks.push({ type: 'dbar', pos: i }); i += 2; continue; }
        toks.push({ type: 'bar', pos: i }); i++; continue;
      }
      throw { message: "Unexpected character '" + c + "'", pos: i };
    }
    toks.push({ type: 'end', pos: n });
    return toks;
  }

  /* ---- Parser (recursive descent -> AST) ---------------------------------- */
  function parse(tokens, srcLen) {
    var pos = 0;
    function peek() { return tokens[pos]; }
    function next() { return tokens[pos++]; }
    function err(msg, tk) { throw { message: msg, pos: tk ? tk.pos : srcLen }; }
    function expect(type) { var tk = peek(); if (tk.type !== type) err('Expected ' + type, tk); return next(); }
    function startsPrimary(tk) { return tk.type === 'num' || tk.type === 'ident' || tk.type === 'lparen'; }

    function parseExpr() { return parseCmp(); }
    /* comparisons return 1 (true) / 0 (false); chained "a < b < c" means (a<b) AND (b<c) */
    function parseCmp() {
      var node = parseAdd();
      if (peek().type !== 'cmp') return node;
      var operands = [node], ops = [];
      while (peek().type === 'cmp') { ops.push(next().value); operands.push(parseAdd()); }
      var result = cmp(ops[0], operands[0], operands[1]);
      for (var i = 1; i < ops.length; i++) result = bin('*', result, cmp(ops[i], operands[i], operands[i + 1]));
      return result;
    }
    function parseAdd() {
      var node = parseMul();
      while (peek().type === 'op' && (peek().value === '+' || peek().value === '-')) node = bin(next().value, node, parseMul());
      return node;
    }
    function parseMul() {
      var node = parseUnary();
      while (true) {
        var tk = peek();
        if (tk.type === 'op' && (tk.value === '*' || tk.value === '/' || tk.value === '%')) node = bin(next().value, node, parseUnary());
        else if (startsPrimary(tk)) node = bin('*', node, parseUnary());   /* implicit multiply */
        else break;
      }
      return node;
    }
    function parseUnary() {
      var tk = peek();
      if (tk.type === 'op' && (tk.value === '-' || tk.value === '+')) {
        var op = next().value; var operand = parseUnary();
        return op === '-' ? neg(operand) : operand;
      }
      return parsePow();
    }
    function parsePow() {
      var base = parsePrimary();
      if (peek().type === 'op' && peek().value === '^') { next(); return pown(base, parseUnary()); }
      return base;
    }
    function parsePrimary() {
      var tk = peek();
      if (tk.type === 'num') { next(); return num(tk.value); }
      if (tk.type === 'lparen') { next(); var e = parseExpr(); expect('rparen'); return e; }
      if (tk.type === 'bar') {                    /* |expr| absolute value */
        next(); var eb = parseExpr();
        if (peek().type !== 'bar') err('Expected closing "|"', peek());
        next(); return calln('abs', [eb]);
      }
      if (tk.type === 'dbar') {                   /* ||a, b, …||: the current norm */
        next(); var comps = [parseExpr()];
        while (peek().type === 'comma') { next(); comps.push(parseExpr()); }
        if (peek().type !== 'dbar') err('Expected closing "||"', peek());
        next(); return normAST(comps, CUR_NORM.kind, num(CUR_NORM.p));
      }
      if (tk.type === 'ident') {
        var name = tk.value; next();
        if (peek().type === 'lparen') {
          if (!Object.prototype.hasOwnProperty.call(ARITY, name)) err("Unknown function '" + name + "'", tk);
          next();
          var args = [];
          if (peek().type !== 'rparen') { args.push(parseExpr()); while (peek().type === 'comma') { next(); args.push(parseExpr()); } }
          expect('rparen');
          var ar = ARITY[name];
          if (ar >= 0 && args.length !== ar) err("'" + name + "' expects " + ar + ' argument(s), got ' + args.length, tk);
          if (ar < 0 && args.length < 1) err("'" + name + "' expects at least 1 argument", tk);
          /* fixed-norm macros expand right here (never reach codegen) */
          if (name === 'norm') return normAST(args, '2');
          if (name === 'norm1') return normAST(args, '1');
          if (name === 'norminf') return normAST(args, 'inf');
          if (name === 'normp') {
            if (args.length < 2) err("'normp' expects p and at least one component: normp(p, a, …)", tk);
            return normAST(args.slice(1), 'p', args[0]);
          }
          if (name === 'cases' && (args.length < 3 || args.length % 2 === 0))
            err("'cases' expects cond1, value1, …, otherwise (an odd number of arguments ≥ 3)", tk);
          return calln(name, args);
        }
        if (VARSET[name]) return vnode(name);
        if (name === 'u') return vnode('x');      /* surface parameters: u = x-slot, v = y-slot */
        if (name === 'v') return vnode('y');
        if (PSEUDOSET[name]) return pseudoAST(name);
        if (Object.prototype.hasOwnProperty.call(CONSTS, name)) return num(CONSTS[name]);
        if (/^[xyzt]+$/.test(name)) {             /* juxtaposed coords: xyz -> x*y*z */
          /* an exponent binds to the LAST letter only (math convention):
             xy^2 = x·y², not (x·y)²; consumed here so parsePow won't see it */
          var lastF = vnode(name.charAt(name.length - 1));
          if (peek().type === 'op' && peek().value === '^') { next(); lastF = pown(lastF, parseUnary()); }
          var pn = name.length === 1 ? lastF : vnode(name.charAt(0));
          for (var ci = 1; ci < name.length; ci++) pn = bin('*', pn, ci === name.length - 1 ? lastF : vnode(name.charAt(ci)));
          return pn;
        }
        err("Unknown name '" + name + "' (variables are x, y, z, t, r, rho, phi, theta)", tk);
      }
      err('Unexpected token', tk);
    }

    var ast = parseExpr();
    if (peek().type !== 'end') err('Unexpected trailing input', peek());
    return ast;
  }

  /* ---- Code generation (AST -> JS source) --------------------------------- */
  function numLit(v) {
    if (!isFinite(v)) return v > 0 ? 'Infinity' : (v < 0 ? '(-Infinity)' : 'NaN');
    return String(v);
  }
  function astToCode(n) {
    switch (n.k) {
      case 'num': return '(' + numLit(n.v) + ')';
      case 'var': return n.name;
      case 'neg': return '(-' + astToCode(n.a) + ')';
      case 'bin': return '(' + astToCode(n.a) + n.op + astToCode(n.b) + ')';
      case 'cmp': {
        var jsop = n.op === '==' ? '===' : (n.op === '!=' ? '!==' : n.op);
        return '(' + astToCode(n.a) + jsop + astToCode(n.b) + '?1:0)';
      }
      case 'pow': return 'H.pow(' + astToCode(n.a) + ',' + astToCode(n.b) + ')';
      case 'call': {
        if (n.name === 'if' || n.name === 'cases') {
          /* lazy ternary chain: only the live branch is ever evaluated, so
             e.g. if(||x,y|| != 0, x*y/||x,y||, 0) is 0 (not NaN) at the origin */
          var la = n.args, code = astToCode(la[la.length - 1]);
          for (var ci = la.length - 3; ci >= 0; ci -= 2)
            code = '(' + astToCode(la[ci]) + '!==0?' + astToCode(la[ci + 1]) + ':' + code + ')';
          return code;
        }
        var parts = [];
        for (var i = 0; i < n.args.length; i++) parts.push(astToCode(n.args[i]));
        return 'H.' + n.name + '(' + parts.join(',') + ')';
      }
    }
    throw { message: 'bad AST node', pos: 0 };
  }

  /* ---- Public API --------------------------------------------------------- */
  function parseAST(expr) {
    var src = (expr == null ? '' : String(expr)).trim();
    if (src === '') return { ast: num(0), expr: '' };
    return { ast: parse(tokenize(src), src.length), expr: src };
  }

  function compile(expr) {
    var p = parseAST(expr);
    var code = astToCode(p.ast);
    var raw;
    try { raw = new Function('x', 'y', 'z', 't', 'H', 'return (' + code + ');'); }
    catch (e) { throw { message: 'Internal compile error: ' + e.message, pos: 0 }; }
    var fn = function (x, y, z, t) { return raw(x, y, z, t, H); };
    return { fn: fn, source: code, expr: p.expr, ast: p.ast };
  }

  function validate(expr) {
    try { compile(expr); return { ok: true }; }
    catch (e) { return { ok: false, message: e.message, pos: (e.pos == null ? -1 : e.pos) }; }
  }

  /* compile an already-built AST (used for constraint sub-expressions like a−b) */
  function compileAST(ast) {
    var code = astToCode(ast), raw;
    try { raw = new Function('x', 'y', 'z', 't', 'H', 'return (' + code + ');'); }
    catch (e) { throw { message: 'Internal compile error: ' + e.message, pos: 0 }; }
    return { fn: function (x, y, z, t) { return raw(x, y, z, t, H); }, ast: ast };
  }

  /* ---- constraints (Nebenbedingungen) ---------------------------------------
     A constraint row is a full relation: "x^2+y^2 <= 4", "2 < x^2+y^2 < 9",
     "x^2+y^2 = 4" (single = is accepted here and means equality).  Returns
       kind        'eq' (curve only) | 'ineq' (region mask)
       fn          the 1/0 mask (null for 'eq')
       boundaries  [{fn, ast}] of signed functions g with boundary {g = 0}
       generic     true when the row is a boolean combination (and/or …) whose
                   boundary has no single smooth g: trace it by bisection. */
  function hasCmpNode(n) {
    if (!n || typeof n !== 'object') return false;
    if (n.k === 'cmp') return true;
    if (n.k === 'neg') return hasCmpNode(n.a);
    if (n.k === 'bin' || n.k === 'pow') return hasCmpNode(n.a) || hasCmpNode(n.b);
    if (n.k === 'call') { for (var i = 0; i < n.args.length; i++) if (hasCmpNode(n.args[i])) return true; }
    return false;
  }
  function collectCmpProduct(n, out) {   /* cmp, or product of cmps (chained a<g<b) */
    if (n.k === 'cmp') { out.push(n); return true; }
    if (n.k === 'bin' && n.op === '*') return collectCmpProduct(n.a, out) && collectCmpProduct(n.b, out);
    return false;
  }
  function parseConstraint(src) {
    var s = (src == null ? '' : String(src)).trim();
    if (s === '') return { ok: false, message: 'empty constraint' };
    var t = s.replace(/([^<>=!])=([^=])/g, '$1==$2');   /* single = means equality here */
    var p;
    try { p = parseAST(t); } catch (e) { return { ok: false, message: e.message }; }
    var ast = p.ast, cmps = [], pure = collectCmpProduct(ast, cmps);
    function gPart(c) { return compileAST(bin('-', c.a, c.b)); }
    if (pure && cmps.length === 1 && cmps[0].op === '==')
      return { ok: true, kind: 'eq', fn: null, boundaries: [gPart(cmps[0])], generic: false };
    var fn = compileAST(ast).fn, bs = [], i;
    if (pure) { for (i = 0; i < cmps.length; i++) if (cmps[i].op !== '==') bs.push(gPart(cmps[i])); }
    else if (!hasCmpNode(ast)) bs.push(compileAST(ast));   /* plain expr: mask ≠ 0, boundary expr = 0 */
    return { ok: true, kind: 'ineq', fn: fn, boundaries: bs, generic: !pure && hasCmpNode(ast) };
  }

  VF.Parser = { compile: compile, validate: validate, parseAST: parseAST, setNorm: setNorm, getNorm: getNorm, parseConstraint: parseConstraint };

})(window.VF = window.VF || {});
