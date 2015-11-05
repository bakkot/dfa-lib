var gtool = require('cfgrammar-tool');
require('./dfa');

var astPrinter = gtool.printers.astPrinter;
var parser = gtool.parser;

var rules = [
  Rule('U', [NT('C'), T('|'), NT('U')]), // union
  Rule('U', [T('^'), NT('U')]),
  Rule('U', []),
  Rule('U', [NT('C')]),
  Rule('C', [NT('O'), NT('C')]), // concatenation
  Rule('C', [NT('O')]),
  Rule('O', [NT('R'), T('?')]), // option
  Rule('O', [NT('R')]),
  Rule('R', [NT('A'), T('*')]), // repetition
  Rule('R', [NT('A'), T('+')]),
  Rule('R', [NT('A')]),
  Rule('A', [T('('), NT('U'), T(')')]), // atom
  Rule('A', [NT('L')]),
];

function ruleNamer(rule) { // strictly speaking, this could be folded in to to_NFA, but it's nice to make a readable AST.
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
    case 8:
      return 'Star';
    case 9:
      return 'Plus';
    case 11:
      return 'Paren';
    default:
      throw 'Unreachable: ' + rules.indexOf(rule);
  }
}


function parse(regex, alphabet) {
  var grammar = Grammar(rules.concat(alphabet.map(function(c){ return Rule('L', [T(c)]); })), 'U');
  var res = parser.parse(grammar, regex);
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
  return reduce(parse(regex, alphabet));
}

// TODO: to_regex, just on principle

var n = to_NFA('(ababab)*', ['a', 'b']);
console.log(require('util').inspect(
  n.minimized()
, {depth: null}));

console.log(n.accepts(''));