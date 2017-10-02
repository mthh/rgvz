import { comp, math_round, math_abs, Rect, prepareTooltip, svgPathToCoords, getMean } from './../helpers';
import { color_disabled, color_countries, color_sup, color_inf, color_highlight } from './../options';
import { calcPopCompletudeSubset } from './../prepare_data';
import { svg_map } from './../map';
import { app, resetColors } from './../../main';
import TableResumeStat from './../tableResumeStat';

const svg_bar = d3.select('#svg_bar');
const margin = { top: 70, right: 70, bottom: 70, left: 70 };

const width = +svg_bar.attr('width') - margin.left - margin.right;
const height = +svg_bar.attr('height') - margin.top - margin.bottom;

/**
* Class representing a chart of "parallel coordinates".
*/
export class ParallelCoords2 {
  constructor(ref_data) {
    // Set the minimum number of variables to keep selected for this kind of chart:
    app.current_config.nb_var = 2;
  }
}
