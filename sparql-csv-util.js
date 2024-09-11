const SEPARATOR = ';';

// escape logic from https://github.com/lblod/loket-report-generation-service/blob/a56d1590920a63c16570e6b55fbc39ce379936fc/helpers.js#L14
function escapeCsvValue(val) {
  //If special character: encapsulate
  if (val.includes(SEPARATOR) || val.match(/"/g)) {
    //Escape the use of double quotes by prepending a quote
    val = val.replace(/"/g, '""');
    //Encapsulate the use of the semicolon and the quotes
    val = `"${val}"`;
  }
  //Escape newlines and tabs (can also be done with just "-encapsulation)
  val = val.replace(/\n/g, '\\n');
  val = val.replace(/\t/g, '\\t');
  return val;
}

function csvHeaderFromData(data) {
  const vars = data.head.vars;
  return vars.join(SEPARATOR);
}

function csvRowFromBinding(binding, vars) {
  const csvRow = [];
  for (let _var of vars) {
    const isBound = _var in binding;
    let csvVar;
    if (isBound) {
      csvVar = escapeCsvValue(binding[_var].value);
    } else {
      csvVar = '';
    }
    csvRow.push(csvVar);
  }
  return csvRow.join(SEPARATOR);
}

// convert `application/sparql-results+json` to `text/csv`
 export function sparqlJsonToCsv(data) {
  const csvHeader = csvHeaderFromData(data);
  const csvRows = data.results.bindings.map((b) => {
    return csvRowFromBinding(b, data.head.vars);
  });
  const csvString = csvHeader + '\n';
  csvString += csvRows.join('\n');
  return csvString;
}
