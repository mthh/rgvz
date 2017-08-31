/* eslint-env browser */

export function xhrequest(method, url, data) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open(method, url, true);
    request.onload = (resp) => {
      resolve(resp.target.responseText);
    };
    request.onerror = (err) => {
      reject(err);
    };
    request.send(data);
  });
}

export function get(url) {
  return xhrequest('GET', url, null);
}

export function parseCsv(readedText, lineSeparator = '\n', delimiter = ',', fromLine = 1, textSeparator = null) {
  const stripTextSeparator = (line) => { // eslint-disable-line no-param-reassign
    const len = line.length;
    for (let i = 0; i < len; i++) { // eslint-disable-line
      const val = line[i];
      if (textSeparator && val.startsWith(textSeparator) && val.endsWith(textSeparator)) {
        line[i] = val.slice(1, -1);
      }
    }
  };
  let lines = readedText.split(lineSeparator);
  const fields = lines[fromLine - 1].split(delimiter);
  const tmpNbFields = fields.length;

  stripTextSeparator(fields);

  lines = lines.slice(fromLine).filter(line => line !== '');
  const nbFt = lines.length;
  const parsedData = [];
  let valid = true;
  for (let i = 0; i < nbFt; i++) { //eslint-disable-line
    const values = lines[i].split(delimiter);
    stripTextSeparator(values);
    const ft = {};
    if (values.length !== tmpNbFields) {
      valid = false;
    }
    for (let j=0; j < tmpNbFields; j++) { //eslint-disable-line
      ft[fields[j] || ['Field', j].join('')] = values[j];
    }
    parsedData.push(ft);
  }
  console.log(parsedData);
  return [valid, parsedData];
}
