import debug from 'debug';

debug('app:log');


function createMenu (names, variables, study_zones, territorial_mesh) {
  // First section, regions names:
  const section1 = document.createElement('div');
  section1.className = 'box';
  const title_section1 = document.createElement('p');
  title_section1.className = 'title_menu';
  title_section1.innerHTML = 'Ma région';
  section1.appendChild(title_section1);
  for (let i = 0, len_i = names.length; i < len_i; i++) {
    const id = names[i].geo;
    const name = names[i].Nom;
    const entry = document.createElement('p');
    entry.innerHTML = `<span value="${id}" class='target_region square'></span><span class="label_chk">${name}</span>`;
    section1.appendChild(entry);
  }

  // Second section, groups of variables:
  const section2 = document.createElement('div');
  section2.className = 'box';
  const title_section2 = document.createElement('p');
  title_section2.className = 'title_menu';
  title_section2.innerHTML = 'Mon/mes indicateurs';
  section2.appendChild(title_section2);
  const groups_var = Object.keys(variables);
  for (let i = 0, len_i = groups_var.length; i < len_i; i++) {
    const gp_name = groups_var[i];
    const entry = document.createElement('p');
    entry.innerHTML = `<span class='square checked'></span><span class="label_chk">${gp_name}</span>`;
    section2.appendChild(entry);
    const var_names = Object.keys(variables[gp_name]);
    for (let j = 0, len_j = var_names.length; j < len_j; j++) {
      const name_var = var_names[j];
      const code_var = variables[gp_name][name_var];
      const sub_entry = document.createElement('p');
      sub_entry.className = 'small';
      sub_entry.innerHTML = `<span value="${code_var}" class="small_square"></span><span>${var_names[j]}</span>`;
      section2.appendChild(sub_entry);
    }
  }

  // Third section, study zone:
  const section3 = document.createElement('div');
  section3.className = 'box';
  const title_section3 = document.createElement('p');
  title_section3.className = 'title_menu';
  title_section3.innerHTML = 'Mon espace d\'étude';
  section3.appendChild(title_section3);
  for (let i = 0, len_i = study_zones.length; i < len_i; i++) {
    const entry = document.createElement('p');
    const zone = study_zones[i];
    entry.innerHTML = `<span filter-value="${zone.id}" class='filter_v square checked'></span><span class="label_chk">${zone.name}</span>`;
    section3.appendChild(entry);
  }

  // Fourth section:
  const section4 = document.createElement('div');
  section4.className = 'box';
  const title_section4 = document.createElement('p');
  title_section4.className = 'title_menu';
  title_section4.innerHTML = 'Maillage territorial d\'analyse';
  for (let i = 0, len_i = territorial_mesh.length; i < len_i; i++) {
    const entry = document.createElement('p');
    const territ_level = territorial_mesh[i];
    entry.innerHTML = `<span value="${territ_level.id}" class='square checked'></span><span class="label_chk">${territ_level.name}</span>`;
    section4.appendChild(entry);
  }

  // The actual menu containing these 4 sections:
  const menu = document.createElement('div');
  menu.id = 'menu';
  menu.style.width = '340px';
  menu.style.float = 'left';
  menu.appendChild(section1);
  menu.appendChild(section2);
  menu.appendChild(section3);
  menu.appendChild(section4);
}


const svg_bar = d3.select("svg#svg_bar"),
  margin = { top: 10, right: 20, bottom: 110, left: 30 },
  margin2 = { top: 430, right: 20, bottom: 30, left: 30 },
  width = +svg_bar.attr("width") - margin.left - margin.right,
  height = +svg_bar.attr("height") - margin.top - margin.bottom,
  height2 = +svg_bar.attr("height") - margin2.top - margin2.bottom;

const svg_map = d3.select("svg#svg_map"),
  margin_map = { top: 40, right: 10, bottom: 40, left: 10 },
  width_map = +svg_bar.attr("width") - margin.left - margin.right,
  height_map = +svg_bar.attr("height") - margin.top - margin.bottom;

const x = d3.scaleBand().range([0, width]).padding(0.1),
  x2 = d3.scaleBand().range([0, width]).padding(0.1),
  y = d3.scaleLinear().range([height, 0]),
  y2 = d3.scaleLinear().range([height2, 0]);

const xAxis = d3.axisBottom(x),
  xAxis2 = d3.axisBottom(x2),
  yAxis = d3.axisLeft(y);

const color_countries = 'rgb(147,144,252)';
const color_disabled = 'rgb(214, 214, 214)';

const changeRegion = (id_region) => {
  my_region = id_region;
  my_region_pretty_name = app.feature_names[my_region];
  colors = {};
  colors[my_region] = 'yellow';
  ref_value = ref_data.filter(d => d.id === my_region).map(d => d.ratio)[0];
  update();
  updateMiniBars();
  updateContext(0, data.length);
  updateMapRegio();
  svg_bar.select('.brush_bottom').call(brush_bottom.move, x.range());
  svg_map.select('.brush_map').call(brush_map.move, null);
  updateLegend();
};

let my_region = 'FRH';
let my_region_pretty_name;
let ref_value;

let variable_name = 'ratio';
let id_field = 'NUTS1_2016';
let num = 'EMP_2014';
let denum = 'Y20.64_2014';
let ratio = 'TX_EMP_2014';
let variable_pretty_name = 'Taux d\'emploi (2015)';

let brush_bottom, brush_top, brush_map, zoom, zoom_map, ref_data, data, nbFt, length_dataset, mean_value;
let focus, context;
let displayed;
let current_range = [0, 0];
let current_range_brush = [0, 0];

let current_ranks;

let current_ids;
let serie_inversed = false;
let projection;
let path;
let nuts1_lyr;
let g_bar;
let colors = {};
colors[my_region] = 'yellow';

loadData();

const comp = (test_value, ref_value) => {
  if (test_value < ref_value) {
    return serie_inversed ? 'green' : 'red';
  } else {
    return serie_inversed ? 'red' : 'green';
  }
};

const styles = {
  template: { stroke_width: 0 },
  countries: { stroke_width: 0.5 },
  seaboxes: { stroke_width: 1 },
  remote: { stroke_width: 0.5 },
  seaboxes2: { stroke_width: 1 },
  nuts1: { stroke_width: 0.5 },
  nuts1_no_data: { stroke_width: 0.5 },
};


const prepareData = (geojson_layer) => {
  ref_data = geojson_layer.features.map(ft => ({
    id: ft.properties[id_field],
    num: +ft.properties[num],
    denum: +ft.properties[denum] / 1000,
    // TX_EMP_2014: (+ft.properties[num] / +ft.properties[denum]) * 100000,
    ratio: (+ft.properties[num] / +ft.properties[denum]) * 100000,
  })).filter(ft => {
    if (ft.id === my_region) {
      ref_value = ft.ratio;
    }
    return ft.ratio;
  });
  ref_data.sort((a, b) => a.ratio - b.ratio);
  ref_data.forEach((d, i) => d.rang = i +1);
  return ref_data;
};

let nuts1,
  countries,
  remote,
  template,
  seaboxes;

const app = {};

function prepare_dataset(full_dataset) {
  app.full_dataset = full_dataset
  // Create an Object feature_id ->  feature_name:
  app.feature_names = {};
  full_dataset.forEach(elem => {
    app.feature_names[elem.geo] = elem.Nom;
  });
}

function filter_no_empty() {
  const data = app.full_dataset.map(ft => ({
    id: ft.geo,
    num: +ft[num],
    denum: +ft[denum] / 1000,
    // TX_EMP_2014: (+ft.properties[num] / +ft.properties[denum]) * 100000,
    ratio: (+ft[num] / +ft[denum]) * 100000,
  })).filter(ft => {
    if (ft.id === my_region) {
      ref_value = ft.ratio;
    }
    return ft.ratio;
  });
  data.sort((a, b) => a.ratio - b.ratio);
  data.forEach((d, i) => d.rang = i + 1);
  return data;
}

function loadData() {
  d3.queue(4)
    .defer(d3.csv, 'data/REGIOVIZ_DATA_aggregated.csv')
    .defer(d3.json, 'data/cget-nuts1-3035.geojson')
    .defer(d3.json, 'data/countries3035.geojson')
    .defer(d3.json, 'data/remote3035.geojson')
    .defer(d3.json, 'data/template3035.geojson')
    .defer(d3.json, 'data/sea_boxes.geojson')
    .awaitAll(function (error, results){
      if (error) throw error;
      const [full_dataset, nuts1, countries, remote, template, seaboxes] = results;
      prepare_dataset(full_dataset);
      const data_no_empty = filter_no_empty();
       my_region_pretty_name = app.feature_names[my_region];
      makeMap(nuts1, countries, remote, template, seaboxes);
      makeChart(data_no_empty);
      makeUI();
      makeSourceSection();
      makeMapLegend();
      makeTable(data_no_empty);
  });
}

function makeTable(data_no_empty) {
  let table = createTableDOM(data_no_empty);
  document.querySelector('#map_section').append(table);
  const dataTable = new DataTable("#myTable");
  const t = document.querySelector('.dataTable-wrapper');
  t.style.marginTop = '20px';
  t.style.display = 'none';
  t.style.fontSize = '0.7em';
  t.querySelector('.dataTable-top').remove();
  Array.from(t.querySelectorAll('span.small'))
    .forEach((el) => {
      el.onclick = function() { el.parentElement.click() };
    });
}

function makeUI() {
  d3.select('#bar_section')
    .insert('p', 'svg')
    .attr('class', 'title_menu')
    .style('margin-top', '15px')
    .style('font-size', '0.75em')
    .text('Rang (1 individu)');
  const header_bar_section =   d3.select('#bar_section')
    .insert('p', 'svg')
    .style('margin-bottom', '0');
  header_bar_section.insert('span')
    .styles({
      'font-family': '\'Signika\', sans-serif',
      'font-weight': '800',
      'font-size': '14px',
      'margin-top': '12px',
      'margin-left': '40px',
      float: 'left',
    })
    .attr('class', 'title_variable')
    .html(variable_pretty_name);
  header_bar_section.insert('img')
    .attrs({
      width: 24,
      height: 24,
      src: 'img/edit-table-insert-row-above.svg',
      id: 'img_table'
    })
    .style('margin', '3px')
    .style('float', 'right')
    .on('click', function () {
      if (document.querySelector('.dataTable-wrapper').style.display) {
        document.querySelector('#svg_map').style.display = 'none';
        document.querySelector('#svg_legend').style.display = 'none';
        document.querySelector('#header_map').style.display = 'none';
        document.querySelector('#header_table').style.display = null;
        document.querySelector('.dataTable-wrapper').style.display = null;
        this.style.filter = 'invert(75%)';
      } else {
        document.querySelector('#svg_map').style.display = null;
        document.querySelector('#svg_legend').style.display = null;
        document.querySelector('#header_map').style.display = null;
        document.querySelector('#header_table').style.display = 'none';
        document.querySelector('.dataTable-wrapper').style.display = 'none';
        this.style.filter = null;
      }
    });

  header_bar_section.insert('img')
    .attrs({
      width: 24,
      height: 24,
      src: 'img/printer.svg',
      id: 'img_printer'
    })
    .style('margin', '3px')
    .style('float', 'right');

  header_bar_section.insert('img')
    .attrs({
      width: 24,
      height: 24,
      src: 'img/gtk-info.svg',
      id: 'img_info'
    })
    .style('margin', '3px')
    .style('float', 'right');

  d3.selectAll('span.filter_v')
    .on('click', function () {
      if (this.classList.contains('checked')) {
        return;
      } else {
        d3.selectAll('span.filter_v').attr('class', 'filter_v square');
        this.classList.add('checked');
        const filter_type = this.getAttribute('filter-value');
        applyFilter(filter_type);
      }
    });

  d3.selectAll('span.target_region')
    .on('click', function () {
      if (this.classList.contains('checked')) {
        return;
      } else {
        d3.selectAll('span.target_region').attr('class', 'target_region square');
        this.classList.add('checked');
        changeRegion(this.getAttribute('value'));
      }
    });

  d3.selectAll('span.label_chk')
    .on('click', function () {
      this.previousSibling.click();
    });

  const header_map_section =   d3.select('#map_section')
    .insert('p', 'svg')
    .attr('id', 'header_map')
    .style('margin-bottom', '0')
    .style('margin-top', '0')
    .style('margin-left', '10px');

  header_map_section.insert('img')
    .attrs({
      width: 20,
      height: 20,
      src: 'img/gimp-tool-rect-select.png',
      id: 'img_rect_selec',
      class: 'active'
    })
    .styles({
      margin: '3px',
      float: 'left',
    })
    .on('click', function () {
      if (this.classList.contains('active')) {
        return;
        // this.classList.remove('active');
        // this.style.filter = null;
        // document.getElementById('img_map_zoom').style.filter = 'invert(75%)';
        // document.getElementById('img_map_zoom').classList.add('active');
        // svg_map.on('.zoom', null);
        // svg_map.select('.brush_map').style('display', null);
      } else {
        this.classList.add('active');
        this.style.filter = '';
        document.getElementById('img_map_zoom').style.filter = 'opacity(25%)';
        document.getElementById('img_map_zoom').classList.remove('active');
        document.getElementById('img_map_select').style.filter = 'opacity(25%)';
        document.getElementById('img_map_select').classList.remove('active');
        svg_map.on('.zoom', null);
        svg_map.select('.brush_map').style('display', null);
        nuts1_lyr.selectAll('path').on('click', null);
      }
    });

  header_map_section.insert('img')
    .attrs({
      width: 20,
      height: 20,
      src: 'img/gimp-tool-zoom.png',
      id: 'img_map_zoom',
    })
    .styles({
      margin: '3px',
      float: 'left',
      filter: 'opacity(25%)',
    })
    .on('click', function () {
      if (this.classList.contains('active')) {
        return;
        // this.classList.remove('active');
        // this.style.filter = null;
        // document.getElementById('img_rect_selec').style.filter = 'invert(75%)';
        // document.getElementById('img_rect_selec').classList.add('active');
        // svg_map.call(zoom_map);
        // svg_map.select('.brush_map').style('display', 'none');
      } else {
        this.classList.add('active');
        this.style.filter = '';
        document.getElementById('img_rect_selec').style.filter = 'opacity(25%)';
        document.getElementById('img_rect_selec').classList.remove('active');
        document.getElementById('img_map_select').style.filter = 'opacity(25%)';
        document.getElementById('img_map_select').classList.remove('active');
        svg_map.call(zoom_map);
        svg_map.select('.brush_map').call(brush_map.move, null)
        svg_map.select('.brush_map').style('display', 'none');
        nuts1_lyr.selectAll('path').on('click', null);
      }
    });

  header_map_section.insert('img')
    .attrs({
      width: 20,
      height: 20,
      src: 'img/gimp-cursor.png',
      id: 'img_map_select',
    })
    .styles({
      margin: '3px',
      float: 'left',
      filter: 'opacity(25%)',
    })
    .on('click', function () {
        if (this.classList.contains('active')) {
          return;
        } else {
          this.classList.add('active');
          this.style.filter = '';
          document.getElementById('img_rect_selec').style.filter = 'opacity(25%)';
          document.getElementById('img_rect_selec').classList.remove('active');
          document.getElementById('img_map_zoom').style.filter = 'opacity(25%)';
          document.getElementById('img_map_zoom').classList.remove('active');
          svg_map.on('.zoom', null);
          svg_map.select('.brush_map').call(brush_map.move, null)
          svg_map.select('.brush_map').style('display', 'none');
          nuts1_lyr.selectAll('path')
            .on('click', function (d, i) {
              const id = d.properties[id_field];
              if (current_ids.indexOf(id) < 0 || id === my_region) return;
              if (colors[id] !== undefined) {
                colors[id] = undefined;
                d3.select(this).attr('fill', color_countries);
              } else {
                // const value = d.properties.ratio;
                // const color = comp(value, ref_value);
                // colors[id] = color;
                // d3.select(this).attr('fill', color);
                d3.select(this).attr('fill', colors[id] = comp(d.properties.ratio, ref_value));
              }
              update();
            });
        }
    });

  const header_table_section = d3.select('#map_section')
      .insert('p', 'svg')
      .attr('id', 'header_table')
      .style('display', 'none')
      .style('text-align', 'right')
      .style('margin', 'auto');

  header_table_section.append('span')
    .attr('class', 'button_blue')
    .html('CSV')
    .on('click', function() {
      let content = [
        "id,Numérateur,Dénominateur,Ratio,Rang\r\n",
        ref_data.map(d => [d.id, d.num, d.denum, d.ratio, d.rang].join(',')).join('\r\n')
      ].join('');
      const elem = document.createElement('a');
      elem.setAttribute('href', `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`);
      elem.setAttribute('download', 'table.csv');
      elem.style.display = 'none';
      document.body.appendChild(elem);
      elem.click();
      document.body.removeChild(elem);
    });

  const buttons_under_chart = d3.select('#bar_section')
    .append('div')
    .styles({ padding: '10px', 'text-align': 'center' });

  buttons_under_chart.append('button')
    .attrs({ class: 'button_blue', id: 'btn_above_mean' })
    .style('margin', '8px')
    .text('< à la moyenne')
    .on('click', selectBelowMean);

  buttons_under_chart.append('button')
    .attrs({ class: 'button_blue', id: 'btn_below_mean' })
    .style('margin', '8px')
    .text('> à la moyenne')
    .on('click', selectAboveMean);

  buttons_under_chart.append('button')
    .attrs({ class: 'button_blue', id: 'btn_above_my_region' })
    .style('margin', '8px')
    .text('< à ma région')
    .on('click', selectBelowMyRegion);

  buttons_under_chart.append('button')
    .attrs({ class: 'button_blue', id: 'btn_below_my_region' })
    .style('margin', '8px')
    .text('> à ma région')
    .on('click', selectAboveMyRegion);
}

function makeMap(nuts1, countries, remote, template, seaboxes) {
  projection = d3.geoIdentity()
    .fitExtent([[0,0], [width_map, height_map]], template)
    .reflectY(true);

  nuts1.features.forEach(ft => ft.properties.ratio = (+ft.properties[num] / +ft.properties[denum]) * 100000);
  const no_data_features = nuts1.features.filter(ft => isNaN(ft.properties.ratio));
  nuts1.features = nuts1.features.filter(ft => !isNaN(ft.properties.ratio));

  path = d3.geoPath().projection(projection);
  const layers = svg_map.append('g')
    .attr('id', 'layers');

  zoom_map = d3.zoom()
    .scaleExtent([1, 5])
    .translateExtent([[0, 0],[width_map, height_map]])
    .on('zoom', map_zoomed);

  svg_map.call(zoom_map)

  const template_lyr = layers.append('g')
    .attr('id', 'template')
    .attrs({ fill: 'rgb(247, 252, 254)', 'fill-opacity': 1 })
    .selectAll('path')
    .data(template.features)
    .enter()
    .append("path")
    .attrs({ d: path });

  const countries_lyr = layers.append('g')
    .attrs({ fill: 'rgb(214, 214, 214)', 'fill-opacity': 1, 'stroke-width': 0.5, stroke: '#ffffff' })
    .attr('id', 'countries')
    .selectAll('path')
    .data(countries.features)
    .enter()
    .append("path")
    .attrs({ d: path });

  const seaboxes_lyr = layers.append('g')
    .attrs({ fill: '#e0faff', 'fill-opacity': 1, stroke: 'black', 'stroke-width': 1 })
    .attr('id', 'seaboxes')
    .selectAll('path')
    .data(seaboxes.features)
    .enter()
    .append("path")
    .attrs({ d: path });

  const remote_lyr = layers.append('g')
    .attrs({ fill: 'rgb(214, 214, 214)', 'fill-opacity': 1, 'stroke-width': 0.5, stroke: '#ffffff' })
    .attr('id', 'remote')
    .selectAll('path')
    .data(remote.features)
    .enter()
    .append("path")
    .attrs({ d: path });

  const seaboxes2_lyr = layers.append('g')
    .attrs({ fill: 'none', stroke: 'black', 'stroke-width': 1 })
    .attr('id', 'seaboxes')
    .selectAll('path')
    .data(seaboxes.features)
    .enter()
    .append("path")
    .attrs({ d: path });

  const no_data_lyr = layers.append('g')
    .attrs({ id: 'nuts1_no_data', 'fill': 'white', 'fill-opacity': 1, 'stroke-width': 0.5, stroke: 'lightgrey' })
    .selectAll('path')
    .data(no_data_features)
    .enter()
    .append("path")
    .attr('d', path);

  nuts1_lyr = layers.append('g')
    .attrs({ id: 'nuts1', 'fill-opacity': 1, 'stroke-width': 0.5, stroke: '#ffffff' });
  nuts1_lyr.selectAll('path')
    .data(nuts1.features)
    .enter()
    .append("path")
    .attr('fill', d => d.properties.NUTS1_2016 !== my_region ? color_countries : 'yellow')
    .attr('d', path);

  fitLayer();

  brush_map = d3.brush()
    .extent([[0, 0], [width_map, height_map]])
    .on('start brush', function () {
      if (!d3.event || !d3.event.selection) return;
      svg_bar.select('.brush_top').call(brush_top.move, null);
      let selection = d3.event.selection;
      let [topleft, bottomright] = selection;
      // const transform = svg_map.node().__zoom;
      // topleft[0] = (topleft[0] - transform.x) / transform.k;
      // topleft[1] = (topleft[1] - transform.y) / transform.k;
      // bottomright[0] = (bottomright[0] - transform.x) / transform.k;
      // bottomright[1] = (bottomright[1] - transform.y) / transform.k;
      const rect = new Rect(topleft, bottomright);
      colors = {};
      nuts1_lyr.selectAll('path')
        .attr('fill', function(d, i) {
          const id = d.properties.NUTS1_2016;
          if (id === my_region) {
            colors[id] = 'yellow';
            return 'yellow';
          } else if (current_ids.indexOf(id) < 0) {
            return color_disabled;
          }
          if (!this._pts) {
            this._pts = this.getAttribute('d').slice(1).split('L').map(pt => pt.split(',').map(a => +a));
          }
          const pts = this._pts;
          for (let i = 0, nb_pts = pts.length; i < nb_pts; i++) {
            if (rect.contains(pts[i])) {
              const value = d.properties.ratio;
              const color = comp(value, ref_value);
              colors[id] = color;
              return color;
            }
          }
          return color_countries;
        });
        focus.selectAll(".bar")
          .style('fill', (d, i) => colors[d.id] || color_countries);
        const ids = Object.keys(colors);
        let ranks = ids.map(d => current_ids.indexOf(d.id) > -1).map(d => current_ranks[d]);
        if (ranks.length > 1) {
          const c1 = ranks[0] - 1;
          const c2 = ranks[ranks.length - 1];
          if (c1 < current_range[0] || c2 > current_range[1]) {
            current_range = [
              ranks[0] - 1,
              ranks[ranks.length - 1],
            ];
            svg_bar.select('.brush_bottom').call(
              brush_bottom.move,
              [current_range[0] * (width / nbFt), current_range[1] * (width / nbFt)]);
          }
        } else {
          current_range = [0, data.length];
          svg_bar.select('.brush_bottom').call(
            brush_bottom.move, x.range());
        }
        // d3.select('#myTable').selectAll('tbody > tr')
        //   .attr('class', function(d, i) { return colors[this.id.split('row_')[1]]; });
    });

  svg_map.append('g')
    .attr('class', 'brush_map')
    .call(brush_map);

}

function fitLayer() {
	projection.scale(1).translate([0, 0]);
	let b = get_bbox_layer_path('template'),
		s = .95 / Math.max((b[1][0] - b[0][0]) / width_map, (b[1][1] - b[0][1]) / height_map),
		t = [(width_map - s * (b[1][0] + b[0][0])) / 2, (height_map - s * (b[1][1] + b[0][1])) / 2];
	projection.scale(s).translate(t);
  svg_map.selectAll('path').attr('d', path);
}

function get_bbox_layer_path(name) {
	var bbox_layer_path = undefined;
	svg_map.select("#" + name)
    .selectAll("path")
    .each(function(d, i){
  		let bbox_path = path.bounds(d);
  		if(!bbox_layer_path) bbox_layer_path = bbox_path;
  		else {
  			bbox_layer_path[0][0] = bbox_path[0][0] < bbox_layer_path[0][0] ? bbox_path[0][0] : bbox_layer_path[0][0];
  			bbox_layer_path[0][1] = bbox_path[0][1] < bbox_layer_path[0][1] ? bbox_path[0][1] : bbox_layer_path[0][1];
  			bbox_layer_path[1][0] = bbox_path[1][0] > bbox_layer_path[1][0] ? bbox_path[1][0] : bbox_layer_path[1][0];
  			bbox_layer_path[1][1] = bbox_path[1][1] > bbox_layer_path[1][1] ? bbox_path[1][1] : bbox_layer_path[1][1];
  		}
	});
	return bbox_layer_path;
}

function makeChart(ref_data) {
  data = [].concat(ref_data);
  data.sort((a, b) => a.ratio - b.ratio);
  current_ids = data.map(d => d.id);
  current_ranks = data.map((d, i) => i + 1);
  nbFt = data.length;
  mean_value = d3.mean(data.map(d => d.ratio));
  brush_bottom = d3.brushX()
      .extent([[0, 0], [width, height2]])
      .on("brush end", brushed);

  brush_top = d3.brushX()
      .extent([[0, 0], [width, height]])
      .on("brush end", brushed_top);

  zoom = d3.zoom()
      .scaleExtent([1, Infinity])
      .translateExtent([[0, 0], [width, height]])
      .extent([[0, 0], [width, height]]);
      // .on("zoom", zoomed);

  svg_bar.append("defs").append("clipPath")
      .attr("id", "clip")
      .append("rect")
      .attr("width", width)
      .attr("height", height);

  focus = svg_bar.append("g")
      .attr("class", "focus")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  context = svg_bar.append("g")
      .attr("class", "context")
      .attr("transform", "translate(" + margin2.left + "," + margin2.top + ")");

  x.domain(data.map(ft => ft.id));
  y.domain([d3.min(data, d => d.ratio), d3.max(data, d => d.ratio)]);
  x2.domain(x.domain());
  y2.domain(y.domain());

  focus.append("g")
      .attr("class", "axis axis--x")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

  focus.select('.axis--x')
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("transform", "rotate(-65)");

  focus.append("g")
      .attr("class", "axis axis--y")
      .call(yAxis);

  g_bar = focus.append("g");

  let groupe_line_mean = focus.append('g').attr('class', 'mean');
  groupe_line_mean.append('text')
      .attrs({ x: 60, y: y(mean_value) + 20 })
      .styles({
        'font-family': '\'Signika\', sans-serif',
        'fill': 'red',
        'fill-opacity': '0.8',
        display: 'none'
      })
      .text('Valeur moyenne');

  groupe_line_mean.append('line')
      .attrs({
        x1: 0,
        x2: width,
        y1: y(mean_value),
        y2: y(mean_value),
        'stroke-dasharray': '10, 5',
        'stroke-width': '2px',
        class: 'mean_line',
      })
      .style('stroke', 'red');

  // groupe_line_mean.append('line')
  //     .attrs({ x1: 0, x2: width, y1: y(mean_value), y2: y(mean_value), 'stroke-width': '14px' })
  //     .style('stroke', 'transparent')
  //     .on('mouseover', function (){
  //       groupe_line_mean.select('text').style('display', 'initial');
  //     })
  //     .on('mouseout', function () {
  //       groupe_line_mean.select('text').style('display', 'none');
  //     });

  updateMiniBars();

  context.append("g")
    .attr("class", "brush_bottom")
    .call(brush_bottom)
    .call(brush_bottom.move, x.range());

  focus.append("g")
    .attr("class", "brush_top")
    .call(brush_top)
    .call(brush_top.move, null);

  svg_bar.append('text')
    .attrs({ x: 60, y: 40 })
    .styles({ 'font-family': '\'Signika\', sans-serif' })
    .text(`Complétude : ${Math.round(data.length / length_dataset * 1000) / 10}%`);

  svg_bar.append('image')
    .attrs({
      x: width + margin.left + 5,
      y: 385,
      width: 15,
      height: 15,
      'xlink:href': 'reverse_blue.png',
      id: 'img_reverse'
    })
    .on('click', function () {
      serie_inversed = !serie_inversed;
      if (data[0].ratio < data[data.length - 1].ratio) {
        data.sort((a, b) => b.ratio - a.ratio);
      } else {
        data.sort((a, b) => a.ratio - b.ratio);
      }
      x.domain(data.slice(current_range[0], current_range[1]).map(ft => ft.id));
      x2.domain(data.map(ft => ft.id));
      // svg_bar.select(".zoom").call(zoom.transform, d3.zoomIdentity
      //     .scale(width / (current_range[1] - current_range[0]))
      //     .translate(-current_range[0], 0));
      update();
      updateMiniBars();
      updateContext(current_range[0], current_range[1]);
      svg_bar.select('.brush_top').call(brush_top.move, null);
      svg_map.select('.brush_map').call(brush_map.move, null);
      svg_bar.select('.brush_bottom').call(brush_bottom.move, x.range());
    });

  // Prep the tooltip bits, initial display is hidden
  const tooltip = svg_bar.append("g")
    .attr("class", "tooltip")
    .style("display", "none");

  tooltip.append("rect")
    .attr("width", 50)
    .attr("height", 40)
    .attr("fill", "white")
    .style("opacity", 0.5);

  tooltip.append("text")
    .attr('class', 'id_feature')
    .attr("x", 25)
    .attr("dy", "1.2em")
    .style("text-anchor", "middle")
    .attr("font-size", "14px");

  tooltip.append("text")
    .attr('class', 'value_feature')
    .attr("x", 25)
    .attr("dy", "2.4em")
    .style("text-anchor", "middle")
    .attr("font-size", "14px")
    .attr("font-weight", "bold");
}

function updateMapRegio() {
  nuts1_lyr.selectAll('path')
    .attr('fill', (d, i) => current_ids.indexOf(d.properties[id_field]) > -1
                              ? (colors[d.properties[id_field]] || color_countries)
                              : color_disabled);
}

function updateMiniBars(){
  let mini_bars = context.selectAll(".bar")
      .data(data);

  mini_bars
      .attr("x", d => x2(d.id))
      .attr("width", x2.bandwidth())
      .attr("y", d => y2(d.ratio))
      .attr("height", d => height2 - y2(d.ratio))
      .style('fill', d => d.id !== my_region ? color_countries : 'yellow');

  mini_bars
      .enter()
      .insert("rect")
      .attr("class", "bar")
      .attr("x", d => x2(d.id))
      .attr("width", x2.bandwidth())
      .attr("y", d => y2(d.ratio))
      .attr("height", d => height2 - y2(d.ratio))
      .style('fill', d => d.id !== my_region ? color_countries : 'yellow');;
  mini_bars.exit().remove();
  // context.select('.axis--x').remove();
  // context.append("g")
  //   .attr("class", "axis axis--x")
  //   .attr("transform", "translate(0," + height2 + ")")
  //   .call(xAxis2)
  //     .selectAll("text")
  //     .style("text-anchor", "end")
  //     .attr("dx", "-.8em")
  //     .attr("dy", ".15em")
  //     .attr("transform", "rotate(-65)");
}

function update() {
  displayed = 0;

  let bar = g_bar.selectAll(".bar")
    .data(data);

  bar
    .attr("x", d => x(d.id))
    .attr("width", x.bandwidth())
    .attr("y", d => y(d.ratio))
    .attr("height", d => height - y(d.ratio))
    .style('fill', d => colors[d.id] || color_countries)
    .style("display", (d) => {
      let to_display = x(d.id) != null;
      if (to_display) {
        displayed += 1;
        return 'initial';
      }
      return 'none';
    })
    .on("mouseover", () => {
      svg_bar.select('.tooltip').style('display', null);
    })
    .on("mouseout", () => {
      svg_bar.select('.tooltip').style('display', 'none');
    })
    .on("mousemove", function(d) {
      const tooltip = svg_bar.select('.tooltip');
      tooltip
        .select("text.id_feature")
        .text(`${d.id}`);
      tooltip.select('text.value_feature')
        .text(`${Math.round(d.ratio)}`);
      tooltip
        .attr('transform', `translate(${[d3.mouse(this)[0] - 5, d3.mouse(this)[1] - 45]})`);
    });

  bar.enter()
    .insert("rect", '.mean')
    .attr("class", "bar")
    .attr("x", d => x(d.id))
    .attr("width", x.bandwidth())
    .attr("y", d => y(d.ratio))
    .attr("height", d => height - y(d.ratio));

  bar.exit().remove();

  focus.select('.axis--y')
    .call(yAxis);

  focus.select('.mean_line')
    .attrs({
      y1: y(mean_value),
      y2: y(mean_value),
    })

  const axis_x = focus.select(".axis--x")
    .attr('font-size', d => displayed > 75 ? 6 : 10)
    .call(xAxis);
  axis_x
    .selectAll("text")
    .attrs(d => {
      if (displayed > 100) {
        return { dx: '-0.8em', dy: '0.15em', transform: 'rotate(-65)' };
      } else if (displayed > 20) {
        return { dx: '-0.8em', dy: '0.15em', transform: 'rotate(-65)' };
      } else {
        return { dx: '0', dy: '0.71em', transform: null };
      }
    })
    .style('text-anchor', d => displayed > 20 ? 'end' : 'middle');
}

function makeSourceSection() {
  const text_zone = d3.select('#svg_legend')
    .append('text')
    .attrs({ y: 0, 'text-anchor': 'end' })
    .style('font-size', '11px')
    .style('font-family', '\'Signika\', sans-serif');
  text_zone.append('tspan')
    .attrs({ x: 470, dy: 12 })
    .text('Niveau régional : NUTS 1 (version 2016)');
  text_zone.append('tspan')
    .attrs({ x: 470, dy: 12 })
    .text('Origine des données : Eurostat, 2016');
  text_zone.append('tspan')
    .attrs({ x: 470, dy: 12 })
    .text('Limite administrative: UMS RIATE, CC-BY-SA')
}

function makeMapLegend() {
  const legend_elems = [
    { color: 'yellow', text: `Ma région : ${my_region_pretty_name}` },
    { color: color_countries, text: 'Autres régions du filtre de comparaison' },
    { color: 'green', text: 'Rang plus élevé que ma région' },
    { color: 'red', text: 'Rang moins élevé que ma région' },
  ];

  const rect_size = 14;
  const spacing = 4;
  const height = rect_size + spacing;
  const offset =  height * legend_elems.length / 2;

  const grp_lgd = d3.select('#svg_legend')
    .append('g')
    .attr('transform', 'translate(50, 40)')
    .styles({ 'font-size': '11px', 'font-family': '\'Signika\', sans-serif'});

  const legends = grp_lgd.selectAll('.legend')
    .data(legend_elems)
    .enter()
    .append('g')
    .attr('class', 'legend')
    .attr('transform', (d, i) => {
      const tx = -2 * rect_size;
      const ty = i * height - offset;
      return 'translate(' + tx + ',' + ty + ')';
    });

  legends.append('rect')
    .attrs({ width: rect_size, height: rect_size })
    .styles(d => ({ fill: d.color, stroke: d.color }));

  legends.append('text')
    .attr('x', rect_size + spacing)
    .attr('y', rect_size - spacing)
    .text(d => d.text);
}

function updateLegend() {
  d3.select('#svg_legend > g > .legend > text').text(`Ma région : ${my_region_pretty_name}`);
}

function updateContext(min, max) {
  context.selectAll(".bar")
      .style('fill-opacity', (_, i) => i >= min && i < max ? '1' : '0.3');
}

function brushed() {
  if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return; // ignore brush-by-zoom
  const s = d3.event.selection || x2.range();
  current_range = [Math.round(s[0] / (width/nbFt)), Math.round(s[1] / (width/nbFt))];
  x.domain(data.slice(current_range[0], current_range[1]).map(ft => ft.id));
  svg_bar.select(".zoom").call(zoom.transform, d3.zoomIdentity
    .scale(width / (current_range[1] - current_range[0]))
    .translate(-current_range[0], 0));
  update();
  updateContext(current_range[0], current_range[1]);
  svg_bar.select('.brush_top').call(brush_top.move, null);
  brushed_top();
}

function brushed_top() {
  const d3_event = d3.event;
  if (d3_event && d3_event.selection
        && d3_event.sourceEvent && d3_event.sourceEvent.target === document.querySelector('.brush_top > rect.overlay')) {
    svg_map.select('.brush_map').call(brush_map.move, null);
    const s = d3_event.selection;
    current_range_brush = [
      current_range[0] + Math.round(s[0] / (width / displayed)) - 1,
      current_range[0] + Math.round(s[1] / (width / displayed)),
    ];
    x.domain(data.slice(current_range_brush[0] + 1, current_range_brush[1]).map(ft => ft.id));
    colors = {};
    focus.selectAll(".bar")
      .style('fill', (d, i) => {
        if (d.id === my_region) {
          colors[d.id] = 'yellow';
          return 'yellow';
        } else if (i > current_range_brush[0] && i < current_range_brush[1]) {
          const color = comp(d.ratio, ref_value);
          colors[d.id] = color;
          return color;
        }
        return color_countries;
      });
      updateMapRegio();
    // d3.select('#myTable').selectAll('tbody > tr')
    //   .attr('class', function(d, i) { return colors[this.id.split('row_')[1]]; });
  } else {
    if (d3_event && !d3_event.selection
        && d3_event.sourceEvent && d3_event.sourceEvent.detail !== undefined) {
      svg_map.select('.brush_map').call(brush_map.move, null);
      colors = {};
      colors[my_region] = 'yellow';
      updateMapRegio();
      // nuts1_lyr.selectAll('path')
      //   .attr('fill', (d, i) => current_ids.indexOf(d.properties[id_field]) > -1
      //                             ? (colors[d.properties[id_field]] || color_countries)
      //                             : color_disabled);
    }
    focus.selectAll(".bar")
      .style('fill', (d, i) => colors[d.id] || color_countries);
    // d3.select('#myTable').selectAll('tbody > tr')
    //   .attr('class', function(d, i) { return this.id === `row_${my_region}` ? 'yellow' : 'white'; });
  }
}

class Rect {
  constructor(topleft, bottomright) {
    this.xmin = topleft[0];
    this.xmax = bottomright[0];
    this.ymin = topleft[1];
    this.ymax = bottomright[1];
  }

  contains(pt) {
    if (pt[0] >= this.xmin && pt[0] <= this.xmax
        && pt[1] >= this.ymin && pt[1] <= this.ymax) {
      return true;
    }
    return false;
  }
}

function createTableDOM(data, opts) {
  const options = opts || {};
  options.id = options.id || 'myTable';
  const doc = document,
    nb_features = data.length,
    column_names = Object.getOwnPropertyNames(data[0]),
    nb_columns = column_names.length;
  const myTable = doc.createElement('table'),
    headers = doc.createElement('thead'),
    body = doc.createElement('tbody'),
    headers_row = doc.createElement('tr');
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
      row.className = 'yellow';
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

function applyFilter(filter_type) {
  if (filter_type === 'no_filter') {
    data = ref_data.slice();
  } else if (filter_type === 'national_FR'){
    data = ref_data.filter(d => d.id.indexOf('FR') > -1);
  } else {
    let a = Math.round(Math.random() * 50);
    let b = Math.round(Math.random() * 101);
    if (a > b) [a, b] = [b, a];
    data = ref_data.slice(a, b);
    if(data.filter(d => d.id === my_region)[0] === undefined) {
      data.push(ref_data.filter(d => d.id === my_region)[0]);
    };
  }
  current_ids = data.map(d => d.id);
  current_ranks = data.map((d, i) => i + 1);
  if (!serie_inversed) {
    data.sort((a, b) => a.ratio - b.ratio);
  } else {
    data.sort((a, b) => b.ratio - a.ratio);
  }
  colors = {};
  colors[my_region] = 'yellow';
  nbFt = data.length;
  x.domain(data.map(ft => ft.id));
  y.domain([d3.min(data, d => d.ratio) - 2, d3.max(data, d => d.ratio)]);
  x2.domain(x.domain());
  y2.domain(y.domain());
  update();
  updateMiniBars();
  updateContext(0, data.length);
  // brush_bottom.extent(current_range)
  svg_bar.select('.brush_bottom').call(brush_bottom.move, x2.range());
  svg_map.select('.brush_map').call(brush_map.move, null);
  colors = {};
  colors[my_region] = 'yellow';
  updateMapRegio();
}

function reset() {
  svg_map.transition()
    .duration(750)
    .call(zoom_map.transform, d3.zoomIdentity );
}

function map_zoomed() {
  const transform = d3.event.transform;
  if (transform.k === 1) {
    transform.x = 0;
    transform.y = 0;
  }
  const layers = svg_map.select('#layers');
  const t = layers
    .selectAll('g')
    .transition()
    .duration(225);

  layers.selectAll('g')
    .transition(t)
    .style("stroke-width", function () {
      return styles[this.id].stroke_width / transform.k + "px";
    });

  layers.selectAll('g')
    .transition(t)
    .attr("transform", transform);

  svg_map.select('.brush_map')
    .transition(t)
    .attr("transform", transform);
}

function selectBelowMyRegion() {
  const my_rank = data.map((d,i) => [d.id, i]).filter(d => d[0]=== my_region)[0][1];
  colors = {};
  colors[my_region] = 'yellow';
  if (!serie_inversed) {
    current_range_brush = [0, my_rank];
    data.filter((d, i) => i < my_rank).map(d => d.id).forEach(ft => { colors[ft] = 'red'; })
  } else {
    current_range_brush = [my_rank, data.length];
    data.filter((d, i) => i > my_rank).map(d => d.id).forEach(ft => { colors[ft] = 'green'; })
  }
  svg_bar.select('.brush_top').call(brush_top.move, current_range_brush.map(d => d * (width / nbFt)));
  updateMapRegio();
}

function selectAboveMyRegion() {
  const my_rank = data.map((d,i) => [d.id, i]).filter(d => d[0] === my_region)[0][1];
  colors = {};
  colors[my_region] = 'yellow';
  if (!serie_inversed) {
    current_range_brush = [my_rank, data.length];
    data.filter((d, i) => i > my_rank).map(d => d.id).forEach(ft => { colors[ft] = 'green'; })
  } else {
    current_range_brush = [0, my_rank];
    data.filter((d, i) => i < my_rank).map(d => d.id).forEach(ft => { colors[ft] = 'red'; })
  }
  svg_bar.select('.brush_top').call(brush_top.move, current_range_brush.map(d => d * (width / nbFt)));
  updateMapRegio();
}

function getMeanRank() {
  let mean_rank = data.map((d, i) => [d.ratio, Math.abs(mean_value - d.ratio), i])
  mean_rank.sort((a, b) => a[1] - b[1]);
  mean_rank = mean_rank[0];
  if (mean_rank[1] > mean_value) {
    mean_rank = mean_rank[2] - 1;
  } else {
    mean_rank = mean_rank[2];
  }
  return mean_rank;
}

function selectAboveMean() {
  const mean_rank = getMeanRank();
  colors = {};
  colors[my_region] = 'yellow';
  if (!serie_inversed) {
    current_range_brush = [mean_rank, data.length];
    data.filter(d => d.ratio > mean_value).forEach(ft => {
      if (ft.ratio > ref_value) colors[ft.id] = 'green'
      else colors[ft.id] = 'red';
    });
  } else {
    current_range_brush = [0, mean_rank + 1];
    data.filter(d => d.ratio > mean_value).forEach(ft => {
      if (ft.ratio > ref_value) colors[ft.id] = 'red';
      else colors[ft.id] = 'green';
    });
  }
  colors[my_region] = 'yellow';
  svg_bar.select('.brush_top').call(brush_top.move, current_range_brush.map(d => d * (width / nbFt)));
  updateMapRegio();
}

function selectBelowMean() {
  const mean_rank = getMeanRank();
  colors = {};
  if (!serie_inversed) {
    current_range_brush = [0, mean_rank];
    data.filter(d => d.ratio < mean_value).forEach(ft => {
      if (ft.ratio < ref_value) colors[ft.id] = 'red';
      else colors[ft.id] = 'green';
    });
  } else {
    current_range_brush = [mean_rank + 1, data.length];
    data.filter(d => d.ratio < mean_value).forEach(ft => {
      if (ft.ratio < ref_value) colors[ft.id] = 'green';
      else colors[ft.id] = 'red';
    });
  }
  colors[my_region] = 'yellow';
  svg_bar.select('.brush_top').call(brush_top.move, current_range_brush.map(d => d * (width / nbFt)));
  updateMapRegio();
}
