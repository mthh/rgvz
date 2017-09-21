import debug from 'debug';
import { createMenu } from './modules/menuleft';
import { makeTopMenu, makeHeaderChart, makeHeaderMapSection } from './modules/menutop';
import { makeTable } from './modules/table';
import { prepare_dataset, filterLevelVar, applyFilter, changeRegion, addVariable, removeVariable, resetVariables } from './modules/prepare_data';
import { MapSelect, makeSourceSection, makeMapLegend, svg_map } from './modules/map';
import { color_countries, color_highlight } from './modules/options';
import { BarChart1 } from './modules/charts/barChart_1v';
import { BubbleChart1 } from './modules/charts/bubbleChart_1v';
import { ScatterPlot2 } from './modules/charts/scatterPlot_2v';
import { unbindUI } from './modules/helpers';

debug('app:log');

export const variables = [
  { ratio: 'PC_CHOM_1524_2015', num: 'CHOM_1524_2015', denum: 'ACT_1524_2015', name: 'Taux de chomage des jeunes (2015)', group: 'Pauvreté / Exclusion sociale' },
  { ratio: 'PC_CHOM_1574_2015', num: 'CHOM_1574_2015', denum: 'ACT_1574_2015', name: 'Taux de chomage (2015)', group: 'Pauvreté / Exclusion sociale' },
  { ratio: 'PC_CHOM_LONG_2016', num: 'CHOM_LONG_2016', denum: 'ACT_LONG_2016', name: 'Taux de chômage de longue durée (2016)', group: 'Pauvreté / Exclusion sociale' },
  { ratio: 'PC_REV_2014', num: 'REV_2014', denum: 'MEN_2014', name: 'Revenu des ménages (2014)', group: 'Pauvreté / Exclusion sociale' },
  { ratio: 'PC_BREV_HAB_2011', num: 'BREV_2011', denum: 'POP_BREV_2011', name: 'Productions innovantes (2011)', group: 'Activité / Innovation' },
  { ratio: 'PC_RD_EMP_2013', num: 'RD_EMP_2013', denum: 'POP_RD_EMP_2013', name: 'Part de l\'emploi en R&D (2013)', group: 'Activité / Innovation' },
  { ratio: 'PC_PIB_HAB_2014', num: 'PC_PIB_HAB_2014', denum: 'POP_PIB_2014', name: 'PIB par habitant (euros)(2014)', group: 'Activité / Innovation' },
  { ratio: 'PC_ARTIF_AREA_2015', num: 'ARTIF_AREA_2015', denum: 'LC_AREA_2015', name: 'Part des surfaces artificialisées (2015)', group: 'Environnement / Transition écologique' },
];


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
  // A mapping id -> color, containing the color to use for each
  // feature not using the default color or the disabled color
  colors: {},
  // The filtered dataset (acccording to: the current territorial level,
  // the filter key (if any) and the ratio(s) selected on the left menu:
  current_data: [],
  // The full dataset provided (containing all the features at any level in one table)
  // Row without data are expected to be empty or to contain the "NA" string.
  full_dataset: [],
  // The ids of the current feature in use (acccording to: the current territorial level,
  // the filter key (if any) and the ratio(s) used in the current chart; filtered
  // to not contain feature with empty ratio values within the ratios in use).
  current_ids: [],
};

function setDefaultConfig(code = 'FRE', variable = 'PC_CHOM_1524_2015') { // }, level = 'NUTS1') {
  app.current_config = {
    // The name of the field of the dataset containing the ID of each feature:
    id_field: 'geo',
    // The name of the field of the dataset containing the name of each feature:
    name_field: 'Nom',
    // The name of the field of the dataset containing the population of each feature:
    pop_field: '',
    // The name of the field of the geojson layer containing the ID of each feature
    // (these values should match with the values of the "id_field" in the
    // tabular dataset)
    id_field_geom: 'NUTS1_2016',
    num: ['CHOM_1524_2015'],
    denum: ['ACT_1524_2015'],
    ratio: [variable],
    ratio_pretty_name: ['Taux de chômage des jeunes (2015)'],
    // The level currently in use:
    current_level: 1,
    // The ID of the region currently in use:
    my_region: code,
    // The name of the region currently in use:
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


export function resetColors() {
  app.colors = {};
  // for (let i = 0, len_i = current_ids.length; i < len_i; i++) {
  //   app.colors[current_ids[i]] = color_countries;
  // }
  app.colors[app.current_config.my_region] = color_highlight;
}

/**
* Create handlers for user event on the left menu and on the map for charts only
* allowing to use 1 variable.
*
* @param {Object} chart - The chart object.
* @param {Object} map_elem - The map object.
* @return {void}
*
*/
function bindUI_chart(chart, map_elem) {
  // User change the study zone:
  d3.selectAll('span.filter_v')
    .on('click', function () {
      if (!this.classList.contains('checked')) {
        d3.selectAll('span.filter_v').attr('class', 'filter_v square');
        this.classList.add('checked');
        const filter_type = this.getAttribute('filter-value');
        applyFilter(app, filter_type);
        makeTable(app.current_data, app.current_config);
        chart.changeStudyZone();
        chart.updateCompletude();
      }
    });

  // User change the targeted region:
  d3.selectAll('span.target_region')
    .on('click', function () {
      if (!this.classList.contains('checked')) {
        d3.selectAll('span.target_region').attr('class', 'target_region square');
        this.classList.add('checked');
        const id_region = this.getAttribute('value');
        changeRegion(app, id_region);
        updateAvailablesRatios(id_region);
        chart.updateChangeRegion();
      }
    });

  // User click to add/remove a variable from the comparison:
  d3.selectAll('span.target_variable')
    .on('click', function () {
      if (this.classList.contains('disabled')) return;
      if (!this.classList.contains('checked')) {
        this.classList.add('checked');
        const code_variable = this.getAttribute('value');
        const name_variable = variables.filter(d => d.ratio === code_variable)[0].name;
        addVariable(app, code_variable);
        makeTable(app.current_data, app.current_config);
        chart.addVariable(code_variable, name_variable);
      } else {
        // We don't want to allow the user to remove the variable if
        // it's the only one selected:
        const last_one = Array.prototype.slice.call(
          document.querySelectorAll('span.target_variable')).filter(
            elem => !!elem.classList.contains('checked')).length === 1;
        if (last_one) {
          return;
        }
        this.classList.remove('checked');
        const code_variable = this.getAttribute('value');
        removeVariable(app, code_variable);
        makeTable(app.current_data, app.current_config);
        chart.removeVariable(code_variable);
      }
      const nb_var = Array.prototype.slice.call(
        document.querySelectorAll('span.target_variable')).filter(
          elem => !!elem.classList.contains('checked')).length;
      if (nb_var === 1) { // Allow all kind of vizu with 1 variable:
        d3.selectAll('.chart_t1')
          .attr('class', 'type_chart chart_t1');
        d3.selectAll('.chart_t2')
          .attr('class', 'type_chart chart_t2 disabled');
        d3.selectAll('.chart_t3')
          .attr('class', 'type_chart chart_t3 disabled');
      } else if (nb_var === 2) { // Allow all kind of vizu with 2 variables:
        d3.selectAll('.chart_t2')
          .attr('class', 'type_chart chart_t2');
        d3.selectAll('.chart_t3')
          .attr('class', 'type_chart chart_t3 disabled');
      } else if (nb_var > 2) { // Allow all kind of vizu with 3 variables:
        d3.selectAll('.chart_t2')
          .attr('class', 'type_chart chart_t2');
        d3.selectAll('.chart_t3')
          .attr('class', 'type_chart chart_t3');
      }
    });

  // Dispatch a click event on the associated checkbox when the text is clicked:
  d3.selectAll('span.label_chk')
    .on('click', function () {
      this.previousSibling.click();
    });

  const header_map_section = d3.select('#map_section > #header_map');

  header_map_section.select('#img_rect_selec')
    .on('click', function () {
      if (!this.classList.contains('active')) {
        this.classList.add('active');
        document.getElementById('img_map_zoom').classList.remove('active');
        document.getElementById('img_map_select').classList.remove('active');
        svg_map.on('.zoom', null);
        svg_map.select('.brush_map').style('display', null);
        map_elem.target_layer.selectAll('path').on('click', null);
      }
    });

  header_map_section.select('#img_map_zoom')
    .on('click', function () {
      if (!this.classList.contains('active')) {
        this.classList.add('active');
        document.getElementById('img_rect_selec').classList.remove('active');
        document.getElementById('img_map_select').classList.remove('active');
        svg_map.call(map_elem.zoom_map);
        svg_map.select('.brush_map').call(map_elem.brush_map.move, null);
        svg_map.select('.brush_map').style('display', 'none');
        map_elem.target_layer.selectAll('path').on('click', null);
      }
    });

  header_map_section.select('#img_map_select')
    .on('click', function () {
      if (!this.classList.contains('active')) {
        this.classList.add('active');
        document.getElementById('img_rect_selec').classList.remove('active');
        document.getElementById('img_map_zoom').classList.remove('active');
        svg_map.on('.zoom', null);
        svg_map.select('.brush_map').call(map_elem.brush_map.move, null);
        svg_map.select('.brush_map').style('display', 'none');
        map_elem.target_layer.selectAll('path')
          .on('click', function (d) { chart.handleClickMap(d, this); });
      }
    });

  const header_table_section = d3.select('#map_section')
      .insert('p', 'svg')
      .attr('id', 'header_table')
      .styles({ display: 'none', margin: 'auto', 'text-align': 'right' });

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
  bindTopButtons(chart, map_elem);
}

/**
* Function to handle click on the top menu, in order to choose
* the kind of availables representation
*
*
*
*/
export function bindTopButtons(chart, map_elem) {
  d3.selectAll('.type_chart')
    .on('click', function () {
      if (this.classList.contains('disabled')) return;
      chart.remove();
      chart = null; // eslint-disable-line no-param-reassign
      unbindUI();
      map_elem.resetZoom();
      app.colors = {};
      const value = this.getAttribute('value');
      if (value === 'BarChart1') {
        console.log('BarChart1');
        makeTable(app.current_data, app.current_config);
        chart = new BarChart1(app.current_data); // eslint-disable-line no-param-reassign
        bindUI_chart(chart, map_elem);
        map_elem.bindBrush(chart);
        chart.bindMap(map_elem);
      } else if (value === 'BubbleChart1') {
        console.log('BubbleChart1');
        makeTable(app.current_data, app.current_config);
        chart = new BubbleChart1(app.current_data); // eslint-disable-line no-param-reassign
        bindUI_chart(chart, map_elem);
        map_elem.bindBrush(chart);
        chart.bindMap(map_elem);
      } else if (value === 'ScatterPlot2') {
        console.log('ScatterPlot2');
        makeTable(app.current_data, app.current_config);
        chart = new ScatterPlot2(app.current_data); // eslint-disable-line no-param-reassign
        bindUI_chart(chart, map_elem);
        map_elem.bindBrush(chart);
        chart.bindMap(map_elem);
      } else if (value === 'RadarChart3') {
        console.log('RadarChart3');
        makeTable(app.current_data, app.current_config);
        chart = new ScatterPlot2(app.current_data);
        bindUI_chart(chart, map_elem);
        map_elem.bindBrush(chart);
        chart.bindMap(map_elem);
      }
    });
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
      filterLevelVar(app);
      const map_elem = new MapSelect(nuts1, countries, remote, template, seaboxes);
      const chart = new BarChart1(app.current_data);
      makeTable(app.current_data, app.current_config);
      makeHeaderMapSection();
      makeSourceSection();
      makeMapLegend();
      bindUI_chart(chart, map_elem);
      map_elem.bindBrush(chart);
      chart.bindMap(map_elem);
    });
}

function updateAvailablesRatios(my_region) {
  const data_my_feature = app.full_dataset.filter(
    ft => ft[app.current_config.id_field] === my_region)[0];
  const menu = document.querySelector('#menu');
  const lines = menu.querySelectorAll('.target_variable');
  for (let i = 0, nb_lines = lines.length; i < nb_lines; i++) {
    const code_variable = lines[i].getAttribute('value');
    if (data_my_feature[code_variable] !== undefined
        && data_my_feature[code_variable] !== 'NA') {
      lines[i].classList.remove('disabled');
      lines[i].nextSibling.classList.remove('disabled');
    } else {
      lines[i].classList.remove('checked');
      lines[i].classList.add('disabled');
      lines[i].nextSibling.classList.add('disabled');
    }
  }
  const new_var = menu.querySelectorAll('.target_variable.checked');
  if (new_var.length !== app.current_config.ratio.length) {
    const new_var_names = Array.prototype.slice.call(
      new_var).map(elem => elem.getAttribute('value'));
    resetVariables(app, new_var_names);
  }
}

loadData();
