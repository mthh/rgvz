export class TableResumeStat {
  constructor(summary_features, options = {}) {
    const doc = document;
    const nb_features = summary_features.length;
    const column_names = ['Min', 'Moyenne', 'Max', 'Ma région'];
    const nb_columns = column_names.length;
    const myTable = doc.createElement('table');
    const headers = doc.createElement('thead');
    const table_body = doc.createElement('tbody');
    const headers_row = doc.createElement('tr');
    for (let i = 0; i < nb_columns; i++) {
      const cell = doc.createElement('th');
      cell.innerHTML = column_names[i];
      headers_row.appendChild(cell);
    }
    headers.appendChild(headers_row);
    myTable.appendChild(headers);
    for (let i = 0; i < nb_features; i++) {
      const row = doc.createElement('tr');
      row.id = `row_${summary_features[i].id}`;
      for (let j = 0; j < nb_columns; j++) {
        const cell = doc.createElement('td');
        const col_name = column_names[j];
        cell.innerHTML = summary_features[i][col_name];
        row.appendChild(cell);
      }
      table_body.appendChild(row);
    }
    myTable.appendChild(table_body);
    myTable.setAttribute('id', options.id || 'table_summary');
    document.querySelector('#map_section').appendChild(myTable);
  }

  addFeature(summary) {

  }

  removeFeature() {

  }
}
