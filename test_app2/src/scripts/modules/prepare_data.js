import { color_highlight } from './options';
import { variables_info } from './../main';

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
export function filterLevelVar(app, filter_id) {
  // Fetch the name(s) of the ratio (and associated num and denum variable),
  // the name of the targeted region and the current level :
  const {
    num, denum, ratio, current_level, id_field, filter_key, name_field, my_region,
  } = app.current_config;

  const all_variables = ratio.concat(num).concat(denum);

  // Prepare the data:
  let temp;
  if (filter_id) {
    temp = app.full_dataset
      .filter(ft => +ft.level === current_level && filter_id.indexOf(ft[id_field]) > -1);
  } else if (filter_key) {
    const my_category = app.full_dataset.filter(ft => ft[id_field] === my_region)[0][filter_key];
    temp = app.full_dataset
      .filter(ft => +ft.level === current_level && ft[filter_key] === my_category);
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

  app.current_data = temp;
}

/**
* Function to prepare the global "variables_info" Array of objects from the array
* containing the readed 'metadata.csv' file.
*
* @param {Array} metadata_indicateurs - The array return by d3.csv.
* @return {void}
*
*/
export function prepareVariablesInfo(metadata_indicateurs) {
  console.log(metadata_indicateurs);
  return metadata_indicateurs
    .filter(ft => ft['Type statistique'] === 'Ratio')
    .map(ft => ({
      ratio: ft['id'],
      num: `${ft['id1']}_${ft['Année']}`,
      denum: `${ft['id2']}_${ft['Année']}`,
      name: `${ft['Nom']} (${ft['Année']})`,
      group: ft['Thème'],
      methodo: ft['Méthodologie'],
      source: ft['Source'],
      last_update: ft['Dernière mise à jour'],
    }));
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
    app.current_config.filter_key = 'Pays';
    filterLevelVar(app);
  } else if (filter_type === 'no_filter') {
    app.current_config.filter_key = undefined;
    filterLevelVar(app);
  } else {
    app.current_config.filter_key = 'type_test';
    filterLevelVar(app);
  }

  app.colors = {};
  app.colors[app.current_config.my_region] = color_highlight;
}

// TODO : Doc
export function changeRegion(app, id_region) {
  app.current_config.my_region = id_region;
  app.current_config.my_region_pretty_name = app.feature_names[app.current_config.my_region];
  if (app.current_config.filter_key !== undefined) {
    filterLevelVar(app);
  }
  // Reset the color to use on the chart/map:
  app.colors = {};
  app.colors[app.current_config.my_region] = color_highlight;
}

/**
*
*
*
*
*/
export function addVariable(app, code_ratio) {
  const variable_info = variables_info.filter(d => d.ratio === code_ratio)[0];
  app.colors = {};
  app.colors[app.current_config.my_region] = color_highlight;
  app.current_config.num.push(variable_info.num);
  app.current_config.denum.push(variable_info.denum);
  app.current_config.ratio.push(variable_info.ratio);
  app.current_config.ratio_pretty_name.push(variable_info.name);
  filterLevelVar(app);
}

/**
*
*
*
*
*/
export function removeVariable(app, code_ratio) {
  const ix = app.current_config.ratio.indexOf(code_ratio);
  app.current_config.num.splice(ix, 1);
  app.current_config.denum.splice(ix, 1);
  app.current_config.ratio.splice(ix, 1);
  app.current_config.ratio_pretty_name.splice(ix, 1);
  filterLevelVar(app);
}

/**
* Reset the current variables in use.
*
*
*
*/
export function resetVariables(app, codes_ratio) {
  app.colors = {};
  app.colors[app.current_config.my_region] = color_highlight;
  app.current_config.num = [];
  app.current_config.denum = [];
  app.current_config.ratio = [];
  app.current_config.ratio_pretty_name = [];
  for (let i = 0, len = codes_ratio.length; i < len; i++) {
    const code_ratio = codes_ratio[i];
    const variable_info = variables_info.filter(d => d.ratio === code_ratio)[0];
    app.current_config.num.push(variable_info.num);
    app.current_config.denum.push(variable_info.denum);
    app.current_config.ratio.push(variable_info.ratio);
    app.current_config.ratio_pretty_name.push(variable_info.name);
  }
  filterLevelVar(app);
}

/**
* Compute the ratio of available (= not empty) values (the "complétude") within
* the subset currently in use for all the variables in "vars".
*
* @param {Object} app -
* @param {Array} vars -
* @return {Number}
*
*/
export function calcCompletudeSubset(app, vars) {
  const {
    current_level, id_field, filter_key, my_region,
  } = app.current_config;

  // Compute the length of the dataset (within the "study zone" if any):
  let temp;
  if (filter_key) {
    const my_category = app.full_dataset.filter(ft => ft[id_field] === my_region)[0][filter_key];
    temp = app.full_dataset
      .filter(ft => +ft.level === current_level && ft[filter_key] === my_category);
  } else {
    temp = app.full_dataset
      .filter(ft => +ft.level === current_level);
  }
  const total_length = temp.length;

  // Compute the length of the dataset if we filter empty features
  // on all the variables of "vars":
  temp = temp.map((ft) => {
    const props_feature = {
      id: ft[id_field],
    };
    for (let i = 0, len_i = vars.length; i < len_i; i++) {
      props_feature[vars[i]] = +ft[vars[i]];
    }
    return props_feature;
  }).filter(ft => vars.map(ratio_name => !!ft[ratio_name]).every(v => v === true));
  const filtered_length = temp.length;

  // Return the ratio of available values ("complétude") within
  // the study zone selected by the user:
  return Math.round((filtered_length / total_length) * 1000) / 10;
}

/**
* Compute the ratio of population covered by features on which all the variables
* of "vars" are available.
*
* @param {Object} app -
* @param {Array} vars -
* @return {Number}
*
*/
export function calcPopCompletudeSubset(app, vars) {
  const {
    current_level, id_field, filter_key, my_region, pop_field,
  } = app.current_config;

  // Compute the total population stock of the data (within the "study zone" if any):
  let temp;
  if (filter_key) {
    const my_category = app.full_dataset.find(ft => ft[id_field] === my_region)[filter_key];
    temp = app.full_dataset
      .filter(ft => +ft.level === current_level && ft[filter_key] === my_category);
  } else {
    temp = app.full_dataset
      .filter(ft => +ft.level === current_level);
  }
  let total_pop = 0;
  for (let i = 0, len = temp.length; i < len; i++) {
    total_pop += isNaN(+temp[i][pop_field]) ? 0 : +temp[i][pop_field];
  }
  // Compute the population stock of the dataset if we filter empty features
  // on all the variables of "vars":
  temp = temp.map((ft) => {
    const props_feature = {
      id: ft[id_field],
      pop: +ft[pop_field],
    };
    for (let i = 0, len_i = vars.length; i < len_i; i++) {
      props_feature[vars[i]] = +ft[vars[i]];
    }
    return props_feature;
  }).filter(ft => vars.map(ratio_name => !!ft[ratio_name]).every(v => v === true));
  let subset_pop = 0;
  for (let i = 0, len = temp.length; i < len; i++) {
    subset_pop += isNaN(temp[i].pop) ? 0 : temp[i].pop;
  }
  // Return the ratio of population values ("complétude") within
  // the study zone selected by the user:
  return Math.round((subset_pop / total_pop) * 1000) / 10;
}
/* eslint-enable no-param-reassign */
