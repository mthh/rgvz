import { math_round } from './helpers';
import { color_highlight } from './options';
import { variables } from './../main';

/* eslint-disable no-param-reassign */

/**
* Attach the full_dataset Array to the app Object and create a dictionnary
* allowing to obtain territorial units name from their Id.
*
* @param {Array} full_dataset - The dataset as an Array of Object
* @param {Object} app - The variable containing the global parameters about
*   the current state of the application.
* @return {void}
*
*/
export function prepare_dataset(full_dataset, app) {
  app.full_dataset = full_dataset;
  // Create an Object feature_id ->  feature_name for easier lookup:
  app.feature_names = {};
  full_dataset.forEach((elem) => {
    app.feature_names[elem.geo] = elem.Nom;
  });
}


/**
* Attach the full_dataset Array to the app Object and create a dictionnary
* allowing to obtain territorial units name from their Id.
*
* @param {Object} app - The variable containing the global parameters about
*   the current state of the application.
* @return {Array} - The filtered data, containing only the requested variables
*   for the feature of the current study zone,
*    without features containing empty ratios.
*
*/
export function filter_no_empty(app, filter_id) {
  // Fetch the name(s) of the ratio (and associated num and denum variable),
  // the name of the targeted region and the current level :
  const {
    num, denum, ratio, current_level, id_field, filter, name_field,
  } = app.current_config;

  const all_variables = ratio.concat(num).concat(denum);

  // Prepare the data:
  let temp;
  if (filter_id) {
    temp = app.full_dataset
      .filter(ft => +ft.level === current_level && filter_id.indexOf(ft[id_field]) > -1);
  } else if (filter) {
    const { key, value } = filter;
    temp = app.full_dataset
      .filter(ft => +ft.level === current_level && ft[key] === value);
  } else {
    temp = app.full_dataset
      .filter(ft => +ft.level === current_level);
  }
  temp = temp.map((ft) => {
    const props_feature = {
      id: ft[id_field],
      name: ft[name_field],
    };
    for (let i = 0, len_i = all_variables.length; i < len_i; i++) {
      props_feature[all_variables[i]] = +ft[all_variables[i]];
    }
    return props_feature;
  });

  // Filter data for empty values :
  const filtered_data = temp.filter(
    ft => ratio.map(v => !!ft[v]).every(v => v === true));
  console.log(filtered_data);
  // // Sort the serie according to the current "inversed" state on the displayed chart:
  // if (!app.serie_inversed) {
  //   filtered_data.sort((a, b) => a.ratio - b.ratio);
  // } else {
  //   filtered_data.sort((a, b) => b.ratio - a.ratio);
  // }
  // filtered_data.forEach((d, i) => { d.rang = i + 1; });

  //
  app.current_data = filtered_data;
  // Store the ids and the ranks of the current features in two arrays for easier acces:
  app.current_ids = filtered_data.map(d => d.id);

  // Compute the ratio of available values ("complétude") within
  // the study zone selected by the user:
  app.completude = math_round((filtered_data.length / temp.length) * 1000) / 10;
  // return filtered_data;
}


/**
* Set and apply a new filter (ie. restrict the study zone) on the dataset to be used.
*
* @param {String} filter_type - The name of the filter to use.
* @return {void}
*
*/
export function applyFilter(app, filter_type) {
  if (filter_type === 'filter_FR') {
    app.current_config.filter = { key: 'PAYS', value: 'FR' };
    filter_no_empty(app);
  } else if (filter_type === 'no_filter') {
    app.current_config.filter = null;
    filter_no_empty(app);
  } else {
    app.current_config.filter = { key: 'type_test', value: `3` };
    filter_no_empty(app);
    const maybe_my_region = app.current_data.filter(
      d => d.id === app.current_config.my_region)[0];
    if (maybe_my_region === undefined) {
      app.current_data.push(
        app.full_dataset.filter(d => d.geo === app.current_config.my_region)[0]);
      app.current_ids = app.current_data.map(d => d.id);
    }
  }

  // if (!app.serie_inversed) {
  //   app.current_data.sort((a, b) => a.ratio - b.ratio);
  // } else {
  //   app.current_data.sort((a, b) => b.ratio - a.ratio);
  // }
  app.colors = {};
  app.colors[app.current_config.my_region] = color_highlight;
}

// TODO : Doc
export function changeRegion(app, id_region) {
  app.current_config.my_region = id_region;
  app.current_config.my_region_pretty_name = app.feature_names[app.current_config.my_region];
  // Reset the color to use on the chart/map:
  app.colors = {};
  app.colors[app.current_config.my_region] = color_highlight;
  // app.current_data = filter_no_empty(app);
  // Change the reference ratio value:

  // app.current_config.ref_value = app.current_data
  //   .filter(d => d.id === app.current_config.my_region)
  //   .map(d => d.ratio)[0];
}

export function addVariable(app, code_ratio) {
  const variable_info = variables.filter(d => d.ratio === code_ratio)[0];
  app.colors = {};
  app.colors[app.current_config.my_region] = color_highlight;
  app.current_config.num.push(variable_info.num);
  app.current_config.denum.push(variable_info.denum);
  app.current_config.ratio.push(variable_info.ratio);
  app.current_config.ratio_pretty_name.push(variable_info.name);
  filter_no_empty(app);
}

export function removeVariable(app, code_ratio) {
  const ix = app.current_config.ratio.map(
    (d, i) => [d, i]).filter(d => d[0] === code_ratio)[1];
  app.current_config.num.splice(ix, 1);
  app.current_config.denum.splice(ix, 1);
  app.current_config.ratio.splice(ix, 1);
  app.current_config.ratio_pretty_name.splice(ix, 1);
  filter_no_empty(app);
}

/* eslint-enable no-param-reassign */
