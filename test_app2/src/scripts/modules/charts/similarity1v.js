import { comp, math_round, math_abs, math_sqrt, Rect, PropSizer, prepareTooltip, svgPathToCoords, getMean } from './../helpers';
import { color_disabled, color_countries, color_sup, color_inf, color_highlight } from './../options';
import { calcPopCompletudeSubset } from './../prepare_data';
import { svg_map } from './../map';
import { app, variables_info, resetColors } from './../../main';
import TableResumeStat from './../tableResumeStat';

const svg_bar = d3.select('#svg_bar');
const margin = { top: 20, right: 20, bottom: 40, left: 30 };

const width = +svg_bar.attr('width') - margin.left - margin.right,
  height = +svg_bar.attr('height') - margin.top - margin.bottom;

export class Similarity1plus {
  constructor(ref_data) {
    // Set the minimum number of variables to keep selected for this kind of chart:
    app.current_config.nb_var = 1;
    this.ratios = app.current_config.ratio;
    this.nums = app.current_config.num;
    this.data = ref_data.filter(ft => this.ratios.map(v => !!ft[v]).every(v => v === true)).slice();
    this.my_region = this.data.find(d => d.id === app.current_config.my_region);
    this.data.forEach((ft) => {
      this.ratios.forEach((v) => {
        ft[`dist_${v}`] = math_abs(+ft[v] - +this.my_region[v]);
      });
    });
    // this.data = ref_data.filter(ft => !!ft[ratio_to_use]).slice();
    // this.data
    //   .forEach((ft) => {
    //     // eslint-disable-next-line no-param-reassign
    //     ft.dist = math_abs(+ft[ratio_to_use] - this.my_region_value);
    //   });
    // this.data.sort((a, b) => b.dist - a.dist);
    this.current_ids = this.data.map(d => d.id);
    resetColors();
    this.highlight_selection = [];
    this.serie_inversed = false;
    this.draw_group = svg_bar
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Prepare the tooltip displayed on mouseover:
    prepareTooltip(svg_bar);

    // Compute the "complétude" value for this ratio:
    this.completude_value = calcPopCompletudeSubset(app, [this.ratio_to_use]);

    // Create the "complétude" text:
    this.completude = svg_bar.append('text')
      .attrs({ id: 'chart_completude', x: 60, y: 40 })
      .styles({ 'font-family': '\'Signika\', sans-serif' })
      .text(`Complétude : ${this.completude_value}%`);

    // Create the button allowing to choose
    // if the colors are inversed
    // (like green/red for superior/inferior regions)
    svg_bar.append('image')
      .attrs({
        x: width + margin.left + 5,
        y: 232.5,
        width: 15,
        height: 15,
        'xlink:href': 'img/reverse_plus.png',
        id: 'img_reverse',
      })
      .on('click', () => {
        this.serie_inversed = !this.serie_inversed;
        this.applySelection(this.highlight_selection.length);
      });


    // Create the section containing the input element allowing to chose
    // how many "close" regions we want to highlight.
    const selection_close = d3.select(svg_bar.node().parentElement)
      .append('div')
      .attr('id', 'menu_selection')
      .styles({ top: '-10px', 'margin-left': '30px', position: 'relative' })
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

    // const header_bar_section = d3.select('#header_chart');
    //
    // this.selec_var = header_bar_section
    //   .insert('select', '#img_table')
    //   .attrs({ class: 'title_variable' })
    //   .styles({
    //     'font-family': '\'Signika\', sans-serif',
    //     'font-weight': '800',
    //     'font-size': '14px',
    //     'margin-top': '12px',
    //     'margin-left': '40px',
    //     float: 'left',
    //   });
    //
    // for (let i = 0, len_i = available_ratios.length; i < len_i; i++) {
    //   this.selec_var.append('option')
    //     .attr('value', available_ratios[i])
    //     .text(app.current_config.ratio_pretty_name[i]);
    // }
    //
    // this.selec_var.on('change', function () {
    //   const code_variable = this.value;
    //   self.changeVariable(code_variable);
    //   self.changeStudyZone();
    //   self.updateCompletude();
    // });

    this.makeTableStat();
  }

  applySelection(nb) {
    app.colors = {};
    if (nb > 0) {
      const ratio_to_use = this.ratios[0];

      this.highlight_selection = this.data.map((ft) => {
        const global_dist = math_sqrt(this.ratios.map(v => `dist_${v}`).map(v => Math.pow(ft[v], 2)).reduce((a, b) => a + b));
        return {
          id: ft.id,
          dist: global_dist,
        };
      });

      this.highlight_selection.sort((a, b) => a.dist - b.dist);
      this.highlight_selection = this.highlight_selection.slice(1, nb + 1);
    } else {
      this.highlight_selection = [];
    }
    this.update();
    this.updateMapRegio();
  }

  update() {
    const self = this;
    const data = self.data;
    const highlight_selection = self.highlight_selection;
    const nb_variables = self.ratios.length;
    let offset = height / nb_variables + 1;
    let height_to_use = offset / 2;
    for (let i = 0; i < nb_variables; i++) {
      const ratio_name = self.ratios[i];
      const num_name = self.nums[i];
      const my_region_value = self.my_region[ratio_name];
      const ratio_values = this.data.map(d => d[ratio_name]);
      let g = this.draw_group.select(`#${ratio_name}`);
      let axis = this.draw_group.select(`g.axis--x.${ratio_name}`);
      if (!g.node()) {
        g = this.draw_group
          .append('g')
          .attr('id', ratio_name);
        axis = g.append('g')
          .attrs({ class: `axis axis--x ${ratio_name}`, transform: 'translate(0, 10)' });
      }
      g.attr('transform', `translate(0, ${height_to_use})`);
      let _min, _max;
      this.data.sort((a, b) => b[`dist_${ratio_name}`] - a[`dist_${ratio_name}`]);
      if (highlight_selection.length > 0) {
        const dist_min = math_abs(my_region_value - +d3.min(highlight_selection, d => d.ratio));
        const dist_max = math_abs(+d3.max(highlight_selection, d => d.ratio) - my_region_value);
        const dist_axis = Math.max(dist_min, dist_max);
        const margin_min_max = math_round(dist_axis) / 8;
        _min = my_region_value - dist_axis - margin_min_max;
        _max = my_region_value + dist_axis + margin_min_max;
        if (_min > _max) { console.log('a'); [_min, _max] = [_max, _min]; }
      } else {
        const dist_min = math_abs(my_region_value - d3.min(ratio_values));
        const dist_max = math_abs(d3.max(ratio_values) - my_region_value);
        const dist_axis = Math.max(dist_min, dist_max);
        const margin_min_max = math_round(dist_axis) / 8;
        _min = my_region_value - dist_axis - margin_min_max;
        _max = my_region_value + dist_axis + margin_min_max;
      }

      this.highlight_selection.forEach((elem) => {
        app.colors[elem.id] = comp(this.data.find(d => d.id === elem.id)[ratio_name], my_region_value, this.serie_inversed);
      });

      app.colors[app.current_config.my_region] = color_highlight;
      const prop_sizer = new PropSizer(d3.max(data, d => d[num_name]), 30);
      const xScale = d3.scaleLinear()
        .domain([_min, _max])
        .range([0, width]);

      axis
        .transition()
        .duration(225)
        .call(d3.axisBottom(xScale));

      const bubbles = g.selectAll('.bubble')
        .data(data, d => d.id);

      bubbles
        .transition()
        .duration(225)
        .attrs((d) => {
          let x_value = xScale(d[ratio_name]);
          if (x_value > width) x_value = width + 200;
          else if (x_value < 0) x_value = -200;
          return {
            cx: x_value,
            cy: 10,
            r: prop_sizer.scale(d[num_name]),
          };
        })
        .styles(d => ({
          fill: app.colors[d.id] || color_countries,
          'fill-opacity': d.id === app.current_config.my_region ? 1 : app.colors[d.id] ? 0.7 : 0.3,
          stroke: 'darkgray',
          'stroke-width': 0.75,
          'stroke-opacity': 0.75,
        }));

      bubbles
        .enter()
        .insert('circle')
        .styles(d => ({
          fill: app.colors[d.id] || color_countries,
          'fill-opacity': d.id === app.current_config.my_region ? 1 : app.colors[d.id] ? 0.7 : 0.3,
          stroke: 'darkgray',
          'stroke-width': 0.75,
          'stroke-opacity': 0.75,
        }))
        .transition()
        .duration(225)
        .attrs((d) => {
          let x_value = xScale(d[ratio_name]);
          if (x_value > width) x_value = width + 200;
          else if (x_value < 0) x_value = -200;
          return {
            class: 'bubble',
            cx: x_value,
            cy: 10,
            r: prop_sizer.scale(d[num_name]),
          };
        })
        .on('end', () => {
          this.draw_group.selectAll('.bubble')
            .on('mouseover', () => {
              svg_bar.select('.tooltip').style('display', null);
            })
            .on('mouseout', () => {
              svg_bar.select('.tooltip').style('display', 'none');
            })
            .on('mousemove', function (d) {
              const tooltip = svg_bar.select('.tooltip');
              const _ratio_to_use = self.ratio_to_use;
              const _stock_to_use = self.stock_to_use;
              tooltip.select('rect').attrs({ width: 0, height: 0 });
              tooltip
                .select('text.id_feature')
                .text(`${d.id}`);
              tooltip.select('text.value_feature1')
                .text(`Ratio: ${Math.round(d[_ratio_to_use] * 10) / 10}`);
              tooltip.select('text.value_feature2')
                .text(`Stock: ${Math.round(d[_stock_to_use] * 10) / 10}`);
              const b = tooltip.node().getBoundingClientRect();
              tooltip.select('rect')
                .attrs({
                  width: b.width + 20,
                  height: b.height + 7.5,
                });
              tooltip
                .attr('transform', `translate(${[d3.mouse(this)[0] - 5, d3.mouse(this)[1] - 45]})`);
            });
        });
      bubbles.exit().transition().duration(225).remove();
      height_to_use += offset;
    }
  }

  updateCompletude() {
    this.completude_value = calcPopCompletudeSubset(app, [this.ratio_to_use]);

    this.completude
      .text(`Complétude : ${this.completude_value}%`);
  }

  updateMapRegio() {
    if (!this.map_elem) return;
    this.map_elem.target_layer.selectAll('path')
      .attr('fill', d => (this.current_ids.indexOf(d.properties[app.current_config.id_field_geom]) > -1
        ? (app.colors[d.properties[app.current_config.id_field_geom]] || color_countries)
        : color_disabled));
  }

  handleClickMap(d, parent) {
    const id = d.properties[app.current_config.id_field_geom];
    if (this.current_ids.indexOf(id) < 0 || id === app.current_config.my_region) return;
    if (app.colors[id] !== undefined) {
      // Remove the clicked feature from the colored selection on the chart:
      const id_to_remove = this.highlight_selection
        .map((ft, i) => (ft.id === id ? i : null)).filter(ft => ft)[0];
      this.highlight_selection.splice(id_to_remove, 1);
      // Change its color in the global colors object:
      app.colors[id] = undefined;
      // Change the color on the map:
      d3.select(parent).attr('fill', color_countries);
    } else {
      const value = +d.properties[this.ratio_to_use];
      const color = comp(value, this.my_region_value, this.serie_inversed);
      // app.colors[id] = color;
      // Change the color on the map:
      d3.select(parent).attr('fill', color);
      // Add the clicked feature on the colored selection on the chart:
      this.highlight_selection.push({
        id,
        ratio: value,
        dist: math_abs(value - this.my_region_value),
      });
    }
    this.highlight_selection.sort((a, b) => a.dist - b.dist);
    this.update();
  }

  updateChangeRegion() {
    if (app.current_config.filter_key !== undefined) {
      this.changeStudyZone();
    } else {
      this.map_elem.updateLegend();
      this.my_region = this.data.find(d => d.id === app.current_config.my_region);
      this.data
        .forEach((ft) => {
          this.ratios.forEach(v => {
            ft[`dist_${v}`] = math_abs(+ft[v] - +this.my_region[v]);
          });
        });
      this.updateTableStats();
      // this.applySelection(this.highlight_selection.length);
    }
  }

  changeStudyZone() {
    this.map_elem.updateLegend();
    this.ratios = app.current_config.ratio;
    this.nums = app.current_config.num;
    this.data = app.current_data.filter(ft => this.ratios.map(v => !!ft[v]).every(v => v === true)).slice();
    this.my_region = this.data.find(d => d.id === app.current_config.my_region);
    this.data.forEach((ft) => {
      this.ratios.forEach((v) => {
        ft[`dist_${v}`] = math_abs(+ft[v] - +this.my_region[v]);
      });
    });
    this.current_ids = this.data.map(d => d.id);
    const temp = this.highlight_selection.length;
    this.highlight_selection = [];
    this.updateTableStats();
    this.applySelection(temp);
  }


  addVariable(code_variable, name_variable) {
    this.ratios = app.current_config.ratio.slice();
    this.nums = app.current_config.num.slice();
    this.data = app.current_data.filter(ft => this.ratios.map(v => !!ft[v]).every(v => v === true)).slice();
    this.my_region = this.data.find(d => d.id === app.current_config.my_region);
    this.data.forEach((ft) => {
      this.ratios.forEach((v) => {
        ft[`dist_${v}`] = math_abs(+ft[v] - +this.my_region[v]);
      });
    });
    // And use it immediatly:
    this.update();
  }

  removeVariable(code_variable) {
    this.ratios = app.current_config.ratio.slice();
    this.nums = app.current_config.num.slice();
    this.data = app.current_data.filter(ft => this.ratios.map(v => !!ft[v]).every(v => v === true)).slice();
    this.my_region = this.data.find(d => d.id === app.current_config.my_region);

    this.draw_group.select(`g#${code_variable}`).remove();
    // And use it immediatly:
    this.update();
  }

  bindMenu() {
    const self = this;
    const menu = d3.select('#menu_selection');
    const applychange = function () {
      // self.map_elem.removeRectBrush();
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

  remove() {
    this.map_elem.unbindBrushClick();
    this.map_elem = null;
    this.table_stats.remove();
    this.table_stats = null;
    this.selec_var.remove();
    svg_bar.html('');
  }

  bindMap(map_elem) {
    this.map_elem = map_elem;
    this.map_elem.resetColors(this.current_ids);
    this.update();
  }

  updateTableStats() {
    this.table_stats.removeAll();
    this.table_stats.addFeature(this.prepareTableStat());
  }

  prepareTableStat() {
    const values = this.data.map(d => d[this.ratio_to_use]);
    return {
      Min: d3.min(values),
      Max: d3.max(values),
      Moyenne: getMean(values),
      id: this.ratio_to_use,
      Variable: this.ratio_to_use,
      'Ma région': this.my_region_value,
    };
  }

  makeTableStat() {
    const feature = this.prepareTableStat();
    this.table_stats = new TableResumeStat([feature]);
  }
}
