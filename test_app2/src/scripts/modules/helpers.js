const math_abs = Math.abs;
const math_round = Math.round;

function unbindUI() {
  d3.selectAll('span.filter_v')
    .on('click', null);
  d3.selectAll('span.target_region')
    .on('click', null);
  d3.selectAll('span.label_chk')
    .on('click', null);

  d3.select('.dataTable-wrapper').remove();

  d3.select('#header_map')
    .selectAll('img')
    .on('click', null);

  d3.select('#bar_section > #buttons_under_chart').remove();

  d3.selectAll('.type_chart.title_menu').on('click', null);
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

const PropSizer = function (fixed_value, fixed_size) {
  this.fixed_value = fixed_value;
  const sqrt = Math.sqrt;
  const abs = Math.abs;
  const PI = Math.PI;
  this.smax = fixed_size * fixed_size * PI;
  this.scale = val => sqrt(abs(val) * this.smax / this.fixed_value) / PI;
  this.get_value = size => ((size * PI) ** 2) / this.smax * this.fixed_value;
};


export {
  comp,
  math_abs,
  math_round,
  Rect,
  PropSizer,
  unbindUI,
};
