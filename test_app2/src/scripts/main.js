import debug from 'debug';
import { createMenu } from './modules/menuleft';
import { makeTable } from './modules/table';
import { prepare_dataset, filter_no_empty } from './modules/prepare_data';
import { MapSelect, makeSourceSection, makeMapLegend } from './modules/map';
import { color_countries, color_highlight } from './modules/options';
import { BarChart1, bindUI_BarChart1 } from './modules/charts/barChart_1v';
import { makeTopMenu, makeHeaderChart, makeHeaderMapSection } from './modules/menutop';
import { BubbleChart1, bindUI_BubbleChart1 } from './modules/charts/bubbleChart_1v';
import { unbindUI } from './modules/helpers';

debug('app:log');

const variables = {
  'Pauvreté exclusion': {
    'Taux d\'emploi (2015)': 'TX_EMP_2014',
    'Taux de chomage (2015)': 'PC_CHOM_1524_2015',
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

function setDefaultConfig(code = 'FRE', variable = 'PC_CHOM_1524_2015') { // }, level = 'NUTS1') {
  app.current_config = {
    id_field: 'geo',
    id_field_geom: 'NUTS1_2016',
    num: 'CHOM_1524_2015',
    denum: 'ACT_1524_2015',
    ratio: variable,
    ratio_pretty_name: 'Taux de chômage des jeunes (2015)',
    current_level: 1,
    my_region: code,
    my_region_pretty_name: app.feature_names[code],
  };
  app.colors[app.current_config.my_region] = color_highlight;
}

function setDefaultConfigMenu(code = 'FRE', variable = 'PC_CHOM_1524_2015', level = 'NUTS1') {
  document.querySelector(`.target_region.square[value="${code}"]`).classList.add('checked');
  document.querySelector(`.target_variable.small_square[value="${variable}"]`).classList.add('checked');
  document.querySelector('.filter_v.square[filter-value="no_filter"]').classList.add('checked');
  document.querySelector(`.territ_level.square[value="${level}"]`).classList.add('checked');
}

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
      setDefaultConfig('FRB', 'PC_CHOM_1524_2015', 'NUTS1');
      const features_menu = full_dataset.filter(ft => ft.geo.indexOf('FR') > -1
        && +ft.level === app.current_config.current_level);
      createMenu(features_menu, variables, study_zones, territorial_mesh);
      makeTopMenu();
      makeHeaderChart();
      setDefaultConfigMenu('FRB', 'PC_CHOM_1524_2015', 'NUTS1');
      app.current_data = filter_no_empty(app);
      const map_elem = new MapSelect(nuts1, countries, remote, template, seaboxes);
      const chart = new BarChart1(app.current_data);
      makeTable(app.current_data, app.current_config);
      makeHeaderMapSection();
      makeSourceSection();
      makeMapLegend();
      bindUI_BarChart1(chart, map_elem);
      chart.bindMap(map_elem);
      map_elem.bindBrush(chart);
    });
}

function resetColors() {
  const ids = app.current_ids;
  const my_region = app.current_config.my_region;
  app.colors = {};
  for (let i = 0, len_i = ids.length; i < len_i; i++) {
    app.colors[ids[i]] = ids[i] === my_region ? color_highlight : color_countries;
  }
}

export function bindTopButtons(chart, map_elem) {
  d3.selectAll('.type_chart.title_menu')
    .on('click', function () {
      chart.remove();
      chart = null; // eslint-disable-line no-param-reassign
      unbindUI();
      map_elem.resetZoom();
      app.colors = {};
      app.serie_inversed = false;
      // app.current_data = filter_no_empty(app);
      // app.current_ids = app.current_data.map(d => d.id);
      // app.current_ranks = app.current_data.map((d, i) => i + 1);
      resetColors();
      map_elem.resetColors();
      const value = this.getAttribute('value');
      if (value === 'BarChart1') {
        console.log('BarChart1');
        makeTable(app.current_data, app.current_config);
        chart = new BarChart1(app.current_data); // eslint-disable-line no-param-reassign
        bindUI_BarChart1(chart, map_elem);
        map_elem.bindBrush(chart);
        chart.bindMap(map_elem);
      } else if (value === 'BubbleChart1') {
        console.log('BubbleChart1');
        makeTable(app.current_data, app.current_config);
        chart = new BubbleChart1(app.current_data); // eslint-disable-line no-param-reassign
        bindUI_BubbleChart1(chart, map_elem);
        map_elem.bindBrush(chart);
        chart.bindMap(map_elem);
      }
    });
}

loadData();
