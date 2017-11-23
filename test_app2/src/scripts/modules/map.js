import tippy from 'tippy.js';
import { app } from './../main';
import { color_disabled, color_countries, color_sup, color_inf, color_highlight, color_default_dissim, RATIO_WH_MAP } from './options';
import { getSvgPathType, svgPathToCoords, euclidian_distance } from './helpers';
import { filterLevelGeom } from './prepare_data';

// const svg_map = d3.select('svg#svg_map'),
//   margin_map = { top: 0, right: 0, bottom: 0, left: 0 },
//   bbox_svg = svg_map.node().getBoundingClientRect(),
//   width_map = +bbox_svg.width - margin_map.left - margin_map.right,
//   height_map = +bbox_svg.height - margin_map.top - margin_map.bottom;

const svg_map = d3.select('svg#svg_map');
const bbox_svg = svg_map.node().getBoundingClientRect();
const width_map = +bbox_svg.width;
const height_map = width_map * (1 / RATIO_WH_MAP);
svg_map.attr('height', `${height_map}px`);

const styles = {
  frame: { id: 'frame', fill: '#e9f4fe', 'fill-opacity': 1 },
  countries: { id: 'countries', fill: '#d6d6d6', 'fill-opacity': 1 },
  boxes: { id: 'boxes', fill: '#e9f4fe', 'fill-opacity': 1 },
  nuts: { id: 'nuts', fill: '#9390fc', 'fill-opacity': 1, 'stroke-width': 0.5, stroke: '#f7fcfe', 'stroke-opacity': 0.9, target: true },
  countries_remote: { id: 'countries_remote', fill: '#d6d6d6', 'fill-opacity': 1 },
  cyprus_non_espon_space: { id: 'cyprus_non_espon_space', fill: '#ffffff', 'fill-opacity': 1 },
  borders: { id: 'borders', fill: 'none', 'stroke-width': 1, stroke: '#ffffff' },
  countries_remote_boundaries: { id: 'countries_remote_boundaries', fill: 'none', 'stroke-width': 1, stroke: '#ffffff' },
  coasts: { id: 'coasts', fill: 'none', stroke: '#d2dbef', 'stroke-width': 0.5 },
  coasts_remote: { id: 'coasts_remote', fill: 'none', stroke: '#d2dbef', 'stroke-width': 0.5 },
  boxes2: { id: 'boxes2', stroke: '#7a7a7a', 'stroke-width': 1, fill: 'none' },
  line: { id: 'line', stroke: '#d6d6d6', 'stroke-width': 1.5, fill: 'none' },
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
  const transform = d3.event ? d3.event.transform : svg_map.node().__zoom;
  if (transform.k < 1) transform.k = 1;
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

function interpolateZoom(translate, scale) {
  const node_svg_map = svg_map.node();
  const transform = d3.zoomTransform(node_svg_map);
  return d3.transition().duration(225).tween('zoom', () => {
    const iTranslate = d3.interpolate([transform.x, transform.y], translate);
    const iScale = d3.interpolate(transform.k, scale);
    return (t_value) => {
      node_svg_map.__zoom.k = iScale(t_value);
      const _t = iTranslate(t_value);
      node_svg_map.__zoom.x = _t[0];
      node_svg_map.__zoom.y = _t[1];
      map_zoomed();
    };
  });
}

function zoomClick() {
  const direction = (this.id === 'zoom_in') ? 1 : -1,
    factor = 0.1,
    center = [width_map / 2, height_map / 2],
    transform = d3.zoomTransform(svg_map.node()),
    translate = [transform.x, transform.y],
    view = { x: translate[0], y: translate[1], k: transform.k };
  let target_zoom = 1,
    translate0 = [],
    l = [];
  d3.event.preventDefault();
  target_zoom = transform.k * (1 + factor * direction);
  translate0 = [(center[0] - view.x) / view.k, (center[1] - view.y) / view.k];
  view.k = target_zoom;
  l = [translate0[0] * view.k + view.x, translate0[1] * view.k + view.y];
  view.x += center[0] - l[0];
  view.y += center[1] - l[1];
  interpolateZoom([view.x, view.y], view.k);
}


function makeMapLegend(legend_elems, size, translateY) {
  const rect_size = 14;
  const spacing = 4;
  const lgd_height = rect_size + spacing;
  const offset = lgd_height * legend_elems.length / 2;

  const grp_lgd = d3.select('#svg_legend')
    .attr('height', size)
    .append('g')
    .attr('transform', `translate(50, ${translateY})`)
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

  if (legend_elems[legend_elems.length - 1].color instanceof Array) {
    const elems = grp_lgd.selectAll('g.legend')._groups[0];
    const last_elem = d3.select(elems[elems.length - 1]);
    last_elem.append('polygon')
      .attr('points', `0,0 ${rect_size},${rect_size} 0,${rect_size}`)
      .style('fill', last_elem.node().__data__.color[0]);
    last_elem.append('polygon')
      .attr('points', `0,0 ${rect_size},0 ${rect_size},${rect_size}`)
      .style('fill', last_elem.node().__data__.color[1]);
  }
}

function getLegendElems(type) {
  if (type === 0) {
    return [
      [
        { color: color_highlight, text: `Ma région : ${app.current_config.my_region_pretty_name}` },
        { color: color_countries, text: 'Autres régions de l\'espace d\'étude' },
        { color: color_sup, text: 'Rang plus élevé que ma région' },
        { color: color_inf, text: 'Rang moins élevé que ma région' },
      ],
      '75', '41',
    ];
  } else if (type === 1) {
    return [
      [
        { color: color_highlight, text: `Ma région : ${app.current_config.my_region_pretty_name}` },
        { color: color_countries, text: 'Autres régions de l\'espace d\'étude' },
        { color: color_sup, text: 'Rang plus élevé que ma région (2 indicateurs)' },
        { color: color_inf, text: 'Rang moins élevé que ma région (2 indicateurs)' },
        { color: ['orange', 'rgb(160, 30, 160)'], text: 'Rang plus élevé que ma région (1 indicateur sur 2)' },
      ],
      '95', '50',
    ];
  }
  return [
    [
      { color: color_highlight, text: `Ma région : ${app.current_config.my_region_pretty_name}` },
      { color: color_countries, text: 'Autres régions de l\'espace d\'étude, sélectionnables pour la comparaison' },
    ],
    '60', '22.5',
  ];
}


class MapSelect {
  constructor(nuts, other_layers, filter = 'N1') {
    app.mapDrawRatio = app.ratioToWide;
    projection = d3.geoIdentity()
      .fitExtent([[0, 0], [width_map, height_map]], other_layers.get('frame'))
      .reflectY(true);

    path = d3.geoPath().projection(projection);

    const layers = svg_map.append('g')
      .attr('id', 'layers')
      .attr('transform', 'scale(1)');
    this.nuts = nuts;
    this.zoom_map = d3.zoom()
      .scaleExtent([1, 5])
      .translateExtent([[0, 0], [width_map, height_map]])
      .on('zoom', map_zoomed);

    svg_map.call(this.zoom_map);

    const layer_list = Object.keys(styles);
    for (let i = 0, n_layer = layer_list.length; i < n_layer; i++) {
      const name_lyr = layer_list[i];
      const style_layer = styles[name_lyr];
      if (style_layer.target === true) {
        this.target_layer = layers.append('g')
          .attrs(style_layer);
        this.target_layer.selectAll('path')
          .data(filterLevelGeom(this.nuts.features, filter), d => d.id)
          .enter()
          .append('path')
          .attr('class', 'tg_ft')
          .attr('title', d => `${d.properties[app.current_config.name_field]} (${d.id})`)
          .attr('fill', d => (d.id !== app.current_config.my_region ? color_countries : color_highlight))
          .attr('d', path);
      } else {
        layers.append('g')
          .attrs(style_layer)
          .selectAll('path')
          .data(other_layers.get(name_lyr).features)
          .enter()
          .append('path')
          .attrs({ d: path });
      }
    }
    this.layers = layers;
    fitLayer();
    app.type_path = getSvgPathType(this.target_layer.select('path').node().getAttribute('d'));
    this.target_layer.selectAll('path')
      .each(function () {
        this._pts = svgPathToCoords(this.getAttribute('d'), app.type_path);
      });
    this.tooltips = tippy(this.target_layer.node().querySelectorAll('path'), {
      animation: 'fade',
      duration: 0,
      followCursor: true,
      // performance: true,
    });
  }

  updateLevelRegion(filter = 'N1') {
    this.tooltips.destroyAll();
    const new_selection = filterLevelGeom(this.nuts.features, filter);
    const selection = this.target_layer
      .selectAll('path')
      .data(new_selection, d => d.id);
    selection.enter()
      .append('path')
      .attrs(d => ({
        title: `${d.properties[app.current_config.name_field]} (${d.id})`,
        fill: d.id !== app.current_config.my_region ? color_countries : color_highlight,
        d: path,
      }));
    selection
      .attr('d', path);
    selection
      .exit()
      .remove();
    this.resetColors(new_selection.map(d => d.id));
    this.computeDistMat();
    this.target_layer.selectAll('path')
      .each(function () {
        this._pts = undefined;
      });
    this.tooltips = tippy(this.target_layer.node().querySelectorAll('path'), {
      animation: 'fade',
      duration: 0,
      followCursor: true,
      // performance: true,
    });
  }

  resetColors(current_ids) {
    this.target_layer.selectAll('path')
      .attr('fill', (d) => {
        if (d.id === app.current_config.my_region) {
          return color_highlight;
        } else if (current_ids.indexOf(d.id) > -1) {
          return app.colors[d.id] || color_countries;
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
    if (chart.handleClickMap && !chart.handle_brush_map) {
      this.target_layer.selectAll('path')
        .on('click', function (d) {
          chart.handleClickMap(d, this);
        });
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
      d => d.__data__.id === app.current_config.my_region).__data__.geometry;
    const my_region_centroid = turf.centroid(my_region_geom);
    const result_dist = [];
    for (let i = 0; i < nb_ft; i++) {
      const id = features[i].__data__.id;
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

  displayLegend(type = 0) {
    d3.selectAll('#svg_legend > g').remove();
    const [elems, size, ty] = getLegendElems(type);
    makeMapLegend(elems, size, ty);
  }
}

function makeSourceSection() {
  const parent = svg_map.node().parentElement;
  const elem = document.createElement('p');
  elem.style.fontSize = '0.45em';
  elem.style.position = 'relative';
  elem.innerHTML = 'Données : Eurostat (téléchargement : Oct. 2017)- Limite administrative: UMS RIATE, CC-BY-SA';
  parent.insertBefore(elem, parent.querySelector('#header_map'));
  elem.style.left = '49%';
  elem.style.paddingLeft = '2em';
  elem.style.top = '32%';
  elem.style.margin = 'auto';
  elem.style.width = '100%';
  elem.className = 'rotate';
}

export {
  MapSelect,
  makeSourceSection,
  makeMapLegend,
  svg_map,
  zoomClick,
};
