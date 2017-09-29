import {
  math_max, math_sin, math_cos, HALF_PI, _getPR, computePercentileRank, getMean } from './../helpers';
import { color_disabled, color_countries, color_highlight } from './../options';
import { calcPopCompletudeSubset } from './../prepare_data';
import { app, variables_info, resetColors } from './../../main';
import TableResumeStat from './../tableResumeStat';

const svg_bar = d3.select('#svg_bar');
const margin = { top: 70, right: 70, bottom: 70, left: 70 };

const width = +svg_bar.attr('width') - margin.left - margin.right,
  height = +svg_bar.attr('height') - margin.top - margin.bottom;

const wrap = (_text, _width) => {
  _text.each(function () {
    const text = d3.select(this),
      words = text.text().split(/\s+/).reverse(),
      lineHeight = 1.4, // ems
      y = text.attr('y'),
      x = text.attr('x'),
      dy = parseFloat(text.attr('dy'));
    let line = [],
      lineNumber = 0;
    let tspan = text.text(null)
      .append('tspan')
      .attr('x', x)
      .attr('y', y)
      .attr('dy', `${dy}em`);
    let word = words.pop();
    while (word) {
      line.push(word);
      tspan.text(line.join(' '));
      if (tspan.node().getComputedTextLength() > _width) {
        line.pop();
        tspan.text(line.join(' '));
        line = [word];
        tspan = text.append('tspan')
          .attr('x', x)
          .attr('y', y)
          .attr('dy', `${++lineNumber * lineHeight + dy}em`)
          .text(word);
      }
      word = words.pop();
    }
  });
};

const move = function move(array, from, to) {
  array.splice(to, 0, array.splice(from, 1)[0]);
  return array;
};

const swap = function swap(array, ix1, ix2) {
  [array[ix1], array[ix2]] = [array[ix2], array[ix1]]; // eslint-disable-line no-param-reassign
  return array;
};

export const prepare_data_radar_default = (data, variables) => {
  const features = [];
  // Prepare the data for "My Région":
  const v_my_region = data.find(d => d.id === app.current_config.my_region);
  const ojb_my_region = {
    name: app.current_config.my_region,
    axes: [],
  };
  variables.forEach((v) => {
    const t = variables_info.find(d => d.ratio === v).name;
    const _v = `pr_${v}`;
    ojb_my_region.axes.push({
      axis: t, value: v_my_region[_v],
    });
  });
  features.push(ojb_my_region);
  const obj_mean = {
    name: 'Moyenne du contexte d\'étude',
    axes: [],
  };
  variables.forEach((v) => {
    const t = variables_info.find(d => d.ratio === v).name;
    const _v = `pr_${v}`;
    obj_mean.axes.push({
      axis: t,
      value: _getPR(getMean(data.map(d => d[_v])), data.map(d => d[_v])),
    });
  });
  features.push(obj_mean);
  return features;
};

export const prepare_data_radar_ft = (data, variables, ft) => {
  const ft_values = data.find(d => d.id === ft);
  const obj = {
    name: ft,
    axes: [],
  };
  variables.forEach((v) => {
    const t = variables_info.find(d => d.ratio === v).name;
    const _v = `pr_${v}`;
    obj.axes.push({
      axis: t, value: ft_values[_v],
    });
  });
  return obj;
};

export class RadarChart3 {
  constructor(data, options) {
    const cfg = {
      w: width, // Width of the circle
      h: height, // Height of the circle
      margin: margin, // The margins of the SVG
      levels: 10, // How many levels or inner circles should there be drawn
      maxValue: 100, // What is the value that the biggest circle will represent
      labelFactor: 1.3, // How much farther than the radius of the outer circle should the labels be placed
      wrapWidth: 85, // The number of pixels after which a label needs to be given a new line
      opacityArea: 0.35, // The opacity of the area of the blob
      dotRadius: 4, // The size of the colored circles of each blog
      opacityCircles: 0.1, // The opacity of the circles of each blob
      strokeWidth: 2, // The width of the stroke around each blob
      roundStrokes: false, // If true the area and stroke will follow a round path (cardinal-closed)
      color: d3.scaleOrdinal(d3.schemeCategory10), // Color function,
      format: '.2', // The format string to be used by d3.format
      unit: '%', // The unit to display after the number on the axis and point tooltips (like $, €, %, etc)
      legend: false,
      allowInverseData: true,
    };
    this.cfg = cfg;
    // Put all of the options into a variable called cfg
    if (typeof options !== 'undefined') {
      for (const i in options) {
        if (typeof options[i] !== 'undefined') { cfg[i] = options[i]; }
      }
    }

    this.g = svg_bar.append('g')
      .attr('id', 'RadarGrp')
      .attr('transform', `translate(${cfg.w / 2 + cfg.margin.left},${cfg.h / 2 + cfg.margin.top})`);

    this.prepareData(data);
    this.drawAxisGrid();
    this.drawArea();
    this.handleLegend();
    // Compute the "complétude" value for these ratios:
    this.completude_value = calcPopCompletudeSubset(app, this.variables);

    // Create the "complétude" text:
    this.completude = svg_bar.append('text')
      .attrs({ id: 'chart_completude', x: 60, y: 40 })
      .styles({ 'font-family': '\'Signika\', sans-serif' })
      .text(`Complétude : ${this.completude_value}%`);

    if (cfg.allowInverseData) {
      this.inverse_data = (field) => {
        const data_length = this.data.length;
        if (!field) {
          for (let i = 0; i < data_length; i++) {
            const ax = this.data[i].axes;
            for (let j = 0; j < ax.length; j++) {
              ax[j].value = 100 - ax[j].value;
            }
          }
        } else {
          for (let i = 0; i < data_length; i++) {
            const ax = this.data[i].axes;
            for (let j = 0; j < ax.length; j++) {
              if (ax[j].axis === field) {
                ax[j].value = 100 - ax[j].value;
              }
            }
          }
        }
        this.update();
      };
    }
    this.makeTableStat();
  }

  add_element(elem) {
    const n_axis = elem.axes.map(i => i.axis);
    if (!(JSON.stringify(n_axis) === JSON.stringify(this.allAxis))) {
      throw new Error('Expected element with same axes name than existing data.');
    }
    this.data.push(elem);
    this.displayed_ids.push(elem.name);
    for (let j = 0; j < this.data.length; j++) {
      const on_axes = [];
      for (let i = 0; i < this.data[j].axes.length; i++) {
        this.data[j].axes[i].id = this.data[j].name;
        on_axes.push(this.data[j].name);
      }
    }

    const self = this;
    const cfg = this.cfg;
    const n = this.data.length - 1;
    const blobWrapper = this.g
      .insert('g', '.radarCircleWrapper')
      .attr('id', elem.name.indexOf(' ') > -1 ? 'ctx' : elem.name)
      .attr('class', 'radarWrapper');

    // Append the backgrounds
    blobWrapper
      .append('path')
      .attr('class', 'radarArea')
      .attr('d', this.radarLine(elem.axes))
      .style('fill', cfg.color(n))
      .style('fill-opacity', 0)
      .style('fill-opacity', cfg.opacityArea)
      .on('mouseover', function () {
        // Dim all blobs
        blobWrapper.selectAll('.radarArea')
          .transition().duration(200)
          .style('fill-opacity', 0.1);
        // Bring back the hovered over blob
        d3.select(this)
          .transition().duration(200)
          .style('fill-opacity', 0.7);
      })
      .on('mouseout', () => {
        // Bring back all blobs
        blobWrapper.selectAll('.radarArea')
          .transition().duration(200)
          .style('fill-opacity', cfg.opacityArea);
      });
      // .on('click', function () {
      //   const p = this.parentElement;
      //   if (p.previousSibling.className !== 'tooltip') {
      //     const group = g.node();
      //     group.insertBefore(p, group.querySelector('.tooltip'));
      //     const new_order = [];
      //     g.selectAll('.radarWrapper').each(d => new_order.push(d.name));
      //     new_order.reverse();
      //     updateLegend(new_order);
      //   }
      // });

    // Create the outlines
    blobWrapper.append('path')
      .attr('class', 'radarStroke')
      .attr('d', this.radarLine(elem.axes))
      .style('stroke-width', `${cfg.strokeWidth}px`)
      .style('stroke', cfg.color(n))
      .style('fill', 'none')
      .style('filter', 'url(#glow)');

    // Append the circles
    blobWrapper.selectAll('.radarCircle')
      .data(elem.axes)
      .enter()
      .append('circle')
      .attr('class', 'radarCircle')
      .attr('r', cfg.dotRadius)
      .attr('cx', (d, i) => this.rScale(d.value) * math_cos(this.angleSlice * i - HALF_PI))
      .attr('cy', (d, i) => this.rScale(d.value) * math_sin(this.angleSlice * i - HALF_PI))
      .style('fill', d => cfg.color(d.id))
      .style('fill-opacity', 0.8);

    // ///////////////////////////////////////////////////////
    // ////// Append invisible circles for tooltip ///////////
    // ///////////////////////////////////////////////////////

    // Wrapper for the invisible circles on top
    const blobCircleWrapper = this.g
      .insert('g', '.tooltip')
      .attr('id', elem.name.indexOf(' ') > -1 ? 'ctx' : elem.name)
      .attr('class', 'radarCircleWrapper');

    // Append a set of invisible circles on top for the mouseover pop-up
    blobCircleWrapper.selectAll('.radarInvisibleCircle')
      .data(elem.axes)
      .enter()
      .append('circle')
      .attr('class', 'radarInvisibleCircle')
      .attr('r', cfg.dotRadius * 1.5)
      .attr('cx', (d, i) => this.rScale(d.value) * math_cos(this.angleSlice * i - HALF_PI))
      .attr('cy', (d, i) => this.rScale(d.value) * math_sin(this.angleSlice * i - HALF_PI))
      .style('fill', 'none')
      .style('pointer-events', 'all')
      .on('mouseover', function (d) {
        self.g.select('.tooltip')
          .attr('x', this.cx.baseVal.value - 10)
          .attr('y', this.cy.baseVal.value - 10)
          .transition()
          .style('display', 'block')
          .text(this.Format(d.value) + cfg.unit);
      })
      .on('mouseout', () => {
        self.g.select('.tooltip').transition()
          .style('display', 'none').text('');
      });
  }

  changeOrder() {
    this.data = this.data.slice(1, this.data.length).concat(this.data.slice(0, 1));
    this.update();
  }

  prepareData(data) {
    app.current_config.nb_var = 3;
    this.variables = app.current_config.ratio;
    this.ref_data = data.slice().filter(
      ft => this.variables.map(v => !!ft[v]).every(d => d === true));
    this.rank_variables = this.variables.map(d => `pr_${d}`);
    this.variables.forEach((d, i) => {
      computePercentileRank(this.ref_data, d, this.rank_variables[i]);
    });
    this.data = prepare_data_radar_default(this.ref_data, this.variables);
    this.displayed_ids = this.data.map(d => d.name);
    this.current_ids = this.ref_data.map(d => d.id);
    // const ref_ids = [];
    // If the supplied maxValue is smaller than the actual one, replace by the max in the data
    // var maxValue = max(cfg.maxValue, d3.max(data, function(i){return d3.max(i.map(function(o){return o.value;}))}));
    let maxValue = 0;
    for (let j = 0; j < this.data.length; j++) {
      const on_axes = [];
      for (let i = 0; i < this.data[j].axes.length; i++) {
        this.data[j].axes[i].id = this.data[j].name;
        // on_axes.push(this.data[j].name);
        if (this.data[j].axes[i].value > maxValue) {
          maxValue = this.data[j].axes[i].value;
        }
        // ref_ids.push(on_axes);
      }
    }

    this.maxValue = math_max(this.cfg.maxValue, maxValue);
    this.allAxis = this.data[0].axes.map(i => i.axis); // Names of each axis
    this.total = this.allAxis.length; // The number of different axes
    this.radius = Math.min(this.cfg.w / 2, this.cfg.h / 2); // Radius of the outermost circle
    this.Format = d3.format(this.cfg.format); // Formatting
    this.angleSlice = Math.PI * 2 / this.total; // The width in radians of each "slice"
    // Scale for the radius
    this.rScale = d3.scaleLinear()
      .range([0, this.radius])
      .domain([0, this.maxValue]);
    // The radial line function
    this.radarLine = d3.radialLine()
      .curve(this.cfg.roundStrokes ? d3.curveCardinalClosed : d3.curveLinearClosed)
      .radius(d => this.rScale(d.value))
      .angle((d, i) => i * this.angleSlice);
  }

  drawAxisGrid() {
    const self = this;
    const cfg = this.cfg;
    const g = this.g;
    const radius = this.radius;
    const Format = this.Format;
    const maxValue = this.maxValue;
    const rScale = this.rScale;
    const angleSlice = this.angleSlice;

    const labelClicked = function labelClicked() {
      const ix = +this.id;
      if (ix + 1 === self.allAxis.length) {
        for (let i = 0; i < self.data.length; i++) {
          swap(self.data[i].axes, ix, 0);
        }
      } else {
        const new_ix = ix + 1;
        for (let i = 0; i < self.data.length; i++) {
          move(self.data[i].axes, ix, new_ix);
        }
      }
      self.update();
    };

    const labelCtxMenu = function labelCtxMenu(label) {
      d3.event.stopPropagation();
      d3.event.preventDefault();
      const ix = +this.id;
      self.inverse_data(label);
    };

    const axisGrid = g.append('g').attr('class', 'axisWrapper');

    // Draw the background circles
    axisGrid.selectAll('.levels')
      .data(d3.range(1, (cfg.levels + 1)).reverse())
      .enter()
      .append('circle')
      .attr('class', 'gridCircle')
      .attr('r', d => radius / cfg.levels * d)
      .style('fill', '#CDCDCD')
      .style('stroke', '#CDCDCD')
      .style('fill-opacity', cfg.opacityCircles)
      .style('filter', 'url(#glow)');

    // Text indicating at what % each level is
    axisGrid.selectAll('.axisLabel')
      .data(d3.range(1, (cfg.levels + 1)).reverse())
      .enter().append('text')
      .attr('class', 'axisLabel')
      .attr('x', 4)
      .attr('y', d => -d * radius / cfg.levels)
      .attr('dy', '0.4em')
      .style('font-size', '10px')
      .attr('fill', '#737373')
      .text(d => Format(maxValue * d / cfg.levels) + cfg.unit);

    // Create the straight lines radiating outward from the center
    const axis = axisGrid.selectAll('.axis')
      .data(this.allAxis)
      .enter()
      .append('g')
      .attr('class', 'axis');
    // Append the lines
    axis.append('line')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', (d, i) => rScale(maxValue * 1.1) * math_cos(angleSlice * i - HALF_PI))
      .attr('y2', (d, i) => rScale(maxValue * 1.1) * math_sin(angleSlice * i - HALF_PI))
      .attr('class', 'line')
      .style('stroke', 'white')
      .style('stroke-width', '2px');

    // Append the labels at each axis
    axis.append('text')
      .attr('class', 'legend')
      .style('font-size', '11px')
      .attr('id', (d, i) => i)
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('x', (d, i) => rScale(maxValue * cfg.labelFactor) * math_cos(angleSlice * i - HALF_PI))
      .attr('y', (d, i) => rScale(maxValue * cfg.labelFactor) * math_sin(angleSlice * i - HALF_PI))
      .text(d => d)
      .on('click', labelClicked)
      .on('contextmenu', cfg.allowInverseData ? labelCtxMenu : null)
      .call(wrap, cfg.wrapWidth);

    // Filter for the outside glow
    const filter = g.append('defs')
      .append('filter')
      .attr('id', 'glow');
    filter.append('feGaussianBlur')
      .attr('stdDeviation', '2.5')
      .attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    this.axisGrid = axisGrid;
  }

  handleLegend() {
    const cfg = this.cfg;
    if (cfg.legend !== false && typeof cfg.legend === 'object') {
      const names = this.data.map(el => el.name);
      if (cfg.legend.title) {
        this.legendZone.append('text')
          .attr('class', 'title')
          .attr('transform', 'translate(0, -20)')
          .attr('x', cfg.w - 70)
          .attr('y', 10)
          .attr('font-size', '12px')
          .attr('fill', '#404040')
          .text(cfg.legend.title);
      }
      const legend = this.legendZone
        .selectAll('g')
        .data(names);
      const legendEnter = legend
        .enter()
        .append('g');

      // Create rectangles markers
      legendEnter
        .append('rect')
        .attr('x', cfg.w - 65)
        .attr('y', (d, i) => i * 20)
        .attr('width', 10)
        .attr('height', 10)
        .style('fill', d => cfg.color(d));
      // Create labels
      legendEnter
        .append('text')
        .attr('x', cfg.w - 52)
        .attr('y', (d, i) => i * 20 + 9)
        .attr('font-size', '11px')
        .attr('fill', '#737373')
        .text(d => d);

      legend.merge(legendEnter).selectAll('rect')
        .attr('y', (d, i) => i * 20)
        .style('fill', d => cfg.color(d));

      legend.merge(legendEnter).selectAll('text')
        .attr('x', cfg.w - 52)
        .attr('y', (d, i) => i * 20 + 9)
        .text(d => d);

      legend.exit().remove();
    }
  }

  drawArea() {
    const cfg = this.cfg;
    const g = this.g;
    const Format = this.Format;
    const rScale = this.rScale;
    const angleSlice = this.angleSlice;

    // Create a wrapper for the blobs
    const blobWrapper = g.selectAll('.radarWrapper')
      .data(this.data, d => d.name)
      .enter()
      .append('g')
      .attr('id', d => (d.name.indexOf(' ') > -1 ? 'ctx' : d.name))
      .attr('class', 'radarWrapper');

    // Append the backgrounds
    blobWrapper
      .append('path')
      .attr('class', 'radarArea')
      .attr('d', d => this.radarLine(d.axes))
      .style('fill', (d, i) => cfg.color(i))
      .style('fill-opacity', 0)
      .style('fill-opacity', cfg.opacityArea)
      .on('mouseover', function () {
        // Dim all blobs
        blobWrapper.selectAll('.radarArea')
          .transition().duration(200)
          .style('fill-opacity', 0.1);
        // Bring back the hovered over blob
        d3.select(this)
          .transition().duration(200)
          .style('fill-opacity', 0.7);
      })
      .on('mouseout', () => {
        // Bring back all blobs
        blobWrapper.selectAll('.radarArea')
          .transition().duration(200)
          .style('fill-opacity', cfg.opacityArea);
      });
      // .on('click', function () {
      //   const p = this.parentElement;
      //   if (p.previousSibling.className !== 'tooltip') {
      //     const group = g.node();
      //     group.insertBefore(p, group.querySelector('.tooltip'));
      //     const new_order = [];
      //     g.selectAll('.radarWrapper').each(d => new_order.push(d.name));
      //     new_order.reverse();
      //     updateLegend(new_order);
      //   }
      // });

    // Create the outlines
    blobWrapper.append('path')
      .attr('class', 'radarStroke')
      .attr('d', d => this.radarLine(d.axes))
      .style('stroke-width', `${cfg.strokeWidth}px`)
      .style('stroke', (d, i) => cfg.color(i))
      .style('fill', 'none')
      .style('filter', 'url(#glow)');

    // Append the circles
    blobWrapper.selectAll('.radarCircle')
      .data(d => d.axes)
      .enter()
      .append('circle')
      .attr('class', 'radarCircle')
      .attr('r', cfg.dotRadius)
      .attr('cx', (d, i) => rScale(d.value) * math_cos(angleSlice * i - HALF_PI))
      .attr('cy', (d, i) => rScale(d.value) * math_sin(angleSlice * i - HALF_PI))
      .style('fill', d => cfg.color(d.id))
      .style('fill-opacity', 0.8);

    // ///////////////////////////////////////////////////////
    // ////// Append invisible circles for tooltip ///////////
    // ///////////////////////////////////////////////////////

    // Wrapper for the invisible circles on top
    const blobCircleWrapper = g.selectAll('.radarCircleWrapper')
      .data(this.data, d => d.name)
      .enter()
      .append('g')
      .attr('id', d => (d.name.indexOf(' ') > -1 ? 'ctx' : d.name))
      .attr('class', 'radarCircleWrapper');

    // Append a set of invisible circles on top for the mouseover pop-up
    blobCircleWrapper.selectAll('.radarInvisibleCircle')
      .data(d => d.axes)
      .enter()
      .append('circle')
      .attr('class', 'radarInvisibleCircle')
      .attr('r', cfg.dotRadius * 1.5)
      .attr('cx', (d, i) => rScale(d.value) * math_cos(angleSlice * i - HALF_PI))
      .attr('cy', (d, i) => rScale(d.value) * math_sin(angleSlice * i - HALF_PI))
      .style('fill', 'none')
      .style('pointer-events', 'all')
      .on('mouseover', function (d) {
        g.select('.tooltip')
          .attr('x', this.cx.baseVal.value - 10)
          .attr('y', this.cy.baseVal.value - 10)
          .transition()
          .style('display', 'block')
          .text(Format(d.value) + cfg.unit);
      })
      .on('mouseout', () => {
        g.select('.tooltip').transition()
          .style('display', 'none').text('');
      });

    const tooltip = g.append('text')
      .attr('class', 'tooltip')
      .attr('x', 0)
      .attr('y', 0)
      .style('font-size', '12px')
      .style('display', 'none')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em');

    this.legendZone = svg_bar.append('g')
      .attr('id', 'legendZone')
      .attr('class', 'legend')
      .attr('transform', `translate(${cfg.legend.translateX},${cfg.legend.translateY + 20})`);
  }

  update() {
    const rScale = this.rScale;
    const maxValue = this.maxValue;
    const cfg = this.cfg;
    const angleSlice = this.angleSlice;
    // console.log(this.current_ids);
    // if (new_data) {
    //   const new_axis = new_data[0].axes.map(elem => elem.axis);
    //   if (!(JSON.stringify(new_axis) === JSON.stringify(this.allAxis))) {
    //     throw new Error('Expected element with same axes name than existing data.');
    //   }
    //   this.data = new_data;
    //   this.allAxis = new_axis;
    // } else {
    this.allAxis = this.data[0].axes.map(elem => elem.axis);
    // }
    const update_axis = this.axisGrid.selectAll('.axis')
      .data(this.allAxis);

    const t = this.g.selectAll('.radarWrapper')
      .transition()
      .duration(225);
      // .on('end', () => {
      //   parent.selectAll('text.legend')
      //     .text(d => d)
      //     .call(wrap, cfg.wrapWidth);
      //   // wrap(parent.selectAll('text.legend'), cfg.wrapWidth);
      // });
    update_axis.select('text.legend')
      .attr('id', (d, i) => i)
      .attr('x', (d, i) => rScale(maxValue * cfg.labelFactor) * math_cos(angleSlice * i - HALF_PI))
      .attr('y', (d, i) => rScale(maxValue * cfg.labelFactor) * math_sin(angleSlice * i - HALF_PI))
      .text(d => d)
      .call(wrap, cfg.wrapWidth);

    const update_blobWrapper = this.g.selectAll('.radarWrapper')
      .data(this.data, d => d.name);

    update_blobWrapper.select('.radarArea')
      .transition(t)
      .attr('d', d => this.radarLine(d.axes));

    update_blobWrapper.select('.radarStroke')
      .transition(t)
      .attr('d', d => this.radarLine(d.axes));

    const circle = update_blobWrapper.selectAll('.radarCircle')
      .data(d => d.axes);
    circle
      .transition(t)
      .attr('cx', (d, i) => rScale(d.value) * math_cos(angleSlice * i - HALF_PI))
      .attr('cy', (d, i) => rScale(d.value) * math_sin(angleSlice * i - HALF_PI))
      .style('fill', d => cfg.color(d.id))
      .style('fill-opacity', 0.8);

    const update_blobCircleWrapper = this.g.selectAll('.radarCircleWrapper')
      .data(this.data, d => d.name);

    const invisibleCircle = update_blobCircleWrapper.selectAll('.radarInvisibleCircle')
      .data(d => d.axes);
    invisibleCircle
      .transition(t)
      .attr('cx', (d, i) => rScale(d.value) * math_cos(angleSlice * i - HALF_PI))
      .attr('cy', (d, i) => rScale(d.value) * math_sin(angleSlice * i - HALF_PI));
  }

  round_stroke(val) {
    if (val === undefined) {
      return this.cfg.roundStrokes;
    } else if (val !== this.cfg.roundStrokes) {
      this.cfg.roundStrokes = val;
      this.radarLine = d3.radialLine()
        .curve(this.cfg.roundStrokes ? d3.curveCardinalClosed : d3.curveLinearClosed)
        .radius(d => this.rScale(d.value))
        .angle((d, i) => i * this.angleSlice);
      this.update();
    }
    return val;
  }

  bindMap(map_elem) {
    this.map_elem = map_elem;
    this.map_elem.resetColors(this.current_ids);
  }

  remove() {
    this.table_stats.remove();
    this.table_stats = null;
    this.map_elem.unbindBrush();
    this.map_elem = null;
    svg_bar.html('');
  }

  updateChangeRegion() {
    // if (app.current_config.filter_key) {
    this.changeStudyZone();
    // } else {
    //
    // }
  }

  changeStudyZone() {
    this.variables = app.current_config.ratio;
    this.ref_data = app.current_data.slice().filter(
      ft => this.variables.map(v => !!ft[v]).every(d => d === true));
    this.rank_variables = this.variables.map(d => `pr_${d}`);
    this.variables.forEach((d, i) => {
      computePercentileRank(this.ref_data, d, this.rank_variables[i]);
    });
    this.data = prepare_data_radar_default(this.ref_data, this.variables);
    this.current_ids = this.ref_data.map(d => d.id);
    this.displayed_ids = this.data.map(d => d.name);
    resetColors();
    this.nbFt = this.data.length;
    this.updateMapRegio();
    this.updateTableStat();
    this.update();
  }

  addVariable(code_variable, name_variable) {
    const other_features = this.displayed_ids.filter(d => d !== app.current_config.my_region && d !== 'Moyenne du contexte d\'étude');
    console.log(other_features);
    this.g.remove();
    this.g = svg_bar.append('g')
      .attr('id', 'RadarGrp')
      .attr('transform', `translate(${this.cfg.w / 2 + this.cfg.margin.left},${this.cfg.h / 2 + this.cfg.margin.top})`);

    this.prepareData(app.current_data);
    this.drawAxisGrid();
    this.drawArea();
    this.handleLegend();
    other_features.forEach((id) => {
      const a = prepare_data_radar_ft(this.ref_data, this.variables, id);
      this.add_element(a);
    });
    // this.update();
    // this.variables = app.current_config.ratio;
    // this.ref_data = app.current_data.slice().filter(
    //   ft => this.variables.map(v => !!ft[v]).every(d => d === true));
    // this.rank_variables = this.variables.map(d => `pr_${d}`);
    // this.variables.forEach((d, i) => {
    //   computePercentileRank(this.ref_data, d, this.rank_variables[i]);
    // });
    // this.data = prepare_data_radar_default(this.ref_data, this.variables);
    // this.current_ids = this.ref_data.map(d => d.id);
    // resetColors();
    // this.nbFt = this.data.length;
    // this.updateMapRegio();
    // this.updateTableStat();
    // this.update();
  }

  removeVariable(code_variable) {
    this.g.remove();
    this.g = svg_bar.append('g')
      .attr('id', 'RadarGrp')
      .attr('transform', `translate(${this.cfg.w / 2 + this.cfg.margin.left},${this.cfg.h / 2 + this.cfg.margin.top})`);

    this.prepareData(app.current_data);
    this.drawAxisGrid();
    this.drawArea();
    this.handleLegend();
    // this.variables = app.current_config.ratio;
    // this.ref_data = app.current_data.slice().filter(
    //   ft => this.variables.map(v => !!ft[v]).every(d => d === true));
    // this.rank_variables = this.variables.map(d => `pr_${d}`);
    // this.variables.forEach((d, i) => {
    //   computePercentileRank(this.ref_data, d, this.rank_variables[i]);
    // });
    // this.data = prepare_data_radar_default(this.ref_data, this.variables);
    // this.current_ids = this.ref_data.map(d => d.id);
    // resetColors();
    // this.nbFt = this.data.length;
    // this.updateMapRegio();
    // this.updateTableStat();
    // this.update();
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

  // handle_brush_map(event) {
  //   console.log(this);
  //   console.log(event);
  // }

  handleClickMap(d, parent) {
    const id = d.properties[app.current_config.id_field_geom];
    if (this.current_ids.indexOf(id) < 0 || id === app.current_config.my_region) return;
    if (this.displayed_ids.indexOf(id) < 0) {
      const a = prepare_data_radar_ft(this.ref_data, this.variables, id);
      this.add_element(a);
      this.update();
      console.log(a);
    } else {
      this.g.selectAll(`#${id}.radarWrapper`).remove();
      this.g.selectAll(`#${id}.radarCircleWrapper`).remove();
      const ix = this.data.map((_d, i) => [i, _d.name === id]).find(_d => _d[1] === true);
      this.data.splice(ix, 1);
      this.displayed_ids = this.data.map(_d => _d.name);
      this.update();
    }
  }

  updateCompletude() {
    this.completude_value = calcPopCompletudeSubset(app, this.variables);
    this.completude
      .text(`Complétude : ${this.completude_value}%`);
  }

  updateMapRegio() {
    if (!this.map_elem) return;
    this.map_elem.target_layer.selectAll('path')
      .attr('fill', d => (this.displayed_ids.indexOf(d.properties[app.current_config.id_field_geom]) > -1
        ? (app.colors[d.properties[app.current_config.id_field_geom]] || color_countries)
        : color_disabled));
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
