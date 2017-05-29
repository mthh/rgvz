/* eslint-env browser */

import 'd3-selection-multi';
import { select } from 'd3-selection';
import { geoBounds, geoPath, geoMercator, geoProjection, geoAzimuthalEqualArea, geoEquirectangular } from 'd3-geo';  // eslint-disable-line no-unused-vars
import { get } from './helpers';

export default class D3Map {
  constructor(selector, width = 600, height = 400) {
    this.container = select(selector)
      .append('svg')
      .attrs({ width, height })
      .append('g');

    this.projection = geoAzimuthalEqualArea()
      .rotate([-10, -52, 0])
      .scale(100)
      .translate([width / 2, height / 2]);

    this.path = geoPath(this.projection);
    this.width = width;
    this.height = height;
  }

  drawBaseMap() {
    const path = this.path;
    const container = this.container;
    get('https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_110m_admin_0_countries.geojson')
      .then((result) => {
        const parsed = JSON.parse(result);
        container
          .append('g')
          .attr('id', '#world_countries')
          .styles({ 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })
          .selectAll('path')
          .data(parsed.features)
          .enter()
          .append('path')
          .attrs({ d: path, height: '100%', width: '100%' });
      });
  }

  addLayer(url, id, zoomFit = false, style = {}) {
    const container = this.container;
    return get(url)
      .then((result) => {
        const parsed = JSON.parse(result);
        container
          .append('g')
          .attr('id', id)
          .styles({ 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })
          .selectAll('path')
          .data(parsed.features)
          .enter()
          .append('path')
          .attrs({ d: this.path, height: '100%', width: '100%' })
          .attr('id', (d,i) => ['feature_', i].join(''))
          .styles(style);

        if (zoomFit) {
          this.projection = this.projection.fitSize([this.width, this.height], parsed);
          this.path = geoPath(this.projection);
          container.selectAll('path')
            .attr('d', this.path);
        }
        return Promise.resolve(true);
      });
  }

  fitFeature(data) {
    this.projection = this.projection
      .fitSize([this.width, this.height], data);
    this.path = geoPath(this.projection);
    this.container.selectAll('path')
      .attr('d', this.path);
  }

  fitLayer(id) {
    const layer = this.container.select(['#', id].join('')).node().querySelectorAll('path');
    const features = [];
    for (let i = 0; i < layer.length; i++) { // eslint-disable-line
      features.push(layer[i].__data__);
    }
    this.projection = this.projection
      .fitSize([this.width, this.height], { type: 'FeatureCollection', features: features });
    this.path = geoPath(this.projection);
    this.container.selectAll('path')
      .attr('d', this.path);
  }
}
