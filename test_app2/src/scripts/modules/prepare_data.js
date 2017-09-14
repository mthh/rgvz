export function prepare_dataset(full_dataset, app) {
  app.full_dataset = full_dataset; // eslint-disable-line no-param-reassign
  // Create an Object feature_id ->  feature_name:
  app.feature_names = {}; // eslint-disable-line no-param-reassign
  full_dataset.forEach((elem) => {
    app.feature_names[elem.geo] = elem.Nom; // eslint-disable-line no-param-reassign
  });
}

export function filter_no_empty(app) {
  const { num, denum, ratio, my_region, current_level } = app.current_config;
  const filtered_data = app.full_dataset.filter(ft => +ft.level === current_level).map(ft => ({
    id: ft.geo,
    name: ft.Nom,
    num: +ft[num],
    denum: +ft[denum] / 1000,
    ratio: +ft[ratio],
  })).filter((ft) => {
    if (ft.id === my_region) {
      app.current_config.ref_value = ft.ratio; // eslint-disable-line no-param-reassign
    }
    return ft.ratio;
  });
  app.serie_inversed = false; // eslint-disable-line no-param-reassign
  filtered_data.sort((a, b) => a.ratio - b.ratio);
  filtered_data.forEach((d, i) => { d.rang = i + 1; }); // eslint-disable-line no-param-reassign
  return filtered_data;
}
