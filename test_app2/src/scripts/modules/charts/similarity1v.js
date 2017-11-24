import { comp, math_round, math_abs, math_sqrt, PropSizer, prepareTooltip2, getMean, Tooltipsify } from './../helpers';
import { color_disabled, color_countries, color_default_dissim, color_highlight } from './../options';
import { calcPopCompletudeSubset, calcCompletudeSubset } from './../prepare_data';
// import { svg_map } from './../map';
import { app, resetColors, variables_info } from './../../main';
import TableResumeStat from './../tableResumeStat';
import CompletudeSection from './../completude';

let svg_bar;
let margin;
let bbox_svg;
let width;
let height;
let svg_container;
let t;

const updateDimensions = () => {
  svg_bar = d3.select('#svg_bar');
  margin = { top: 20, right: 20, bottom: 40, left: 30 };
  bbox_svg = svg_bar.node().getBoundingClientRect();
  width = +bbox_svg.width - margin.left - margin.right;
  height = 500 * app.ratioToWide - margin.top - margin.bottom;
  svg_bar.attr('height', `${500 * app.ratioToWide}px`);
  svg_container = svg_bar.append('g').attr('class', 'container');
};


export class Similarity1plus {
  constructor(ref_data) {
    updateDimensions();
    app.chartDrawRatio = app.ratioToWide;
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
    this.proportionnal_symbols = false;
    this.draw_group = svg_container
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Prepare the tooltip displayed on mouseover:
    this.tooltip = prepareTooltip2(d3.select(svg_bar.node().parentElement), null);

    this.completude = new CompletudeSection();
    this.completude.update(
      calcCompletudeSubset(app, this.ratios, 'array'),
      calcPopCompletudeSubset(app, this.ratios));

    this.inversedAxis = new Set();
    // // Create the button allowing to choose
    // // if the colors are inversed
    // // (like green/red for superior/inferior regions)
    // svg_container.append('image')
    //   .attrs({
    //     x: width + margin.left + 5,
    //     y: 232.5,
    //     width: 15,
    //     height: 15,
    //     'xlink:href': 'img/reverse_plus.png',
    //     id: 'img_reverse',
    //   })
    //   .on('click', () => {
    //     this.serie_inversed = !this.serie_inversed;
    //     this.applySelection(this.highlight_selection.length);
    //   });

    // Create the section containing the input element allowing to chose
    // how many "close" regions we want to highlight.
    const menu_selection = d3.select(svg_bar.node().parentElement)
      .append('div')
      .attr('id', 'menu_selection')
      .styles({ position: 'relative', color: '#4f81bd', 'text-align': 'center' });
    const selection_close = menu_selection.append('p').attr('class', 'selection_display');
    selection_close.append('span')
      .html('Sélection des');
    selection_close.append('input')
      .attrs({ class: 'nb_select', type: 'number' })
      .styles({ color: '#4f81bd', 'margin-left': '1px' })
      .property('value', 5);
    selection_close.append('span')
      .html('régions les plus proches');
    const section = menu_selection.append('section')
      .attr('class', 'slider-checkbox');
    section.append('input')
      .attrs({ type: 'checkbox', id: 'check_prop' });
    section.append('label')
      .attrs({ class: 'label not_selected', for: 'check_prop' })
      .text('Cercles proportionnels au numérateur');

    // const switch_button = menu_selection.append('p')
    //   .attr('class', 'btn-switch');
    // switch_button.append('input')
    //   .attrs({ type: 'radio', id: 'yes', name: 'switch', class: 'btn-switch__radio btn-switch__radio_yes' })
    // switch_button.append('input')
    //   .attrs({ type: 'radio', id: 'no', name: 'switch', class: 'btn-switch__radio btn-switch__radio_no' })
    //   .property('checked', 'checked');
    // const yes_label = switch_button.append('label')
    //   .attrs({ for: 'yes', class: 'btn-switch__label btn-switch__label_yes'});
    // yes_label.append('span')
    //   .attr('class', 'btn-switch__txt')
    //   .html('&#xf00c;');
    // const no_label = switch_button.append('label')
    //   .attrs({ for: 'no', class: 'btn-switch__label btn-switch__label_no' });
    // no_label.append('span')
    //   .attr('class', 'btn-switch__txt')
    //   .html('&#xf00d;');

    this.bindMenu();
    this.makeTableStat();
  }

  applySelection(nb) {
    app.colors = {};
    if (nb > 0) {
      this.data.forEach((ft) => {
        // eslint-disable-next-line
        ft.dist = math_sqrt(this.ratios.map(v => `dist_${v}`).map(v => Math.pow(ft[v], 2)).reduce((a, b) => a + b));
      });
      this.data.sort((a, b) => a.dist - b.dist);
      this.data.forEach((el, i) => { el.rank = i; });
      this.highlight_selection = this.data.slice(1, nb + 1);
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
      const selector_ratio_name = `l_${ratio_name}`;
      const ratio_pretty_name = app.current_config.ratio_pretty_name[i];
      const num_name = self.nums[i];
      const my_region_value = self.my_region[ratio_name];
      const ratio_values = this.data.map(d => d[ratio_name]);
      let g = this.draw_group.select(`#${selector_ratio_name}`);
      let axis = this.draw_group.select(`g.axis--x.${selector_ratio_name}`);
      let layer_other;
      let layer_highlighted;
      if (!g.node()) {
        g = this.draw_group
          .append('g')
          .attrs({
            id: selector_ratio_name,
            num: num_name,
            class: 'grp_var',
          });
        axis = g.append('g')
          .attrs({
            class: `axis axis--x ${selector_ratio_name}`,
            transform: 'translate(0, 10)',
          });
        let txt = g.append('text')
          .attrs({
            x: 0,
            y: -7.5,
            fill: '#4f81bd',
            'font-size': '11px',
            'font-weight': 'bold',
            'font-family': '"Signika",sans-serif',
            'title-tooltip': ratio_pretty_name,
          })
          .text(ratio_name);
        g.append('image')
          .attrs({
            x: txt.node().getBoundingClientRect().width + 5,
            y: -18,
            width: 14,
            height: 14,
            'xlink:href': 'img/reverse_plus.png',
            id: 'img_reverse',
          })
          .on('click', () => {
            if (self.inversedAxis.has(ratio_name)) {
              self.inversedAxis.delete(ratio_name);
            } else {
              self.inversedAxis.add(ratio_name);
            }
            self.update();
          });
        layer_other = g.append('g').attr('class', 'otherfeature');
        layer_highlighted = g.append('g').attr('class', 'highlighted');
      } else {
        layer_other = g.select('g.otherfeature');
        layer_highlighted = g.select('g.highlighted');
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
        app.colors[elem.id] = comp(
          elem[ratio_name], my_region_value, !self.inversedAxis.has(ratio_name));
      });

      app.colors[app.current_config.my_region] = color_highlight;

      const size_func = this.proportionnal_symbols ? new PropSizer(d3.max(data, d => d[num_name]), 33).scale : () => 7.5;
      const xScale = d3.scaleLinear()
        .domain([_min, _max])
        .range([0, width]);

      axis
        .transition()
        .duration(125)
        .call(d3.axisBottom(xScale));

      const bubbles1 = layer_other.selectAll('.bubble')
        .data(data.filter(d => app.colors[d.id] === undefined), d => d.id);

      bubbles1
        .transition()
        .duration(125)
        .attrs((d) => {
          let x_value = xScale(d[ratio_name]);
          if (x_value > width) x_value = width + 200;
          else if (x_value < 0) x_value = -200;
          return {
            rank: d.rank,
            cx: x_value,
            cy: 10,
            r: size_func(d[num_name]),
          };
        })
        .styles(d => ({
          fill: color_countries,
          'fill-opacity': 0.1,
          stroke: 'darkgray',
          'stroke-width': 0.75,
          'stroke-opacity': 0.75,
        }));

      bubbles1
        .enter()
        .insert('circle')
        .styles(d => ({
          fill: color_countries,
          'fill-opacity': 0.1,
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
            rank: d.rank,
            id: d.id,
            class: 'bubble',
            cx: x_value,
            cy: 10,
            r: size_func(d[num_name]),
          };
        });

      bubbles1.exit().transition().duration(125).remove();

      const bubbles2 = layer_highlighted.selectAll('.bubble')
        .data(data.filter(d => app.colors[d.id] !== undefined), d => d.id);

      bubbles2
        .transition()
        .duration(125)
        .attrs((d) => {
          let x_value = xScale(d[ratio_name]);
          if (x_value > width) x_value = width + 200;
          else if (x_value < 0) x_value = -200;
          return {
            rank: d.rank,
            cx: x_value,
            cy: 10,
            r: size_func(d[num_name]),
          };
        })
        .styles(d => ({
          fill: app.colors[d.id],
          'fill-opacity': d.id === app.current_config.my_region ? 1 : 0.7,
          stroke: 'darkgray',
          'stroke-width': 0.75,
          'stroke-opacity': 0.75,
        }));

      bubbles2
        .enter()
        .insert('circle')
        .styles(d => ({
          fill: app.colors[d.id],
          'fill-opacity': d.id === app.current_config.my_region ? 1 : 0.7,
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
            rank: d.rank,
            id: d.id,
            class: 'bubble',
            cx: x_value,
            cy: 10,
            r: size_func(d[num_name]),
          };
        });

      bubbles2.exit().transition().duration(125).remove();

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
    // const value_input_selection = +d3.select('#menu_selection').select('.nb_select').property('value');
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
      const obj = this.data.find(el => el.id === id);
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
          clearTimeout(t);
          this.tooltip.style('display', null);
        })
        .on('mouseout', () => {
          clearTimeout(t);
          t = setTimeout(() => { this.tooltip.style('display', 'none'); }, 250);
        })
        .on('mousemove mousedown', function (d) {
          const content = [];
          let _h = 65;
          const ratio_n = this.parentElement.parentElement.id.replace('l_', '');
          const unit_ratio = variables_info.find(ft => ft.id === ratio_n).unit;
          const rank = +this.getAttribute('rank');
          content.push(`${ratio_n} : ${Math.round(d[ratio_n] * 10) / 10} ${unit_ratio}`);
          if (self.proportionnal_symbols) {
            _h += 20;
            const num_n = this.parentElement.parentElement.getAttribute('num');
            const o = variables_info.find(ft => ft.id === num_n);
            const unit_num = o.unit;
            let coef = +o.formula;
            coef = isNaN(coef) || coef === 0 ? 1 : coef;
            content.push(`${num_n} (numérateur) : ${Math.round(d[num_n] * coef * 10) / 10} ${unit_num}`);
          }
          if (!isNaN(rank)) {
            if (+rank === 0) {
              content.push('(Ma région)');
            } else if (+rank === 1) {
              content.push('(Région la plus proche)');
            } else {
              content.push(`(${rank}ème région la plus proche)`);
            }
          }
          clearTimeout(t);
          self.tooltip.select('.title')
            .html([
              '<b>', d.name, ' (', d.id, ')', '</b>'].join(''));
          self.tooltip.select('.content')
            .html(content.join('<br>'));
          self.tooltip
            .styles({
              display: null,
              left: `${d3.event.pageX - 5}px`,
              top: `${d3.event.pageY - _h}px` });
        })
        .on('click', function (d) {
          if (this.style.fill !== color_countries) {
            self.displayLine(d.id);
          }
          self.map_elem.target_layer
            .selectAll('path')
            .each(function (ft) {
              if (ft.id === d.id) {
                const cloned = this.cloneNode();
                cloned.style.fill = 'red';
                cloned.style.stroke = 'orange';
                cloned.style.strokeWidth = '2.25px';
                cloned.classList.add('cloned');
                self.map_elem.layers.select('#temp').node().appendChild(cloned);
                setTimeout(() => { cloned.remove(); }, 5000);
              }
            });
        });
  }

  displayLine(id_region) {
    if (this.ratios.length === 1) return;
    const coords = [];
    svg_container.selectAll('.grp_var')
      .selectAll(`#${id_region}.bubble`)
      .each(function () {
        const ty = +this.parentElement.parentElement.getAttribute('transform').split('translate(0, ')[1].replace(')', '');
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
      // eslint-disable-next-line no-param-reassign
      ft.dist = math_sqrt(this.ratios.map(v => `dist_${v}`).map(v => Math.pow(ft[v], 2)).reduce((a, b) => a + b));
    });
    this.data.sort((a, b) => a.dist - b.dist);
    this.data.forEach((el, i) => { el.rank = i; });

    // To keep the same selection :
    // this.highlight_selection = this.highlight_selection.map((d) => {
    //   return this.data.find(el => el.id === d.id);
    // }).filter(d => !!d);
    // this.update();

    // To use a new selection according to 'nb_select' value:
    this.applySelection(+d3.select('#menu_selection').select('.nb_select').property('value'));

    this.updateTableStat();
    this.updateMapRegio();
    Tooltipsify('[title-tooltip]');
  }

  removeVariable(code_variable) {
    this.removeLines();
    this.ratios = app.current_config.ratio.slice();
    this.nums = app.current_config.num.slice();
    this.data = app.current_data.filter(
      ft => this.ratios.map(v => !!ft[v]).every(v => v === true)).slice();
    this.data.forEach((ft) => {
      this.ratios.forEach((v) => {
        // eslint-disable-next-line no-param-reassign
        ft[`dist_${v}`] = math_abs(+ft[v] - +this.my_region[v]);
      });
      // eslint-disable-next-line no-param-reassign
      ft.dist = math_sqrt(this.ratios.map(v => `dist_${v}`).map(v => Math.pow(ft[v], 2)).reduce((a, b) => a + b));
    });
    this.data.sort((a, b) => a.dist - b.dist);
    this.data.forEach((el, i) => { el.rank = i; });
    this.highlight_selection = this.highlight_selection.map((d) => {
      return this.data.find(el => el.id === d.id);
    }).filter(d => !!d);

    this.my_region = this.data.find(d => d.id === app.current_config.my_region);

    this.draw_group.select(`g#l_${code_variable}`).remove();
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
    menu.select('#check_prop')
      .on('change', function () {
        if (this.checked) {
          menu.select('.slider-checkbox > .label').attr('class', 'label');
          self.proportionnal_symbols = true;
        } else {
          menu.select('.slider-checkbox > .label').attr('class', 'label not_selected');
          self.proportionnal_symbols = false;
        }
        self.update();
      });
  }

  removeLines() {
    this.draw_group.selectAll('.regio_line').remove();
  }

  remove() {
    this.map_elem.layers.selectAll('.cloned').remove();
    this.map_elem.unbindBrushClick();
    this.map_elem = null;
    this.table_stats.remove();
    this.table_stats = null;
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
      Moy: getMean(values),
      Med: d3.median(values),
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

  getHelpMessage() {
    return `
<h3>Ressemblances</h3>

<b>Aide générale</b>

Les graphiques de ressemblance permettent de visualiser pour 1 à 8 indicateurs les unités territoriales les plus proches statistiquement à l’unité territoriale de référence.

Cette proximité est mesurée par la distance euclidienne. Cette fonction permet d’évaluer la distance normalisée globale (exprimée en rang) séparant l’unité territoriale de référence avec l’ensemble des autres unités territoriales pour un ensemble d’indicateurs. La formule de la fonction est la suivante :

<b>Σ(xi - yi)²</b>

Si la valeur de l’indice équivaut à 0, la similarité est totale entre deux unités territoriales. Plus la valeur de l’indice est élevée, plus la dissimilarité est importante. A noter que cette métrique euclidienne est assez sensible aux ordres de grandeur hétérogènes entre plusieurs indicateurs (un fort écart pour un indicateur peut affecter significativement la valeur de l’indice).

Pour éviter de potentielles erreurs d’interprétation liées à cet indice de similarité synthétique, Regioviz propose systématiquement une représentation graphique permettant d’évaluer visuellement le degré de similarité indicateur par indicateur.

Par défaut, l’application renvoie les 5 unités territoriales pour l’espace d’étude et les indicateurs sélectionnées qui sont définis par la distance euclidienne la plus faible. Libre à l’utilisateur de choisir plus ou moins d’unités territoriales de comparaison en fonction de ses objectifs d’analyse.

Sur le graphique apparaissent les n unités territoriales les plus proches pour chaque indicateur dans leurs unités de mesure respectives. L’unité territoriale de référence apparaît systématiquement au centre de chacun des graphiques. Un clic gauche sur une des unités territoriales sur le graphique ou sur la carte génère une ligne entre chaque indicateur permettant d’évaluer le degré de ressemblance avec l’unité territoriale de référence et visualiser ainsi si celle-ci se positionne au-dessus ou en dessous, et pour quel indicateur.

Par défaut, la taille des cercles sur le graphique est constante. Mais l’utilisateur peut activer l’option « cercles proportionnels au numérateur » pour visualiser graphiquement la masse des unités territoriales. Par exemple, si l’indicateur PIB par habitant est sélectionné, la taille des cercles sera proportionnelle à la masse de PIB des unités territoriales. Si c’est la part des 0-24 ans dans la population totale, la taille des figurés sera proportionnelle à la masse de la population âgée de 0 à 24 ans. Cette option a été créée afin de pouvoir restituer les ordres de grandeur potentiellement hétérogènes des unités territoriales proposées dans l’application.`;
  }
}
