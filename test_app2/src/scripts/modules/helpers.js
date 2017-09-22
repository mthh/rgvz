import { color_inf, color_sup } from './options';

const math_abs = Math.abs;
const math_round = Math.round;

function prepareTooltip(parent_svg_elem) {
  const tooltip = parent_svg_elem.append('g')
    .attr('class', 'tooltip')
    .style('display', 'none');

  tooltip.append('rect')
    .attrs({ width: 50, height: 40, fill: 'white' })
    .style('opacity', 0.5);

  tooltip.append('text')
    .attrs({ class: 'id_feature', x: 25, dy: '1.2em', 'font-size': '14px' })
    .style('text-anchor', 'middle');

  tooltip.append('text')
    .attrs({
      class: 'value_feature1',
      x: 25,
      dy: '2.4em',
      'font-size': '14px',
      'font-weight': 'bold' })
    .style('text-anchor', 'middle');

  tooltip.append('text')
    .attrs({
      class: 'value_feature2',
      x: 25,
      dy: '3.5em',
      'font-size': '14px',
      'font-weight': 'bold' })
    .style('text-anchor', 'middle');

  tooltip.append('text')
    .attrs({
      class: 'value_feature3',
      x: 25,
      dy: '4.6em',
      'font-size': '14px',
      'font-weight': 'bold' })
    .style('text-anchor', 'middle');

  tooltip.append('text')
    .attrs({
      class: 'value_feature4',
      x: 25,
      dy: '5.7em',
      'font-size': '14px',
      'font-weight': 'bold' })
    .style('text-anchor', 'middle');

  return tooltip;
}

function unbindUI() {
  // Removes the current behavior corresponding to clicking on the left menu:
  d3.selectAll('span.filter_v')
    .on('click', null);
  d3.selectAll('span.target_region')
    .on('click', null);
  d3.selectAll('span.label_chk')
    .on('click', null);

  // Remove the table:
  d3.select('.dataTable-wrapper').remove();

  // Unbind buttons on the top of the map:
  d3.select('#header_map')
    .selectAll('img')
    .on('click', null);

  // Remove the selection menu (or buttons) under the chart:
  d3.select('#bar_section > #menu_selection').remove();

  // Removes the current behavior corresponding to clicking on the top menu:
  d3.selectAll('.type_chart.title_menu').on('click', null);

  // Removes the current behavior corresponding to pressing the Control key:
  document.onkeyup = null;
  document.onkeydown = null;
}

/**
* Function to compare the value of a feature to the reference value (i.e. the value of "my region")
* and return the appropriate color (serie may be inversed)
*
* @param {Number} test_value - The value to be compared to the value of "my region".
* @param {Number} ref_value - The value of my region.
* @param {Boolean} serie_inversed - Whether the serie is inversed or not in the current chart.
* @return {String} - A string containing the color to be used for this value.
*
*/
const comp = (test_value, ref_value, serie_inversed) => {
  if (test_value < ref_value) {
    return serie_inversed ? color_sup : color_inf;
  }
  return serie_inversed ? color_inf : color_sup;
};


/**
* Function to compare the value of a feature to the reference value (i.e. the value of "my region")
* and return the appropriate color (serie may be inversed)
*
* @param {Number} val1 - The value to be compared to the value of "my region" for the 1st variable.
* @param {Number} val2 - The value to be compared to the value of "my region" for the 2nd variable.
* @param {Number} ref_val1 - The value of my region for he first variable.
* @param {Number} ref_val2 - The value of my region for the second variable.
* @param {Boolean} xInversed - Whether the serie is inversed on the x axis in the current chart.
* @param {Boolean} yInversed - Whether the serie is inversed on the y axis in the current chart.
* @return {String} - A string containing the color to be used for theses values.
*
*/
const comp2 = (val1, val2, ref_val1, ref_val2, xInversed, yInversed) => {
  if ((val1 < ref_val1 && !xInversed) || (val1 > ref_val1 && xInversed)) { // val1 is inferior:
    if (val2 < ref_val2) {
      return yInversed ? 'rgb(160, 30, 160)' : color_inf;
    }
    return yInversed ? color_inf : 'rgb(160, 30, 160)';
  }
  // val1 is superior :
  if (val2 > ref_val2) {
    return !yInversed ? color_sup : 'orange';
  }
  return !yInversed ? 'orange' : color_sup;
};

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

const PropSizer = function PropSizer(fixed_value, fixed_size) {
  this.fixed_value = fixed_value;
  const sqrt = Math.sqrt;
  const abs = Math.abs;
  const PI = Math.PI;
  this.smax = fixed_size * fixed_size * PI;
  this.scale = val => sqrt(abs(val) * this.smax / this.fixed_value) / PI;
  // this.get_value = size => ((size * PI) ** 2) / this.smax * this.fixed_value;
  // Use Math pow to support browser without ** operator:
  // eslint-disable-next-line no-restricted-properties
  this.get_value = size => Math.pow(size * PI, 2) / this.smax * this.fixed_value;
};

const removeDuplicates = function removeDuplicates(arr) {
  const tmp = [];
  for (let i = 0, len_arr = arr.length; i < len_arr; i++) {
    if (tmp.indexOf(arr[i]) === -1) {
      tmp.push(arr[i]);
    }
  }
  return tmp;
};

const getSvgPathType = (path) => {
  if (path.indexOf('M ') > -1 && path.indexOf(' L ') > -1) {
    return 2;
  }
  return 1;
};

const svgPathToCoords = (path, type_path) => {
  if (type_path === 1) {
    return path.slice(1).split('L').map(pt => pt.split(',').map(a => +a));
  }
  return path.slice(2).split(' L ').map(pt => pt.split(' ').map(a => +a));
};

function computePercentileRank(obj, field_name, result_field_name) {
  const values = obj.map(d => d[field_name]);
  const len_values = values.length;
  const getPR = (v) => {
    let count = 0;
    for (let i = 0; i < len_values; i++) {
      if (values[i] <= v) {
        count += 1;
      }
    }
    return 100 * count / len_values;
  };
  for (let ix = 0; ix < len_values; ix++) {
    obj[ix][result_field_name] = getPR(values[ix]);
  }
}

const _getPR = (v, serie) => {
  let count = 0;
  for (let i = 0; i < serie.length; i++) {
    if (serie[i] <= v) {
      count += 1;
    }
  }
  return 100 * count / serie.length;
};

export {
  comp,
  comp2,
  math_abs,
  math_round,
  Rect,
  PropSizer,
  unbindUI,
  prepareTooltip,
  removeDuplicates,
  getSvgPathType,
  svgPathToCoords,
  computePercentileRank,
  _getPR,
};
