import { app } from './../main';


export function makeTopMenu() {
  const top_menu = d3.select('#menutop')
    .styles({ 'font-family': "'Signika', sans-serif", 'font-size': '0.80em', padding: '0.3px' });
  const width_left = `${document.querySelector('#menu').getBoundingClientRect().width + 25}px`;
  const t = document.querySelector('#bar_section').getBoundingClientRect().width;
  const width_central_chart = `${t}px`;
  const width_map = `${document.querySelector('#map_section').getBoundingClientRect().width - 35}px`;
  const width_type_comp = `${(t - 80) / 2 - 2}px`;
  top_menu
    .append('div')
    .attrs({ class: 'title_section' })
    .styles({ width: width_left, float: 'left', margin: '0 3px' })
    .html('SÉLECTION');

  const type_chart = top_menu
    .append('div')
    .attr('class', 'top_section')
    .styles({ width: width_central_chart, float: 'left', margin: '0 3px', 'text-align': 'center' });

  const position = type_chart
    .append('div')
    .attr('class', 'type_comparaison')
    .styles({ width: width_type_comp });

  position.append('p')
    .attr('class', 'title_type_comp')
    .html('POSITION');

  position.append('span')
    .attrs({ class: 'type_chart chart_t1 selected', value: 'BarChart1' })
    .html('1 ind.');

  position.append('span')
    .attrs({ class: 'type_chart chart_t2 disabled', value: 'ScatterPlot2' })
    .html('2 ind.');

  position.append('span')
    .attrs({ class: 'type_chart chart_t3 disabled', value: 'RadarChart3' })
    .html('+3 ind.');

  const ressemblance = type_chart
    .append('div')
    .attr('class', 'type_comparaison')
    .styles({ width: width_type_comp });

  ressemblance.append('p')
    .attr('class', 'title_type_comp')
    .html('RESSEMBLANCES');

  ressemblance.append('span')
    .attrs({ class: 'type_chart chart_t1', value: 'Similarity1plus' })
    .html('+1 ind.');

  top_menu
    .append('div')
    .attrs({ class: 'title_section' })
    .styles({ width: width_map, float: 'left', margin: '0 0 0 20px' })
    .html('QUELLES REGIONS ?');
}

export function makeHeaderMapSection() {
  const header_map_section = d3.select('#map_section')
    .insert('p', 'svg')
    .attr('id', 'header_map')
    .style('margin', '0 0 0 10px');

  header_map_section.insert('img')
    .attrs({
      class: 'map_button active',
      width: 20,
      height: 20,
      src: 'img/gimp-tool-rect-select.png',
      id: 'img_rect_selec',
    });

  header_map_section.insert('img')
    .attrs({
      class: 'map_button',
      width: 20,
      height: 20,
      src: 'img/gimp-tool-zoom.png',
      id: 'img_map_zoom',
    });

  header_map_section.insert('img')
    .attrs({
      class: 'map_button',
      width: 20,
      height: 20,
      src: 'img/gimp-cursor.png',
      id: 'img_map_select',
    });
}


export function makeHeaderChart() {
  const header_bar_section = d3.select('#bar_section')
    .insert('p', 'svg')
    .attr('id', 'header_chart')
    .style('margin-bottom', '0')
    .style('clear', 'both');

  header_bar_section.insert('img')
    .attrs({
      width: 20,
      height: 20,
      src: 'img/edit-table-insert-row-above.svg',
      id: 'img_table',
    })
    .styles({ margin: '3px', float: 'right' })
    .on('click', () => {
      const columns = Object.keys(app.current_data[0]);
      const content = [
        columns.join(','), '\r\n',
        app.current_data.map(d => columns.map(c => d[c]).join(',')).join('\r\n'),
      ].join('');
      const elem = document.createElement('a');
      elem.setAttribute('href', `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`);
      elem.setAttribute('download', 'Regioviz_export.csv');
      elem.style.display = 'none';
      document.body.appendChild(elem);
      elem.click();
      document.body.removeChild(elem);
      // if (document.querySelector('.dataTable-wrapper').style.display) {
      //   document.querySelector('#svg_map').style.display = 'none';
      //   document.querySelector('#svg_legend').style.display = 'none';
      //   document.querySelector('#header_map').style.display = 'none';
      //   document.querySelector('#header_table').style.display = null;
      //   document.querySelector('.dataTable-wrapper').style.display = null;
      //   this.style.filter = 'invert(75%)';
      // } else {
      //   document.querySelector('#svg_map').style.display = null;
      //   document.querySelector('#svg_legend').style.display = null;
      //   document.querySelector('#header_map').style.display = null;
      //   document.querySelector('#header_table').style.display = 'none';
      //   document.querySelector('.dataTable-wrapper').style.display = 'none';
      //   this.style.filter = null;
      // }
    });

  header_bar_section.insert('img')
    .attrs({
      width: 20,
      height: 20,
      src: 'img/printer.svg',
      id: 'img_printer',
    })
    .styles({ margin: '3px', float: 'right' });

  header_bar_section.insert('img')
    .attrs({
      width: 20,
      height: 20,
      src: 'img/gtk-info.svg',
      id: 'img_info',
    })
    .styles({ margin: '3px', float: 'right' });
}
