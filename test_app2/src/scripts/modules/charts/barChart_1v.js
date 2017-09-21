import { comp, math_round, math_abs, Rect, prepareTooltip, svgPathToCoords } from './../helpers';
import { color_disabled, color_countries, color_sup, color_inf, color_highlight } from './../options';
import { calcCompletudeSubset } from './../prepare_data';
import { svg_map } from './../map';
import { app, resetColors } from './../../main';

export const svg_bar = d3.select('svg#svg_bar'),
  margin = { top: 10, right: 20, bottom: 100, left: 40 },
  margin2 = { top: 430, right: 20, bottom: 15, left: 40 },
  width = +svg_bar.attr('width') - margin.left - margin.right,
  height = +svg_bar.attr('height') - margin.top - margin.bottom,
  height2 = +svg_bar.attr('height') - margin2.top - margin2.bottom;

let nbFt;
let current_range_brush = [0, 0];
let current_range = [0, 0];
let displayed;

function getMeanRank(mean_value, ratio_to_use) {
  let mean_rank = app.current_data.map(
    (d, i) => [d[ratio_to_use], math_abs(mean_value - d[ratio_to_use]), i]);
  mean_rank.sort((a, b) => a[1] - b[1]);
  mean_rank = mean_rank[0];
  if (mean_rank[1] > mean_value) {
    mean_rank = mean_rank[2] - 1;
  } else {
    mean_rank = mean_rank[2];
  }
  return mean_rank;
}


export class BarChart1 {
  constructor(ref_data) {
    this.brushed = () => {
      if (d3.event.sourceEvent && d3.event.sourceEvent.type === 'zoom') return; // ignore brush-by-zoom
      if (!this.x) { console.log('a'); return; }
      const s = d3.event.selection || this.x2.range();
      current_range = [math_round(s[0] / (width / nbFt)), math_round(s[1] / (width / nbFt))];
      this.x.domain(this.data.slice(current_range[0], current_range[1]).map(ft => ft.id));
      svg_bar.select('.zoom').call(this.zoom.transform, d3.zoomIdentity
        .scale(width / (current_range[1] - current_range[0]))
        .translate(-current_range[0], 0));
      this.update();
      this.updateContext(current_range[0], current_range[1]);
      svg_bar.select('.brush_top').call(this.brush_top.move, null);
      this.brushed_top();
    };

    this.brushed_top = () => {
      if (!this._focus) { console.log('b'); return; }
      if (!this.map_elem) { console.log('c'); return; }
      const d3_event = d3.event;
      const ratio_to_use = this.ratio_to_use;
      const ref_value = this.ref_value;
      if (d3_event && d3_event.selection
            && d3_event.sourceEvent && d3_event.sourceEvent.target === document.querySelector('.brush_top > rect.overlay')) {
        this.map_elem.removeRectBrush();
        const s = d3_event.selection;
        current_range_brush = [
          current_range[0] + math_round(s[0] / (width / displayed)) - 1,
          current_range[0] + math_round(s[1] / (width / displayed)),
        ];
        this.x.domain(this.data.slice(current_range_brush[0] + 1, current_range_brush[1])
          .map(ft => ft.id));
        app.colors = {};
        this._focus.selectAll('.bar')
          .style('fill', (d, i) => {
            if (d.id === app.current_config.my_region) {
              app.colors[d.id] = color_highlight;
              return color_highlight;
            } else if (i > current_range_brush[0] && i < current_range_brush[1]) {
              const color = comp(d[ratio_to_use], ref_value, this.serie_inversed);
              app.colors[d.id] = color;
              return color;
            }
            return color_countries;
          });
        this.updateMapRegio();
      } else {
        if (d3_event && !d3_event.selection
            && d3_event.sourceEvent && d3_event.sourceEvent.detail !== undefined) {
          this.map_elem.removeRectBrush();
          app.colors = {};
          app.colors[app.current_config.my_region] = color_highlight;
          this.updateMapRegio();
        }
        this._focus.selectAll('.bar')
          .style('fill', d => app.colors[d.id] || color_countries);
      }
    };
    const x = d3.scaleBand().range([0, width]).padding(0.1),
      x2 = d3.scaleBand().range([0, width]).padding(0.1),
      y = d3.scaleLinear().range([height, 0]),
      y2 = d3.scaleLinear().range([height2, 0]);

    const xAxis = d3.axisBottom(x);
    const xAxis2 = d3.axisBottom(x2);
    const yAxis = d3.axisLeft(y);

    this.x = x;
    this.x2 = x2;
    this.y = y;
    this.y2 = y2;
    this.xAxis = xAxis;
    this.yAxis = yAxis;
    this.xAxis2 = xAxis2;
    const self = this;
    const available_ratios = app.current_config.ratio;
    const ratio_to_use = available_ratios[0];
    this.ratio_to_use = ratio_to_use;

    this.data = ref_data.filter(ft => !!ft[ratio_to_use]);
    this.data.sort((a, b) => a[ratio_to_use] - b[ratio_to_use]);
    this.current_ids = this.data.map(d => d.id);
    resetColors(this.current_ids);
    this.current_ranks = this.data.map((d, i) => i + 1);
    nbFt = this.data.length;
    this.mean_value = d3.mean(this.data.map(d => d[ratio_to_use]));
    this.ref_value = this.data.filter(
      ft => ft.id === app.current_config.my_region)[0][ratio_to_use];
    svg_bar.append('defs')
      .append('clipPath')
      .attr('id', 'clip')
      .append('rect')
      .attrs({ width, height });

    const focus = svg_bar.append('g')
      .attrs({
        class: 'focus',
        transform: `translate(${margin.left}, ${margin.top})`,
      });

    const context = svg_bar.append('g')
      .attrs({
        class: 'context',
        transform: `translate(${margin2.left}, ${margin2.top})`,
      });

    this._focus = focus;
    this.context = context;

    x.domain(this.data.map(ft => ft.id));
    y.domain([
      d3.min(this.data, d => d[ratio_to_use]) - 2,
      d3.max(this.data, d => d[ratio_to_use]),
    ]);
    x2.domain(x.domain());
    y2.domain(y.domain());

    const brush_bottom = d3.brushX()
      .extent([[0, 0], [width, height2]])
      .on('brush end', this.brushed);

    const brush_top = d3.brushX()
      .extent([[0, 0], [width, height]])
      .on('brush end', this.brushed_top);

    const zoom = d3.zoom()
      .scaleExtent([1, Infinity])
      .translateExtent([[0, 0], [width, height]])
      .extent([[0, 0], [width, height]]);
      // .on("zoom", zoomed);
    this.brush_top = brush_top;
    this.brush_bottom = brush_bottom;
    this.zoom = zoom;

    focus.append('g')
      .attrs({ class: 'axis axis--x', transform: `translate(0, ${height})` })
      .call(xAxis);

    focus.select('.axis--x')
      .selectAll('text')
      .style('text-anchor', 'end')
      .attrs({ dx: '-0.8em', dy: '0.15em', transform: 'rotate(-65)' });

    focus.append('g')
      .attr('class', 'axis axis--y')
      .call(yAxis);

    this.g_bar = focus.append('g');

    const groupe_line_mean = focus.append('g').attr('class', 'mean');
    groupe_line_mean.append('text')
      .attrs({ x: 60, y: y(this.mean_value) + 20 })
      .styles({
        display: 'none',
        fill: 'red',
        'fill-opacity': '0.8',
        'font-family': '\'Signika\', sans-serif',
      })
      .text(`Valeur moyenne : ${Math.round(this.mean_value * 10) / 10}`);

    groupe_line_mean.append('line')
      .attrs({
        x1: 0,
        x2: width,
        y1: y(this.mean_value),
        y2: y(this.mean_value),
        'stroke-dasharray': '10, 5',
        'stroke-width': '2px',
        class: 'mean_line',
      })
      .style('stroke', 'red');

    groupe_line_mean.append('line')
      .attrs({ x1: 0, x2: width, y1: y(this.mean_value), y2: y(this.mean_value), 'stroke-width': '14px', class: 'transp_mean_line' })
      .style('stroke', 'transparent')
      .on('mouseover', () => {
        groupe_line_mean.select('text')
          .style('display', 'initial');
      })
      .on('mouseout', () => {
        groupe_line_mean.select('text')
          .style('display', 'none');
      });

    this.updateMiniBars();

    context.append('g')
      .attr('class', 'brush_bottom')
      .call(brush_bottom)
      .call(brush_bottom.move, x.range());

    focus.append('g')
      .attr('class', 'brush_top')
      .call(brush_top)
      .call(brush_top.move, null);

    this.completude_value = calcCompletudeSubset(app, [this.ratio_to_use]);

    this.completude = svg_bar.append('text')
      .attrs({ id: 'chart_completude', x: 60, y: 40 })
      .styles({ 'font-family': '\'Signika\', sans-serif' })
      .text(`Complétude : ${this.completude_value}%`);

    svg_bar.append('image')
      .attrs({
        x: width + margin.left + 5,
        y: 385,
        width: 15,
        height: 15,
        'xlink:href': 'img/reverse_blue.png',
        id: 'img_reverse',
      })
      .on('click', () => {
        // this.data = app.current_data.slice();
        if (!this.serie_inversed) {
          this.data.sort((a, b) => b[this.ratio_to_use] - a[this.ratio_to_use]);
        } else {
          this.data.sort((a, b) => a[this.ratio_to_use] - b[this.ratio_to_use]);
        }
        this.serie_inversed = !this.serie_inversed;
        x.domain(this.data.slice(current_range[0], current_range[1]).map(ft => ft.id));
        x2.domain(this.data.map(ft => ft.id));
        // svg_bar.select(".zoom").call(zoom.transform, d3.zoomIdentity
        //     .scale(width / (current_range[1] - current_range[0]))
        //     .translate(-current_range[0], 0));
        this.update();
        // this.updateMiniBars();
        this.updateContext(current_range[0], current_range[1]);
        svg_bar.select('.brush_top').call(brush_top.move, null);
        this.map_elem.removeRectBrush();
        svg_bar.select('.brush_bottom').call(brush_bottom.move, x.range());
      });

    // Prepare the tooltip displayed on mouseover:
    const tooltip = prepareTooltip(svg_bar);

    // Deactivate the brush rect selection on the map + on the chart
    // when he user press the Ctrl key:
    document.onkeydown = (event) => {
      if (event && event.key === 'Control') {
        svg_bar.select('.brush_top')
          .selectAll('.selection, .overlay')
          .style('display', 'none');
        svg_map.select('.brush_map')
          .selectAll('.selection, .overlay')
          .style('display', 'none');
      }
    };
    document.onkeyup = (event) => {
      if (event && event.key === 'Control') {
        svg_bar.select('.brush_top')
          .selectAll('.selection, .overlay')
          .style('display', null);
        svg_map.select('.brush_map')
          .selectAll('.selection, .overlay')
          .style('display', null);
      }
    };

    //
    const header_bar_section = d3.select('#header_chart');

    this.selec_var = header_bar_section
      .insert('select', '#img_table')
      .attrs({ class: 'title_variable' })
      .styles({
        'font-family': '\'Signika\', sans-serif',
        'font-weight': '800',
        'font-size': '14px',
        'margin-top': '12px',
        'margin-left': '40px',
        float: 'left',
      });

    for (let i = 0, len_i = available_ratios.length; i < len_i; i++) {
      this.selec_var.append('option')
        .attr('value', available_ratios[i])
        .text(app.current_config.ratio_pretty_name[i]);
    }

    this.selec_var.on('change', function () {
      const code_variable = this.value;
      self.changeVariable(code_variable);
      self.changeStudyZone();
      self.updateCompletude();
    });

    // Create the menu under the chart allowing to use some useful selections
    // (above or below the mean value and above or below my_region)
    const menu_selection = d3.select('#bar_section')
      .append('div')
      .attr('id', 'menu_selection')
      .styles({ padding: '0 10px 10px 10px', 'text-align': 'center' });

    menu_selection.append('button')
      .attrs({ class: 'button_blue', id: 'btn_above_mean' })
      .text('< à la moyenne')
      .on('click', () => this.selectBelowMean());

    menu_selection.append('button')
      .attrs({ class: 'button_blue', id: 'btn_below_mean' })
      .text('> à la moyenne')
      .on('click', () => this.selectAboveMean());

    menu_selection.append('button')
      .attrs({ class: 'button_blue', id: 'btn_above_my_region' })
      .text('< à ma région')
      .on('click', () => this.selectBelowMyRegion());

    menu_selection.append('button')
      .attrs({ class: 'button_blue', id: 'btn_below_my_region' })
      .text('> à ma région')
      .on('click', () => this.selectAboveMyRegion());
  }

  updateCompletude() {
    this.completude_value = calcCompletudeSubset(app, [this.ratio_to_use]);

    this.completude
      .text(`Complétude : ${this.completude_value}%`);
  }

  updateContext(min, max) {
    this.context.selectAll('.bar')
       .style('fill-opacity', (_, i) => (i >= min && i < max ? '1' : '0.3'));
  }

  update() {
    displayed = 0;
    const ratio_to_use = this.ratio_to_use;
    const self = this;
    const bar = this.g_bar.selectAll('.bar')
      .data(this.data);

    bar
      .attrs(d => ({
        x: this.x(d.id),
        y: this.y(d[ratio_to_use]),
        width: this.x.bandwidth(),
        height: height - this.y(d[ratio_to_use]),
      }))
      .style('fill', d => app.colors[d.id] || color_countries)
      .style('display', (d) => {
        const to_display = this.x(d.id) != null;
        if (to_display) {
          displayed += 1;
          return 'initial';
        }
        return 'none';
      })
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
        y: this.y(d[ratio_to_use]),
        width: this.x.bandwidth(),
        height: height - this.y(d[ratio_to_use]),
      }));

    bar.exit().remove();

    this._focus.select('.axis--y')
      .call(this.yAxis);

    const axis_x = this._focus.select('.axis--x')
      .attr('font-size', () => (displayed > 75 ? 6 : 10))
      .call(this.xAxis);
    axis_x
      .selectAll('text')
      .attrs(() => {
        if (displayed > 100) {
          return { dx: '-0.8em', dy: '0.15em', transform: 'rotate(-65)' };
        } else if (displayed > 20) {
          return { dx: '-0.8em', dy: '0.15em', transform: 'rotate(-65)' };
        } else {
          return { dx: '0', dy: '0.71em', transform: null };
        }
      })
      .style('text-anchor', () => (displayed > 20 ? 'end' : 'middle'));

    this.updateMiniBars();
  }


  updateMiniBars() {
    const ratio_to_use = this.ratio_to_use;
    const mini_bars = this.context.selectAll('.bar')
      .data(this.data);

    mini_bars
      .attrs(d => ({
        x: this.x2(d.id),
        y: this.y2(d[ratio_to_use]),
        width: this.x2.bandwidth(),
        height: height2 - this.y2(d[ratio_to_use]),
      }))
      .style('fill', d => (d.id !== app.current_config.my_region ? color_countries : color_highlight));

    mini_bars
      .enter()
      .insert('rect')
      .attrs(d => ({
        class: 'bar',
        x: this.x2(d.id),
        y: this.y2(d[ratio_to_use]),
        width: this.x2.bandwidth(),
        height: height2 - this.y2(d[ratio_to_use]),
      }))
      .style('fill', d => (d.id !== app.current_config.my_region ? color_countries : color_highlight));
    mini_bars.exit().remove();
  }

  updateMapRegio() {
    this.map_elem.target_layer.selectAll('path')
      .attr('fill', d => (this.current_ids.indexOf(d.properties[app.current_config.id_field_geom]) > -1
        ? (app.colors[d.properties[app.current_config.id_field_geom]] || color_countries)
        : color_disabled));
  }

  selectAboveMyRegion() {
    const my_rank = this.data.map((d, i) => [d.id, i])
      .filter(d => d[0] === app.current_config.my_region)[0][1];
    app.colors = {};
    app.colors[app.current_config.my_region] = color_highlight;
    if (!this.serie_inversed) {
      current_range_brush = [my_rank, this.data.length];
      this.data
        .filter((d, i) => i > my_rank)
        .map(d => d.id)
        .forEach((ft) => { app.colors[ft] = color_sup; });
    } else {
      current_range_brush = [0, my_rank];
      this.data
        .filter((d, i) => i < my_rank)
        .map(d => d.id)
        .forEach((ft) => { app.colors[ft] = color_inf; });
    }
    svg_bar.select('.brush_bottom').call(
      this.brush_bottom.move, this.x2.range());
    this.update();
    // svg_bar.select('.brush_top').call(this.brush_top.move, current_range_brush.map(d => d * (width / nbFt)));
    this.updateMapRegio();
  }

  selectBelowMyRegion() {
    const my_rank = this.data.map((d, i) => [d.id, i])
      .filter(d => d[0] === app.current_config.my_region)[0][1];

    app.colors = {};
    app.colors[app.current_config.my_region] = color_highlight;
    if (!this.serie_inversed) {
      current_range_brush = [0, my_rank];
      this.data
        .filter((d, i) => i < my_rank)
        .map(d => d.id)
        .forEach((ft) => { app.colors[ft] = color_inf; });
    } else {
      current_range_brush = [my_rank, this.data.length];
      this.data
        .filter((d, i) => i > my_rank)
        .map(d => d.id)
        .forEach((ft) => { app.colors[ft] = color_sup; });
    }
    svg_bar.select('.brush_bottom').call(
      this.brush_bottom.move, this.x2.range());
    this.update();
    // svg_bar.select('.brush_top').call(this.brush_top.move, current_range_brush.map(d => d * (width / nbFt)));
    this.updateMapRegio();
  }

  selectAboveMean() {
    const mean_rank = getMeanRank(this.mean_value, this.ratio_to_use);
    const ratio_to_use = this.ratio_to_use;
    const ref_value = this.ref_value;

    app.colors = {};
    app.colors[app.current_config.my_region] = color_highlight;
    if (!this.serie_inversed) {
      current_range_brush = [mean_rank, this.data.length];
      this.data.filter(d => d[ratio_to_use] > this.mean_value).forEach((ft) => {
        if (ft[ratio_to_use] > ref_value) app.colors[ft.id] = color_sup;
        else app.colors[ft.id] = color_inf;
      });
    } else {
      current_range_brush = [0, mean_rank + 1];
      this.data.filter(d => d[ratio_to_use] > this.mean_value).forEach((ft) => {
        if (ft[ratio_to_use] > ref_value) app.colors[ft.id] = color_inf;
        else app.colors[ft.id] = color_sup;
      });
    }
    app.colors[app.current_config.my_region] = color_highlight;
    svg_bar.select('.brush_bottom').call(
      this.brush_bottom.move, this.x2.range());
    this.update();
    // svg_bar.select('.brush_top').call(this.brush_top.move, current_range_brush.map(d => d * (width / nbFt)));
    this.updateMapRegio();
  }

  selectBelowMean() {
    const mean_rank = getMeanRank(this.mean_value, this.ratio_to_use);
    const ratio_to_use = this.ratio_to_use;
    const ref_value = this.ref_value;
    app.colors = {};
    if (!this.serie_inversed) {
      current_range_brush = [0, mean_rank];
      this.data.filter(d => d[ratio_to_use] < this.mean_value).forEach((ft) => {
        if (ft[ratio_to_use] < ref_value) app.colors[ft.id] = color_inf;
        else app.colors[ft.id] = color_sup;
      });
    } else {
      current_range_brush = [mean_rank + 1, this.data.length];
      this.data.filter(d => d[ratio_to_use] < this.mean_value).forEach((ft) => {
        if (ft[ratio_to_use] < ref_value) app.colors[ft.id] = color_sup;
        else app.colors[ft.id] = color_inf;
      });
    }
    app.colors[app.current_config.my_region] = color_highlight;
    svg_bar.select('.brush_bottom').call(
      this.brush_bottom.move, this.x2.range());
    this.update();
    // svg_bar.select('.brush_top').call(this.brush_top.move, current_range_brush.map(d => d * (width / nbFt)));
    this.updateMapRegio();
  }

  handle_brush_map(event) {
    if (!event || !event.selection) {
      this.last_map_selection = undefined;
      return;
    }
    const ratio_to_use = this.ratio_to_use;
    const ref_value = this.ref_value;
    const self = this;
    svg_bar.select('.brush_top').call(self.brush_top.move, null);
    const [topleft, bottomright] = event.selection;
    this.last_map_selection = [topleft, bottomright];
    // const transform = svg_map.node().__zoom;
    // topleft[0] = (topleft[0] - transform.x) / transform.k;
    // topleft[1] = (topleft[1] - transform.y) / transform.k;
    // bottomright[0] = (bottomright[0] - transform.x) / transform.k;
    // bottomright[1] = (bottomright[1] - transform.y) / transform.k;
    const rect = new Rect(topleft, bottomright);
    app.colors = {};
    self.map_elem.target_layer.selectAll('path')
      .attr('fill', function (d) {
        const id = d.properties[app.current_config.id_field_geom];
        if (id === app.current_config.my_region) {
          app.colors[id] = color_highlight;
          return color_highlight;
        } else if (self.current_ids.indexOf(id) < 0) {
          return color_disabled;
        }
        if (!this._pts) {
          this._pts = svgPathToCoords(this.getAttribute('d'), app.type_path);
        }
        const pts = this._pts;
        for (let ix = 0, nb_pts = pts.length; ix < nb_pts; ix++) {
          if (rect.contains(pts[ix])) {
            const value = d.properties[ratio_to_use];
            const color = comp(value, ref_value, this.serie_inversed);
            app.colors[id] = color;
            return color;
          }
        }
        return color_countries;
      });
    self._focus.selectAll('.bar')
      .style('fill', d => app.colors[d.id] || color_countries);
    const ids = Object.keys(app.colors);
    const ranks = ids.map(d => this.current_ids.indexOf(d.id) > -1).map(d => this.current_ranks[d]);
    if (ranks.length > 1) {
      const c1 = ranks[0] - 1;
      const c2 = ranks[ranks.length - 1];
      if (c1 < current_range[0] || c2 > current_range[1]) {
        current_range = [
          ranks[0] - 1,
          ranks[ranks.length - 1],
        ];
        svg_bar.select('.brush_bottom').call(
          self.brush_bottom.move,
          [current_range[0] * (width / nbFt), current_range[1] * (width / nbFt)]);
      }
    } else {
      current_range = [0, this.data.length];
      svg_bar.select('.brush_bottom').call(
        self.brush_bottom.move, self.x.range());
    }
  }

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
    if (app.current_config.filter_key !== undefined) {
      this.changeStudyZone();
    } else {
      this.ref_value = this.data.filter(
        ft => ft.id === app.current_config.my_region)[0][this.ratio_to_use];
      this.update();
      // this.updateMiniBars();
      this.updateContext(0, this.data.length);
      this.updateMapRegio();
      svg_bar.select('.brush_bottom').call(this.brush_bottom.move, this.x.range());
      this.map_elem.removeRectBrush();
      this.map_elem.updateLegend();
    }
  }

  updateMeanValue() {
    const y = this.y;
    const ratio_to_use = this.ratio_to_use;
    const grp_mean = this._focus.select('.mean');
    this.mean_value = d3.mean(this.data.map(d => d[ratio_to_use]));
    grp_mean.select('text')
      .attr('y', y(this.mean_value) + 20)
      .text(`Valeur moyenne : ${Math.round(this.mean_value * 10) / 10}`);
    grp_mean.select('.mean_line')
      .attrs({ y1: y(this.mean_value), y2: y(this.mean_value) });
    grp_mean.select('.transp_mean_line')
      .attrs({ y1: y(this.mean_value), y2: y(this.mean_value) });
  }

  changeStudyZone() {
    const ratio_to_use = this.ratio_to_use;
    this.data = app.current_data.filter(ft => !!ft[ratio_to_use]);

    if (this.serie_inversed) {
      this.data.sort((a, b) => b[ratio_to_use] - a[ratio_to_use]);
    } else {
      this.data.sort((a, b) => a[ratio_to_use] - b[ratio_to_use]);
    }
    nbFt = this.data.length;
    this.ref_value = this.data.filter(
      ft => ft.id === app.current_config.my_region)[0][ratio_to_use];
    this.x.domain(this.data.map(ft => ft.id));
    const min_serie = d3.min(this.data, d => d[ratio_to_use]);
    const max_serie = d3.max(this.data, d => d[ratio_to_use]);
    const offset_y = (max_serie - min_serie) / 20;
    this.y.domain([
      min_serie - offset_y, max_serie,
    ]);
    this.x2.domain(this.x.domain());
    this.y2.domain(this.y.domain());
    this.updateMeanValue();
    this.update();
    this.updateContext(0, this.data.length);

    svg_bar.select('.brush_bottom').call(this.brush_bottom.move, this.x2.range());
    this.map_elem.removeRectBrush();
    app.colors = {};
    app.colors[app.current_config.my_region] = color_highlight;
    this.updateMapRegio();
  }

  addVariable(code_variable, name_variable) {
    // Add the variable to the input element allowing to choose variables:
    this.selec_var.append('option')
      .attr('value', code_variable)
      .text(name_variable);

    // And use it immediatly:
    this.selec_var.node().value = code_variable;
    this.selec_var.dispatch('change');
  }

  removeVariable(code_variable) {
    // Add the variable to the input element allowing to choose variables:
    this.selec_var.select(`option[value=${code_variable}]`).remove();
    if (this.ratio_to_use === code_variable) {
      this.selec_var.node().value = this.selec_var.select('option').node().value;
      this.selec_var.dispatch('change');
    }
  }

  changeVariable(code_variable) {
    this.ratio_to_use = code_variable;
  }

  remove() {
    this._focus.remove();
    this.context.remove();
    this.selec_var.remove();
    this.map_elem.unbindBrush();
    this.map_elem = null;
    svg_bar.html('');
  }

  bindMap(map_elem) {
    this.map_elem = map_elem;
    this.map_elem.resetColors(this.current_ids);
  }
}
