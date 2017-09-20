import { comp, math_round, math_abs, Rect, comp2, prepareTooltip, svgPathToCoords, _getPR, computePercentileRank } from './../helpers';
import { color_disabled, color_countries, color_highlight } from './../options';
import { calcCompletudeSubset } from './../prepare_data';
import { svg_map } from './../map';
import { app, variables, resetColors } from './../../main';
import ContextMenu from './../contextMenu';

const svg_bar = d3.select('#svg_bar');
const margin = { top: 20, right: 20, bottom: 40, left: 40 };

const width = +svg_bar.attr('width') - margin.left - margin.right,
  height = +svg_bar.attr('height') - margin.top - margin.bottom;

export class ScatterPlot2 {
  constructor(ref_data) {
    const self = this;
    this.variable1 = app.current_config.ratio[0];
    this.variable2 = app.current_config.ratio[1];
    this.rank_variable1 = `pr_${this.variable1}`;
    this.rank_variable2 = `pr_${this.variable2}`;
    this.pretty_name1 = app.current_config.ratio_pretty_name[0];
    this.pretty_name2 = app.current_config.ratio_pretty_name[1];
    this.data = ref_data.filter(ft => !!ft[this.variable1] && !!ft[this.variable2])
      .map((d) => {
        const res = { id: d.id };
        res[this.variable1] = d[this.variable1];
        res[this.variable2] = d[this.variable2];
        return res;
      });
    this.current_ids = this.data.map(d => d.id);
    resetColors(this.current_ids);
    this.nbFt = this.data.length;
    computePercentileRank(this.data, this.variable1, this.rank_variable1);
    computePercentileRank(this.data, this.variable2, this.rank_variable2);

    this.x = d3.scaleLinear()
      .range([0, width])
      .nice();
    this.y = d3.scaleLinear()
      .range([height, 0])
      .nice();
    this.xAxis = d3.axisBottom(this.x).ticks(12);
    this.yAxis = d3.axisLeft(this.y).ticks(12 * height / width);
    this.xAxis2 = d3.axisBottom(this.x).ticks(12);
    this.yAxis2 = d3.axisLeft(this.y).ticks(12 * height / width);

    this.xInversed = false;
    this.yInversed = false;
    this.ref_value1 = this.data.filter(
      d => d.id === app.current_config.my_region)[0][this.variable1];
    this.ref_value2 = this.data.filter(
      d => d.id === app.current_config.my_region)[0][this.variable2];

    this.plot = svg_bar.append('g')
      .attr('transform', `translate(${[margin.left, margin.top]})`);

    this.plot.append('defs')
      .append('svg:clipPath')
      .attr('id', 'clip')
      .append('svg:rect')
      .attrs({
        width,
        height,
        x: 0,
        y: 0,
      });

    this.scatter = this.plot.append('g')
         .attr('id', 'scatterplot')
         .attr('clip-path', 'url(#clip)');

    this.x.domain(d3.extent(this.data, d => d[this.rank_variable1])).nice();
    this.y.domain(d3.extent(this.data, d => d[this.rank_variable2])).nice();
    this.mean_variable1 = _getPR(
      d3.mean(this.data.map(d => d[this.variable1])), this.data.map(d => d[this.variable1]));
    this.mean_variable2 = _getPR(
      d3.mean(this.data.map(d => d[this.variable2])), this.data.map(d => d[this.variable2]));

    this.makeGrid();

    const groupe_line_mean = this.plot.append('g')
      .attr('clip-path', 'url(#clip)')
      .attr('class', 'mean');
    groupe_line_mean.append('line')
      .attr('clip-path', 'url(#clip)')
      .attrs({
        id: 'mean_x',
        x1: this.x(this.mean_variable1),
        x2: this.x(this.mean_variable1),
        y1: 0,
        y2: width,
        'stroke-dasharray': '10, 5',
        'stroke-width': '2px',
      })
      .style('stroke', 'red');
    groupe_line_mean.append('line')
      .style('stroke', 'red')
      .attrs({
        id: 'mean_y',
        x1: 0,
        x2: width,
        y1: this.y(this.mean_variable2),
        y2: this.y(this.mean_variable2),
        'clip-path': 'url(#clip)',
        'stroke-dasharray': '10, 5',
        'stroke-width': '2px',
      });

    this.plot.append('g')
      .attrs({
        class: 'x axis', id: 'axis--x', transform: `translate(0, ${height})`,
      })
      .call(this.xAxis);

    this.plot.append('g')
      .attrs({ class: 'y axis', id: 'axis--y' })
      .call(this.yAxis);

    this.menuX = new ContextMenu();
    this.itemsX = app.current_config.ratio.map(elem => ({
      name: elem, action: () => self.changeVariableX(elem),
    }));

    svg_bar.append('text')
      .attrs({
        id: 'title-axis-x',
        x: margin.left + width / 2,
        y: margin.top + height + margin.bottom / 2 + 5,
      })
      .styles({ 'font-family': 'sans-serif', 'font-size': '12px', 'text-anchor': 'middle' })
      .text(this.variable1)
      .on('click', function () {
        const bbox = this.getBoundingClientRect();
        self.menuX.showMenu(d3.event, document.body, self.itemsX, [bbox.left - 20, bbox.top + 20]);
      });

    svg_bar.append('image')
      .attrs({
        x: margin.left + width / 2 - 20 - svg_bar.select('#title-axis-x').node().getBoundingClientRect().width / 2,
        y: margin.top + height + margin.bottom / 2 - 7.5,
        width: 15,
        height: 15,
        'xlink:href': 'img/reverse_blue.png',
        id: 'img_reverse_x',
      })
      .on('click', () => {
        this.xInversed = !this.xInversed;
        for (let i = 0; i < this.nbFt; i++) {
          self.data[i][self.rank_variable1] = 100 - self.data[i][self.rank_variable1];
        }
        if (this.last_map_selection) {
          this.map_elem.callBrush(this.last_map_selection);
        } else {
          this.update();
        }
      });

    this.menuY = new ContextMenu();
    this.itemsY = app.current_config.ratio.map(elem => ({
      name: elem, action: () => self.changeVariableY(elem),
    }));

    svg_bar.append('text')
      .attr('id', 'title-axis-y')
      .attr('x', margin.left / 2)
      .attr('y', margin.top + (height / 2))
      .attr('transform', `rotate(-90, ${margin.left / 2}, ${margin.top + (height / 2)})`)
      .style('text-anchor', 'middle')
      .styles({ 'font-family': 'sans-serif', 'font-size': '12px' })
      .text(this.variable2)
      .on('click', function () {
        const bbox = this.getBoundingClientRect();
        self.menuY.showMenu(d3.event, document.body, self.itemsY, [bbox.left, bbox.bottom + 10]);
      });


    svg_bar.append('image')
      .attrs({
        x: margin.left / 2 - 15,
        y: margin.top + (height / 2) + svg_bar.select('#title-axis-y').node().getBoundingClientRect().height / 2 + 7.5,
        width: 15,
        height: 15,
        'xlink:href': 'img/reverse_blue.png',
        id: 'img_reverse_y',
      })
      .on('click', () => {
        this.yInversed = !this.yInversed;
        for (let i = 0; i < this.nbFt; i++) {
          this.data[i][this.rank_variable2] = 100 - this.data[i][this.rank_variable2];
        }
        if (this.last_map_selection) {
          this.map_elem.callBrush(this.last_map_selection);
        } else {
          this.update();
        }
      });

    // Prepare the tooltip displayed on mouseover:
    prepareTooltip(svg_bar);

    // Compute the "complétude" value for this ratio:
    this.completude_value = calcCompletudeSubset(app, [this.variable1, this.variable2]);

    // Create the "complétude" text:
    this.completude = svg_bar.append('text')
      .attrs({ id: 'chart_completude', x: 60, y: 40 })
      .styles({ 'font-family': '\'Signika\', sans-serif' })
      .text(`Complétude : ${this.completude_value}%`);


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
    // this.update();
  }

  makeGrid() {
    this.plot.insert('g', '#scatterplot')
      .attrs({
        class: 'grid grid-x', transform: `translate(0, ${height})`,
      })
      .call(this.xAxis2
        .tickSize(-height)
        .tickFormat(''));
    this.plot.insert('g', '#scatterplot')
      .attr('class', 'grid grid-y')
      .call(this.yAxis2
        .tickSize(-width)
        .tickFormat(''));
    this.plot.selectAll('.grid')
      .selectAll('line')
      .attr('stroke', 'lightgray');
  }


  update() {
    const self = this;
    const data = self.data;
    const rank_variable1 = this.rank_variable1;
    const rank_variable2 = this.rank_variable2;
    const x = this.x;
    const y = this.y;
    const default_color = 'gray';
    const dots = this.scatter.selectAll('.dot')
      .data(data, d => d.id);

    dots.transition()
      .duration(225)
      .attrs(d => ({
        r: 5,
        cx: x(d[rank_variable1]),
        cy: y(d[rank_variable2]),
        opacity: 0.6,
      }))
      .styles(d => ({
        fill: app.colors[d.id] || default_color,
      }));

    dots.enter()
      .insert('circle')
      .styles(d => ({
        fill: app.colors[d.id] || default_color,
      }))
      .transition()
      .duration(225)
      .attrs(d => ({
        r: 5,
        cx: x(d[rank_variable1]),
        cy: y(d[rank_variable2]),
        opacity: 0.6,
        class: 'dot',
      }));

    dots.exit().transition().duration(225).remove();

    dots
      .on('mouseover', () => {
        svg_bar.select('.tooltip').style('display', null);
      })
      .on('mouseout', () => {
        svg_bar.select('.tooltip').style('display', 'none');
      })
      .on('mousemove', function (d) {
        const tooltip = svg_bar.select('.tooltip');
        const _var1 = self.variable1;
        const _var2 = self.variable2;
        tooltip
          .select('text.id_feature')
          .text(`${d.id}`);
        tooltip.select('text.value_feature1')
          .text(`Variable 1 : ${Math.round(d[_var1] * 10) / 10}`);
        tooltip.select('text.value_feature2')
          .text(`Variable 2 : ${Math.round(d[_var2] * 10) / 10}`);
        tooltip
          .attr('transform', `translate(${[d3.mouse(this)[0] - 5, d3.mouse(this)[1] - 45]})`);
      });
  }

  updateCompletude() {
    this.completude_value = calcCompletudeSubset(app, [this.variable1, this.variable2]);

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

  handle_brush_map(event) {
    if (!event || !event.selection) {
      this.last_map_selection = undefined;
      return;
    }
    const self = this;
    const [topleft, bottomright] = event.selection;
    this.last_map_selection = [topleft, bottomright];
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
            const value1 = d.properties[self.variable1];
            const value2 = d.properties[self.variable2];
            const color = comp2(
              value1, value2,
              self.ref_value1, self.ref_value2,
              self.xInversed, self.yInversed);
            app.colors[id] = color;
            return color;
          }
        }
        return color_countries;
      });
    self.update();
  }

  handleClickMap(d, parent) {
    const id = d.properties[app.current_config.id_field_geom];
    if (this.current_ids.indexOf(id) < 0 || id === app.current_config.my_region) return;
    if (app.colors[id] !== undefined) {
      // Change its color in the global colors object:
      app.colors[id] = undefined;
      // Change the color on the map:
      d3.select(parent).attr('fill', color_countries);
    } else {
      const value1 = d.properties[this.variable1];
      const value2 = d.properties[this.variable2];
      const color = comp2(
        value1, value2,
        this.ref_value1, this.ref_value2,
        this.xInversed, this.yInversed);
      app.colors[id] = color;
      // Change the color on the map:
      d3.select(parent).attr('fill', color);
      // Add the clicked feature on the colored selection on the chart:
    }
    this.update();
  }

  updateMeanValue() {
    this.mean_variable1 = _getPR(
      d3.mean(this.data.map(d => d[this.variable1])), this.data.map(d => d[this.variable1]));
    this.mean_variable2 = _getPR(
      d3.mean(this.data.map(d => d[this.variable2])), this.data.map(d => d[this.variable2]));
    const grp_mean = this.plot.select('g.mean');
    grp_mean.select('#mean_x')
      .transition()
      .duration(225)
      .attrs({
        x1: this.x(this.mean_variable1),
        x2: this.x(this.mean_variable1),
      });
    grp_mean.select('#mean_y')
      .transition()
      .duration(225)
      .attrs({
        y1: this.y(this.mean_variable2),
        y2: this.y(this.mean_variable2),
      });
  }

  updateChangeRegion() {
    if (app.current_config.filter_key !== undefined) {
      this.changeStudyZone();
    } else {
      this.ref_value1 = this.data.filter(
        d => d.id === app.current_config.my_region)[0][this.variable1];
      this.ref_value2 = this.data.filter(
        d => d.id === app.current_config.my_region)[0][this.variable2];
      this.map_elem.removeRectBrush();
      this.map_elem.updateLegend();
      this.map_elem.resetColors(this.current_ids);
      this.update();
    }
  }

  changeStudyZone() {
    this.data = app.current_data.filter(ft => !!ft[this.variable1] && !!ft[this.variable2])
      .map((d) => {
        const res = { id: d.id };
        res[this.variable1] = d[this.variable1];
        res[this.variable2] = d[this.variable2];
        return res;
      });
    this.current_ids = this.data.map(d => d.id);
    resetColors(this.current_ids);
    this.nbFt = this.data.length;
    computePercentileRank(this.data, this.variable1, this.rank_variable1);
    computePercentileRank(this.data, this.variable2, this.rank_variable2);

    this.xInversed = false;
    this.yInversed = false;
    // this.ref_value1 = this.data.filter(d => d.id === app.current_config.my_region)[0][this.variable1];
    // this.ref_value2 = this.data.filter(d => d.id === app.current_config.my_region)[0][this.variable2];

    this.x.domain(d3.extent(this.data, d => d[this.rank_variable1])).nice();
    this.y.domain(d3.extent(this.data, d => d[this.rank_variable2])).nice();
    this.map_elem.removeRectBrush();
    this.updateMeanValue();
    this.updateMapRegio();
    this.update();
  }

  changeVariableX(code_variable) {
    this.variable1 = code_variable;
    this.rank_variable1 = `pr_${this.variable1}`;
    this.pretty_name1 = variables.filter(ft => ft.ratio === code_variable)[0].name;
    svg_bar.select('#title-axis-x')
      .text(code_variable);
    this.data = app.current_data.filter(ft => !!ft[this.variable1] && !!ft[this.variable2])
      .map((d) => {
        const res = { id: d.id };
        res[this.variable1] = d[this.variable1];
        res[this.variable2] = d[this.variable2];
        return res;
      });
    this.current_ids = this.data.map(d => d.id);
    resetColors(this.current_ids);
    this.nbFt = this.data.length;
    computePercentileRank(this.data, this.variable1, this.rank_variable1);
    computePercentileRank(this.data, this.variable2, this.rank_variable2);
    this.ref_value1 = this.data.filter(
      d => d.id === app.current_config.my_region)[0][this.variable1];
    this.x.domain(d3.extent(this.data, d => d[this.rank_variable1])).nice();
    // this.y.domain(d3.extent(this.data, d => d[this.rank_variable2])).nice();
    this.updateMeanValue();
    this.updateMapRegio();
    this.update();
  }

  changeVariableY(code_variable) {
    this.variable2 = code_variable;
    this.rank_variable2 = `pr_${this.variable2}`;
    this.pretty_name2 = variables.filter(ft => ft.ratio === code_variable)[0].name;
    svg_bar.select('#title-axis-y')
      .text(code_variable);
    this.data = app.current_data.filter(ft => !!ft[this.variable1] && !!ft[this.variable2])
      .map((d) => {
        const res = { id: d.id };
        res[this.variable1] = d[this.variable1];
        res[this.variable2] = d[this.variable2];
        return res;
      });
    this.current_ids = this.data.map(d => d.id);
    resetColors(this.current_ids);
    this.nbFt = this.data.length;
    computePercentileRank(this.data, this.variable1, this.rank_variable1);
    computePercentileRank(this.data, this.variable2, this.rank_variable2);
    this.ref_value2 = this.data.filter(
      d => d.id === app.current_config.my_region)[0][this.variable2];
    // this.x.domain(d3.extent(this.data, d => d[this.rank_variable1])).nice();
    this.y.domain(d3.extent(this.data, d => d[this.rank_variable2])).nice();
    this.updateMeanValue();
    this.updateMapRegio();
    this.update();
  }

  addVariable(code_variable, name_variable) {
    this.itemsX.push({
      name: code_variable,
      action: () => this.changeVariableX(code_variable),
    });
    this.itemsY.push({
      name: code_variable,
      action: () => this.changeVariableY(code_variable),
    });
  }

  removeVariable(code_variable) {
    for (let i = this.itemsX.length - 1; i > 0; i--) {
      if (this.itemsX[i].name === code_variable) {
        this.itemsX.splice(i, 1);
        break;
      }
    }
    for (let i = this.itemsY.length - 1; i > 0; i--) {
      if (this.itemsY[i].name === code_variable) {
        this.itemsY.splice(i, 1);
        break;
      }
    }
  }

  remove() {
    this.map_elem.unbindBrush();
    this.map_elem = null;
    svg_bar.html('');
  }

  bindMap(map_elem) {
    this.map_elem = map_elem;
    this.updateMapRegio();
    this.update();
  }
}
