var gtool = require('cfgrammar-tool');
var lib = require('dfa-lib');
var NFA = lib.NFA;

var astPrinter = gtool.printers.astPrinter;
var parser = gtool.parser;

var rules = [
  Rule('U', [NT('C'), T('|'), NT('U')]), // union
  Rule('U', [T('|'), NT('U')]),
  Rule('U', []),
  Rule('U', [NT('C')]),
  Rule('C', [NT('O'), NT('C')]), // concatenation
  Rule('C', [NT('O')]),
  Rule('O', [NT('R'), T('?')]), // option
  Rule('O', [NT('R')]),
  Rule('R', [NT('A'), T('*')]), // repetition
  Rule('R', [NT('A'), T('+')]),
  Rule('R', [NT('A'), T('^'), NT('I')]),
  Rule('R', [NT('A')]),
  Rule('A', [T('('), NT('U'), T(')')]), // atom
  Rule('A', [NT('L')]),
  Rule('I', [NT('D')]), // int
  Rule('I', [NT('I'), NT('D')]),
  Rule('D', [T('0')]),
  Rule('D', [T('1')]),
  Rule('D', [T('2')]),
  Rule('D', [T('3')]),
  Rule('D', [T('4')]),
  Rule('D', [T('5')]),
  Rule('D', [T('6')]),
  Rule('D', [T('7')]),
  Rule('D', [T('8')]),
  Rule('D', [T('9')]),
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
    case 10:
      return 'Repetition';
    case 12:
      return 'Paren';
    case 15:
      return 'Digits';
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

function guessAlphabet(regex) {
  return regex.replace(/[\|\*\+\^\?\(\)0-9]/g, '').split('').filter(function(c,i,s){return s.indexOf(c)===i;}).sort();
}

function to_NFA(regex, alphabet) {
  if (typeof alphabet === 'undefined') {
    alphabet = guessAlphabet(regex);
  } else if (typeof alphabet === 'string') {
    alphabet = alphabet.split('');
  }
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
      case 'Repetition':
        return reduce(tree.children[0]).repeat(parseInt(reduceDigits(tree.children[1])));
      case 'Paren':
        return reduce(tree.children[0]);
      case 'Terminal':
        return NFA.for(tree.value, alphabet);
      default:
        throw 'Unreachable: ' + tree.type;
    }
  }

  function reduceDigits(tree) { // Note: string concatenation
    if (tree.type === 'Digits') {
      return reduceDigits(tree.children[0]) + reduceDigits(tree.children[1]);
    } else { // Terminal
      return tree.value;
    }
  }

  return reduce(parse(regex, alphabet));
}


// TODO: to_regex, just on principle

module.exports = to_NFA;
module.exports.parse = parse;
