import { select as d3select } from 'd3-selection';
import debug from 'debug';
import D3Map from './modules/map';
// import '../styles/main.css';

const log = debug('app:log');

if (ENV !== 'production') {
  debug.enable('*');
  log('Logging is enabled');
} else {
  debug.disable();
}

const mainMap = new D3Map('#q1');
const zoomMap = new D3Map('#q3');
// mainMap.drawBaseMap();
mainMap.addLayer(
  'data/geom/template.geojson',
  'template',
  true,
  { fill: '#006666', 'fill-opacity': 1 },
);
mainMap.addLayer(
  'data/geom/countries.geojson',
  'contries',
  false,
  { fill: 'grey', 'fill-opacity': 1, 'stroke-width': 0.5, stroke: '#180000' },
);
mainMap.addLayer(
  'data/geom/sea_boxes.geojson',
  'sea_boxes',
  false,
  { fill: '#006666', 'fill-opacity': 1, stroke: 'black', 'stroke-width': 1 },
);
mainMap.addLayer(
  'data/geom/remote.geojson',
  'contries',
  false,
  { fill: 'grey', 'fill-opacity': 1, 'stroke-width': 0.5, stroke: '#180000' },
);
mainMap.addLayer(
  'data/geom/cget-nuts1-version-2016.geojson',
  'nuts1',
  false,
  { fill: 'yellow', 'fill-opacity': 1, 'stroke-width': 0.5, stroke: '#180000' },
).then(() => {
  mainMap.container.select(['#', 'nuts1'].join(''))
    .selectAll('path')
    .on('mouseover', function a() {
      d3select(this).transition().style('fill', 'red');
    })
    .on('mouseout', function b() {
      d3select(this).transition().style('fill', 'yellow');
    })
    .on('click', function c(d) {
      zoomMap.fitFeature(d);
      const nuts1 = zoomMap.container.select('#nuts1');
      nuts1
        .selectAll('path')
        .style('fill', 'yellow');
      nuts1
        .select(['#', this.id].join(''))
        .style('fill', 'orange');
      zoomMap.container.select('#nuts3')
        .selectAll('path')
        .style('stroke-opacity', '0.8');
    });
  mainMap.container.on('dblclick', () => {
    zoomMap.fitLayer('template');
    zoomMap.container.select('#nuts1')
      .selectAll('path')
      .style('fill', 'yellow');
    zoomMap.container.select('#nuts3')
      .selectAll('path')
      .style('stroke-opacity', '0');
  });
});
// zoomMap.drawBaseMap();
zoomMap.addLayer(
  'data/geom/template.geojson',
  'template',
  true,
  { fill: '#006666', 'fill-opacity': 1 },
);
zoomMap.addLayer(
  'data/geom/countries.geojson',
  'contries',
  false,
  { fill: 'grey', 'fill-opacity': 1, 'stroke-width': 0.5, stroke: '#180000' },
);
zoomMap.addLayer(
  'data/geom/sea_boxes.geojson',
  'sea_boxes',
  false,
  { fill: '#006666', 'fill-opacity': 1, stroke: 'black', 'stroke-width': 1 },
);
zoomMap.addLayer(
  'data/geom/remote.geojson',
  'contries',
  false,
  { fill: 'grey', 'fill-opacity': 1, 'stroke-width': 0.5, stroke: '#180000' },
);
zoomMap.addLayer(
  'data/geom/cget-nuts1-version-2016.geojson',
  'nuts1',
  false,
  { fill: 'yellow', 'fill-opacity': 1, 'stroke-width': 1, stroke: '#180000' },
).then(() => {
  zoomMap.container.select(['#', 'nuts1'].join(''))
    .selectAll('path')
    .on('mouseover', function a() {
      d3select(this).transition().style('fill', 'red');
    })
    .on('mouseout', function b() {
      d3select(this).transition().style('fill', 'yellow');
    });
  zoomMap.container.on('dblclick', () => {
    zoomMap.fitLayer('template');
    zoomMap.container.select('#nuts1')
      .selectAll('path')
      .style('fill', 'yellow');
    zoomMap.container.select('#nuts3')
      .selectAll('path')
      .style('stroke-opacity', '0');
  });
});
// zoomMap.addLayer(
//   'data/geom/cget-nuts2-version-2013.geojson',
//   'nuts2',
//   false,
//   { fill: 'transparent', 'stroke-width': 0.5, stroke: '#180000' },
// );
zoomMap.addLayer(
  'data/geom/cget-nuts3-version-2013.geojson',
  'nuts3',
  false,
  { fill: 'transparent', 'stroke-width': 0.3, stroke: '#180000', 'stroke-opacity': '0' },
);
