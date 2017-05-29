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
);
const zoomMap = new D3Map('#q3');
zoomMap.drawBaseMap();
