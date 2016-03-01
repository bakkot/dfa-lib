function go() {
  findEquiv(document.querySelector('#regex-1').value, document.querySelector('#regex-2').value);
}

function hideAll() {
  document.querySelector('#equiv-div').style.display = 'none';
  document.querySelector('#error-div').style.display = 'none';
  document.querySelector('#unequiv-div').style.display = 'none';
  document.querySelector('#both-error').style.display = 'none';
  document.querySelector('#first-error').style.display = 'none';
  document.querySelector('#second-error').style.display = 'none';
  document.querySelector('#first-accept-div').style.display = 'none';
  document.querySelector('#second-accept-div').style.display = 'none';
}

function union(l1, l2) {
  return l1.concat(l2).filter(function(v, i, a){return a.indexOf(v) === i}).sort();
}

function findEquiv(s1, s2) { // s1 and s2 are strings representing regular expressions
  hideAll();

  var m1, firstFailed = false;
  try {
    m1 = to_NFA(s1);
  } catch(e) {
    firstFailed = true;
  }
  var m2, secondFailed = false;
  try {
    m2 = to_NFA(s2);
  } catch(e) {
    secondFailed = true;
  }

  if (firstFailed || secondFailed) {
    document.querySelector('#error-div').style.display = 'inline';
    if (firstFailed && secondFailed) {
      document.querySelector('#both-error').style.display = 'inline';
    } else if (firstFailed) {
      document.querySelector('#first-error').style.display = 'inline';
    } else {
      document.querySelector('#second-error').style.display = 'inline';
    }
    return;
  }

  var alphabet = union(m1.alphabet, m2.alphabet);
  m1.alphabet = m2.alphabet = alphabet;
  m1 = m1.minimized();
  m2 = m2.minimized();

  var strings = m1.find_equivalence_counterexamples(m2);


  if (strings[0] === null && strings[1] === null) {
    document.querySelector('#equiv-div').style.display = 'inline';
  } else {
    document.querySelector('#unequiv-div').style.display = 'inline';

    if (strings[0] !== null) {
      document.querySelector('#first-accept-div').style.display = 'inline';
      if (strings[0] === '') {
        strings[0] = '[empty string]';
      }
      document.querySelector('#first-accept-pre').textContent = strings[0];
    }

    if (strings[1] !== null) {
      document.querySelector('#second-accept-div').style.display = 'inline';
      if (strings[1] === '') {
        strings[1] = '[empty string]';
      }
      document.querySelector('#second-accept-pre').textContent = strings[1];
    }
  }
}

addEventListener('load', function(){
  document.querySelector('#regex-1').addEventListener("input", go);
  document.querySelector('#regex-2').addEventListener("input", go);
  go();
});