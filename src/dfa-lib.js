"use strict";


// TODO consider rolling an in-house Set type; this is getting absurd.

function DFA(alphabet, delta, initial, final) {
  /*  alphabet is a list of characters.
      delta an object such that delta[state][sym] = state, for each (state, sym) pair.
        Its own properties are the states of the automaton.
      initial the name of the start state
      final a list of accepting states */
  // TODO automatically sanitize names?
  this.alphabet = alphabet.slice(0)//.sort();
  this.states = Object.getOwnPropertyNames(delta).sort();
  this.delta = delta;
  this.initial = initial;
  this.final = final.slice(0)//.sort();
  this.isMinimized = false; // internal property: was this produced by minimization?
  
  // todo sanity checking (cf python)
}

DFA.prototype.accepts = function(str) {
  /* boolean: does my language contain the given string? */
  // todo sanity checking (str in alphabet*)
  var state = this.initial;
  for (var i = 0; i < str.length; ++i) {
    state = this.delta[state][str[i]];
  }
  return this.final.indexOf(state) !== -1;
}

DFA.prototype.test = function(str) { // alias for accepts, to match JS regex
  return this.accepts(str);
}

DFA.prototype.to_NFA = function() {
  /*  return the NFA which is this DFA. */
  var newDelta = {};
  for (var i = 0; i < this.states.length; ++i) {
    var state = this.states[i];
    newDelta[state] = {};
    for (var j = 0; j < this.alphabet.length; ++j) {
      newDelta[state][this.alphabet[j]] = [this.delta[state][this.alphabet[j]]];
    }
  }
  return new NFA(this.alphabet, newDelta, [this.initial], this.final);
}

DFA.prototype.minimized = function() {
  /*  non-destructively return the minimal DFA equivalent to this one.
      state names will become meaningless.
      Brzozowski's algorithm = best algorithm */
  var out = this.to_NFA().reversed().to_DFA().to_NFA().reversed().to_DFA();
  out.isMinimized = true;
  return out;
}

DFA.prototype.without_unreachables = function() { // todo naming conventions
  /*  non-destructively produce equivalent DFA without unreachable states */
  var reached = {};
  crawl(this.alphabet, this.initial, this.delta, {state_fn: function(s){reached[s]=true;}});
  
  var newDelta = {};
  var newStates = Object.getOwnPropertyNames(reached);
  for (var i = 0; i < newStates.length; ++i) {
    newDelta[newStates[i]] = this.delta[newStates[i]];
  }
  var newFinal = this.final.filter(reached.hasOwnProperty.bind(reached));
  return new DFA(this.alphabet, newDelta, this.initial, newFinal);
}

DFA.prototype.complemented = function() {
  /*  non-destructively produce DFA accepting exactly the strings this does not */
  var final = this.final;
  return new DFA(this.alphabet, this.delta, this.initial, this.states.filter(function(s){return final.indexOf(s) === -1;}));
}

DFA.prototype.find_passing = function() {
  /*  Returns one of the shortest strings which will be accepted by the DFA, if such exists.
      Otherwise returns null. */
  return crawl(this.alphabet, this.initial, this.delta, {should_exit: function(s){return this.final.indexOf(s) !== -1;}.bind(this)});
}

DFA.prototype.intersect = function(other) {
  /*  Return a DFA for the language which is the intersection of this machine's and other's.
      `other` must be over the same alphabet. */
  // todo sanity checking (alphabets)
  function get_name(pair) {
    return this.states.indexOf(pair[0]) + ' ' + other.states.indexOf(pair[1]);
  }
  get_name = get_name.bind(this);

  var initial = [this.initial, other.initial];
  var newFinal = [];
  var newDelta = {};

  var thiz = this;
  function follow(state, sym) {
    var next = [thiz.delta[state[0]][sym], other.delta[state[1]][sym]];
    newDelta[get_name(state)][sym] = get_name(next);
    return next;
  }

  function state_fn(state) {
    var curName = get_name(state);
    newDelta[curName] = {};
    if (thiz.final.indexOf(state[0]) !== -1 && other.final.indexOf(state[1]) !== -1) {
      newFinal.push(curName);
    }
  }

  crawl(this.alphabet, initial, follow, {get_name: get_name, state_fn: state_fn});

  return new DFA(this.alphabet, newDelta, get_name(initial), newFinal);
}

DFA.prototype.find_equivalence_counterexamples = function(other) {
  /*  Return a pair of strings such that the first string is accepted by the first machine,
      but not the second, and the second string is accepted by the second, but not the first.
      If no such string exists in either case, the corresponding value will be null.
      Hence, if machines are equivalent, returns [null, null]. TODO can also check equivalence by comparing serializations
      `other` must be over the same alphabet. */
  return [
    this.intersect(other.complemented()).find_passing(),
    other.intersect(this.complemented()).find_passing()
  ];
}

DFA.prototype.dottified = function() {
  /*  Return a string representation of this DFA as a graph in Dot format. */
  var out = 'digraph foo {\n  rankdir=LR;\n  "__start" [style=invis label="" shape=plain];\n  node [shape=circle];';
  var thiz = this;
  this.states.filter(function(s){return thiz.final.indexOf(s) == -1;}).forEach(function(state){
    out += ' "' + reprEscape(state) + '";';
  });
  out += '\n  node [shape = doublecircle];';
  this.final.forEach(function(state){
    out += ' "' + reprEscape(state) + '";';
  });
  out += '\n  "__start" -> "' + reprEscape(this.initial) + '";';
  this.states.forEach(function(state){
    var edges = {};
    thiz.states.forEach(function(s){
      edges[s] = [];
    });
    thiz.alphabet.forEach(function(c){
      edges[thiz.delta[state][c]].push(c);
    });
    thiz.states.forEach(function(target){
      if (edges[target].length === 0) {
        return;
      }
      out += '\n  "' + reprEscape(state) +
              '" -> "' + reprEscape(target) +
              '" [label="' + edges[target].map(reprEscape).join(',') + '"];'
    });
  });
  out += '\n}\n';
  return out;
}

DFA.prototype.serialized = function() {
  /*  Give a string representing a JSON serialization of this DFA, discarding state names and unreachable states.
      Deterministic in the following strong sense: if two DFAs are identical up to state
      names, then they will serialize to the same string. */

  // canonically order states
  var newStates = [];
  crawl(this.alphabet, this.initial, this.delta, {state_fn: function(s){newStates.push(s);}});

  // then serialize using said order
  function get_name(state) {
    /*  Helper: state -> canonical name */
    return newStates.indexOf(state);
  }
  var alphabet = this.alphabet.slice(0).sort();
  var deltaStr = '{';
  for (var i = 0; i < newStates.length; ++i) {
    if (i !== 0) {
      deltaStr += ', ';
    }
    deltaStr += '"' + i + '": {';
    for (var j = 0; j < alphabet.length; ++j) {
      var sym = alphabet[j];
      if (j !== 0) {
        deltaStr += ', ';
      }
      deltaStr += '"' + reprEscape(sym) + '": "' + get_name(this.delta[newStates[i]][sym]) + '"';
    }
    deltaStr += '}';
  }
  deltaStr += '}';
  
  var out = '{';
  out += '"alphabet": [' + alphabet.map(reprEscape).map(function(c){return '"' + c + '"';}).join(',') + '], ';
  out += '"delta": ' + deltaStr + ', ';
  out += '"initial": "' + get_name(this.initial) + '", ';
  out += '"final": [' + this.final.map(get_name).sort().map(function(c){return '"' + c + '"';}).join(',') + ']}';
  return out;
}



function NFA(alphabet, delta, initial, final) {
  /*  alphabet is a list of characters.
      delta an object such that delta[state][sym] = list of states
        Its own properties are the states of the automaton.
        the epsilon transition is held to be the empty string. so delta[state][''] should also be a list of states.
        it is permissible for delta[state][sym] to be undefined, which will be interpreted as the empty set.
      initial a list of start states (in our formalism, multiple start states are allowed; this is obviously equivalent and simplifies some operations, like reversal)
      final a list of accepting states */
  this.alphabet = alphabet.slice(0)//.sort();
  this.states = Object.getOwnPropertyNames(delta).sort();
  this.delta = delta;
  this.initial = initial.slice(0)//.sort(); // maybe should be epsilon closure'd?
  this.final = final.slice(0)//.sort();
  
  // todo sanity checking (cf python)
}

NFA.prototype.epsilon_closure = function(states) {
  /*  Mainly an internal method.
      Given a set of states, return the set of states reachable via 0 or more epsilon transitions from those states.
      Incidentally also deduplicates. */
  var out = deduped(states);
  var processing = out.slice(0);
  while (processing.length > 0) {
    var cur = processing.pop();
    var next = this.delta[cur][''];
    if (next === undefined) {
      continue;
    }
    for (var i = 0; i < next.length; ++i) {
      if (processing.indexOf(next[i]) === -1 && out.indexOf(next[i]) === -1) { // TODO consider alternatives to indexOf
        processing.push(next[i]);
        out.push(next[i]);
      }
    }
  }
  return out;
}

NFA.prototype.step = function(states, sym) {
  /*  Given a set of states and a symbol, give the result of running the machine
      for one step. As a prerequisite, states should be equal to its own epsilon closure.
      Takes epsilon closure at the end. */
  // todo sanity checking? (sym in alphabet)
  var delta = this.delta;
  states = states.map(function(state) {
    var out = delta[state][sym];
    if (out === undefined) {
      return [];
    }
    return out;
  });
  if (states.length === 0) {
    return states;
  }
  states = states.reduce(function(a, b) { return a.concat(b); }); // no flatmap, so map + flatten.
  return this.epsilon_closure(states);
}

NFA.prototype.accepts = function(str) {
  /* boolean: does my language contain the given string? */
  // todo sanity checking (str in alphabet*)
  var states = this.epsilon_closure(this.initial);
  for (var i = 0; i < str.length; ++i) {
    states = this.step(states, str[i]);
  }
  for (i = 0; i < this.final.length; ++i) {
    if (states.indexOf(this.final[i]) !== -1) {
      return true;
    }
  }
  return false;
}

NFA.prototype.test = function(str) { // alias for accepts, to match JS regex
  return this.accepts(str);
}

NFA.prototype.to_DFA = function() {
  /*  Return an equivalent DFA. State names become meaningless. */
  function get_name(states) {
    /*  Helper: set of states -> canonical (string) name */
    return states.map(this.states.indexOf.bind(this.states)).sort().join(' ');
  }
  get_name = get_name.bind(this);

  var initial = this.epsilon_closure(this.initial);
  var newFinal = [];
  var newDelta = {};

  var thiz = this;
  function follow(state, sym) {
    var next = thiz.step(state, sym);
    newDelta[get_name(state)][sym] = get_name(next);
    return next;
  }

  function state_fn(state) {
    var curName = get_name(state);
    newDelta[curName] = {};
    for (var i = 0; i < thiz.final.length; ++i) {
      if (state.indexOf(thiz.final[i]) !== -1) { // i.e., state contains an accepting state
        newFinal.push(curName);
        break;
      }
    }
  }

  crawl(this.alphabet, initial, follow, {get_name: get_name, state_fn: state_fn});
  return new DFA(this.alphabet, newDelta, get_name(initial), newFinal);
}

NFA.prototype.minimized = function() {
  /*  non-destructively return the minimal DFA equivalent to this automata.
      state names will become meaningless. */
  return this.to_DFA().minimized();
}

NFA.prototype.reversed = function() {
  /*  non-destructively return the NFA given by reversing all arrows and swapping initial with final.
      The result will accept the reverse of the language of this machine, i.e., all strings whose reverse is accepted by this machine. */
  var newDelta = {};
  for (var i = 0; i < this.states.length; ++i) {
    newDelta[this.states[i]] = {};
  }
  
  for (i = 0; i < this.states.length; ++i) {
    var state = this.states[i];
    for (var j = 0; j <= this.alphabet.length; ++j) {
      var sym = (j == this.alphabet.length) ? '' : this.alphabet[j];
      var res = this.delta[state][sym];
      if (res === undefined) {
        continue;
      }
      for (var k = 0; k < res.length; ++k) { // todo three nested loops is almost certainly not the best way to do this.
        var existing = newDelta[res[k]][sym];
        newDelta[res[k]][sym] = (existing === undefined) ? [state] : deduped(existing.concat([state])); // todo could just update in-place
      }
    }
  }
  return new NFA(this.alphabet, newDelta, this.final, this.initial);
}

NFA.prototype._clone = function(prefix) {
  /*  Internal method. Return a copy of this automaton.
      State names will become integers prefixed with 'prefix'. */ // TODO keep old names?
  function get_name(state) {
    /*  Helper: state -> canonical name */
    return '' + prefix + this.states.indexOf(state);
  }
  get_name = get_name.bind(this);

  var newDelta = {};
  for (var i = 0; i < this.states.length; ++i) {
    var state = this.states[i];
    var curName = get_name(state);
    newDelta[curName] = {};
    for (var j = 0; j <= this.alphabet.length; ++j) {
      var sym = (j == this.alphabet.length) ? '' : this.alphabet[j];
      var res = this.delta[state][sym];
      if (res === undefined) {
        continue;
      }
      newDelta[curName][sym] = res.map(get_name);
    }
  }
  return new NFA(this.alphabet, newDelta, this.initial.map(get_name), this.final.map(get_name));
}

NFA.prototype.concat = function(other) {
  /*  Give an NFA for the language given by concatenating all strings from this machine's
      language with all strings from other's language. E.g., if 'x' only accepts strings
      of a's and y only accepts strings of b's, the result accepts any string of a's
      followed by 'b's.
      `other` must be over the same alphabet. */
  // todo sanity checking (alphabets)
  var newThis = this._clone('q');
  var newThat = other._clone('r'); // these two machines now do not have conflicting state names.
  
  for (var i = 0; i < newThat.states.length; ++i) {
    var state = newThat.states[i];
    newThis.delta[state] = newThat.delta[state];
  }
  
  for (i = 0; i < newThis.final.length; ++i) {
    var state = newThis.final[i];
    var cur = newThis.delta[state][''];
    if (cur === undefined) {
      cur = newThis.delta[state][''] = [];
    }
    for (var j = 0; j < newThat.initial.length; ++j) {
      cur.push(newThat.initial[j]);
    }
  }
  
  return new NFA(this.alphabet, newThis.delta, newThis.initial, newThat.final);
}

NFA.prototype.union = function(other) {
  /*  Give an NFA for the language containing all strings in this machine's
      language and all strings in other's language. E.g., if 'x' only accepts strings
      of a's and y only accepts strings of b's, the result accepts any string of a's
      or any string of 'b's.
      `other` must be over the same alphabet. */
  // todo sanity checking (alphabets)
  var newThis = this._clone('q');
  var newThat = other._clone('r'); // these two machines now do not have conflicting state names.
  
  for (var i = 0; i < newThat.states.length; ++i) {
    var state = newThat.states[i];
    newThis.delta[state] = newThat.delta[state];
  }
  // TODO the above code is duplicated in concat
  
  newThis.delta['s'] = {'': newThis.initial.concat(newThat.initial)};
  
  return new NFA(this.alphabet, newThis.delta, ['s'], newThis.final.concat(newThat.final));
}

NFA.prototype.star = function() {
  /*  Give the Kleene star of this NFA. */
  var newThis = this._clone('q');
  newThis.delta['s'] = {'': newThis.initial};
  for (var i = 0; i < newThis.final.length; ++i) {
    var state = newThis.final[i];
    var cur = newThis.delta[state][''];
    if (cur === undefined) {
      cur = newThis.delta[state][''] = [];
    }
    cur.push('s');
  }
  return new NFA(newThis.alphabet, newThis.delta, ['s'], ['s']);
}

NFA.prototype.plus = function() {
  /*  Give the Kleene plus of this NFA. */
  var newThis = this._clone('q');
  for (var i = 0; i < newThis.final.length; ++i) {
    var state = newThis.final[i];
    var cur = newThis.delta[state][''];
    if (cur === undefined) {
      cur = newThis.delta[state][''] = [];
    }
    for (var j = 0; j < newThis.initial.length; ++j) {
      cur.push(newThis.initial[j]);
    }
    //cur.splice(cur.length, 0, newThis.initial);
  }
  return newThis;
}

NFA.prototype.repeat = function(n) {
  /* Given the NFA produced by repeating this NFA a finite number of times. */
  if (n < 0) {
    throw 'Can\'t repeat a negative number of times (' + n + ')';
  } else if (n === 0) {
    return NFA.for('', this.alphabet);
  } else if (n === 1) {
    return this;
  } else {
    return this.concat(this.repeat(n-1));
  }
}

NFA.prototype.optional = function() {
  /*  Give an NFA which is equivalent to this, but also accepts the empty string.
      Corresponds to the '?' operator on regular expressions. */
  var newThis = this._clone('q');
  newThis.delta['s'] = {'': newThis.initial};
  return new NFA(newThis.alphabet, newThis.delta, ['s'], newThis.final.concat(['s']));
}

NFA.for = function(str, alphabet) {
  /*  Construct an NFA which matches exactly the string given. */
  // TODO check str in alphabet*
  var cur = 's';
  var delta = {'s': {}};
  for (var i = 0; i < str.length; ++i) {
    var next = 'q' + (i+1);
    delta[cur][str[i]] = [next];
    delta[next] = {};
    cur = next;
  }
  return new NFA(alphabet, delta, ['s'], [cur]);
}

// TODO serialize NFA?

NFA.prototype.dottified = function() {
  /*  Return a string representation of this NFA as a graph in Dot format.
      For technical reasons, epsilon transitions are represented as '_'. */
  var out = 'digraph foo {\n  rankdir=LR;\n  "__start" [style=invis label="" shape=plain];\n  node [shape=circle];';
  var thiz = this;
  this.states.filter(function(s){return thiz.final.indexOf(s) == -1;}).forEach(function(state){
    out += ' "' + reprEscape(state) + '";';
  });
  out += '\n  node [shape = doublecircle];';
  this.final.forEach(function(state){
    out += ' "' + reprEscape(state) + '";';
  });
  this.initial.forEach(function(state){
    out += '\n  "__start" -> "' + reprEscape(state) + '";';
  });
  this.states.forEach(function(state){
    var edges = {};
    thiz.states.forEach(function(s){
      edges[s] = [];
    });
    thiz.alphabet.concat('').forEach(function(c){
      var transitions = thiz.delta[state][c];
      if (transitions === undefined) {
        return;
      }
      if (c === '') {
        c = '_';
      }
      transitions.forEach(function(target){
        edges[target].push(c);
      });
    });
    thiz.states.forEach(function(target){
      if (edges[target].length === 0) {
        return;
      }
      out += '\n  "' + reprEscape(state) +
              '" -> "' + reprEscape(target) +
              '" [label="' + edges[target].map(reprEscape).join(',') + '"];'
    });
  });
  out += '\n}\n';
  return out;
}


// library stuff

function deduped(l) { // non-destructively remove duplicates from list. also sorts.
  return l.filter(function(val, index, arr) { return arr.indexOf(val) == index; }).sort();
}

function reprEscape(str) { // does not handle unicode or exceptional cases properly.
  return str.replace(/["\\]/g, function(c) { return '\\' + c; })
    .replace(/\n/g, '\\n').replace(/\r/g, '\\r');
}

function crawl(alphabet, initial, follow, options) {
  /*  Walk an automaton graph.
      Follow should be either a function from state, sym to state, or a DFA delta object.
      Options are state_fn, which is run once for each state encountered,
      get_name, which is a map from states to their names (so that the actual state objects can be complex)
      and should_exit, which takes a state and returns a boolean; if true, crawl immediately returns the string which caused that state to be reached.
      Otherwise returns null. */
  var state_fn = options.state_fn || function(){};
  var get_name = options.get_name || function(x){return x;};
  var should_exit = options.should_exit || function(){return false;};

  if (should_exit(initial)) {
    return '';
  }

  if (typeof follow === "object") {
    var delta = follow;
    follow = function(state, sym) {
      return delta[state][sym];
    }
  }

  var reached = Object.create(null);
  reached[get_name(initial)] = '';
  var processing = [initial];
  while (processing.length > 0) {
    var cur = processing.shift();
    var curName = get_name(cur);
    state_fn(cur);
    for (var i = 0; i < alphabet.length; ++i) {
      var sym = alphabet[i];
      var next = follow(cur, sym);
      var nextName = get_name(next);
      if (should_exit(next)) {
        return reached[cur] + sym;
      }
      if (reached[nextName] === undefined) {
        reached[nextName] = reached[curName] + sym;
        processing.push(next);
      }
    }
  }
  return null;
}


module.exports.NFA = NFA;
module.exports.DFA = DFA;
