import { app } from './../main';


export function makeTopMenu() {
  const top_menu = d3.select('#menutop')
    .styles({ 'font-family': "'Signika', sans-serif", 'font-size': '0.80em', padding: '0.3px' });

  top_menu
    .append('div')
    .attr('class', 'title_menu')
    .styles({ width: '80px', float: 'left', margin: '0 3px', cursor: 'pointer' })
    .html('Rang<br>(1 individu)');

  top_menu
    .append('div')
    .attr('class', 'title_menu')
    .styles({ width: '80px', float: 'left', margin: '0 3px', cursor: 'pointer' })
    .html('Rang<br>(2 individus)');

  top_menu
    .append('div')
    .attr('class', 'title_menu')
    .styles({ width: '80px', float: 'left', margin: '0 3px', cursor: 'pointer' })
    .html('Rang<br>(2+ individus)');

  top_menu
    .append('div')
    .attr('class', 'title_menu')
    .styles({ width: '80px', float: 'left', margin: '0 3px', cursor: 'pointer' })
    .html('Position<br>(1 individu)');

  top_menu
    .append('div')
    .attr('class', 'title_menu')
    .styles({ width: '80px', float: 'left', margin: '0 3px', cursor: 'pointer' })
    .html('Position<br>(2 individus)');
}

export function makeHeaderChart() {
  const header_bar_section = d3.select('#bar_section')
    .insert('p', 'svg')
    .style('margin-bottom', '0')
    .style('clear', 'both');

  header_bar_section.insert('span')
    .styles({
      'font-family': '\'Signika\', sans-serif',
      'font-weight': '800',
      'font-size': '14px',
      'margin-top': '12px',
      'margin-left': '40px',
      float: 'left',
    })
    .attr('class', 'title_variable')
    .html(app.current_config.ratio_pretty_name);

  header_bar_section.insert('img')
    .attrs({
      width: 24,
      height: 24,
      src: 'img/edit-table-insert-row-above.svg',
      id: 'img_table',
    })
    .styles({ margin: '3px', float: 'right' })
    .on('click', function () {
      if (document.querySelector('.dataTable-wrapper').style.display) {
        document.querySelector('#svg_map').style.display = 'none';
        document.querySelector('#svg_legend').style.display = 'none';
        document.querySelector('#header_map').style.display = 'none';
        document.querySelector('#header_table').style.display = null;
        document.querySelector('.dataTable-wrapper').style.display = null;
        this.style.filter = 'invert(75%)';
      } else {
        document.querySelector('#svg_map').style.display = null;
        document.querySelector('#svg_legend').style.display = null;
        document.querySelector('#header_map').style.display = null;
        document.querySelector('#header_table').style.display = 'none';
        document.querySelector('.dataTable-wrapper').style.display = 'none';
        this.style.filter = null;
      }
    });

  header_bar_section.insert('img')
    .attrs({
      width: 24,
      height: 24,
      src: 'img/printer.svg',
      id: 'img_printer',
    })
    .styles({ margin: '3px', float: 'right' });

  header_bar_section.insert('img')
    .attrs({
      width: 24,
      height: 24,
      src: 'img/gtk-info.svg',
      id: 'img_info',
    })
    .styles({ margin: '3px', float: 'right' });
}
