import { comp, math_round, math_abs, Rect, PropSizer, prepareTooltip, svgPathToCoords } from './../helpers';
import { color_disabled, color_countries, color_sup, color_inf, color_highlight } from './../options';
import { svg_map } from './../map';
import { app } from './../../main';

const svg_bar = d3.select('#svg_bar');
const margin = { top: 20, right: 20, bottom: 40, left: 30 };

const width = +svg_bar.attr('width') - margin.left - margin.right,
  height = +svg_bar.attr('height') - margin.top - margin.bottom;

export class BubbleChart1 {
  constructor(ref_data) {
    this.data = ref_data.slice().sort(
      (a, b) => b[app.current_config.num] - a[app.current_config.num]);
    this.highlight_selection = [];
    const draw_group = svg_bar
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);
    draw_group.append('g')
      .attrs({ class: 'axis axis--x', transform: `translate(0, ${height / 2})` });
    this.draw_group = draw_group;

    // Set the variable name as title of the chart:
    d3.select('#bar_section > p > .title_variable')
      .html(app.current_config.ratio_pretty_name);

    // Prepare the tooltip displayed on mouseover:
    prepareTooltip(svg_bar);

    // Create the "completude" text:
    this.completude = svg_bar.append('text')
      .attrs({ id: 'chart_completude', x: 60, y: 40 })
      .styles({ 'font-family': '\'Signika\', sans-serif' })
      .text(`Complétude : ${app.completude}%`);

    // Create the section containing the input element allowing to chose
    // how many "close" regions we want to highlight.
    const selection_close = d3.select(svg_bar.node().parentElement)
      .append('div')
      .attr('id', 'menu_selection')
      .styles({ top: '-100px', 'margin-left': '30px', position: 'relative' })
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
    this.my_region_value = this.data
        .filter(d => d.id === app.current_config.my_region)
        .map(d => d.ratio)[0];
    this.bindMenu();
    this.applySelection(5, 'close');

    // Deactivate the rect brush selection on the map
    // while the user press the Ctrl key:
    document.onkeydown = (event) => {
      if (event && event.key === 'Control') {
        svg_map.select('.brush_map')
          .selectAll('.selection, .overlay')
          .style('display', 'none');
      }
    };
    // Reactivate the rect brush selection on the map
    // when the user doesn't press the Ctrl key anymore
    document.onkeyup = (event) => {
      if (event && event.key === 'Control') {
        svg_map.select('.brush_map')
          .selectAll('.selection, .overlay')
          .style('display', null);
      }
    };
  }

  applySelection(nb, type_selection = 'close') {
    app.colors = {};
    if (nb > 0) {
      const my_region_value = this.my_region_value;
      this.highlight_selection = this.data.map(d => ({
        dist: math_abs(d.ratio - my_region_value),
        ratio: d.ratio,
        id: d.id }));
      if (type_selection === 'close') {
        this.highlight_selection.sort((a, b) => a.dist - b.dist);
        this.highlight_selection = this.highlight_selection.slice(1, nb + 1);
      } else if (type_selection === 'distant') {
        this.highlight_selection.sort((a, b) => b.dist - a.dist);
        this.highlight_selection = this.highlight_selection.slice(0, nb);
      }
      this.highlight_selection.forEach((elem) => {
        app.colors[elem.id] = elem.ratio < my_region_value ? color_inf : color_sup;
      });
    } else {
      this.highlight_selection = [];
    }
    app.colors[app.current_config.my_region] = color_highlight;
    this.update();
    this.updateMapRegio();
  }

  update() {
    const data = this.data;
    const highlight_selection = this.highlight_selection;
    const my_region_value = this.my_region_value;
    let _min;
    let _max;
    if (highlight_selection.length > 0) {
      const dist_min = my_region_value - d3.min(highlight_selection, d => d.ratio);
      const dist_max = d3.max(highlight_selection, d => d.ratio) - my_region_value;
      const dist_axis = Math.max(dist_min, dist_max);
      const margin_min_max = math_round(dist_axis) / 8;
      _min = my_region_value - dist_axis - margin_min_max;
      _max = my_region_value + dist_axis + margin_min_max;
    } else {
      const dist_min = my_region_value - d3.min(data, d => d.ratio);
      const dist_max = d3.max(data, d => d.ratio) - my_region_value;
      const dist_axis = Math.max(dist_min, dist_max);
      const margin_min_max = math_round(dist_axis) / 8;
      _min = my_region_value - dist_axis - margin_min_max;
      _max = my_region_value + dist_axis + margin_min_max;
    }

    const prop_sizer = new PropSizer(d3.max(data, d => d.num), 30);
    const xScale = d3.scaleLinear()
      .domain([_min, _max])
      .range([0, width]);

    this.draw_group.select('g.axis--x')
      .transition()
      .duration(225)
      .call(d3.axisBottom(xScale));

    const bubbles = this.draw_group.selectAll('.bubble')
      .data(data, d => d.id);

    bubbles
      .transition()
      .duration(225)
      .attrs((d) => {
        let x_value = xScale(d.ratio);
        if (x_value > width) x_value = width + 200;
        else if (x_value < 0) x_value = -200;
        return {
          cx: x_value,
          cy: height / 2,
          r: prop_sizer.scale(d.num),
        };
      })
      .styles(d => ({
        fill: app.colors[d.id] || color_countries,
      }));

    bubbles
      .enter()
      .insert('circle')
      .styles(d => ({
        fill: app.colors[d.id] || color_countries,
      }))
      .transition()
      .duration(225)
      .attrs((d) => {
        let x_value = xScale(d.ratio);
        if (x_value > width) x_value = width + 200;
        else if (x_value < 0) x_value = -200;
        return {
          class: 'bubble',
          cx: x_value,
          cy: height / 2,
          r: prop_sizer.scale(d.num),
        };
      });

    bubbles.exit().transition().duration(225).remove();

    this.draw_group.selectAll('.bubble')
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
          .text(`Ratio: ${Math.round(d.ratio)}`);
        tooltip.select('text.value_feature2')
          .text(`Stock: ${Math.round(d.num)}`);
        tooltip
          .attr('transform', `translate(${[d3.mouse(this)[0] - 5, d3.mouse(this)[1] - 45]})`);
      });
  }
  updateCompletude() {
    this.completude
      .text(`Complétude : ${app.completude}%`);
  }

  updateMapRegio() {
    if (!this.map_elem) return;
    this.map_elem.target_layer.selectAll('path')
      .attr('fill', d => (app.current_ids.indexOf(d.properties[app.current_config.id_field_geom]) > -1
        ? (app.colors[d.properties[app.current_config.id_field_geom]] || color_countries)
        : color_disabled));
  }

  handle_brush_map(event) {
    const self = this;
    const [topleft, bottomright] = event.selection;
    const rect = new Rect(topleft, bottomright);
    app.colors = {};
    self.highlight_selection = [];
    self.map_elem.target_layer.selectAll('path')
      .attr('fill', function (d) {
        const id = d.properties[app.current_config.id_field_geom];
        if (id === app.current_config.my_region) {
          app.colors[id] = color_highlight;
          return color_highlight;
        } else if (app.current_ids.indexOf(id) < 0) {
          return color_disabled;
        }
        if (!this._pts) {
          this._pts = svgPathToCoords(this.getAttribute('d'), app.type_path);
        }
        const pts = this._pts;
        for (let ix = 0, nb_pts = pts.length; ix < nb_pts; ix++) {
          if (rect.contains(pts[ix])) {
            const value = d.properties[app.current_config.ratio];
            const color = comp(value, self.my_region_value, this.serie_inversed);
            app.colors[id] = color;
            self.highlight_selection.push({
              id,
              ratio: value,
              dist: math_abs(value - self.my_region_value),
            });
            return color;
          }
        }
        return color_countries;
      });
    self.update();
  }

  handleClickMap(d, parent) {
    const id = d.properties[app.current_config.id_field_geom];
    if (app.current_ids.indexOf(id) < 0 || id === app.current_config.my_region) return;
    if (app.colors[id] !== undefined) {
      // Remove the clicked feature from the colored selection on the chart:
      const id_to_remove = this.highlight_selection
        .map((ft, i) => (ft.id === id ? i : null)).filter(ft => ft);
      this.highlight_selection.splice(id_to_remove, 1);
      // Change its color in the global colors object:
      app.colors[id] = undefined;
      // Change the color on the map:
      d3.select(parent).attr('fill', color_countries);
    } else {
      const value = d.properties[app.current_config.ratio];
      const color = comp(value, this.my_region_value, this.serie_inversed);
      app.colors[id] = color;
      // Change the color on the map:
      d3.select(parent).attr('fill', color);
      // Add the clicked feature on the colored selection on the chart:
      this.highlight_selection.push({
        id,
        ratio: value,
        dist: math_abs(value - this.my_region_value),
      });
    }
    this.update();
  }

  updateChangeRegion() {
    this.map_elem.removeRectBrush();
    this.map_elem.updateLegend();
    this.my_region_value = this.data.filter(
      d => d.id === app.current_config.my_region)[0][this.ratio_to_use];
    this.applySelection(this.highlight_selection.length, 'close');
  }

  changeStudyZone() {
    this.map_elem.removeRectBrush();
    this.map_elem.updateLegend();
    this.data = app.current_data.slice().sort(
      (a, b) => b[app.current_config.num] - a[app.current_config.num]);
    this.my_region_value = this.data.filter(
      d => d.id === app.current_config.my_region)[0][this.ratio_to_use];
    const temp = this.highlight_selection.length;
    this.highlight_selection = [];
    this.applySelection(temp, 'close');
  }

  bindMenu() {
    const self = this;
    const menu = d3.select('#menu_selection');
    const applychange = function () {
      self.map_elem.removeRectBrush();
      const type = this.parentElement.querySelector('.type_selection').value;
      let value = +this.value;
      if (!(value > -1)) {
        this.value = 5;
        value = 5;
      }
      self.applySelection(value, type);
    };
    menu.select('.nb_select')
      .on('change', applychange);
    menu.select('.nb_select')
      .on('wheel', applychange);
    menu.select('.nb_select')
      .on('keyup', applychange);
  }

  remove() {
    this.map_elem.unbindBrush();
    this.map_elem = null;
    d3.select('#menu_selection').remove();
    svg_bar.html('');
  }

  bindMap(map_elem) {
    this.map_elem = map_elem;
    d3.select('#menu_selection').select('.nb_select').dispatch('change');
  }
}
