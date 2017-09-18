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
  d3.select('#bar_section > #buttons_under_chart').remove();

  // Removes the current behavior corresponding to clicking on the top menu:
  d3.selectAll('.type_chart.title_menu').on('click', null);

  // Removes the current behavior corresponding to pressing the Control key:
  document.onkeyup = null;
  document.onkeydown = null;
}

const comp = (test_value, ref_value, serie_inversed) => {
  if (test_value < ref_value) {
    return serie_inversed ? 'green' : 'red';
  } else {
    return serie_inversed ? 'red' : 'green';
  }
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

export {
  comp,
  math_abs,
  math_round,
  Rect,
  PropSizer,
  unbindUI,
  prepareTooltip,
  removeDuplicates,
};
