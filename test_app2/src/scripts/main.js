// import debug from 'debug';
import tingle from 'tingle.js';
import { createMenu } from './modules/menuleft';
import { makeTopMenu, makeHeaderChart, makeHeaderMapSection } from './modules/menutop';
import { MapSelect, makeSourceSection, makeMapLegend, svg_map } from './modules/map';
import { makeTable } from './modules/table';
import { color_highlight } from './modules/options';
import { BarChart1 } from './modules/charts/barChart_1v';
import { BubbleChart1 } from './modules/charts/bubbleChart_1v';
import { ScatterPlot2 } from './modules/charts/scatterPlot_2v';
import { RadarChart3 } from './modules/charts/radarChart_3v';
import { SimilarityChart } from './modules/charts/similarity_2v';
import { Similarity1plus } from './modules/charts/similarity1v';
// import { BoxPlot1 } from './modules/charts/boxPlot_1v';
// import { ParallelCoords2 } from './modules/charts/parallelCoords_2v';
import { unbindUI } from './modules/helpers';
import {
  prepare_dataset,
  filterLevelVar,
  applyFilter,
  changeRegion,
  addVariable,
  removeVariable,
  resetVariables,
  prepareVariablesInfo,
} from './modules/prepare_data';

export let variables_info;

const study_zones = [
  { id: 'no_filter', name: 'UE28' },
  { id: 'filter_FR', name: 'Filtre national (France)' },
  { id: 'filter_param2', name: 'Espace de comparaison n°2' },
  { id: 'filter_dist', name: 'Région dans un rayon de ' },
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

function setDefaultConfig(code = 'FRE', variable = 'RT_CHOM_1574') { // }, level = 'NUTS1') {
  app.current_config = {
    // The name of the field of the dataset containing the ID of each feature:
    id_field: 'geo',
    // The name of the field of the dataset containing the name of each feature:
    name_field: 'Nom',
    // The name of the field of the dataset containing the population of each feature:
    pop_field: 'POP_AGE_T_2016',
    // The name of the field of the geojson layer containing the ID of each feature
    // (these values should match with the values of the "id_field" in the
    // tabular dataset)
    id_field_geom: 'NUTS1_2016',
    num: ['CHOM_1574_2016'],
    denum: ['ACT_1574_2016'],
    ratio: [variable],
    ratio_pretty_name: ['Taux de chômage (15-74 ans) (2016)'],
    // The level currently in use:
    current_level: 1,
    // The ID of the region currently in use:
    my_region: code,
    // The name of the region currently in use:
    my_region_pretty_name: app.feature_names[code],
    // How many ratio on the current chart:
    nb_var: 1,
  };
  app.colors[app.current_config.my_region] = color_highlight;
}

function setDefaultConfigMenu(code = 'FRE', variable = 'RT_CHOM_1574', level = 'NUTS1') {
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
* Function to select the first variable on the left menu
* (triggered after changing region, if no more variable was selected)
*
* @return {void}
*/
function selectFirstAvailableVar() {
  const menu = document.querySelector('#menu');
  const v = menu.querySelectorAll('.target_variable');
  for (let i = 0; i < v.length; i++) {
    if (!v[i].classList.contains('disabled')) {
      v[i].classList.add('checked');
      return v[i].getAttribute('value');
    }
  }
}

/**
* Function to update the availables ratios in the left menu (after changing region)
* If a selected variable is not available anymore it will be deselected.
* If there selected variable (all the previously selected variables are unavailable for this region)
* the first variable on the menu will be selected.
* If the new number of selected feature is inferior to the number of variables on the current
* chart, a new chart (suitable for only 1 variable) will be selected.
*
*
* @param {String} my_region - The ID of the newly selected region.
* @return {Number} - The new number of selected ratios.
*
*/
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
    let new_var_names;
    if (new_var.length === 0) {
      const name = selectFirstAvailableVar();
      new_var_names = [name];
    } else {
      new_var_names = Array.prototype.slice.call(
        new_var).map(elem => elem.getAttribute('value'));
    }
    resetVariables(app, new_var_names);
  }
  return new_var.length;
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
        if (filter_type === 'filter_dist') {
          const input_elem = document.getElementById('dist_filter');
          input_elem.removeAttribute('disabled');
          const dist = +input_elem.value;
          const ids = map_elem.getUnitsWithin(dist);
          applyFilter(app, ids);
        } else {
          document.getElementById('dist_filter').setAttribute('disabled', 'disabled');
          applyFilter(app, filter_type);
        }
        makeTable(app.current_data, app.current_config);
        chart.changeStudyZone();
        chart.updateCompletude();
      }
    });

  d3.select('#dist_filter')
    .on('change, keyup', function () {
      const ids = map_elem.getUnitsWithin(+this.value);
      applyFilter(app, ids);
      makeTable(app.current_data, app.current_config);
      chart.changeStudyZone();
      chart.updateCompletude();
    });

  // User change the targeted region:
  d3.selectAll('span.target_region')
    .on('click', function () {
      if (!this.classList.contains('checked')) {
        d3.selectAll('span.target_region').attr('class', 'target_region square');
        this.classList.add('checked');
        const id_region = this.getAttribute('value');
        changeRegion(app, id_region, map_elem);
        // Update the availables ratio on the left menu
        // (this may change the current selected ratio(s) as some variables are
        // not available for some features) and fetch the number of selected
        // variables after that:
        const new_nb_var = updateAvailablesRatios(id_region);
        if (new_nb_var >= app.current_config.nb_var) {
          chart.updateChangeRegion();
        } else {
          // If there fewer selected variables than requested by the current chart,
          // redraw the first (default) kind of chart:
          d3.select('span.chart_t1[value="BarChart1"]').dispatch('click');
        }
      }
    });

  // User click on the name of a group of variables
  // to expand or collapse its content:
  d3.selectAll('.name_group_var')
    .on('click', function () {
      const group_var = this.nextSibling;
      if (group_var.style.display === 'none') {
        group_var.style.display = null;
      } else {
        group_var.style.display = 'none';
      }
    });

  // User click to add/remove a variable from the comparison:
  d3.selectAll('span.target_variable')
    .on('click', function () {
      if (this.classList.contains('disabled')) return;
      let nb_var = Array.prototype.slice.call(
        document.querySelectorAll('span.target_variable')).filter(
          elem => !!elem.classList.contains('checked')).length;
      // Select a new variable and trigger the appropriate changes on the current chart:
      if (!this.classList.contains('checked')) {
        // We don't want the user to be able to select more than 8 variables simultaneously:
        if (nb_var >= 8) return;
        this.classList.add('checked');
        const code_variable = this.getAttribute('value');
        const name_variable = variables_info.find(d => d.ratio === code_variable).name;
        addVariable(app, code_variable);
        makeTable(app.current_data, app.current_config);
        chart.addVariable(code_variable, name_variable);
        nb_var += 1;
      } else { // Remove a variable from the selection:
        nb_var -= 1;
        // We don't want to let the user remove the variable if
        // it's the only one selected or if the currently displayed
        // chart need a minimum number of variables:
        if (nb_var < app.current_config.nb_var) {
          return;
        }
        const code_variable = this.getAttribute('value');
        this.classList.remove('checked');
        removeVariable(app, code_variable);
        chart.removeVariable(code_variable);
        makeTable(app.current_data, app.current_config);
      }
      // Update the top menu to display available charts according to the current
      // number of available variables:
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
        if (map_elem.brush_map) {
          svg_map.select('.brush_map').style('display', null);
        }
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
        if (map_elem.brush_map) {
          svg_map.select('.brush_map').call(map_elem.brush_map.move, null);
          svg_map.select('.brush_map').style('display', 'none');
        }
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
        if (map_elem.brush_map) {
          svg_map.select('.brush_map').call(map_elem.brush_map.move, null);
          svg_map.select('.brush_map').style('display', 'none');
        }
        map_elem.target_layer.selectAll('path')
          .on('click', function (d) {
            chart.handleClickMap(d, this);
          });
      }
    });

  if (!map_elem.brush_map) {
    if (chart.handleClickMap) {
      map_elem.target_layer.selectAll('path')
        .on('click', function (d) {
          chart.handleClickMap(d, this);
        });
    } else {
      map_elem.target_layer.selectAll('path')
        .on('click', null);
    }
  }

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
* @param {Object} chart -
* @param {Object} map_elem -
* @return {void}
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
        map_elem.bindBrushClick(chart);
        chart.bindMap(map_elem);
      } else if (value === 'BubbleChart1') {
        console.log('BubbleChart1');
        makeTable(app.current_data, app.current_config);
        chart = new BubbleChart1(app.current_data); // eslint-disable-line no-param-reassign
        bindUI_chart(chart, map_elem);
        map_elem.bindBrushClick(chart);
        chart.bindMap(map_elem);
      } else if (value === 'ScatterPlot2') {
        console.log('ScatterPlot2');
        makeTable(app.current_data, app.current_config);
        chart = new ScatterPlot2(app.current_data); // eslint-disable-line no-param-reassign
        bindUI_chart(chart, map_elem);
        map_elem.bindBrushClick(chart);
        chart.bindMap(map_elem);
      } else if (value === 'RadarChart3') {
        console.log('RadarChart3');
        makeTable(app.current_data, app.current_config);
        chart = new RadarChart3(app.current_data);
        bindUI_chart(chart, map_elem);
        map_elem.bindBrushClick(chart);
        chart.bindMap(map_elem);
      } else if (value === 'SimilarityChart') {
        console.log('SimilarityChart');
        makeTable(app.current_data, app.current_config);
        chart = new SimilarityChart(app.current_data);
        bindUI_chart(chart, map_elem);
        map_elem.bindBrushClick(chart);
        chart.bindMap(map_elem);
      } else if (value === 'Similarity1plus') {
        console.log('Similarity1plus');
        makeTable(app.current_data, app.current_config);
        chart = new Similarity1plus(app.current_data);
        bindUI_chart(chart, map_elem);
        map_elem.bindBrushClick(chart);
        chart.bindMap(map_elem);
      }
      //  else if (value === 'ParallelCoords2') {
      //   console.log('ParallelCoords2');
      //   // makeTable(app.current_data, app.current_config);
      //   chart = new ParallelCoords2(app.current_data);
      //   bindUI_chart(chart, map_elem);
      //   map_elem.bindBrushClick(chart);
      //   chart.bindMap(map_elem);
      // } else if (value === 'BoxPlot1') {
      //   console.log('BoxPlot1');
      //   makeTable(app.current_data, app.current_config);
      //   chart = new BoxPlot1(app.current_data);
      //   bindUI_chart(chart, map_elem);
      //   map_elem.bindBrushClick(chart);
      //   chart.bindMap(map_elem);
      // }
    });
}


function loadData() {
  d3.queue(4)
    .defer(d3.csv, 'data/REGIOVIZ_DATA.csv')
    .defer(d3.json, 'data/cget-nuts1-3035.geojson')
    .defer(d3.json, 'data/countries3035.geojson')
    .defer(d3.json, 'data/remote3035.geojson')
    .defer(d3.json, 'data/template3035.geojson')
    .defer(d3.json, 'data/sea_boxes.geojson')
    .defer(d3.csv, 'data/indicateurs_meta.csv')
    .defer(d3.csv, 'data/nuts2_aggreg.csv')
    .awaitAll((error, results) => {
      if (error) throw error;
      const [
        full_dataset, nuts1, countries, remote, template, seaboxes, metadata_indicateurs, agg_n2,
      ] = results;
      app.agg_n2 = agg_n2;
      variables_info = prepareVariablesInfo(metadata_indicateurs);
      prepare_dataset(full_dataset, app);
      setDefaultConfig('FRB', 'RT_CHOM_1574', 'NUTS1');
      const features_menu = full_dataset.filter(ft => ft.geo.indexOf('FR') > -1
        && +ft.level === app.current_config.current_level);
      createMenu(features_menu, variables_info, study_zones, territorial_mesh);
      bindHelpMenu();
      makeTopMenu();
      makeHeaderChart();
      setDefaultConfigMenu('FRB', 'RT_CHOM_1574', 'NUTS1');
      filterLevelVar(app);
      console.log(app);
      const map_elem = new MapSelect(nuts1, countries, remote, template, seaboxes);
      const chart = new BarChart1(app.current_data);
      makeTable(app.current_data, app.current_config);
      makeHeaderMapSection();
      makeSourceSection();
      makeMapLegend();
      bindUI_chart(chart, map_elem);
      map_elem.bindBrushClick(chart);
      chart.bindMap(map_elem);
    });
}

function bindHelpMenu() {
  const help_buttons_var = document.querySelector('#menu_variables').querySelectorAll('span.i_info');
  Array.prototype.slice.call(help_buttons_var).forEach((btn_i) => {
    // eslint-disable-next-line no-param-reassign
    btn_i.onclick = function () {
      const code_variable = this.previousSibling.previousSibling.getAttribute('value');
      const o = variables_info.find(d => d.ratio === code_variable);
      // eslint-disable-next-line new-cap
      const modal = new tingle.modal({
        stickyFooter: false,
        closeMethods: ['overlay', 'button', 'escape'],
        closeLabel: 'Close',
        onOpen() {
          document.querySelector('div.tingle-modal.tingle-modal--visible').style.background = 'rgba(0,0,0,0.4)';
        },
        onClose() {
          modal.destroy();
        },
      });
      modal.setContent(
        `<p style="font-family: 'Signika',sans-serif;color: #4f81bd;font-size: 1.3rem;">Description de l'indicateur</p>
        <p style="font-family: 'Signika',sans-serif;text-align: justify;">${o.methodo.split('\n').join('<br>')}</p>
        <p style="font-family: 'Signika',sans-serif;font-size: 0.8em">${o.source}</p>
        <p style="font-family: 'Signika',sans-serif;font-size: 0.8em">Date de téléchargement de la données : ${o.last_update}</p>`);
      modal.open();
    };
  });

  const helps_buttons_study_zone = document.querySelector('#menu_studyzone').querySelectorAll('span.i_info');
  Array.prototype.slice.call(helps_buttons_study_zone).forEach((btn_i) => {
    // eslint-disable-next-line no-param-reassign
    btn_i.onclick = function () {
      const filter_name = this.previousSibling.previousSibling.getAttribute('filter-value');
      // eslint-disable-next-line new-cap
      const modal = new tingle.modal({
        stickyFooter: false,
        closeMethods: ['overlay', 'button', 'escape'],
        closeLabel: 'Close',
        onOpen() {
          document.querySelector('div.tingle-modal.tingle-modal--visible').style.background = 'rgba(0,0,0,0.4)';
        },
        onClose() {
          modal.destroy();
        },
      });
      modal.setContent(
        `<p style="font-family: 'Signika',sans-serif;color: #4f81bd;font-size: 1.3rem;">Méthodologie</p>
        <p style="font-family: 'Signika',sans-serif;text-align: justify;">${filter_name}</p>`);
      modal.open();
    };
  });

  const helps_buttons_territ_unit = document.querySelector('#menu_territ_level').querySelectorAll('span.i_info');
  Array.prototype.slice.call(helps_buttons_territ_unit).forEach((btn_i) => {
    // eslint-disable-next-line no-param-reassign
    btn_i.onclick = function () {
      const territ_level_name = this.previousSibling.previousSibling.getAttribute('value');
      // eslint-disable-next-line new-cap
      const modal = new tingle.modal({
        stickyFooter: false,
        closeMethods: ['overlay', 'button', 'escape'],
        closeLabel: 'Close',
        onOpen() {
          document.querySelector('div.tingle-modal.tingle-modal--visible').style.background = 'rgba(0,0,0,0,0.4)';
        },
        onClose() {
          modal.destroy();
        },
      });
      modal.setContent(`
        <p style="font-family: 'Signika',sans-serif; color: #4f81bd;font-size: 1.3rem;">Titre</p>
        <p style="font-family: 'Signika',sans-serif;text-align: justify;">${territ_level_name}</p>`);
      modal.open();
    };
  });
}

loadData();
