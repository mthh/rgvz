import { comp, math_round, math_abs, Rect } from './../helpers';
import { color_disabled, color_countries, color_sup, color_inf, color_highlight } from './../options';
import { svg_map } from './../map';
import { applyFilter } from './../prepare_data';
import { app, bindTopButtons } from './../../main';

export const svg_bar = d3.select('svg#svg_bar'),
  margin = { top: 10, right: 20, bottom: 100, left: 30 },
  margin2 = { top: 430, right: 20, bottom: 15, left: 30 },
  width = +svg_bar.attr('width') - margin.left - margin.right,
  height = +svg_bar.attr('height') - margin.top - margin.bottom,
  height2 = +svg_bar.attr('height') - margin2.top - margin2.bottom;

let nbFt;
let mean_value;
let current_range_brush = [0, 0];
let current_range = [0, 0];
let displayed;

function getMeanRank() {
  let mean_rank = app.current_data.map((d, i) => [d.ratio, math_abs(mean_value - d.ratio), i]);
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
      this.x.domain(app.current_data.slice(current_range[0], current_range[1]).map(ft => ft.id));
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
      if (d3_event && d3_event.selection
            && d3_event.sourceEvent && d3_event.sourceEvent.target === document.querySelector('.brush_top > rect.overlay')) {
        svg_map.select('.brush_map').call(this.map_elem.brush_map.move, null);
        const s = d3_event.selection;
        current_range_brush = [
          current_range[0] + math_round(s[0] / (width / displayed)) - 1,
          current_range[0] + math_round(s[1] / (width / displayed)),
        ];
        this.x.domain(app.current_data.slice(current_range_brush[0] + 1, current_range_brush[1])
          .map(ft => ft.id));
        app.colors = {};
        this._focus.selectAll('.bar')
          .style('fill', (d, i) => {
            if (d.id === app.current_config.my_region) {
              app.colors[d.id] = color_highlight;
              return color_highlight;
            } else if (i > current_range_brush[0] && i < current_range_brush[1]) {
              const color = comp(d.ratio, app.current_config.ref_value, app.serie_inversed);
              app.colors[d.id] = color;
              return color;
            }
            return color_countries;
          });
        this.updateMapRegio();
      } else {
        if (d3_event && !d3_event.selection
            && d3_event.sourceEvent && d3_event.sourceEvent.detail !== undefined) {
          svg_map.select('.brush_map').call(this.map_elem.brush_map.move, null);
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

    let data = ref_data;
    data.sort((a, b) => a.ratio - b.ratio);
    app.current_ids = data.map(d => d.id);
    app.current_ranks = data.map((d, i) => i + 1);
    nbFt = data.length;
    mean_value = d3.mean(data.map(d => d.ratio));

    svg_bar.append('defs')
      .append('clipPath')
      .attr('id', 'clip')
      .append('rect')
      .attrs({ width, height });

    const focus = svg_bar.append('g')
      .attr('class', 'focus')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    const context = svg_bar.append('g')
      .attr('class', 'context')
      .attr('transform', `translate(${margin2.left}, ${margin2.top})`);

    this._focus = focus;
    this.context = context;

    x.domain(data.map(ft => ft.id));
    y.domain([
      d3.min(data, d => d.ratio) - 2,
      d3.max(data, d => d.ratio),
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
      .attrs({ x: 60, y: y(mean_value) + 20 })
      .styles({
        display: 'none',
        fill: 'red',
        'fill-opacity': '0.8',
        'font-family': '\'Signika\', sans-serif',
      })
      .text('Valeur moyenne');

    groupe_line_mean.append('line')
      .attrs({
        x1: 0,
        x2: width,
        y1: y(mean_value),
        y2: y(mean_value),
        'stroke-dasharray': '10, 5',
        'stroke-width': '2px',
        class: 'mean_line',
      })
      .style('stroke', 'red');

    groupe_line_mean.append('line')
      .attrs({ x1: 0, x2: width, y1: y(mean_value), y2: y(mean_value), 'stroke-width': '14px' })
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

    this.completude = svg_bar.append('text')
      .attrs({ id: 'chart_completude', x: 60, y: 40 })
      .styles({ 'font-family': '\'Signika\', sans-serif' })
      .text(`Complétude : ${app.completude}%`);

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
        data = app.current_data;
        app.serie_inversed = !app.serie_inversed;
        if (data[0].ratio < data[data.length - 1].ratio) {
          data.sort((a, b) => b.ratio - a.ratio);
        } else {
          data.sort((a, b) => a.ratio - b.ratio);
        }
        x.domain(data.slice(current_range[0], current_range[1]).map(ft => ft.id));
        x2.domain(data.map(ft => ft.id));
        // svg_bar.select(".zoom").call(zoom.transform, d3.zoomIdentity
        //     .scale(width / (current_range[1] - current_range[0]))
        //     .translate(-current_range[0], 0));
        this.update();
        // this.updateMiniBars();
        this.updateContext(current_range[0], current_range[1]);
        svg_bar.select('.brush_top').call(brush_top.move, null);
        svg_map.select('.brush_map').call(this.map_elem.brush_map.move, null);
        svg_bar.select('.brush_bottom').call(brush_bottom.move, x.range());
      });

    // Prep the tooltip bits, initial display is hidden
    const tooltip = svg_bar.append('g')
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
        class: 'value_feature',
        x: 25,
        dy: '2.4em',
        'font-size': '14px',
        'font-weight': 'bold' })
      .style('text-anchor', 'middle');

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
  }

  updateCompletude() {
    console.log(app.completude);
    this.completude
      .text(`Complétude : ${app.completude}%`);
  }

  updateContext(min, max) {
    this.context.selectAll('.bar')
       .style('fill-opacity', (_, i) => (i >= min && i < max ? '1' : '0.3'));
  }

  update() {
    displayed = 0;

    const bar = this.g_bar.selectAll('.bar')
      .data(app.current_data);

    bar
      .attr('x', d => this.x(d.id))
      .attr('width', this.x.bandwidth())
      .attr('y', d => this.y(d.ratio))
      .attr('height', d => height - this.y(d.ratio))
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
        tooltip.select('text.value_feature')
          .text(`${math_round(d.ratio * 10) / 10}`);
        tooltip
          .attr('transform', `translate(${[d3.mouse(this)[0] - 5, d3.mouse(this)[1] - 45]})`);
      });

    bar.enter()
      .insert('rect', '.mean')
      .attr('class', 'bar')
      .attr('x', d => this.x(d.id))
      .attr('width', this.x.bandwidth())
      .attr('y', d => this.y(d.ratio))
      .attr('height', d => height - this.y(d.ratio));

    bar.exit().remove();

    this._focus.select('.axis--y')
      .call(this.yAxis);

    this._focus.select('.mean_line')
      .attrs({
        y1: this.y(mean_value),
        y2: this.y(mean_value),
      });

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
    const mini_bars = this.context.selectAll('.bar')
      .data(app.current_data);

    mini_bars
      .attr('x', d => this.x2(d.id))
      .attr('width', this.x2.bandwidth())
      .attr('y', d => this.y2(d.ratio))
      .attr('height', d => height2 - this.y2(d.ratio))
      .style('fill', d => (d.id !== app.current_config.my_region ? color_countries : color_highlight));

    mini_bars
      .enter()
      .insert('rect')
      .attr('class', 'bar')
      .attr('x', d => this.x2(d.id))
      .attr('width', this.x2.bandwidth())
      .attr('y', d => this.y2(d.ratio))
      .attr('height', d => height2 - this.y2(d.ratio))
      .style('fill', d => (d.id !== app.current_config.my_region ? color_countries : color_highlight));
    mini_bars.exit().remove();
  }

  updateMapRegio() {
    this.map_elem.nuts1_lyr.selectAll('path')
      .attr('fill', d => (app.current_ids.indexOf(d.properties[app.current_config.id_field_geom]) > -1
        ? (app.colors[d.properties[app.current_config.id_field_geom]] || color_countries)
        : color_disabled));
  }

  selectAboveMyRegion() {
    const my_rank = app.current_data.map((d, i) => [d.id, i])
      .filter(d => d[0] === app.current_config.my_region)[0][1];
    app.colors = {};
    app.colors[app.current_config.my_region] = color_highlight;
    if (!app.serie_inversed) {
      current_range_brush = [my_rank, app.current_data.length];
      app.current_data
        .filter((d, i) => i > my_rank)
        .map(d => d.id)
        .forEach((ft) => { app.colors[ft] = color_sup; });
    } else {
      current_range_brush = [0, my_rank];
      app.current_data
        .filter((d, i) => i < my_rank)
        .map(d => d.id)
        .forEach((ft) => { app.colors[ft] = color_inf; });
    }
    svg_bar.select('.brush_top').call(this.brush_top.move, current_range_brush.map(d => d * (width / nbFt)));
    this.updateMapRegio();
  }

  selectBelowMyRegion() {
    const my_rank = app.current_data.map((d, i) => [d.id, i])
      .filter(d => d[0] === app.current_config.my_region)[0][1];
    app.colors = {};
    app.colors[app.current_config.my_region] = color_highlight;
    if (!app.serie_inversed) {
      current_range_brush = [0, my_rank];
      app.current_data
        .filter((d, i) => i < my_rank)
        .map(d => d.id)
        .forEach((ft) => { app.colors[ft] = color_inf; });
    } else {
      current_range_brush = [my_rank, app.current_data.length];
      app.current_data
        .filter((d, i) => i > my_rank)
        .map(d => d.id)
        .forEach((ft) => { app.colors[ft] = color_sup; });
    }
    svg_bar.select('.brush_top').call(this.brush_top.move, current_range_brush.map(d => d * (width / nbFt)));
    this.updateMapRegio();
  }

  selectAboveMean() {
    const mean_rank = getMeanRank();
    app.colors = {};
    app.colors[app.current_config.my_region] = color_highlight;
    if (!app.serie_inversed) {
      current_range_brush = [mean_rank, app.current_data.length];
      app.current_data.filter(d => d.ratio > mean_value).forEach((ft) => {
        if (ft.ratio > app.current_config.ref_value) app.colors[ft.id] = color_sup;
        else app.colors[ft.id] = color_inf;
      });
    } else {
      current_range_brush = [0, mean_rank + 1];
      app.current_data.filter(d => d.ratio > mean_value).forEach((ft) => {
        if (ft.ratio > app.current_config.ref_value) app.colors[ft.id] = color_inf;
        else app.colors[ft.id] = color_sup;
      });
    }
    app.colors[app.current_config.my_region] = color_highlight;
    svg_bar.select('.brush_top').call(this.brush_top.move, current_range_brush.map(d => d * (width / nbFt)));
    this.updateMapRegio();
  }

  selectBelowMean() {
    const mean_rank = getMeanRank();
    app.colors = {};
    if (!app.serie_inversed) {
      current_range_brush = [0, mean_rank];
      app.current_data.filter(d => d.ratio < mean_value).forEach((ft) => {
        if (ft.ratio < app.current_config.ref_value) app.colors[ft.id] = color_inf;
        else app.colors[ft.id] = color_sup;
      });
    } else {
      current_range_brush = [mean_rank + 1, app.current_data.length];
      app.current_data.filter(d => d.ratio < mean_value).forEach((ft) => {
        if (ft.ratio < app.current_config.ref_value) app.colors[ft.id] = color_sup;
        else app.colors[ft.id] = color_inf;
      });
    }
    app.colors[app.current_config.my_region] = color_highlight;
    svg_bar.select('.brush_top').call(this.brush_top.move, current_range_brush.map(d => d * (width / nbFt)));
    this.updateMapRegio();
  }

  handle_brush_map(event) {
    const self = this;
    svg_bar.select('.brush_top').call(self.brush_top.move, null);
    const [topleft, bottomright] = event.selection;
    // const transform = svg_map.node().__zoom;
    // topleft[0] = (topleft[0] - transform.x) / transform.k;
    // topleft[1] = (topleft[1] - transform.y) / transform.k;
    // bottomright[0] = (bottomright[0] - transform.x) / transform.k;
    // bottomright[1] = (bottomright[1] - transform.y) / transform.k;
    const rect = new Rect(topleft, bottomright);
    app.colors = {};
    self.map_elem.nuts1_lyr.selectAll('path')
      .attr('fill', function (d) {
        const id = d.properties.NUTS1_2016;
        if (id === app.current_config.my_region) {
          app.colors[id] = color_highlight;
          return color_highlight;
        } else if (app.current_ids.indexOf(id) < 0) {
          return color_disabled;
        }
        if (!this._pts) {
          this._pts = this.getAttribute('d').slice(1).split('L').map(pt => pt.split(',').map(a => +a));
        }
        const pts = this._pts;
        for (let ix = 0, nb_pts = pts.length; ix < nb_pts; ix++) {
          if (rect.contains(pts[ix])) {
            const value = d.properties[app.current_config.ratio];
            const color = comp(value, app.current_config.ref_value, app.serie_inversed);
            app.colors[id] = color;
            return color;
          }
        }
        return color_countries;
      });
    self._focus.selectAll('.bar')
      .style('fill', d => app.colors[d.id] || color_countries);
    const ids = Object.keys(app.colors);
    const ranks = ids.map(d => app.current_ids.indexOf(d.id) > -1).map(d => app.current_ranks[d]);
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
      current_range = [0, app.current_data.length];
      svg_bar.select('.brush_bottom').call(
        self.brush_bottom.move, self.x.range());
    }
  }

  changeRegion(id_region) {
    app.current_config.my_region = id_region;
    app.current_config.my_region_pretty_name = app.feature_names[app.current_config.my_region];
    app.colors = {};
    app.colors[app.current_config.my_region] = color_highlight;
    // app.current_data = filter_no_empty(app);
    app.current_config.ref_value = app.current_data
      .filter(d => d.id === app.current_config.my_region)
      .map(d => d.ratio)[0];
    this.update();
    // this.updateMiniBars();
    this.updateContext(0, app.current_data.length);
    this.updateMapRegio();
    svg_bar.select('.brush_bottom').call(this.brush_bottom.move, this.x.range());
    svg_map.select('.brush_map').call(this.map_elem.brush_map.move, null);
    this.map_elem.updateLegend();
  }

  changeStudyZone() {
    nbFt = app.current_data.length;
    this.x.domain(app.current_data.map(ft => ft.id));
    this.y.domain([
      d3.min(app.current_data, d => d.ratio) - 2,
      d3.max(app.current_data, d => d.ratio),
    ]);
    this.x2.domain(this.x.domain());
    this.y2.domain(this.y.domain());
    this.update();
    // this.updateMiniBars();
    this.updateContext(0, app.current_data.length);
    // brush_bottom.extent(current_range)
    svg_bar.select('.brush_bottom').call(this.brush_bottom.move, this.x2.range());
    svg_map.select('.brush_map').call(this.map_elem.brush_map.move, null);
    app.colors = {};
    app.colors[app.current_config.my_region] = color_highlight;
    this.updateMapRegio();
  }

  remove() {
    this._focus.remove();
    this.context.remove();
    this.map_elem.unbindBrush();
    this.map_elem = null;
    svg_bar.html('');
  }

  bindMap(map_elem) {
    this.map_elem = map_elem;
  }
}

export function bindUI_BarChart1(chart, map_elem) {
  d3.selectAll('span.filter_v')
    .on('click', function () {
      if (!this.classList.contains('checked')) {
        d3.selectAll('span.filter_v').attr('class', 'filter_v square');
        this.classList.add('checked');
        const filter_type = this.getAttribute('filter-value');
        applyFilter(app, filter_type);
        chart.updateCompletude();
        chart.changeStudyZone();
      }
    });

  d3.selectAll('span.target_region')
    .on('click', function () {
      if (!this.classList.contains('checked')) {
        d3.selectAll('span.target_region').attr('class', 'target_region square');
        this.classList.add('checked');
        chart.changeRegion(this.getAttribute('value'));
      }
    });

  d3.selectAll('span.label_chk')
    .on('click', function () {
      this.previousSibling.click();
    });

  const header_map_section = d3.select('#map_section > #header_map');

  header_map_section.select('#img_rect_selec')
    .on('click', function () {
      if (!this.classList.contains('active')) {
        this.classList.add('active');
        // this.style.filter = '';
        // document.getElementById('img_map_zoom').style.filter = 'opacity(25%)';
        document.getElementById('img_map_zoom').classList.remove('active');
        // document.getElementById('img_map_select').style.filter = 'opacity(25%)';
        document.getElementById('img_map_select').classList.remove('active');
        svg_map.on('.zoom', null);
        svg_map.select('.brush_map').style('display', null);
        map_elem.nuts1_lyr.selectAll('path').on('click', null);
      }
    });

  header_map_section.select('#img_map_zoom')
    .on('click', function () {
      if (!this.classList.contains('active')) {
        this.classList.add('active');
        // this.style.filter = '';
        // document.getElementById('img_rect_selec').style.filter = 'opacity(25%)';
        document.getElementById('img_rect_selec').classList.remove('active');
        // document.getElementById('img_map_select').style.filter = 'opacity(25%)';
        document.getElementById('img_map_select').classList.remove('active');
        svg_map.call(map_elem.zoom_map);
        svg_map.select('.brush_map').call(map_elem.brush_map.move, null);
        svg_map.select('.brush_map').style('display', 'none');
        map_elem.nuts1_lyr.selectAll('path').on('click', null);
      }
    });

  header_map_section.select('#img_map_select')
    .on('click', function () {
      if (!this.classList.contains('active')) {
        this.classList.add('active');
        // this.style.filter = '';
        // document.getElementById('img_rect_selec').style.filter = 'opacity(25%)';
        document.getElementById('img_rect_selec').classList.remove('active');
        // document.getElementById('img_map_zoom').style.filter = 'opacity(25%)';
        document.getElementById('img_map_zoom').classList.remove('active');
        svg_map.on('.zoom', null);
        svg_map.select('.brush_map').call(map_elem.brush_map.move, null);
        svg_map.select('.brush_map').style('display', 'none');
        map_elem.nuts1_lyr.selectAll('path')
          .on('click', function (d) {
            const id = d.properties[app.current_config.id_field_geom];
            if (app.current_ids.indexOf(id) < 0 || id === app.current_config.my_region) return;
            if (app.colors[id] !== undefined) {
              app.colors[id] = undefined;
              d3.select(this).attr('fill', color_countries);
            } else {
              const color = comp(
                d.properties[app.current_config.ratio],
                app.current_config.ref_value,
                app.serie_inversed);
              app.colors[id] = color;
              d3.select(this).attr('fill', color);
            }
            chart.update();
          });
      }
    });

  const header_table_section = d3.select('#map_section')
      .insert('p', 'svg')
      .attr('id', 'header_table')
      .styles({ display: 'none', margin: 'auto', 'text-align': 'right' });

  header_table_section.append('span')
    .attr('class', 'button_blue')
    .html('CSV')
    .on('click', () => {
      const content = [
        'id,Numérateur,Dénominateur,Ratio,Rang\r\n',
        app.current_data.map(d => [d.id, d.num, d.denum, d.ratio, d.rang].join(',')).join('\r\n'),
      ].join('');
      const elem = document.createElement('a');
      elem.setAttribute('href', `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`);
      elem.setAttribute('download', 'table.csv');
      elem.style.display = 'none';
      document.body.appendChild(elem);
      elem.click();
      document.body.removeChild(elem);
    });

  const buttons_under_chart = d3.select('#bar_section')
    .append('div')
    .attr('id', 'buttons_under_chart')
    .styles({ padding: '0 10px 10px 10px', 'text-align': 'center' });

  buttons_under_chart.append('button')
    .attrs({ class: 'button_blue', id: 'btn_above_mean' })
    .text('< à la moyenne')
    .on('click', () => chart.selectBelowMean());

  buttons_under_chart.append('button')
    .attrs({ class: 'button_blue', id: 'btn_below_mean' })
    .text('> à la moyenne')
    .on('click', () => chart.selectAboveMean());

  buttons_under_chart.append('button')
    .attrs({ class: 'button_blue', id: 'btn_above_my_region' })
    .text('< à ma région')
    .on('click', () => chart.selectBelowMyRegion());

  buttons_under_chart.append('button')
    .attrs({ class: 'button_blue', id: 'btn_below_my_region' })
    .text('> à ma région')
    .on('click', () => chart.selectAboveMyRegion());

  bindTopButtons(chart, map_elem);
}
