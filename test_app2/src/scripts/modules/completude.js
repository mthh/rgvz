export default class CompletudeSection {
  constructor(parent) {
    this.section = document.createElement('div');
    this.section.className = 'completude_section';
    this.completude_population = document.createElement('p');
    this.completude_features = document.createElement('p');
    this.completude_features.className = 'active';
    this.section.appendChild(this.completude_features);
    this.section.appendChild(this.completude_population);
    const self = this;
    parent.appendChild(this.section);
    this.completude_features.onclick = function () {
      this.classList.remove('active');
      self.completude_population.classList.add('active');
    };
    this.completude_population.onclick = function () {
      this.classList.remove('active');
      self.completude_features.classList.add('active');
    };
  }

  update(value_features, value_pop) {
    this.completude_features.innerHTML = `Données disponibles pour ${value_features[0]}/${value_features[1]} entités.`;
    this.completude_population.innerHTML = `Données disponibles pour ${value_pop}% de la population de l'espace d'étude.`;
  }

  remove() {
    this.section.remove();
    this.section = null;
    this.completude_population = null;
    this.completude_features = null;
  }
}