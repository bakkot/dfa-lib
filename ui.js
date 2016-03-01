function go() {
	findEquiv(document.querySelector('#regex-1').value, document.querySelector('#regex-2').value);
}

function union(l1, l2) {
	return l1.concat(l2).filter(function(v, i, a){return a.indexOf(v) === i}).sort();
}

function findEquiv(s1, s2) { // s1 and s2 are strings representing regular expressions
	var m1 = to_NFA(s1);
	var m2 = to_NFA(s2);
	var alphabet = union(m1.alphabet, m2.alphabet);
	m1.alphabet = m2.alphabet = alphabet;
	m1 = m1.minimized();
	m2 = m2.minimized();

  var strings = m1.find_equivalence_counterexamples(m2);
  console.log(strings);

  if (strings[0] === null && strings[1] === null) {
  	document.querySelector('#equiv-div').style.display = 'inline';
  	document.querySelector('#unequiv-div').style.display = 'none';
  } else {
  	document.querySelector('#equiv-div').style.display = 'none';
  	document.querySelector('#unequiv-div').style.display = 'inline';

  	if (strings[0] !== null) {
  		document.querySelector('#first-accept-div').style.display = 'inline';
  		document.querySelector('#first-accept-pre').textContent = strings[0];
  	} else {
  		document.querySelector('#first-accept-div').style.display = 'none';
  	}

  	if (strings[1] !== null) {
  		document.querySelector('#second-accept-div').style.display = 'inline';
  		document.querySelector('#second-accept-pre').textContent = strings[1];
  	} else {
  		document.querySelector('#second-accept-div').style.display = 'none';
  	}
  }
}

addEventListener('load', function(){
	document.querySelector('#regex-1').addEventListener("input", go);
	document.querySelector('#regex-2').addEventListener("input", go);
	go();
});