/* eslint-env browser */
import DataTable from 'vanilla-datatables';
import { get, parseCsv } from './helpers';

export default class Table {
  constructor(selectorParent, urlData, options) {
    const parent = document.querySelector(selectorParent);
    get(urlData)
      .then((dataText) => {
        const [valid, data] = parseCsv(dataText);
        if (valid) {
          const table = this.createTableDOM(data);
          for (const (key, value) of Object.entries(options)) {
            console.log(key, value);
            parent.style[key] = options[value];
          }
          parent.appendChild(table);
          this.dataTable = new DataTable(table);
        }
      });

  }

  createTableDOM(data, options = {}) {
    const opts = options;
    options.id = options.id || "myTable";
    const doc = document,
      nbFeatures = data.length,
      columnNames = Object.getOwnPropertyNames(data[0]),
      nbColumns = columnNames.length;
    const myTable = doc.createElement("table"),
      headers = doc.createElement("thead"),
      body = doc.createElement("tbody"),
      headers_row = doc.createElement("tr");
    for (let i=0; i < nbColumns; i++) {
      const cell = doc.createElement("th");
      cell.innerHTML = columnNames[i];
      headers_row.appendChild(cell);
    }
    headers.appendChild(headers_row);
    myTable.appendChild(headers);
    for (let i=0; i < nbFeatures; i++) { //eslint-disable-line
      const row = doc.createElement("tr");
      for (let j=0; j < nbColumns; j++) { //eslint-disable-line
        const cell = doc.createElement("td");
        cell.innerHTML = data[i][columnNames[j]]
        row.appendChild(cell);
      }
      body.appendChild(row);
    }
    myTable.appendChild(body);
    myTable.setAttribute("id", options.id);
    return myTable;
  }
}
