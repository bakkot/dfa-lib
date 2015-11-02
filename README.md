DFA-lib
==============

A JavaScript library for working with [DFAs](https://en.wikipedia.org/wiki/Deterministic_finite_automaton) and [NFAs](https://en.wikipedia.org/wiki/Nondeterministic_finite_automaton). Used in 2015 for tools for an introductory computer science class (CS103) at Stanford.


Features
--------

* Parsing. 

* Various manipulations: converting NFAs to DFAs, finding minimal DFAs, taking intersections, Kleene stars, etc.

* Equivalence counterexamples: given two automata, find strings accepted by one and not the other, if they are not equivalent.


Example
-------

```javascript
var oddb = new DFA( // ends in an odd number of b's
  ['a', 'b'], // alphabet
  { // transition table
    0: {'a': '0', 'b': '1'},
    1: {'a': '0', 'b': '0'},
  },
  '0', // start state
  ['1'] // accepting states
);

var evena = new DFA( // contains a positive even number of a's
  ['a', 'b'],
  {
    0: {'a': '1', 'b': '0'},
    1: {'a': '2', 'b': '1'},
    2: {'a': '3', 'b': '2'},
    3: {'a': '2', 'b': '3'},
  },
  '0',
  ['2']
);

console.log(oddb.intersect(evena).find_passing()); // 'aab'


var zoz = new NFA( // strings containing '010' as a substring.
  ['0', '1'], // alphabet
  { // transition table. Note that transitions are to sets of states, and that transitions can be absent (equivalent to mapping to the empty set).
    0: {0: ['0', '1'], 1: ['0']},
    1: {'': ['0'], 1: ['2']}, // Note also that states can transition on the empty string (i.e., an epsilon transition), though it's entirely redundant in this particular automaton.
    2: {0: ['3']},
    3: {0: ['3'], 1: ['3']},
  },
  ['0'], // set of initial states
  ['3'] // set of accepting states
);

console.log(JSON.stringify(JSON.parse(zoz.minimized().serialized()), null, '  ')); // prints a human-readable serialization of the minimal equivalent DFA.
```

License
-------

Licensed under the [MIT license](http://opensource.org/licenses/MIT). If you're making public or commercial use of this library, I encourage (but do not require) you to tell me about it!
