import { removeDuplicates } from './helpers';

const createMenu = function createMenu(names, variables, study_zones, territorial_mesh) {
  // First section, regions names:
  const title_section1 = document.createElement('p');
  title_section1.className = 'title_menu';
  title_section1.innerHTML = 'Ma région';
  const section1 = document.createElement('div');
  section1.className = 'box';
  section1.style.overflow = 'auto';
  section1.style.height = '180px';
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
  section2.id = 'menu_variables';
  section2.className = 'box';
  section2.style.overflow = 'auto';
  section2.style.height = '170px';

  // Filter the "variables" variable to fetch the group names :
  const groups_var = removeDuplicates(variables.map(d => d.group));

  for (let i = 0, len_i = groups_var.length; i < len_i; i++) {
    const gp_name = groups_var[i];
    const entry = document.createElement('p');
    entry.className = 'name_group_var';
    entry.innerHTML = `<span class='square'></span><span>${gp_name}</span>`;
    section2.appendChild(entry);
    const div_grp = document.createElement('div');
    div_grp.style.display = i === 0 ? null : 'none';
    const var_names = variables.filter(d => d.group === gp_name);
    for (let j = 0, len_j = var_names.length; j < len_j; j++) {
      const name_var = var_names[j].name;
      const code_var = var_names[j].ratio;
      const sub_entry = document.createElement('p');
      sub_entry.className = 'small';
      sub_entry.innerHTML = `<span value="${code_var}" class="target_variable small_square"></span><span class="label_chk">${name_var}</span><span class="i_info">i</span>`;
      div_grp.appendChild(sub_entry);
    }
    section2.appendChild(div_grp);
  }

  // Third section, study zone:
  const title_section3 = document.createElement('p');
  title_section3.className = 'title_menu';
  title_section3.innerHTML = 'Mon espace d\'étude';
  const section3 = document.createElement('div');
  section3.id = 'menu_studyzone';
  section3.className = 'box';
  for (let i = 0, len_i = study_zones.length; i < len_i; i++) {
    const entry = document.createElement('p');
    const zone = study_zones[i];
    if (zone.id === 'filter_dist') {
      entry.innerHTML = `<span filter-value="${zone.id}" class='filter_v square'></span><span class="label_chk">${zone.name}</span><input value="450" disabled="disabled" style="width: 55px; height: 13px;" type="number" min="0" max="100000" id="dist_filter"></input><span> km</span><span class="i_info">i</span>`;
    } else {
      entry.innerHTML = `<span filter-value="${zone.id}" class='filter_v square'></span><span class="label_chk">${zone.name}</span><span class="i_info">i</span>`;
    }
    section3.appendChild(entry);
  }

  // Fourth section:
  const title_section4 = document.createElement('p');
  title_section4.className = 'title_menu';
  title_section4.innerHTML = 'Maillage territorial d\'analyse';
  const section4 = document.createElement('div');
  section4.id = 'menu_territ_level';
  section4.className = 'box';
  for (let i = 0, len_i = territorial_mesh.length; i < len_i; i++) {
    const entry = document.createElement('p');
    const territ_level = territorial_mesh[i];
    entry.innerHTML = `<span value="${territ_level.id}" class='square territ_level'></span><span class="label_chk">${territ_level.name}</span><span class="i_info">i</span>`;
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
