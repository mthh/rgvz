const createMenu = function createMenu(names, variables, study_zones, territorial_mesh) {
  // First section, regions names:
  const title_section1 = document.createElement('p');
  title_section1.className = 'title_menu';
  title_section1.innerHTML = 'Ma région';
  const section1 = document.createElement('div');
  section1.className = 'box';
  section1.style.overflow = 'auto';
  section1.style.height = '200px';
  for (let i = 0, len_i = names.length; i < len_i; i++) {
    const id = names[i].geo;
    const name = names[i].Nom;
    const entry = document.createElement('p');
    entry.innerHTML = `<span value="${id}" class='target_region square'></span><span class="label_chk">${name}</span>`;
    section1.appendChild(entry);
  }

  // Second section, groups of variables:
  const title_section2 = document.createElement('p');
  title_section2.className = 'title_menu';
  title_section2.innerHTML = 'Mon/mes indicateurs';
  const section2 = document.createElement('div');
  section2.className = 'box';
  const groups_var = Object.keys(variables);
  for (let i = 0, len_i = groups_var.length; i < len_i; i++) {
    const gp_name = groups_var[i];
    const entry = document.createElement('p');
    entry.innerHTML = `<span class='square'></span><span class="label_chk">${gp_name}</span>`;
    section2.appendChild(entry);
    const var_names = Object.keys(variables[gp_name]);
    for (let j = 0, len_j = var_names.length; j < len_j; j++) {
      const name_var = var_names[j];
      const code_var = variables[gp_name][name_var];
      const sub_entry = document.createElement('p');
      sub_entry.className = 'small';
      sub_entry.innerHTML = `<span value="${code_var}" class="small_square"></span><span>${var_names[j]}</span>`;
      section2.appendChild(sub_entry);
    }
  }

  // Third section, study zone:
  const title_section3 = document.createElement('p');
  title_section3.className = 'title_menu';
  title_section3.innerHTML = 'Mon espace d\'étude';
  const section3 = document.createElement('div');
  section3.className = 'box';
  for (let i = 0, len_i = study_zones.length; i < len_i; i++) {
    const entry = document.createElement('p');
    const zone = study_zones[i];
    entry.innerHTML = `<span filter-value="${zone.id}" class='filter_v square'></span><span class="label_chk">${zone.name}</span>`;
    section3.appendChild(entry);
  }

  // Fourth section:
  const title_section4 = document.createElement('p');
  title_section4.className = 'title_menu';
  title_section4.innerHTML = 'Maillage territorial d\'analyse';
  const section4 = document.createElement('div');
  section4.className = 'box';
  for (let i = 0, len_i = territorial_mesh.length; i < len_i; i++) {
    const entry = document.createElement('p');
    const territ_level = territorial_mesh[i];
    entry.innerHTML = `<span value="${territ_level.id}" class='square'></span><span class="label_chk">${territ_level.name}</span>`;
    section4.appendChild(entry);
  }

  // The actual menu containing these 4 sections:
  const menu = document.getElementById('menu');
  menu.id = 'menu';
  menu.style.width = '340px';
  menu.style.float = 'left';
  menu.appendChild(title_section1);
  menu.appendChild(section1);
  menu.appendChild(title_section2);
  menu.appendChild(section2);
  menu.appendChild(title_section3);
  menu.appendChild(section3);
  menu.appendChild(title_section4);
  menu.appendChild(section4);
};

export { createMenu };
