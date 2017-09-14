import debug from 'debug';
import { createMenu } from './modules/menuleft';
import { makeTable } from './modules/table';
import { prepare_dataset, filter_no_empty } from './modules/prepare_data';
import { MapSelect, makeSourceSection, makeMapLegend, updateLegend } from './modules/map';
import { comp, math_abs, math_round } from './modules/helpers';

debug('app:log');

const variables = {
  'Pauvreté exclusion': {
    'Taux d\'emploi': 'TX_EMP_2014',
    'Taux de chomage': 'TX_CHOM_2014',
  },
  'Groupe 2': {
    'Indicateur 1': 'IND_1',
    'Indicateur 2': 'IND_2',
  },
};

const study_zones = [
  { id: 'filter_FR', name: 'Filtre national (France)' },
  { id: 'filter_param2', name: 'Espace de comparaison n°2' },
];

const territorial_mesh = [
  { id: 'NUTS1', name: 'NUTS1' },
  { id: 'NUTS12stat', name: 'NUTS1/2 (statistique)' },
];

export const svg_bar = d3.select('svg#svg_bar'),
  margin = { top: 10, right: 20, bottom: 110, left: 30 },
  margin2 = { top: 430, right: 20, bottom: 30, left: 30 },
  width = +svg_bar.attr('width') - margin.left - margin.right,
  height = +svg_bar.attr('height') - margin.top - margin.bottom,
  height2 = +svg_bar.attr('height') - margin2.top - margin2.bottom;

export const svg_map = d3.select('svg#svg_map'),
  margin_map = { top: 40, right: 10, bottom: 40, left: 10 },
  width_map = +svg_bar.attr('width') - margin.left - margin.right,
  height_map = +svg_bar.attr('height') - margin.top - margin.bottom;

const x = d3.scaleBand().range([0, width]).padding(0.1),
  x2 = d3.scaleBand().range([0, width]).padding(0.1),
  y = d3.scaleLinear().range([height, 0]),
  y2 = d3.scaleLinear().range([height2, 0]);

const xAxis = d3.axisBottom(x),
  xAxis2 = d3.axisBottom(x2),
  yAxis = d3.axisLeft(y);

const color_countries = 'rgb(147,144,252)';
const color_disabled = 'rgb(214, 214, 214)';

export let brush_bottom, brush_top, zoom, ref_data, data, nbFt, length_dataset, mean_value;
let focus, context;
let displayed;
let current_range = [0, 0];
let current_range_brush = [0, 0];

let g_bar;
let map_elem;

export const app = {
  colors: {},
  currrent_data: [],
  full_dataset: [],
};

loadData();

const changeRegion = (id_region) => {
  app.current_config.my_region = id_region;
  app.current_config.my_region_pretty_name = app.feature_names[app.current_config.my_region];
  app.colors = {};
  app.colors[app.current_config.my_region] = 'yellow';
  // app.current_data = filter_no_empty(app);
  app.current_config.ref_value = app.current_data.filter(d => d.id === app.current_config.my_region).map(d => d.ratio)[0];
  update();
  updateMiniBars();
  updateContext(0, data.length);
  updateMapRegio();
  svg_bar.select('.brush_bottom').call(brush_bottom.move, x.range());
  svg_map.select('.brush_map').call(map_elem.brush_map.move, null);
  updateLegend();
};


// const prepareData = (geojson_layer) => {
//   ref_data = geojson_layer.features.filter(ft => +ft.level === current_level)
//     .map(ft => ({
//       id: ft.properties[app.current_config.id_field_geom],
//       num: +ft.properties[app.current_config.num],
//       denum: +ft.properties[app.current_config.denum] / 1000,
//       // TX_EMP_2014: (+ft.properties[app.current_config.num] / +ft.properties[app.current_config.denum]) * 100000,
//       ratio: (+ft.properties[app.current_config.num] / +ft.properties[app.current_config.denum]) * 100000,
//     })).filter(ft => {
//       if (ft.id === my_region) {
//         ref_value = ft.ratio;
//       }
//       return ft.ratio;
//     });
//   ref_data.sort((a, b) => a.ratio - b.ratio);
//   ref_data.forEach((d, i) => d.rang = i + 1);
//   return ref_data;
// };

function loadData() {
  d3.queue(4)
    .defer(d3.csv, 'data/REGIOVIZ_DATA_aggregated.csv')
    .defer(d3.json, 'data/cget-nuts1-3035.geojson')
    .defer(d3.json, 'data/countries3035.geojson')
    .defer(d3.json, 'data/remote3035.geojson')
    .defer(d3.json, 'data/template3035.geojson')
    .defer(d3.json, 'data/sea_boxes.geojson')
    .awaitAll((error, results) => {
      if (error) throw error;
      const [full_dataset, nuts1, countries, remote, template, seaboxes] = results;

      prepare_dataset(full_dataset, app);

      app.current_config = {
        id_field: 'geo',
        id_field_geom: 'NUTS1_2016',
        num: 'CHOM_1524_2015',
        denum: 'ACT_1524_2015',
        ratio: 'PC_CHOM_1524_2015',
        ratio_pretty_name: 'Taux d\'emploi (2015)',
        current_level: 1,
        my_region: 'FRE',
        my_region_pretty_name: app.feature_names['FRE'],
      };
      app.colors[app.current_config.my_region] = 'yellow';
      createMenu(full_dataset, variables, study_zones, territorial_mesh);
      app.current_data = filter_no_empty(app);
      map_elem = new MapSelect(nuts1, countries, remote, template, seaboxes);
      makeChart(app.current_data);
      makeUI();
      map_elem.bindBrush(svg_bar, brush_top, brush_bottom, focus);
      makeSourceSection();
      makeMapLegend();
      makeTable(app.current_data, app.current_config);
      console.log(app);
    });
}


function makeUI() {
  d3.select('#bar_section')
    .insert('p', 'svg')
    .attr('class', 'title_menu')
    .style('margin-top', '15px')
    .style('font-size', '0.75em')
    .text('Rang (1 individu)');
  const header_bar_section =  d3.select('#bar_section')
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
    .html(app.current_config.ratio_pretty_name);
  header_bar_section.insert('img')
    .attrs({
      width: 24,
      height: 24,
      src: 'img/edit-table-insert-row-above.svg',
      id: 'img_table',
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
      id: 'img_printer',
    })
    .style('margin', '3px')
    .style('float', 'right');

  header_bar_section.insert('img')
    .attrs({
      width: 24,
      height: 24,
      src: 'img/gtk-info.svg',
      id: 'img_info',
    })
    .style('margin', '3px')
    .style('float', 'right');

  d3.selectAll('span.filter_v')
    .on('click', function () {
      if (!this.classList.contains('checked')) {
        d3.selectAll('span.filter_v').attr('class', 'filter_v square');
        this.classList.add('checked');
        const filter_type = this.getAttribute('filter-value');
        applyFilter(filter_type);
      }
    });

  d3.selectAll('span.target_region')
    .on('click', function () {
      if (!this.classList.contains('checked')) {
        d3.selectAll('span.target_region').attr('class', 'target_region square');
        this.classList.add('checked');
        changeRegion(this.getAttribute('value'));
      }
    });

  d3.selectAll('span.label_chk')
    .on('click', function () {
      this.previousSibling.click();
    });

  const header_map_section =  d3.select('#map_section')
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
      class: 'active',
    })
    .styles({
      margin: '3px',
      float: 'left',
    })
    .on('click', function () {
      if (!this.classList.contains('active')) {
        this.classList.add('active');
        this.style.filter = '';
        document.getElementById('img_map_zoom').style.filter = 'opacity(25%)';
        document.getElementById('img_map_zoom').classList.remove('active');
        document.getElementById('img_map_select').style.filter = 'opacity(25%)';
        document.getElementById('img_map_select').classList.remove('active');
        svg_map.on('.zoom', null);
        svg_map.select('.brush_map').style('display', null);
        map_elem.nuts1_lyr.selectAll('path').on('click', null);
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
      if (!this.classList.contains('active')) {
        this.classList.add('active');
        this.style.filter = '';
        document.getElementById('img_rect_selec').style.filter = 'opacity(25%)';
        document.getElementById('img_rect_selec').classList.remove('active');
        document.getElementById('img_map_select').style.filter = 'opacity(25%)';
        document.getElementById('img_map_select').classList.remove('active');
        svg_map.call(map_elem.zoom_map);
        svg_map.select('.brush_map').call(map_elem.brush_map.move, null);
        svg_map.select('.brush_map').style('display', 'none');
        map_elem.nuts1_lyr.selectAll('path').on('click', null);
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
      if (!this.classList.contains('active')) {
        this.classList.add('active');
        this.style.filter = '';
        document.getElementById('img_rect_selec').style.filter = 'opacity(25%)';
        document.getElementById('img_rect_selec').classList.remove('active');
        document.getElementById('img_map_zoom').style.filter = 'opacity(25%)';
        document.getElementById('img_map_zoom').classList.remove('active');
        svg_map.on('.zoom', null);
        svg_map.select('.brush_map').call(map_elem.brush_map.move, null);
        svg_map.select('.brush_map').style('display', 'none');
        map_elem.nuts1_lyr.selectAll('path')
          .on('click', function (d) {
            const id = d.properties[app.current_config.id_field_geom];
            if (app.current_ids.indexOf(id) < 0 || id === app.current_config.my_region) return;
            if (app.colors[id] !== undefined) {
              app.colors[id] = undefined;
              d3.select(this).attr('fill', color_countries);
            } else {
              // const value = d.properties.ratio;
              // const color = comp(value, ref_value);
              // app.colors[id] = color;
              // d3.select(this).attr('fill', color);
              d3.select(this).attr('fill', app.colors[id] = comp(d.properties[app.current_config.ratio], app.current_config.ref_value, app.serie_inversed));
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
    .on('click', () => {
      const content = [
        'id,Numérateur,Dénominateur,Ratio,Rang\r\n',
        ref_data.map(d => [d.id, d.num, d.denum, d.ratio, d.rang].join(',')).join('\r\n'),
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

function makeChart(ref_data) {
  data = [].concat(ref_data);
  data.sort((a, b) => a.ratio - b.ratio);
  app.current_ids = data.map(d => d.id);
  app.current_ranks = data.map((d, i) => i + 1);
  nbFt = data.length;
  mean_value = d3.mean(data.map(d => d.ratio));
  brush_bottom = d3.brushX()
    .extent([[0, 0], [width, height2]])
    .on('brush end', brushed);

  brush_top = d3.brushX()
    .extent([[0, 0], [width, height]])
    .on('brush end', brushed_top);

  zoom = d3.zoom()
    .scaleExtent([1, Infinity])
    .translateExtent([[0, 0], [width, height]])
    .extent([[0, 0], [width, height]]);
    // .on("zoom", zoomed);

  svg_bar.append('defs')
    .append('clipPath')
    .attr('id', 'clip')
    .append('rect')
    .attr('width', width)
    .attr('height', height);

  focus = svg_bar.append('g')
      .attr('class', 'focus')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

  context = svg_bar.append("g")
      .attr('class', 'context')
      .attr('transform', `translate(${margin2.left}, ${margin2.top})`);

  x.domain(data.map(ft => ft.id));
  y.domain([d3.min(data, d => d.ratio), d3.max(data, d => d.ratio)]);
  x2.domain(x.domain());
  y2.domain(y.domain());

  focus.append('g')
    .attrs({ class: 'axis axis--x', transform: `translate(0, ${height})` })
    .call(xAxis);

  focus.select('.axis--x')
    .selectAll('text')
    .style('text-anchor', 'end')
    .attrs({ dx: '-0.8em', dy: '0.15em', transform: 'rotate(-65)' });

  focus.append('g')
    .attr('class', 'axis axis--y')
    .call(yAxis);

  g_bar = focus.append('g');

  const groupe_line_mean = focus.append('g').attr('class', 'mean');
  groupe_line_mean.append('text')
    .attrs({ x: 60, y: y(mean_value) + 20 })
    .styles({
      display: 'none',
      fill: 'red',
      'fill-opacity': '0.8',
      'font-family': '\'Signika\', sans-serif',
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

  context.append('g')
    .attr('class', 'brush_bottom')
    .call(brush_bottom)
    .call(brush_bottom.move, x.range());

  focus.append('g')
    .attr('class', 'brush_top')
    .call(brush_top)
    .call(brush_top.move, null);

  svg_bar.append('text')
    .attrs({ x: 60, y: 40 })
    .styles({ 'font-family': '\'Signika\', sans-serif' })
    .text(`Complétude : ${math_round(data.length / length_dataset * 1000) / 10}%`);

  svg_bar.append('image')
    .attrs({
      x: width + margin.left + 5,
      y: 385,
      width: 15,
      height: 15,
      'xlink:href': 'img/reverse_blue.png',
      id: 'img_reverse',
    })
    .on('click', () => {
      app.serie_inversed = !app.serie_inversed;
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
      svg_map.select('.brush_map').call(map_elem.brush_map.move, null);
      svg_bar.select('.brush_bottom').call(brush_bottom.move, x.range());
    });

  // Prep the tooltip bits, initial display is hidden
  const tooltip = svg_bar.append('g')
    .attr('class', 'tooltip')
    .style('display', 'none');

  tooltip.append('rect')
    .attr('width', 50)
    .attr('height', 40)
    .attr('fill', 'white')
    .style('opacity', 0.5);

  tooltip.append('text')
    .attr('class', 'id_feature')
    .attr('x', 25)
    .attr('dy', '1.2em')
    .style('text-anchor', 'middle')
    .attr('font-size', '14px');

  tooltip.append('text')
    .attr('class', 'value_feature')
    .attr('x', 25)
    .attr('dy', '2.4em')
    .style('text-anchor', 'middle')
    .attr('font-size', '14px')
    .attr('font-weight', 'bold');
}

function updateMapRegio() {
  map_elem.nuts1_lyr.selectAll('path')
    .attr('fill', d => (app.current_ids.indexOf(d.properties[app.current_config.id_field_geom]) > -1
      ? (app.colors[d.properties[app.current_config.id_field_geom]] || color_countries)
      : color_disabled));
}

function updateMiniBars(){
  const mini_bars = context.selectAll('.bar')
    .data(data);

  mini_bars
    .attr('x', d => x2(d.id))
    .attr('width', x2.bandwidth())
    .attr('y', d => y2(d.ratio))
    .attr('height', d => height2 - y2(d.ratio))
    .style('fill', d => (d.id !== app.current_config.my_region ? color_countries : 'yellow'));

  mini_bars
    .enter()
    .insert('rect')
    .attr('class', 'bar')
    .attr('x', d => x2(d.id))
    .attr('width', x2.bandwidth())
    .attr('y', d => y2(d.ratio))
    .attr('height', d => height2 - y2(d.ratio))
    .style('fill', d => (d.id !== app.current_config.my_region ? color_countries : 'yellow'));
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

  const bar = g_bar.selectAll('.bar')
    .data(data);

  bar
    .attr('x', d => x(d.id))
    .attr('width', x.bandwidth())
    .attr('y', d => y(d.ratio))
    .attr('height', d => height - y(d.ratio))
    .style('fill', d => app.colors[d.id] || color_countries)
    .style('display', (d) => {
      const to_display = x(d.id) != null;
      if (to_display) {
        displayed += 1;
        return 'initial';
      }
      return 'none';
    })
    .on('mouseover', () => {
      svg_bar.select('.tooltip').style('display', null);
    })
    .on('mouseout', () => {
      svg_bar.select('.tooltip').style('display', 'none');
    })
    .on('mousemove', function (d) {
      const tooltip = svg_bar.select('.tooltip');
      tooltip
        .select('text.id_feature')
        .text(`${d.id}`);
      tooltip.select('text.value_feature')
        .text(`${math_round(d.ratio)}`);
      tooltip
        .attr('transform', `translate(${[d3.mouse(this)[0] - 5, d3.mouse(this)[1] - 45]})`);
    });

  bar.enter()
    .insert('rect', '.mean')
    .attr('class', 'bar')
    .attr('x', d => x(d.id))
    .attr('width', x.bandwidth())
    .attr('y', d => y(d.ratio))
    .attr('height', d => height - y(d.ratio));

  bar.exit().remove();

  focus.select('.axis--y')
    .call(yAxis);

  focus.select('.mean_line')
    .attrs({
      y1: y(mean_value),
      y2: y(mean_value),
    });

  const axis_x = focus.select('.axis--x')
    .attr('font-size', () => (displayed > 75 ? 6 : 10))
    .call(xAxis);
  axis_x
    .selectAll('text')
    .attrs(() => {
      if (displayed > 100) {
        return { dx: '-0.8em', dy: '0.15em', transform: 'rotate(-65)' };
      } else if (displayed > 20) {
        return { dx: '-0.8em', dy: '0.15em', transform: 'rotate(-65)' };
      } else {
        return { dx: '0', dy: '0.71em', transform: null };
      }
    })
    .style('text-anchor', () => (displayed > 20 ? 'end' : 'middle'));
}

function updateContext(min, max) {
  context.selectAll('.bar')
      .style('fill-opacity', (_, i) => (i >= min && i < max ? '1' : '0.3'));
}

function brushed() {
  if (d3.event.sourceEvent && d3.event.sourceEvent.type === 'zoom') return; // ignore brush-by-zoom
  const s = d3.event.selection || x2.range();
  current_range = [math_round(s[0] / (width / nbFt)), math_round(s[1] / (width / nbFt))];
  x.domain(data.slice(current_range[0], current_range[1]).map(ft => ft.id));
  svg_bar.select('.zoom').call(zoom.transform, d3.zoomIdentity
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
    svg_map.select('.brush_map').call(map_elem.brush_map.move, null);
    const s = d3_event.selection;
    current_range_brush = [
      current_range[0] + math_round(s[0] / (width / displayed)) - 1,
      current_range[0] + math_round(s[1] / (width / displayed)),
    ];
    x.domain(data.slice(current_range_brush[0] + 1, current_range_brush[1]).map(ft => ft.id));
    app.colors = {};
    focus.selectAll('.bar')
      .style('fill', (d, i) => {
        if (d.id === app.current_config.my_region) {
          app.colors[d.id] = 'yellow';
          return 'yellow';
        } else if (i > current_range_brush[0] && i < current_range_brush[1]) {
          const color = comp(d.ratio, app.current_config.ref_value, app.serie_inversed);
          app.colors[d.id] = color;
          return color;
        }
        return color_countries;
      });
      updateMapRegio();
    // d3.select('#myTable').selectAll('tbody > tr')
    //   .attr('class', function(d, i) { return app.colors[this.id.split('row_')[1]]; });
  } else {
    if (d3_event && !d3_event.selection
        && d3_event.sourceEvent && d3_event.sourceEvent.detail !== undefined) {
      svg_map.select('.brush_map').call(map_elem.brush_map.move, null);
      app.colors = {};
      app.colors[app.current_config.my_region] = 'yellow';
      updateMapRegio();
      // nuts1_lyr.selectAll('path')
      //   .attr('fill', (d, i) => current_ids.indexOf(d.properties[id_field]) > -1
      //                             ? (app.colors[d.properties[id_field]] || color_countries)
      //                             : color_disabled);
    }
    focus.selectAll('.bar')
      .style('fill', d => app.colors[d.id] || color_countries);
    // d3.select('#myTable').selectAll('tbody > tr')
    //   .attr('class', function(d, i) { return this.id === `row_${my_region}` ? 'yellow' : 'white'; });
  }
}

function applyFilter(filter_type) {
  if (filter_type === 'no_filter') {
    data = ref_data.slice();
  } else if (filter_type === 'national_FR') {
    data = ref_data.filter(d => d.id.indexOf('FR') > -1);
  } else {
    let a = math_round(Math.random() * 50);
    let b = math_round(Math.random() * 101);
    if (a > b) [a, b] = [b, a];
    data = ref_data.slice(a, b);
    if (data.filter(d => d.id === app.current_config.my_region)[0] === undefined) {
      data.push(ref_data.filter(d => d.id === app.current_config.my_region)[0]);
    }
  }
  app.current_ids = data.map(d => d.id);
  app.current_ranks = data.map((d, i) => i + 1);
  if (!app.serie_inversed) {
    data.sort((a, b) => a.ratio - b.ratio);
  } else {
    data.sort((a, b) => b.ratio - a.ratio);
  }
  app.colors = {};
  app.colors[app.current_config.my_region] = 'yellow';
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
  svg_map.select('.brush_map').call(map_elem.brush_map.move, null);
  app.colors = {};
  app.colors[app.current_config.my_region] = 'yellow';
  updateMapRegio();
}

function selectBelowMyRegion() {
  const my_rank = data.map((d, i) => [d.id, i])
    .filter(d => d[0] === app.current_config.my_region)[0][1];
  app.colors = {};
  app.colors[app.current_config.my_region] = 'yellow';
  if (!app.serie_inversed) {
    current_range_brush = [0, my_rank];
    data.filter((d, i) => i < my_rank).map(d => d.id).forEach((ft) => { app.colors[ft] = 'red'; });
  } else {
    current_range_brush = [my_rank, data.length];
    data.filter((d, i) => i > my_rank).map(d => d.id).forEach((ft) => { app.colors[ft] = 'green'; });
  }
  svg_bar.select('.brush_top').call(brush_top.move, current_range_brush.map(d => d * (width / nbFt)));
  updateMapRegio();
}

function selectAboveMyRegion() {
  const my_rank = data.map((d, i) => [d.id, i])
    .filter(d => d[0] === app.current_config.my_region)[0][1];
  app.colors = {};
  app.colors[app.current_config.my_region] = 'yellow';
  if (!app.serie_inversed) {
    current_range_brush = [my_rank, data.length];
    data.filter((d, i) => i > my_rank).map(d => d.id).forEach((ft) => { app.colors[ft] = 'green'; });
  } else {
    current_range_brush = [0, my_rank];
    data.filter((d, i) => i < my_rank).map(d => d.id).forEach((ft) => { app.colors[ft] = 'red'; });
  }
  svg_bar.select('.brush_top').call(brush_top.move, current_range_brush.map(d => d * (width / nbFt)));
  updateMapRegio();
}

function getMeanRank() {
  let mean_rank = data.map((d, i) => [d.ratio, math_abs(mean_value - d.ratio), i]);
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
  app.colors = {};
  app.colors[app.current_config.my_region] = 'yellow';
  if (!app.serie_inversed) {
    current_range_brush = [mean_rank, data.length];
    data.filter(d => d.ratio > mean_value).forEach((ft) => {
      if (ft.ratio > app.current_config.ref_value) app.colors[ft.id] = 'green';
      else app.colors[ft.id] = 'red';
    });
  } else {
    current_range_brush = [0, mean_rank + 1];
    data.filter(d => d.ratio > mean_value).forEach((ft) => {
      if (ft.ratio > app.current_config.ref_value) app.colors[ft.id] = 'red';
      else app.colors[ft.id] = 'green';
    });
  }
  app.colors[app.current_config.my_region] = 'yellow';
  svg_bar.select('.brush_top').call(brush_top.move, current_range_brush.map(d => d * (width / nbFt)));
  updateMapRegio();
}

function selectBelowMean() {
  const mean_rank = getMeanRank();
  app.colors = {};
  if (!app.serie_inversed) {
    current_range_brush = [0, mean_rank];
    data.filter(d => d.ratio < mean_value).forEach((ft) => {
      if (ft.ratio < app.current_config.ref_value) app.colors[ft.id] = 'red';
      else app.colors[ft.id] = 'green';
    });
  } else {
    current_range_brush = [mean_rank + 1, data.length];
    data.filter(d => d.ratio < mean_value).forEach((ft) => {
      if (ft.ratio < app.current_config.ref_value) app.colors[ft.id] = 'green';
      else app.colors[ft.id] = 'red';
    });
  }
  app.colors[app.current_config.my_region] = 'yellow';
  svg_bar.select('.brush_top').call(brush_top.move, current_range_brush.map(d => d * (width / nbFt)));
  updateMapRegio();
}
