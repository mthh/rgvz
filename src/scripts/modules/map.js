/* eslint-env browser */

import 'd3-selection-multi';
import { select } from 'd3-selection';
import { geoBounds, geoPath, geoMercator, geoProjection, geoEquirectangular } from 'd3-geo';  // eslint-disable-line no-unused-vars
import { get } from './helpers';

export default class D3Map {
  constructor(selector, width = 600, height = 400) {
    this.container = select(selector)
      .append('svg')
      .attrs({ width, height })
      .append('g');

    this.projection = geoEquirectangular()
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

  addLayer(url, zoomFit = false, props = {}) {
    const path = this.path;
    const container = this.container;
    const options = props;
    get(url)
      .then((result) => {
        const parsed = JSON.parse(result);
        container
          .append('g')
          .attr('id', options.id)
          .styles({ 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })
          .selectAll('path')
          .data(parsed.features)
          .enter()
          .append('path')
          .attrs({ d: path, height: '100%', width: '100%' })
          .style('fill', options.color);

        if (zoomFit) {
          this.projection().fitSize([this.width, this.height], parsed.features[0]);
          this.path = geoPath(this.projection);
          container.selectAll('path')
            .attr('d', path);
        }
      });
  }
}
