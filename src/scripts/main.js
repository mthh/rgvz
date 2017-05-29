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
  'data/geom/template.geojson', true, { color: 'blue', id: 'template' }
);
mainMap.addLayer(
  'data/geom/countries.geojson', true, { color: 'yellow', id: 'countries' }
);
mainMap.addLayer(
  'data/geom/sea_boxes.geojson', false, { color: 'purple', id: 'sea_boxes' }
);
const zoomMap = new D3Map('#q3');
zoomMap.drawBaseMap();
