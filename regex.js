var gtool = require('cfgrammar-tool');
require('./dfa');

var Grammar = gtool.types.Grammar;
var Rule = gtool.types.Rule;
var astPrinter = gtool.printers.astPrinter;
var parser = gtool.parser;

var rules = [
  Rule('U', [NT('C'), T('|'), NT('U')]),
  Rule('U', [T('^'), NT('U')]),
  Rule('U', []),
  Rule('U', [NT('C')]),
  Rule('C', [NT('P'), NT('C')]),
  Rule('C', [NT('P')]),
  Rule('P', [NT('O'), T('?')]),
  Rule('P', [NT('O')]),
  Rule('O', [NT('A'), T('+')]),
  Rule('O', [NT('A'), T('*')]),
  Rule('O', [NT('A')]),
  Rule('A', [T('('), NT('U'), T(')')]),
  Rule('A', [NT('L')]),
];

var alphabet = ['a', 'b'];
rules = rules.concat(alphabet.map(function(c){ return Rule('L', [T(c)]); }));

function ruleNamer(rule) {
  switch (rules.indexOf(rule)) {
    case 0:
      return 'Union';
    case 1:
      return 'EmptyUnion';
    case 2:
      return 'Empty';
    case 4:
      return 'Concatenation';
    case 6:
      return 'Option';
    case 7:
      return 'Star';
    case 8:
      return 'Plus';
    case 10:
      return 'Paren';
    default:
      throw 'Unreachable: ' + rules.indexOf(rule);
  }
}


function parse(regex) {
  var res = parser.parse(Grammar(rules, 'U'), regex);
  if (res.length !== 1) throw 'Couldn\'t unambiguously parse: ' + res.length;
  return astPrinter(res[0], true, true, ruleNamer);
}


function to_NFA(regex, alphabet) {
  function reduce(tree) {
    switch (tree.type) {
      case 'Union':
        return reduce(tree.children[0]).union(reduce(tree.children[1]));
      case 'EmptyUnion':
        return reduce(tree.children[0]).optional();
      case 'Empty':
        return NFA.for('', alphabet);
      case 'Concatenation':
        return reduce(tree.children[0]).concat(reduce(tree.children[1]));
      case 'Option':
        return reduce(tree.children[0]).optional();
      case 'Star':
        return reduce(tree.children[0]).star();
      case 'Plus':
        return reduce(tree.children[0]).plus();
      case 'Paren':
        return reduce(tree.children[0]);
      case 'Terminal':
        return NFA.for(tree.value, alphabet);
      default:
        throw 'Unreachable: ' + tree.type;
    }
  }
  return reduce(parse(regex));
}



var n = to_NFA('a?b?', ['a', 'b']);
console.log(require('util').inspect(
  n.minimized()
, {depth: null}));

console.log(n.accepts(''));