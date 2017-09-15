import debug from 'debug';
import { createMenu } from './modules/menuleft';
import { makeTable } from './modules/table';
import { prepare_dataset, filter_no_empty } from './modules/prepare_data';
import { MapSelect, makeSourceSection, makeMapLegend, svg_map } from './modules/map';
import { comp, math_round } from './modules/helpers';
import { color_countries, color_highlight } from './modules/options';
import { BarChart } from './modules/charts/barChart_1v';
import { makeTopMenu, makeHeaderChart } from './modules/menutop';

debug('app:log');

const variables = {
  'Pauvreté exclusion': {
    'Taux d\'emploi (2015)': 'TX_EMP_2014',
    'Taux de chomage (2015)': 'TX_CHOM_2014',
  },
  'Groupe 2': {
    'Indicateur 1': 'IND_1',
    'Indicateur 2': 'IND_2',
  },
};

const study_zones = [
  { id: 'no_filter', name: 'UE28' },
  { id: 'filter_FR', name: 'Filtre national (France)' },
  { id: 'filter_param2', name: 'Espace de comparaison n°2' },
];

const territorial_mesh = [
  { id: 'NUTS1', name: 'NUTS1' },
  { id: 'NUTS12stat', name: 'NUTS1/2 (statistique)' },
];

export const app = {
  colors: {},
  current_data: [],
  full_dataset: [],
  current_ids: [],
  current_ranks: [],
  serie_inversed: false,
};

loadData();


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
        ratio_pretty_name: 'Taux de chômage des jeunes (2015)',
        current_level: 1,
        my_region: 'FRE',
        my_region_pretty_name: app.feature_names['FRE'],
      };
      app.colors[app.current_config.my_region] = color_highlight;
      const features_menu = full_dataset.filter(ft => ft.geo.indexOf('FR') > -1
        && +ft.level === app.current_config.current_level);
      createMenu(features_menu, variables, study_zones, territorial_mesh);
      app.current_data = filter_no_empty(app);

      makeTopMenu();
      makeHeaderChart();
      makeTable(app.current_data, app.current_config);
      const map_elem = new MapSelect(nuts1, countries, remote, template, seaboxes);
      const chart = new BarChart(app.current_data);
      makeUI(chart, map_elem);
      makeSourceSection();
      makeMapLegend();
      chart.bindMap(map_elem);
      map_elem.bindBrush(chart);
    });
}

function applyFilter(filter_type) {
  app.current_data = filter_no_empty(app);
  // That's all if filter_type == 'no_filter'
  if (filter_type === 'filter_FR') {
    app.current_data = app.current_data.filter(d => d.id.indexOf('FR') > -1);
  } else {
    let a = math_round(Math.random() * 50);
    let b = math_round(Math.random() * 101);
    if (a > b) [a, b] = [b, a];
    app.current_data = app.current_data.slice(a, b);
    const maybe_my_region = app.current_data.filter(
      d => d.id === app.current_config.my_region)[0];
    if (maybe_my_region === undefined) {
      app.current_data.push(
        app.full_dataset.filter(d => d.geo === app.current_config.my_region)[0]);
    }
  }
  app.current_ids = app.current_data.map(d => d.id);
  app.current_ranks = app.current_data.map((d, i) => i + 1);
  if (!app.serie_inversed) {
    app.current_data.sort((a, b) => a.ratio - b.ratio);
  } else {
    app.current_data.sort((a, b) => b.ratio - a.ratio);
  }
  app.colors = {};
  app.colors[app.current_config.my_region] = color_highlight;
}

function makeUI(chart, map_elem) {
  d3.selectAll('span.filter_v')
    .on('click', function () {
      if (!this.classList.contains('checked')) {
        d3.selectAll('span.filter_v').attr('class', 'filter_v square');
        this.classList.add('checked');
        const filter_type = this.getAttribute('filter-value');
        applyFilter(filter_type);
        chart.changeStudyZone();
      }
    });

  d3.selectAll('span.target_region')
    .on('click', function () {
      if (!this.classList.contains('checked')) {
        d3.selectAll('span.target_region').attr('class', 'target_region square');
        this.classList.add('checked');
        chart.changeRegion(this.getAttribute('value'));
      }
    });

  d3.selectAll('span.label_chk')
    .on('click', function () {
      this.previousSibling.click();
    });

  const header_map_section = d3.select('#map_section')
    .insert('p', 'svg')
    .attr('id', 'header_map')
    .style('margin', '0 0 0 10px');

  header_map_section.insert('img')
    .attrs({
      width: 20,
      height: 20,
      src: 'img/gimp-tool-rect-select.png',
      id: 'img_rect_selec',
      class: 'active',
    })
    .styles({ margin: '3px', float: 'left' })
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
    .styles({ margin: '3px', float: 'left', filter: 'opacity(25%)' })
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
    .styles({ margin: '3px', float: 'left', filter: 'opacity(25%)' })
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
            chart.update();
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
        app.current_data.map(d => [d.id, d.num, d.denum, d.ratio, d.rang].join(',')).join('\r\n'),
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
    .styles({ padding: '0 10px 10px 10px', 'text-align': 'center' });

  buttons_under_chart.append('button')
    .attrs({ class: 'button_blue', id: 'btn_above_mean' })
    .style('margin', '8px')
    .text('< à la moyenne')
    .on('click', () => chart.selectBelowMean());

  buttons_under_chart.append('button')
    .attrs({ class: 'button_blue', id: 'btn_below_mean' })
    .style('margin', '8px')
    .text('> à la moyenne')
    .on('click', () => chart.selectAboveMean());

  buttons_under_chart.append('button')
    .attrs({ class: 'button_blue', id: 'btn_above_my_region' })
    .style('margin', '8px')
    .text('< à ma région')
    .on('click', () => chart.selectBelowMyRegion());

  buttons_under_chart.append('button')
    .attrs({ class: 'button_blue', id: 'btn_below_my_region' })
    .style('margin', '8px')
    .text('> à ma région')
    .on('click', () => chart.selectAboveMyRegion());
}
