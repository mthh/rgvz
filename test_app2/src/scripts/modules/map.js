import { app } from './../main';
import { color_disabled, color_countries, color_sup, color_inf, color_highlight } from './options';
import { math_round, prepareTooltip, getSvgPathType } from './helpers';

const svg_map = d3.select('svg#svg_map'),
  margin_map = { top: 0, right: 0, bottom: 0, left: 0 },
  width_map = +svg_map.attr('width') - margin_map.left - margin_map.right,
  height_map = +svg_map.attr('height') - margin_map.top - margin_map.bottom;

const styles = {
  template: { id: 'template', fill: 'rgb(247, 252, 254)', 'fill-opacity': 1 },
  countries: { id: 'countries', fill: 'rgb(214, 214, 214)', 'fill-opacity': 1, 'stroke-width': 0.5, stroke: '#ffffff' },
  seaboxes: { id: 'seaboxes', fill: '#e0faff', 'fill-opacity': 1, stroke: 'black', 'stroke-width': 0.2 },
  remote: { id: 'remote', fill: 'rgb(214, 214, 214)', 'fill-opacity': 1, 'stroke-width': 0.5, stroke: '#ffffff' },
  seaboxes2: { id: 'seaboxes2', fill: 'none', stroke: 'black', 'stroke-width': 0.8 },
  nuts1: { id: 'nuts1', 'fill-opacity': 1, 'stroke-width': 0.5, stroke: '#ffffff' },
};

let projection;
let path;

function get_bbox_layer_path(name) {
  const bbox_layer = [[Infinity, Infinity], [-Infinity, -Infinity]];
  svg_map.select(`#${name}`)
    .selectAll('path')
    .each((d) => {
      const bbox_path = path.bounds(d.geometry);
      bbox_layer[0][0] = bbox_path[0][0] < bbox_layer[0][0] ? bbox_path[0][0] : bbox_layer[0][0];
      bbox_layer[0][1] = bbox_path[0][1] < bbox_layer[0][1] ? bbox_path[0][1] : bbox_layer[0][1];
      bbox_layer[1][0] = bbox_path[1][0] > bbox_layer[1][0] ? bbox_path[1][0] : bbox_layer[1][0];
      bbox_layer[1][1] = bbox_path[1][1] > bbox_layer[1][1] ? bbox_path[1][1] : bbox_layer[1][1];
    });
  return bbox_layer;
}

function fitLayer() {
  projection.scale(1).translate([0, 0]);
  const b = get_bbox_layer_path('template');
  const s = 1 / Math.max((b[1][0] - b[0][0]) / width_map, (b[1][1] - b[0][1]) / height_map);
  const t = [(width_map - s * (b[1][0] + b[0][0])) / 2, (height_map - s * (b[1][1] + b[0][1])) / 2];
  projection.scale(s).translate(t);
  svg_map.selectAll('path').attr('d', path);
}

function map_zoomed() {
  const transform = d3.event.transform;
  if (transform.k === 1) {
    transform.x = 0;
    transform.y = 0;
  }
  const layers = svg_map.select('#layers');
  const t = layers
    .selectAll('g')
    .transition()
    .duration(225);

  layers.selectAll('g')
    .transition(t)
    .style('stroke-width', function () {
      return `${styles[this.id]['stroke-width'] / transform.k}px`;
    });

  layers.selectAll('g')
    .transition(t)
    .attr('transform', transform);

  svg_map.select('.brush_map')
    .transition(t)
    .attr('transform', transform);
}

class MapSelect {
  constructor(nuts1, countries, remote, template, seaboxes) {
    projection = d3.geoIdentity()
      .fitExtent([[0, 0], [width_map, height_map]], template)
      .reflectY(true);

    path = d3.geoPath().projection(projection);
    const layers = svg_map.append('g')
      .attr('id', 'layers');

    this.zoom_map = d3.zoom()
      .scaleExtent([1, 5])
      .translateExtent([[0, 0], [width_map, height_map]])
      .on('zoom', map_zoomed);

    svg_map.call(this.zoom_map);

    layers.append('g')
      .attrs(styles.template)
      .selectAll('path')
      .data(template.features)
      .enter()
      .append('path')
      .attrs({ d: path });

    layers.append('g')
      .attrs(styles.countries)
      .attr('id', 'countries')
      .selectAll('path')
      .data(countries.features)
      .enter()
      .append('path')
      .attrs({ d: path });

    layers.append('g')
      .attrs(styles.seaboxes)
      .selectAll('path')
      .data(seaboxes.features)
      .enter()
      .append('path')
      .attrs({ d: path });

    layers.append('g')
      .attrs(styles.remote)
      .selectAll('path')
      .data(remote.features)
      .enter()
      .append('path')
      .attrs({ d: path });

    layers.append('g')
      .attrs(styles.seaboxes2)
      .selectAll('path')
      .data(seaboxes.features)
      .enter()
      .append('path')
      .attrs({ d: path });

    this.target_layer = layers.append('g')
      .attrs(styles.nuts1);
    this.target_layer.selectAll('path')
      .data(nuts1.features)
      .enter()
      .append('path')
      .attr('fill', d => (d.properties[app.current_config.id_field_geom] !== app.current_config.my_region ? color_countries : color_highlight))
      .attr('d', path);
    app.type_path = getSvgPathType(this.target_layer.select('path').node().getAttribute('d'));
    fitLayer();
    prepareTooltip(svg_map);
    this.bindTooltip();
  }

  resetColors() {
    const id_field_geom = app.current_config.id_field_geom;
    this.target_layer.selectAll('path')
      .attr('fill', d => (app.current_ids.indexOf(d.properties[id_field_geom]) > -1
        ? (app.colors[d.properties[id_field_geom]] || color_countries)
        : color_disabled));
  }

  bindTooltip() {
    this.target_layer.selectAll('path')
      .on('mouseover', () => {
        svg_map.select('.tooltip')
          .style('display', null);
      })
      .on('mouseout', () => {
        svg_map.select('.tooltip')
          .style('display', 'none');
      })
      .on('mousemove', function (d) {
        const tooltip = svg_map.select('.tooltip');
        tooltip
          .select('text.id_feature')
          .text(`${d.properties[app.current_config.id_field_geom]}`);
        let _ix, nb_val;
        for (_ix = 0, nb_val = Math.min(app.current_config.ratio.length, 5); _ix < nb_val; _ix++) {
          tooltip.select(`text.value_feature${_ix + 1}`)
            .text(`${app.current_config.ratio_pretty_name[_ix]}: ${math_round(d.properties[app.current_config.ratio[_ix]] * 10) / 10}`);
        }
        tooltip
          .attr('transform', `translate(${[d3.mouse(this)[0] - 5, d3.mouse(this)[1] - 45 - _ix * 12]})`);
      });
  }

  resetZoom() {
    svg_map.transition()
      .duration(250)
      .call(this.zoom_map.transform, d3.zoomIdentity);
  }

  updateLegend() {
    d3.select('#svg_legend > g > .legend > text')
      .text(`Ma région : ${app.current_config.my_region_pretty_name}`);
  }

  removeRectBrush() {
    svg_map.select('.brush_map').call(this.brush_map.move, null);
  }

  bindBrush(chart) {
    this.brush_map = d3.brush()
      .extent([[0, 0], [width_map, height_map]])
      .on('start brush', () => {
        if (!d3.event || !d3.event.selection) return;
        chart.handle_brush_map(d3.event);
      });
    svg_map.append('g')
      .attr('class', 'brush_map')
      .call(this.brush_map);
  }

  unbindBrush() {
    this.brush_map = null;
    svg_map.select('.brush_map')
      .remove();
  }
}

function makeSourceSection() {
  const text_zone = d3.select('#svg_legend')
    .append('text')
    .attrs({ y: 32.5, 'text-anchor': 'end' })
    .style('font-size', '11px')
    .style('font-family', '\'Signika\', sans-serif');
  text_zone.append('tspan')
    .attrs({ x: 470, dy: 12 })
    .text('Niveau régional : NUTS 1 (version 2016)');
  text_zone.append('tspan')
    .attrs({ x: 470, dy: 12 })
    .text('Origine des données : Eurostat, 2016');
  text_zone.append('tspan')
    .attrs({ x: 470, dy: 12 })
    .text('Limite administrative: UMS RIATE, CC-BY-SA');
}

function makeMapLegend() {
  const legend_elems = [
    { color: color_highlight, text: `Ma région : ${app.current_config.my_region_pretty_name}` },
    { color: color_countries, text: 'Autres régions du filtre de comparaison' },
    { color: color_sup, text: 'Rang plus élevé que ma région' },
    { color: color_inf, text: 'Rang moins élevé que ma région' },
  ];

  const rect_size = 14;
  const spacing = 4;
  const lgd_height = rect_size + spacing;
  const offset = lgd_height * legend_elems.length / 2;

  const grp_lgd = d3.select('#svg_legend')
    .append('g')
    .attr('transform', 'translate(50, 40)')
    .styles({ 'font-size': '11px', 'font-family': '\'Signika\', sans-serif' });

  const legends = grp_lgd.selectAll('.legend')
    .data(legend_elems)
    .enter()
    .append('g')
    .attr('class', 'legend')
    .attr('transform', (d, i) => {
      const tx = -2 * rect_size;
      const ty = i * lgd_height - offset;
      return `translate(${[tx, ty]})`;
    });

  legends.append('rect')
    .attrs({ width: rect_size, height: rect_size })
    .styles(d => ({ fill: d.color, stroke: d.color }));

  legends.append('text')
    .attrs({ x: rect_size + spacing, y: rect_size - spacing })
    .text(d => d.text);
}

export {
  MapSelect,
  makeSourceSection,
  makeMapLegend,
  svg_map,
};
