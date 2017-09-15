import { math_round } from './helpers';
import { color_highlight } from './options';


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
  app.full_dataset = full_dataset; // eslint-disable-line no-param-reassign
  // Create an Object feature_id ->  feature_name for easier lookup:
  app.feature_names = {}; // eslint-disable-line no-param-reassign
  full_dataset.forEach((elem) => {
    app.feature_names[elem.geo] = elem.Nom; // eslint-disable-line no-param-reassign
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
export function filter_no_empty(app) {
  // Fetch the name(s) of the ratio (and associated num and denum variable),
  // the name of the targeted region and the current level :
  const { num, denum, ratio, my_region, current_level } = app.current_config;
  // Prepare the data:
  const temp = app.full_dataset.filter(ft => +ft.level === current_level).map(ft => ({
    id: ft.geo,
    name: ft.Nom,
    num: +ft[num],
    denum: +ft[denum] / 1000,
    ratio: +ft[ratio],
  }));
  // Filter data for empty values :
  const filtered_data = temp.filter((ft) => {
    if (ft.id === my_region) {
      // eslint-disable-next-line no-param-reassign
      app.current_config.ref_value = ft.ratio;
    }
    return ft.ratio;
  });
  // Sort the serie according to the current "inversed" state on the displayed chart:
  if (!app.serie_inversed) {
    filtered_data.sort((a, b) => a.ratio - b.ratio);
  } else {
    filtered_data.sort((a, b) => b.ratio - a.ratio);
  }
  // eslint-disable-next-line no-param-reassign
  filtered_data.forEach((d, i) => { d.rang = i + 1; });
  // Compute the ratio of available values ("complétude") within
  // the study zone selected by the user:
  // eslint-disable-next-line no-param-reassign
  app.completude = math_round((filtered_data.length / temp.length) * 1000) / 10;
  return filtered_data;
}


/**
* Apply a filter (ie. restrict the study zone) on the dataset to be used.
*
* @param {String} filter_type - The name of the filter to use.
* @return {void}
*
*/
export function applyFilter(app, filter_type) {
  // eslint-disable-next-line no-param-reassign
  app.current_data = filter_no_empty(app);
  if (filter_type === 'no_filter') {
    // eslint-disable-next-line no-unused-expressions
    null; // Don't filter anything..
  } else if (filter_type === 'filter_FR') {
    // eslint-disable-next-line no-param-reassign
    app.current_data = app.current_data.filter(d => d.id.indexOf('FR') > -1);
  } else {
    let a = math_round(Math.random() * 50);
    let b = math_round(Math.random() * 101);
    if (a > b) [a, b] = [b, a];
    // eslint-disable-next-line no-param-reassign
    app.current_data = app.current_data.slice(a, b);
    const maybe_my_region = app.current_data.filter(
      d => d.id === app.current_config.my_region)[0];
    if (maybe_my_region === undefined) {
      app.current_data.push(
        app.full_dataset.filter(d => d.geo === app.current_config.my_region)[0]);
    }
  }
  // eslint-disable-next-line no-param-reassign
  app.current_ids = app.current_data.map(d => d.id);
  // eslint-disable-next-line no-param-reassign
  app.current_ranks = app.current_data.map((d, i) => i + 1);
  if (!app.serie_inversed) {
    app.current_data.sort((a, b) => a.ratio - b.ratio);
  } else {
    app.current_data.sort((a, b) => b.ratio - a.ratio);
  }
  // eslint-disable-next-line no-param-reassign
  app.colors = {};
  // eslint-disable-next-line no-param-reassign
  app.colors[app.current_config.my_region] = color_highlight;
}
