import tingle from 'tingle.js';
import { app } from './../main';


export function makeTopMenu() {
  const top_menu = d3.select('#menutop')
    .styles({ 'font-family': "'Signika', sans-serif", 'font-size': '0.80em', 'text-align': 'center' });
  const width_left = `${document.querySelector('#menu').getBoundingClientRect().width + 25}px`;
  const width_central_chart = `${document.querySelector('#bar_section').getBoundingClientRect().width}px`;
  const width_map = `${document.querySelector('#map_section').getBoundingClientRect().width - 40}px`;

  top_menu
    .append('div')
    .attrs({ class: 'title_section t1' })
    .html('SÉLECTION');

  const type_chart = top_menu
    .append('div')
    .attr('class', 'top_section t2')
    .style('display', 'flex');

  const position = type_chart
    .append('div')
    .attr('class', 'type_comparaison');

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
    .attr('class', 'type_comparaison');

  ressemblance.append('p')
    .attr('class', 'title_type_comp')
    .html('RESSEMBLANCES');

  ressemblance.append('span')
    .attrs({ class: 'type_chart chart_t1', value: 'Similarity1plus' })
    .html('+1 ind.');

  top_menu
    .append('div')
    .attrs({ class: 'title_section t3' })
    .html('QUELLES RÉGIONS ?');
}

export function makeHeaderMapSection() {
  const header_map_section = d3.select('#map_section')
    .insert('div', '#svg_map')
    .attr('id', 'header_map');

  header_map_section.append('div')
    .attrs({ class: 'filter_info', title: 'Espace d\'étude' });

  const completude_section = header_map_section.append('div')
    .attrs({ class: 'completude_section', title: 'Complétude de l\'information' });

  completude_section.append('p')
    .attr('id', 'completude_features');

  completude_section.append('p')
    .attr('id', 'completude_population');

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

  header_map_section.insert('div')
    .attrs({
      id: 'zoom_in',
      class: 'top_half_circle',
    })
    .append('span')
    .text('+');

  header_map_section.insert('div')
    .attrs({
      id: 'zoom_out',
      class: 'top_half_circle',
    })
    .append('span')
    .text('-');
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
      src: 'img/picto_download2.png',
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
      src: 'img/picto_report2.png',
      id: 'img_printer',
    })
    .styles({ margin: '3px', float: 'right' })
    .on('click', () => {
      const content = `<div id="prep_rapport"><h3>Rapport en cours de préparation...</h3>
<div class="spinner"><div class="cube1"></div><div class="cube2"></div></div></div>`;
      // eslint-disable-next-line new-cap
      const modal = new tingle.modal({
        stickyFooter: false,
        closeMethods: ['overlay', 'escape'],
        closeLabel: 'Close',
        onOpen() {
          document.querySelector('div.tingle-modal.tingle-modal--visible').style.background = 'rgba(0,0,0,0.4)';
        },
        onClose() {
          modal.destroy();
        },
      });
      modal.setContent(content);
      modal.open();
      setTimeout(() => {
        modal.setContent(`<div id="prep_rapport">
<p><a class="buttonDownload" href="#">Télécharger</a> <a class="buttonDownload" href="#">Ouvrir</a></p></div>`);
      }, 2500);
    });

  header_bar_section.insert('img')
    .attrs({
      width: 20,
      height: 20,
      src: 'img/picto_information2.png',
      id: 'img_info',
    })
    .styles({ margin: '3px', float: 'right' })
    .on('click', () => {
      const help_message = app.chart.getHelpMessage().split('\n').join('<br>');
      // eslint-disable-next-line new-cap
      const modal = new tingle.modal({
        stickyFooter: false,
        closeMethods: ['overlay', 'button', 'escape'],
        closeLabel: 'Close',
        onOpen() {
          document.querySelector('div.tingle-modal.tingle-modal--visible').style.background = 'rgba(0,0,0,0.4)';
        },
        onClose() {
          modal.destroy();
        },
      });
      modal.setContent(help_message);
      modal.open();
    });
}
