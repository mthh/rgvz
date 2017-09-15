import DataTable from 'vanilla-datatables';
import { color_highlight } from './options';

function createTableDOM(data, opts, config) {
  const { num, denum, ratio, my_region } = config;
  const options = opts || {};
  options.id = options.id || 'myTable';
  const doc = document;
  const nb_features = data.length;
  const column_names = Object.getOwnPropertyNames(data[0]);
  const nb_columns = column_names.length;
  const myTable = doc.createElement('table');
  const headers = doc.createElement('thead');
  const body = doc.createElement('tbody');
  const headers_row = doc.createElement('tr');
  for (let i = 0; i < nb_columns; i++) {
    const cell = doc.createElement('th');
    const col_name = column_names[i];
    if (col_name === 'num') {
      cell.innerHTML = `Num<br><span class="small">${num}`;
    } else if (col_name === 'denum') {
      cell.innerHTML = `Denum<br><span class="small">${denum}`;
    } else if (col_name === 'ratio') {
      cell.innerHTML = `Ratio<br><span class="small">${ratio}`;
    } else if (col_name === 'rang') {
      cell.innerHTML = 'Rang ';
    } else {
      cell.innerHTML = col_name;
    }
    headers_row.appendChild(cell);
  }
  headers.appendChild(headers_row);
  myTable.appendChild(headers);
  for (let i = 0; i < nb_features; i++) {
    const row = doc.createElement('tr');
    row.id = `row_${data[i].id}`;
    if (data[i].id === my_region) {
      row.className = color_highlight;
    }
    for (let j = 0; j < nb_columns; j++) {
      const cell = doc.createElement('td');
      const col_name = column_names[j];
      if (col_name === 'num' || col_name === 'denum' || col_name === 'ratio') {
        cell.innerHTML = Math.round(data[i][col_name] * 100) / 10;
      } else {
        cell.innerHTML = data[i][col_name];
      }
      row.appendChild(cell);
    }
    body.appendChild(row);
  }
  myTable.appendChild(body);
  myTable.setAttribute('id', options.id);
  return myTable;
}


export function makeTable(data_no_empty, config) {
  const table = createTableDOM(data_no_empty, undefined, config);
  document.querySelector('#map_section').append(table);
  const dataTable = new DataTable('#myTable');
  const t = document.querySelector('.dataTable-wrapper');
  t.style.marginTop = '20px';
  t.style.display = 'none';
  t.style.fontSize = '0.7em';
  t.querySelector('.dataTable-top').remove();
  Array.from(t.querySelectorAll('span.small'))
    .forEach((el) => {
      el.onclick = () => { el.parentElement.click(); }; // eslint-disable-line no-param-reassign
    });
}
