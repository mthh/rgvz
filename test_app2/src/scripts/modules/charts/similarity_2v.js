import { comp, math_round, math_pow, math_sqrt, getMean, getStandardizedMeanStdDev } from './../helpers';
import { color_disabled, color_countries, color_highlight, color_default_dissim } from './../options';
import { calcPopCompletudeSubset } from './../prepare_data';
import { app, variables_info, resetColors } from './../../main';
import ContextMenu from './../contextMenu';
import TableResumeStat from './../tableResumeStat';

const svg_bar = d3.select('#svg_bar');
const margin = { top: 20, right: 20, bottom: 40, left: 40 };

const width = +svg_bar.attr('width') - margin.left - margin.right,
  height = +svg_bar.attr('height') - margin.top - margin.bottom;


/** Class representing a scatterplot */
export class SimilarityChart {
  /**
   * Create a the scatterplot on the `svg_bar` svg element previously defined
   * @param {Array} ref_data - A reference to the subset of the dataset to be used
   * to create the scatterplot (should contain at least two field flagged as ratio
   * in the `app.current_config.ratio` Object.
   */
  constructor(ref_data) {
    app.current_config.nb_var = 2;
    const x = d3.scaleBand().range([0, width]).padding(0.1);
    const y = d3.scaleLinear().range([height, 0]);

    const xAxis = d3.axisBottom(x);
    const yAxis = d3.axisLeft(y);
    this.x = x;
    this.y = y;
    this.xAxis = xAxis;
    this.yAxis = yAxis;
    this.nb_display = 5;
    this.variables = app.current_config.ratio;
    // Filter the data against empty features:
    this.ref_data = ref_data.filter(ft => this.variables.map(v => !!ft[v]).every(v => v === true)).slice();
    // Standardize all variables:
    this.variables.forEach((v) => {
      const serie = this.ref_data.map(ft => ft[v]);
      const standardized = getStandardizedMeanStdDev(serie);
      const name_standardized = `st_${v}`;
      this.ref_data.forEach((ft, i) => {
        // eslint-disable-next-line no-param-reassign
        ft[name_standardized] = standardized[i];
      });
    });

    // Find value of my region:
    const obj_my_region = this.ref_data.find(d => d.id === app.current_config.my_region);

    this.ref_data.forEach((ft) => {
      const s = this.variables.map(v => math_pow(obj_my_region[`st_${v}`] - ft[`st_${v}`], 2)).reduce((a, b) => a + b, 0);
      // eslint-disable-next-line no-param-reassign
      ft.dissimilarity = math_sqrt(s);
    });
    this.ref_data = this.ref_data.sort((a, b) => a.dissimilarity - b.dissimilarity);

    this.data = this.ref_data.slice(1, 1 + this.nb_display);

    this.current_ids = this.ref_data.map(d => d.id);

    this.displayed_ids = this.data.map(d => d.id);

    resetColors();

    svg_bar.append('defs')
      .append('clipPath')
      .attr('id', 'clip')
      .append('rect')
      .attrs({ width, height });

    const bar = svg_bar.append('g')
      .attrs({
        class: 'bar',
        transform: `translate(${margin.left}, ${margin.top})`,
      });

    this.bar = bar;
    // const _min = d3.min(this.data, d => d.dissimilarity);
    const _max = d3.max(this.data, d => d.dissimilarity);

    x.domain(this.displayed_ids);
    y.domain([0, _max + _max / 12]);

    bar.append('g')
      .attrs({ class: 'axis axis--x', transform: `translate(0, ${height})` })
      .call(xAxis);

    bar.select('.axis--x')
      .selectAll('text')
      .style('text-anchor', 'end')
      .attrs({ dx: '-0.8em', dy: '0.15em', transform: 'rotate(-65)' });

    bar.append('g')
      .attr('class', 'axis axis--y')
      .call(yAxis);

    this.g_bar = bar.append('g');

    this.completude_value = calcPopCompletudeSubset(app, this.variables);

    this.completude = svg_bar.append('text')
      .attrs({ id: 'chart_completude', x: 60, y: 40 })
      .styles({ 'font-family': '\'Signika\', sans-serif' })
      .text(`Complétude : ${this.completude_value}%`);

    // // Prepare the tooltip displayed on mouseover:
    // const tooltip = prepareTooltip(svg_bar);

    // // Deactivate the brush rect selection on the map + on the chart
    // // when he user press the Ctrl key:
    // document.onkeydown = (event) => {
    //   if (event && event.key === 'Control') {
    //     svg_bar.select('.brush_top')
    //       .selectAll('.selection, .overlay')
    //       .style('display', 'none');
    //     svg_map.select('.brush_map')
    //       .selectAll('.selection, .overlay')
    //       .style('display', 'none');
    //   }
    // };
    // document.onkeyup = (event) => {
    //   if (event && event.key === 'Control') {
    //     svg_bar.select('.brush_top')
    //       .selectAll('.selection, .overlay')
    //       .style('display', null);
    //     svg_map.select('.brush_map')
    //       .selectAll('.selection, .overlay')
    //       .style('display', null);
    //   }
    // };

    // Create the section containing the input element allowing to chose
    // how many "close" regions we want to highlight.
    const selection_close = d3.select(svg_bar.node().parentElement)
      .append('div')
      .attr('id', 'menu_selection')
      .styles({ top: '-20px', 'margin-left': '30px', position: 'relative' })
      .append('p');

    selection_close.append('span')
      .property('value', 'close')
      .attrs({ value: 'close', class: 'type_selection square checked' });
    selection_close.append('span')
      .attrs({ class: 'label_chk' })
      .html('Les');
    selection_close.append('input')
      .attrs({ class: 'nb_select', type: 'number' })
      .property('value', 5);
    selection_close.append('span')
      .attrs({ class: 'label_chk' })
      .html('régions les plus proches');
    this.bindMenu();
    this.update();
    this.makeTableStat();
  }

  updateCompletude() {
    this.completude_value = calcPopCompletudeSubset(app, this.variables);
    this.completude
      .text(`Complétude : ${this.completude_value}%`);
  }

  updateContext(min, max) {
    this.context.selectAll('.bar')
       .style('fill-opacity', (_, i) => (i >= min && i < max ? '1' : '0.3'));
  }

  update() {
    const self = this;
    const bar = this.g_bar.selectAll('.bar')
      .data(this.data, d => d.id);

    bar
      .attrs(d => ({
        x: this.x(d.id),
        y: this.y(d.dissimilarity),
        width: this.x.bandwidth(),
        height: height - this.y(d.dissimilarity),
      }))
      .style('fill', color_default_dissim)
      .on('mouseover', () => {
        svg_bar.select('.tooltip').style('display', null);
      })
      .on('mouseout', () => {
        svg_bar.select('.tooltip').style('display', 'none');
      })
      .on('mousemove', function (d) {
        const tooltip = svg_bar.select('.tooltip');
        tooltip
          .select('text.id_feature')
          .text(`${d.id}`);
        tooltip.select('text.value_feature1')
          .text(`${math_round(d[self.ratio_to_use] * 10) / 10}`);
        tooltip
          .attr('transform', `translate(${[d3.mouse(this)[0] - 5, d3.mouse(this)[1] - 45]})`);
      });

    bar.enter()
      .insert('rect', '.mean')
      .attrs(d => ({
        class: 'bar',
        x: this.x(d.id),
        y: this.y(d.dissimilarity),
        width: this.x.bandwidth(),
        height: height - this.y(d.dissimilarity),
      }))
      .style('fill', color_default_dissim);

    bar.exit().remove();

    this.bar.select('.axis--y')
      .call(this.yAxis);

    const axis_x = this.bar.select('.axis--x')
      .attr('font-size', () => (this.nb_display > 75 ? 6 : 10))
      .call(this.xAxis);

    axis_x
      .selectAll('text')
      .attrs(() => {
        if (this.nb_display > 100) {
          return { dx: '-0.8em', dy: '0.15em', transform: 'rotate(-65)' };
        } else if (this.nb_display > 20) {
          return { dx: '-0.8em', dy: '0.15em', transform: 'rotate(-65)' };
        } else {
          return { dx: '0', dy: '0.71em', transform: null };
        }
      })
      .style('text-anchor', () => (this.nb_display > 20 ? 'end' : 'middle'));

  }

  updateMapRegio() {
    this.map_elem.target_layer.selectAll('path')
      .attr('fill', d => (this.current_ids.indexOf(d.properties[app.current_config.id_field_geom]) > -1
        ? (app.colors[d.properties[app.current_config.id_field_geom]] || color_countries)
        : color_disabled));
  }

  // handle_brush_map(event) {
  //   if (!event || !event.selection) {
  //     this.last_map_selection = undefined;
  //     return;
  //   }
  //   const ratio_to_use = this.ratio_to_use;
  //   const ref_value = this.ref_value;
  //   const self = this;
  //   svg_bar.select('.brush_top').call(self.brush_top.move, null);
  //   const [topleft, bottomright] = event.selection;
  //   this.last_map_selection = [topleft, bottomright];
  //   // const transform = svg_map.node().__zoom;
  //   // topleft[0] = (topleft[0] - transform.x) / transform.k;
  //   // topleft[1] = (topleft[1] - transform.y) / transform.k;
  //   // bottomright[0] = (bottomright[0] - transform.x) / transform.k;
  //   // bottomright[1] = (bottomright[1] - transform.y) / transform.k;
  //   const rect = new Rect(topleft, bottomright);
  //   app.colors = {};
  //   self.map_elem.target_layer.selectAll('path')
  //     .attr('fill', function (d) {
  //       const id = d.properties[app.current_config.id_field_geom];
  //       if (id === app.current_config.my_region) {
  //         app.colors[id] = color_highlight;
  //         return color_highlight;
  //       } else if (self.current_ids.indexOf(id) < 0) {
  //         return color_disabled;
  //       }
  //       if (!this._pts) {
  //         this._pts = svgPathToCoords(this.getAttribute('d'), app.type_path);
  //       }
  //       const pts = this._pts;
  //       for (let ix = 0, nb_pts = pts.length; ix < nb_pts; ix++) {
  //         if (rect.contains(pts[ix])) {
  //           const value = d.properties[ratio_to_use];
  //           const color = comp(value, ref_value, this.serie_inversed);
  //           app.colors[id] = color;
  //           return color;
  //         }
  //       }
  //       return color_countries;
  //     });
  //   self._focus.selectAll('.bar')
  //     .style('fill', d => app.colors[d.id] || color_countries);
  //   const ids = Object.keys(app.colors);
  //   const ranks = ids.map(d => this.current_ids.indexOf(d.id) > -1).map(d => this.current_ranks[d]);
  //   if (ranks.length > 1) {
  //     const c1 = ranks[0] - 1;
  //     const c2 = ranks[ranks.length - 1];
  //     if (c1 < current_range[0] || c2 > current_range[1]) {
  //       current_range = [
  //         ranks[0] - 1,
  //         ranks[ranks.length - 1],
  //       ];
  //       svg_bar.select('.brush_bottom').call(
  //         self.brush_bottom.move,
  //         [current_range[0] * (width / nbFt), current_range[1] * (width / nbFt)]);
  //     }
  //   } else {
  //     current_range = [0, this.data.length];
  //     svg_bar.select('.brush_bottom').call(
  //       self.brush_bottom.move, self.x.range());
  //   }
  // }

  handleClickMap(d, parent) {
    const id = d.properties[app.current_config.id_field_geom];
    if (this.current_ids.indexOf(id) < 0 || id === app.current_config.my_region) return;
    if (app.colors[id] !== undefined) {
      app.colors[id] = undefined;
      d3.select(parent).attr('fill', color_countries);
    } else {
      const color = comp(
        d.properties[this.ratio_to_use],
        this.ref_value,
        this.serie_inversed);
      app.colors[id] = color;
      d3.select(parent).attr('fill', color);
    }
    this.update();
  }

  updateChangeRegion() {
    // if (app.current_config.filter_key !== undefined) {
    this.changeStudyZone();
    // } else {
    //   this.ref_value = this.data.filter(
    //     ft => ft.id === app.current_config.my_region)[0][this.ratio_to_use];
    //   this.update();
    //   this.updateTableStats();
    //   this.map_elem.removeRectBrush();
    //   this.map_elem.updateLegend();
    // }
  }

  changeStudyZone() {
    this.variables = app.current_config.ratio;
    // Filter the data against empty features:
    this.ref_data = app.current_data.filter(ft => this.variables.map(v => !!ft[v]).every(v => v === true)).slice();
    // Standardize all variables:
    this.variables.forEach((v) => {
      const serie = this.ref_data.map(ft => ft[v]);
      const standardized = getStandardizedMeanStdDev(serie);
      const name_standardized = `st_${v}`;
      this.ref_data.forEach((ft, i) => {
        // eslint-disable-next-line no-param-reassign
        ft[name_standardized] = standardized[i];
      });
    });

    // Find value of my region:
    const obj_my_region = this.ref_data.find(d => d.id === app.current_config.my_region);

    this.ref_data.forEach((ft) => {
      const s = this.variables.map(v => math_pow(obj_my_region[`st_${v}`] - ft[`st_${v}`], 2)).reduce((a, b) => a + b, 0);
      // eslint-disable-next-line no-param-reassign
      ft.dissimilarity = math_sqrt(s);
    });
    this.ref_data = this.ref_data.sort((a, b) => a.dissimilarity - b.dissimilarity);
    this.data = this.ref_data.slice(1, 1 + this.nb_display);

    this.current_ids = this.ref_data.map(d => d.id);
    this.displayed_ids = this.data.map(d => d.id);
    this.x.domain(this.displayed_ids);
    const _max = d3.max(this.data, d => d.dissimilarity);
    this.y.domain([
      0, _max
    ])
    this.updateCompletude();
    this.updateTableStats();
    this.updateMapRegio();
    this.update();
  }

  applySelection(nb_value) {
    this.nb_display = nb_value;
    this.data = this.ref_data.slice(1, 1 + nb_value);
    this.displayed_ids = this.data.map(d => d.id);
    // const _min = d3.min(this.data, d => d.dissimilarity);
    const _max = d3.max(this.data, d => d.dissimilarity);
    this.x.domain(this.displayed_ids);
    this.y.domain([0, _max + _max / 12]);
    this.update();
  }

  bindMenu() {
    const self = this;
    const menu = d3.select('#menu_selection');
    const applychange = function () {
      const value = +this.value;
      if (value < 1) {
        this.value = 1;
        return;
      }
      self.applySelection(value);
    };
    menu.select('.nb_select')
      .on('change', applychange);
    menu.select('.nb_select')
      .on('wheel', applychange);
    menu.select('.nb_select')
      .on('keyup', applychange);
  }

  addVariable(code_variable, name_variable) {
    this.changeStudyZone();
  }

  removeVariable(code_variable) {

  }

  changeVariable(code_variable) {
    this.ratio_to_use = code_variable;
  }

  remove() {
    this.bar.remove();
    this.table_stats.remove();
    this.table_stats = null;
    this.map_elem.unbindBrush();
    this.map_elem = null;
    svg_bar.html('');
  }

  bindMap(map_elem) {
    this.map_elem = map_elem;
    this.map_elem.resetColors(this.current_ids);
  }

  updateTableStats() {
    this.table_stats.removeAll();
    this.table_stats.addFeature(this.prepareTableStat());
  }

  prepareTableStat() {
    const all_values = this.variables.map(v => this.ref_data.map(d => d[v]));
    const my_region = this.ref_data.find(d => d.id === app.current_config.my_region);
    const features = all_values.map((values, i) => ({
      Min: d3.min(values),
      Max: d3.max(values),
      Moyenne: getMean(values),
      id: this.variables[i],
      Variable: this.variables[i],
      'Ma région': my_region[this.variables[i]],
    }));
    return features;
  }

  makeTableStat() {
    this.table_stats = new TableResumeStat(this.prepareTableStat());
  }
}
