const math_abs = Math.abs;
const math_round = Math.round;

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

export {
  comp,
  math_abs,
  math_round,
  Rect,
};
