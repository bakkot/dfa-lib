function $(s){
  return document.querySelector(s);
}

function hideAll() {
  $('#equiv-div').style.display = 'none';
  $('#error-div').style.display = 'none';
  $('#unequiv-div').style.display = 'none';
  $('#both-error').style.display = 'none';
  $('#first-error').style.display = 'none';
  $('#second-error').style.display = 'none';
  $('#first-accept-div').style.display = 'none';
  $('#second-accept-div').style.display = 'none';
}

function show(ele) {
  ele.style.display = 'inline';
}

function parse(s1) {
  try {
    return to_NFA(s1);
  } catch(e) {
    return null;
  }
}

function union(l1, l2) {
  return l1.concat(l2).filter(function(v, i, a){return a.indexOf(v) === i}).sort();
}

function update() {
  hideAll();

  var m1 = parse($('#regex-1').value);
  var m2 = parse($('#regex-2').value);

  if (!m1 || !m2) {
    show($('#error-div'));
    if (!m1 && !m2) {
      show($('#both-error'));
    } else if (!m1) {
      show($('#first-error'));
    } else {
      show($('#second-error'));
    }
    return;
  }

  m1.alphabet = m2.alphabet = union(m1.alphabet, m2.alphabet);
  m1 = m1.minimized();
  m2 = m2.minimized();

  var strings = m1.find_equivalence_counterexamples(m2);

  if (strings[0] === null && strings[1] === null) {
    show($('#equiv-div'));
  } else {
    show($('#unequiv-div'));

    strings = strings.map(function(s){return s === '' ? '[empty string]' : s});

    if (strings[0] !== null) {
      show($('#first-accept-div'));
      $('#first-accept-pre').textContent = strings[0];
    }

    if (strings[1] !== null) {
      show($('#second-accept-div'));
      $('#second-accept-pre').textContent = strings[1];
    }
  }
}

addEventListener('load', function(){
  $('#regex-1').addEventListener('input', update);
  $('#regex-2').addEventListener('input', update);
  update();
});
