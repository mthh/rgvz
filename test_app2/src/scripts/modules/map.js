import tippy from 'tippy.js';
import { app } from './../main';
import { color_disabled, color_countries, color_sup, color_inf, color_highlight } from './options';
import { prepareTooltip, getSvgPathType, svgPathToCoords, euclidian_distance } from './helpers';
import { filterLevelGeom } from './prepare_data';

const svg_map = d3.select('svg#svg_map'),
  margin_map = { top: 0, right: 0, bottom: 0, left: 0 },
  width_map = +svg_map.attr('width') - margin_map.left - margin_map.right,
  height_map = +svg_map.attr('height') - margin_map.top - margin_map.bottom;

const styles = {
  frame: { id: 'frame', fill: 'rgb(247, 252, 254)', 'fill-opacity': 1 },
  countries: { id: 'countries', fill: 'rgb(214, 214, 214)', 'fill-opacity': 1, 'stroke-width': 0.5, stroke: '#ffffff' },
  boxes: { id: 'boxes', fill: '#e0faff', 'fill-opacity': 1, stroke: 'black', 'stroke-width': 0.2 },
  countries_remote: { id: 'countries_remote', fill: 'rgb(214, 214, 214)', 'fill-opacity': 1, 'stroke-width': 0.5, stroke: '#ffffff' },
  // boxes2: { id: 'boxes2', fill: 'none', stroke: 'black', 'stroke-width': 0.8 },
  coasts: { id: 'coasts', fill: 'none', stroke: 'black', 'stroke-width': 0.8 },
  coasts_remote: { id: 'coasts_remote', fill: 'none', stroke: 'black', 'stroke-width': 0.8 },
  nuts: { id: 'nuts', 'fill-opacity': 1, 'stroke-width': 0.5, stroke: '#ffffff' },
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
  const b = get_bbox_layer_path('frame');
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
  constructor(nuts, countries, countries_remote, coasts, coasts_remote, frame, boxes, filter = 'NUTS1') {
    projection = d3.geoIdentity()
      .fitExtent([[0, 0], [width_map, height_map]], frame)
      .reflectY(true);

    path = d3.geoPath().projection(projection);
    const layers = svg_map.append('g')
      .attr('id', 'layers');
    this.nuts = nuts;
    this.zoom_map = d3.zoom()
      .scaleExtent([1, 5])
      .translateExtent([[0, 0], [width_map, height_map]])
      .on('zoom', map_zoomed);

    svg_map.call(this.zoom_map);

    layers.append('g')
      .attrs(styles.frame)
      .selectAll('path')
      .data(frame.features)
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
      .attrs(styles.boxes)
      .selectAll('path')
      .data(boxes.features)
      .enter()
      .append('path')
      .attrs({ d: path });

    layers.append('g')
      .attrs(styles.countries_remote)
      .selectAll('path')
      .data(countries_remote.features)
      .enter()
      .append('path')
      .attrs({ d: path });

    layers.append('g')
      .attrs(styles.coasts)
      .selectAll('path')
      .data(coasts.features)
      .enter()
      .append('path')
      .attrs({ d: path });

    layers.append('g')
      .attrs(styles.coasts_remote)
      .selectAll('path')
      .data(coasts_remote.features)
      .enter()
      .append('path')
      .attrs({ d: path });

    // layers.append('g')
    //   .attrs(styles.boxes2)
    //   .selectAll('path')
    //   .data(boxes.features)
    //   .enter()
    //   .append('path')
    //   .attrs({ d: path });

    this.target_layer = layers.append('g')
      .attrs(styles.nuts);
    this.target_layer.selectAll('path')
      .data(filterLevelGeom(this.nuts.features, filter))
      .enter()
      .append('path')
      .attr('title', d => `${d.properties[app.current_config.name_field]} (${d.properties[app.current_config.id_field_geom]})`)
      .attr('fill', d => (d.properties[app.current_config.id_field_geom] !== app.current_config.my_region ? color_countries : color_highlight))
      .attr('d', path);

    fitLayer();
    prepareTooltip(svg_map);
    // this.bindTooltip();
    app.type_path = getSvgPathType(this.target_layer.select('path').node().getAttribute('d'));
    this.target_layer.selectAll('path')
      .each(function () {
        this._pts = svgPathToCoords(this.getAttribute('d'), app.type_path);
      });
    tippy(this.target_layer.node().querySelectorAll('path'), {
      animation: 'fade',
      duration: 50,
      followCursor: true,
      performance: true,
    });
  }

  updateLevelRegion(filter = 'NUTS1') {
    const new_selection = filterLevelGeom(this.nuts.features, filter);
    const selection = this.target_layer
      .selectAll('path')
      .data(new_selection);
    selection.enter()
      .append('path')
      .attr('title', d => `${d.properties[app.current_config.name_field]} (${d.properties[app.current_config.id_field_geom]})`)
      .attr('fill', d => (d.properties[app.current_config.id_field_geom] !== app.current_config.my_region ? color_countries : color_highlight))
      .attr('d', path);
    selection
      .transition()
      .duration(225)
      .attr('d', path);
    selection.exit().remove();
    this.resetColors(new_selection.map(d => d.properties[app.current_config.id_field_geom]));
    this.computeDistMat();
    this.target_layer.selectAll('path')
      .each(function () {
        this._pts = undefined;
      });
    tippy(this.target_layer.node().querySelectorAll('path'), {
      animation: 'fade',
      duration: 20,
      followCursor: true,
      performance: true,
    });
  }

  resetColors(current_ids) {
    const id_field_geom = app.current_config.id_field_geom;
    this.target_layer.selectAll('path')
      .attr('fill', (d) => {
        const id = d.properties[id_field_geom];
        if (id === app.current_config.my_region) {
          return color_highlight;
        } else if (current_ids.indexOf(id) > -1) {
          return app.colors[id] || color_countries;
        }
        return color_disabled;
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

  callBrush(selection) {
    svg_map.select('.brush_map').call(this.brush_map.move, selection);
  }

  bindBrushClick(chart) {
    if (chart.handleClickMap) {
      document.getElementById('img_map_select').classList.remove('disabled');
      document.getElementById('img_map_select').classList.add('active');
    } else {
      document.getElementById('img_map_select').classList.add('disabled');
    }
    if (chart.handle_brush_map) {
      document.getElementById('img_rect_selec').classList.remove('disabled');
      document.getElementById('img_rect_selec').classList.add('active');
      document.getElementById('img_map_zoom').classList.remove('active');
      document.getElementById('img_map_select').classList.remove('active');
      this.brush_map = d3.brush()
        .extent([[0, 0], [width_map, height_map]])
        .on('start brush', () => {
          chart.handle_brush_map(d3.event);
        });
      svg_map.append('g')
        .attr('class', 'brush_map')
        .call(this.brush_map);
    } else {
      document.getElementById('img_rect_selec').classList.remove('active');
      document.getElementById('img_rect_selec').classList.add('disabled');
      document.getElementById('img_map_zoom').classList.remove('active');
      document.getElementById('img_map_select').classList.add('active');
    }
  }

  getUnitsWithin(dist_km) {
    const dist = dist_km * 1000;
    if (!this.dist_to_my_region) this.computeDistMat();
    return this.dist_to_my_region.filter(d => d.dist <= dist).map(d => d.id);
  }

  computeDistMat() {
    const features = Array.prototype.slice
      .call(this.target_layer.node().querySelectorAll('path'));
    const nb_ft = features.length;
    const my_region_geom = features.find(
      d => d.__data__.properties[app.current_config.id_field_geom] === app.current_config.my_region,
      ).__data__.geometry;
    const my_region_centroid = turf.centroid(my_region_geom);
    const result_dist = [];
    for (let i = 0; i < nb_ft; i++) {
      const id = features[i].__data__.properties[app.current_config.id_field_geom];
      const dist = euclidian_distance(
        my_region_centroid, turf.centroid(features[i].__data__.geometry));
      result_dist.push({ id, dist });
    }
    this.dist_to_my_region = result_dist;
  }

  unbindBrushClick() {
    this.brush_map = null;
    svg_map.select('.brush_map')
      .remove();
  }
}

function makeSourceSection() {
  const xmax = +svg_map.attr('width');
  const text_zone = d3.select('#svg_legend')
    .append('text')
    .attrs({ y: 32.5, 'text-anchor': 'end' })
    .style('font-size', '11px')
    .style('font-family', '\'Signika\', sans-serif');
  text_zone.append('tspan')
    .attrs({ x: xmax, dy: 12 })
    .text('Niveau régional : NUTS 1 (version 2016)');
  text_zone.append('tspan')
    .attrs({ x: xmax, dy: 12 })
    .text('Origine des données : Eurostat, 2016');
  text_zone.append('tspan')
    .attrs({ x: xmax, dy: 12 })
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
