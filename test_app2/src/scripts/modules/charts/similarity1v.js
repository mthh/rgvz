import { comp, math_round, math_abs, math_sqrt, PropSizer, prepareTooltip, getMean } from './../helpers';
import { color_disabled, color_countries, color_default_dissim, color_highlight } from './../options';
import { calcPopCompletudeSubset, calcCompletudeSubset } from './../prepare_data';
// import { svg_map } from './../map';
import { app, resetColors } from './../../main';
import TableResumeStat from './../tableResumeStat';
import CompletudeSection from './../completude';

const svg_bar = d3.select('#svg_bar');
const margin = { top: 20, right: 20, bottom: 40, left: 30 };

const width = +svg_bar.attr('width') - margin.left - margin.right;
const height = +svg_bar.attr('height') - margin.top - margin.bottom;

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
        // eslint-disable-next-line no-param-reassign
        ft[`dist_${v}`] = math_abs(+ft[v] - +this.my_region[v]);
      });
    });
    this.current_ids = this.data.map(d => d.id);
    resetColors();
    this.highlight_selection = [];
    this.serie_inversed = false;
    this.draw_group = svg_bar
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Prepare the tooltip displayed on mouseover:
    prepareTooltip(svg_bar);


    this.completude = new CompletudeSection(svg_bar.node().parentElement);
    this.completude.update(
      calcCompletudeSubset(app, this.ratios, 'array'),
      calcPopCompletudeSubset(app, this.ratios));

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
      .styles({ position: 'relative', color: '#4f81bd', 'text-align': 'center' })
      .append('p');

    selection_close.append('span')
      .html('Sélection des');
    selection_close.append('input')
      .attrs({ class: 'nb_select', type: 'number' })
      .style('margin-left', '1px')
      .style('color', '#4f81bd')
      .property('value', 5);
    selection_close.append('span')
      .html('régions les plus proches');

    this.bindMenu();
    this.makeTableStat();
  }

  applySelection(nb) {
    app.colors = {};
    if (nb > 0) {
      this.highlight_selection = this.data.map((ft) => {
        // eslint-disable-next-line no-restricted-properties
        const global_dist = math_sqrt(this.ratios.map(v => `dist_${v}`).map(v => Math.pow(ft[v], 2)).reduce((a, b) => a + b));
        const obj = {
          id: ft.id,
          dist: global_dist,
        };
        this.ratios.forEach((v) => { obj[v] = ft[v]; });
        return obj;
      });
      this.highlight_selection.sort((a, b) => a.dist - b.dist);
      this.highlight_selection = this.highlight_selection.slice(1, nb + 1);
    } else {
      this.highlight_selection = [];
    }
    this.removeLines();
    this.update();
    this.updateMapRegio();
  }

  update() {
    const self = this;
    const data = self.data;
    const highlight_selection = self.highlight_selection;
    const nb_variables = self.ratios.length;
    const offset = height / nb_variables + 1;
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
          .attrs({
            id: ratio_name,
            num: num_name,
            class: 'grp_var',
          });
        axis = g.append('g')
          .attrs({
            class: `axis axis--x ${ratio_name}`,
            transform: 'translate(0, 10)',
          });
        g.append('text')
          .attrs({
            x: 15,
            y: -7.5,
            fill: '#4f81bd',
            'font-size': '11px',
            'font-weight': 'bold',
            'font-family': '"Signika",sans-serif',
          })
          .text(ratio_name);
      }
      g.attr('transform', `translate(0, ${height_to_use})`);
      let _min;
      let _max;
      this.data.sort((a, b) => b[`dist_${ratio_name}`] - a[`dist_${ratio_name}`]);
      if (highlight_selection.length > 0) {
        const dist_axis = Math.max(
          math_abs(my_region_value - +d3.min(highlight_selection, d => d[ratio_name])),
          math_abs(+d3.max(highlight_selection, d => d[ratio_name]) - my_region_value));
        const margin_min_max = math_round(dist_axis) / 8;
        _min = my_region_value - dist_axis - margin_min_max;
        _max = my_region_value + dist_axis + margin_min_max;
        // if (_min > _max) { [_min, _max] = [_max, _min]; }
      } else {
        const dist_axis = Math.max(
          math_abs(my_region_value - d3.min(ratio_values)),
          math_abs(d3.max(ratio_values) - my_region_value));
        const margin_min_max = math_round(dist_axis) / 8;
        _min = my_region_value - dist_axis - margin_min_max;
        _max = my_region_value + dist_axis + margin_min_max;
      }
      this.highlight_selection.forEach((elem) => {
        app.colors[elem.id] = comp(elem[ratio_name], my_region_value, this.serie_inversed);
      });

      app.colors[app.current_config.my_region] = color_highlight;
      const prop_sizer = new PropSizer(d3.max(data, d => d[num_name]), 30);
      const xScale = d3.scaleLinear()
        .domain([_min, _max])
        .range([0, width]);

      axis
        .transition()
        .duration(125)
        .call(d3.axisBottom(xScale));

      const bubbles = g.selectAll('.bubble')
        .data(data, d => d.id);

      bubbles
        .transition()
        .duration(125)
        .attrs((d) => {
          let x_value = xScale(d[ratio_name]);
          if (x_value > width) x_value = width + 200;
          else if (x_value < 0) x_value = -200;
          return {
            cx: x_value,
            cy: 10,
            r: 7.5,
            // r: prop_sizer.scale(d[num_name]),
          };
        })
        .styles(d => ({
          fill: app.colors[d.id] || color_countries,
          'fill-opacity': d.id === app.current_config.my_region ? 1 : app.colors[d.id] ? 0.7 : 0.1,
          stroke: 'darkgray',
          'stroke-width': 0.75,
          'stroke-opacity': 0.75,
        }));

      bubbles
        .enter()
        .insert('circle')
        .styles(d => ({
          fill: app.colors[d.id] || color_countries,
          'fill-opacity': d.id === app.current_config.my_region ? 1 : app.colors[d.id] ? 0.7 : 0.1,
          stroke: 'darkgray',
          'stroke-width': 0.75,
          'stroke-opacity': 0.75,
        }))
        .transition()
        .duration(125)
        .attrs((d) => {
          let x_value = xScale(d[ratio_name]);
          if (x_value > width) x_value = width + 200;
          else if (x_value < 0) x_value = -200;
          return {
            id: d.id,
            class: 'bubble',
            cx: x_value,
            cy: 10,
            r: 7.5,
            // r: prop_sizer.scale(d[num_name]),
          };
        });

      bubbles.exit().transition().duration(125).remove();
      height_to_use += offset;
    }
    setTimeout(() => { this.makeTooltips(); }, 125);
  }

  updateCompletude() {
    this.completude.update(
      calcCompletudeSubset(app, this.ratios, 'array'),
      calcPopCompletudeSubset(app, this.ratios));
  }

  updateMapRegio() {
    if (!this.map_elem) return;
    this.map_elem.target_layer.selectAll('path')
      .attr('fill', (d) => {
        const _id = d.id;
        if (_id === app.current_config.my_region) {
          return color_highlight;
        } else if (this.current_ids.indexOf(_id) > -1) {
          if (app.colors[_id]) return color_default_dissim;
          return color_countries;
        }
        return color_disabled;
      });
  }

  handleClickMap(d, parent) {
    let to_display = false;
    const id = d.id;
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
      app.colors[id] = color_default_dissim;
      // Change the color on the map:
      d3.select(parent).attr('fill', color_default_dissim);
      // Add the clicked feature on the colored selection on the chart:
      // eslint-disable-next-line no-restricted-properties
      const global_dist = math_sqrt(this.ratios.map(v => `dist_${v}`).map(v => Math.pow(+d.properties[v], 2)).reduce((a, b) => a + b));
      const obj = {
        id,
        dist: global_dist,
      };
      this.ratios.forEach((v) => { obj[v] = +d.properties[v]; });
      this.highlight_selection.push(obj);
      to_display = true;
    }
    this.highlight_selection.sort((a, b) => a.dist - b.dist);
    this.removeLines();
    this.update();
    if (to_display) setTimeout(() => { this.displayLine(id); }, 150);
  }

  makeTooltips() {
    const self = this;
    this.draw_group.selectAll('g.grp_var')
      .selectAll('circle')
        .on('mouseover', () => {
          svg_bar.select('.tooltip').style('display', null);
        })
        .on('mouseout', () => {
          svg_bar.select('.tooltip').style('display', 'none');
        })
        .on('mousemove', function (d) {
          const tooltip = svg_bar.select('.tooltip');
          const ratio_n = this.parentElement.id;
          const num_n = this.parentElement.getAttribute('num');
          const ty = +this.parentElement.getAttribute('transform').split('translate(0, ')[1].split(')')[0];
          tooltip.select('rect').attrs({ width: 0, height: 0 });
          tooltip
            .select('text.id_feature')
            .text(`${d.id}`);
          tooltip.select('text.value_feature1')
            .text(`Ratio: ${Math.round(d[ratio_n] * 10) / 10}`);
          tooltip.select('text.value_feature2')
            .text(`Stock: ${Math.round(d[num_n] * 10) / 10}`);
          const b = tooltip.node().getBoundingClientRect();
          tooltip.select('rect')
            .attrs({
              width: b.width + 20,
              height: b.height + 7.5,
            });
          tooltip
            .attr('transform', `translate(${[d3.mouse(this)[0] - 5, d3.mouse(this)[1] - 45 + ty]})`);
        })
        .on('click', function (d) {
          if (this.style.fill !== color_countries) self.displayLine(d.id);
        });
  }

  displayLine(id_region) {
    if (this.ratios.length === 1) return;
    const coords = [];
    svg_bar.selectAll('.grp_var')
      .selectAll(`#${id_region}.bubble`)
      .each(function () {
        const ty = +this.parentElement.getAttribute('transform').split('translate(0, ')[1].replace(')', '');
        coords.push([this.cx.baseVal.value, this.cy.baseVal.value + ty]);
      });

    const l = this.draw_group.append('path')
      .datum(coords)
      .attrs({
        class: 'regio_line',
        fill: 'none',
        stroke: 'steelblue',
        'stroke-linejoin': 'round',
        'stroke-linecap': 'round',
        'stroke-width': 1.5,
        d: d3.line().x(_d => _d[0]).y(_d => _d[1]),
      });
    setTimeout(() => {
      l.remove();
    }, 5000);
  }

  updateChangeRegion() {
    this.removeLines();
    if (app.current_config.filter_key !== undefined) {
      this.changeStudyZone();
    } else {
      this.map_elem.updateLegend();
      this.my_region = this.data.find(d => d.id === app.current_config.my_region);
      this.data
        .forEach((ft) => {
          this.ratios.forEach((v) => {
            // eslint-disable-next-line no-param-reassign
            ft[`dist_${v}`] = math_abs(+ft[v] - +this.my_region[v]);
          });
        });
      this.updateTableStat();
      this.update();
      this.updateMapRegio();
      // this.applySelection(this.highlight_selection.length);
    }
  }

  changeStudyZone() {
    this.removeLines();
    this.map_elem.updateLegend();
    this.ratios = app.current_config.ratio;
    this.nums = app.current_config.num;
    this.data = app.current_data.filter(
      ft => this.ratios.map(v => !!ft[v]).every(v => v === true)).slice();
    this.my_region = this.data.find(d => d.id === app.current_config.my_region);
    this.data.forEach((ft) => {
      this.ratios.forEach((v) => {
        // eslint-disable-next-line no-param-reassign
        ft[`dist_${v}`] = math_abs(+ft[v] - +this.my_region[v]);
      });
    });
    this.current_ids = this.data.map(d => d.id);
    const temp = this.highlight_selection.length;
    this.highlight_selection = [];
    this.updateTableStat();
    this.updateCompletude();
    this.applySelection(temp);
    this.updateMapRegio();
  }

  addVariable(code_variable, name_variable) {
    this.removeLines();
    this.ratios = app.current_config.ratio.slice();
    this.nums = app.current_config.num.slice();
    this.data = app.current_data.filter(
      ft => this.ratios.map(v => !!ft[v]).every(v => v === true)).slice();
    this.current_ids = this.data.map(d => d.id);
    this.my_region = this.data.find(d => d.id === app.current_config.my_region);
    this.data.forEach((ft) => {
      this.ratios.forEach((v) => {
        // eslint-disable-next-line no-param-reassign
        ft[`dist_${v}`] = math_abs(+ft[v] - +this.my_region[v]);
      });
    });
    this.highlight_selection = this.highlight_selection.map((d) => {
      const obj = Object.assign(d, {});
      const ft = this.data.find(elem => elem.id === obj.id);
      if (!ft) return undefined;
      this.ratios.forEach((v) => {
        obj[v] = +ft[v];
        obj[`dist_${v}`] = +ft[`dist_${v}`];
      });
      return obj;
    }).filter(d => !!d);
    // And use it immediatly:
    this.updateTableStat();
    this.update();
    this.updateMapRegio();
  }

  removeVariable(code_variable) {
    this.removeLines();
    this.ratios = app.current_config.ratio.slice();
    this.nums = app.current_config.num.slice();
    this.data = app.current_data.filter(
      ft => this.ratios.map(v => !!ft[v]).every(v => v === true)).slice();
    this.my_region = this.data.find(d => d.id === app.current_config.my_region);

    this.draw_group.select(`g#${code_variable}`).remove();
    // And use it immediatly:
    this.updateTableStat();
    this.update();
    this.updateMapRegio();
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

  removeLines() {
    this.draw_group.selectAll('.regio_line').remove();
  }

  remove() {
    this.map_elem.unbindBrushClick();
    this.map_elem = null;
    this.table_stats.remove();
    this.table_stats = null;
    this.completude.remove();
    this.completude = null;
    svg_bar.html('');
  }

  bindMap(map_elem) {
    this.map_elem = map_elem;
    this.map_elem.resetColors(this.current_ids);
    this.map_elem.displayLegend(2);
    this.applySelection(5);
  }

  prepareTableStat() {
    const ratios = this.ratios;
    const all_values = ratios.map(v => this.data.map(d => +d[v]));
    const my_region = this.my_region;
    const features = all_values.map((values, i) => ({
      Min: d3.min(values),
      Max: d3.max(values),
      Moyenne: getMean(values),
      id: this.ratios[i],
      Variable: this.ratios[i],
      'Ma région': my_region[this.ratios[i]],
    }));
    return features;
  }

  updateTableStat() {
    this.table_stats.removeAll();
    this.table_stats.addFeatures(this.prepareTableStat());
  }

  makeTableStat() {
    const features = this.prepareTableStat();
    this.table_stats = new TableResumeStat(features);
  }
}
