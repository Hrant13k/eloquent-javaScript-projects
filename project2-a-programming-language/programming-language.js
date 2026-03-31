function parseExpression(program) {
  program = skipSpace(program);
  let match, expr;

  if (match = /^"([^"]*)"/.exec(program)) {
    expr = { type: "value", value: match[1] };
  } else if (match = /^\d+\b/.exec(program)) {
    expr = { type: "value", value: Number(match[0]) };
  } else if (match = /^[^\s(),#"]+/.exec(program)) {
    expr = { type: "word", name: match[0] };
  } else {
    throw new SyntaxError("Unexpected syntax: " + program);
  }

  return parseApply(expr, program.slice(match[0].length));
}

function skipSpace(string) {
  let first = string.search(/\S/);
  if (first == -1) return "";
  return string.slice(first);
}

function parseApply(expr, program) {
  program = skipSpace(program);

  if (program[0] != "(") {
    return { expr: expr, rest: program };
  }

  program = skipSpace(program.slice(1));
  expr = { type: "apply", operator: expr, args: [] };

  while (program[0] != ")") {
    let arg = parseExpression(program);
    expr.args.push(arg.expr);
    program = skipSpace(arg.rest);
    if (program[0] == ",") {
      program = skipSpace(program.slice(1));
    } else if (program[0] != ")") {
      throw new SyntaxError("Expected ',' or ')'");
    }
  }

  return parseApply(expr, program.slice(1));
}

function parse(program) {
  let { expr, rest } = parseExpression(program);
  if (skipSpace(rest).length > 0) {
    throw new SyntaxError("Unexpected text after program");
  }
  return expr;
}

function evaluate(expr, scope) {
  if (expr.type == "value") {
    return expr.value;

  } else if (expr.type == "word") {
    if (expr.name in scope) {
      return scope[expr.name];
    } else {
      throw new ReferenceError(`Undefined binding: ${expr.name}`);
    }

  } else if (expr.type == "apply") {
    let { operator, args } = expr;
    if (operator.type == "word" && operator.name in specialForms) {
      return specialForms[operator.name](expr.args, scope);
    } else {
      let op = evaluate(operator, scope);
      if (typeof op != "function") {
        throw new TypeError("Applying a non-function");
      }
      return op(...args.map(arg => evaluate(arg, scope)));
    }
  }
}

const specialForms = Object.create(null);

specialForms["if"] = (args, scope) => {
  if (args.length != 3) throw new SyntaxError("Wrong number of args to if");
  if (evaluate(args[0], scope) !== false) {
    return evaluate(args[1], scope);
  } else {
    return evaluate(args[2], scope);
  }
};

specialForms["while"] = (args, scope) => {
  if (args.length != 2) throw new SyntaxError("Wrong number of args to while");
  while (evaluate(args[0], scope) !== false) {
    evaluate(args[1], scope);
  }
  return false;
};

specialForms["do"] = (args, scope) => {
  let value = false;
  for (let arg of args) {
    value = evaluate(arg, scope);
  }
  return value;
};

specialForms["define"] = (args, scope) => {
  if (args.length != 2 || args[0].type != "word") {
    throw new SyntaxError("Wrong use of define");
  }
  let value = evaluate(args[1], scope);
  scope[args[0].name] = value;
  return value;
};

specialForms["fun"] = (args, scope) => {
  if (!args.length) throw new SyntaxError("fun needs a body");
  let body = args[args.length - 1];
  let params = args.slice(0, args.length - 1).map(expr => {
    if (expr.type != "word") throw new SyntaxError("Parameter names must be words");
    return expr.name;
  });
  return function() {
    if (arguments.length != params.length) {
      throw new TypeError("Wrong number of arguments");
    }
    let localScope = Object.create(scope);
    for (let i = 0; i < params.length; i++) {
      localScope[params[i]] = arguments[i];
    }
    return evaluate(body, localScope);
  };
};

const topScope = Object.create(null);

topScope["true"] = true;
topScope["false"] = false;

for (let op of ["+", "-", "*", "/", "==", "<", ">"]) {
  topScope[op] = Function("a, b", `return a ${op} b;`);
}

topScope["print"] = value => {
  console.log(value);
  return value;
};

function run(program) {
  return evaluate(parse(program), Object.create(topScope));
}

// Test 1
run(`
  do(define(x, 10),
     define(y, 20),
     print(+(x, y)))
`); // 30

// Test 2
run(`
  do(define(i, 0),
     while(<(i, 5),
       do(define(i, +(i, 1)),
          print(i))))
`); // 1 2 3 4 5

// Test 3
run(`
  do(define(square, fun(x, *(x, x))),
     print(square(5)))
`); // 25

topScope["array"] = (...args) => args;
topScope["length"] = (arr) => arr.length;
topScope["element"] = (arr, i) => arr[i];

run(`
  do(define(arr, array(1, 2, 3)),
     print(length(arr)),
     print(element(arr, 0)))
`); // 3 1

run(`
  do(define(makeAdder, fun(x, fun(y, +(x, y)))),
     define(addFive, makeAdder(5)),
     print(addFive(3)))
`); // 8

// Ignore everything after a # in a line
function skipSpace(string) {
  let skippable = string.match(/^(\s|#.*)*/);
  return string.slice(skippable[0].length);
}

run(`
  # this is a comment
  do(define(x, 5), # set x
     print(x))     # print
`); // 5