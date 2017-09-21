export default class contextMenu {
  constructor(items) {
    if (items) {
      this.setItems(items);
    } else {
      this.items = [];
    }
  }

  addItem(item) {
    this.items.push({
      name: item.name,
      action: item.action,
    });
  }

  removeItem(name) {
    for (let i = this.items.length - 1; i > 0; i--) {
      if (this.items[i].name === name) {
        this.items.splice(i, 1);
        break;
      }
    }
  }

  setItems(items) {
    this.items = [];
    for (let i = 0, nb_items = items.length; i < nb_items; i++) {
      if (items[i].name && items[i].action) {
        this.addItem(items[i]);
      }
    }
  }

  showMenu(event, parent, items, position) {
    if (event.preventDefault) event.preventDefault();
    if (event.stopPropagation) event.stopPropagation();
    if (this.DOMobj) {
      this.hideMenu();
      return;
    }
    if (items) {
      this.setItems(items);
    }

    this.initMenu(parent);
    if (!position) {
      this.DOMobj.style.top = `${event.clientY + document.body.scrollTop}px`;
      this.DOMobj.style.left = `${event.clientX}px`;
    } else {
      this.DOMobj.style.top = `${position[1]}px`;
      this.DOMobj.style.left = `${position[0]}px`;
    }
    setTimeout(() => {
      document.addEventListener('click', () => this.hideMenu());
    }, 150);
  }

  hideMenu() {
    if (this.DOMobj && this.DOMobj.parentElement && this.DOMobj.parentElement.removeChild) {
      this.DOMobj.parentElement.removeChild(this.DOMobj);
      this.DOMobj = null;
    }
    document.removeEventListener('click', this.hideMenu);
  }

  initMenu(parent) {
    if (this.DOMobj && this.DOMobj.parentElement && this.DOMobj.parentElement.removeChild) {
      this.DOMobj.parentElement.removeChild(this.DOMobj);
      this.DOMobj = null;
    }
    const self = this;
    const menu = document.createElement('div');
    const list = document.createElement('ul');
    menu.className = 'context-menu';
    menu.appendChild(list);
    for (let i = 0, nb_item = this.items.length; i < nb_item; i++) {
      const item = document.createElement('li');
      item.setAttribute('data-index', i);
      item.innerHTML = `<span class="context-menu-item-name">${this.items[i].name}</span>`;
      list.appendChild(item);
      item.onclick = function () {
        const ix = this.getAttribute('data-index');
        self.items[ix].action();
      };
    }
    this.DOMobj = menu;
    parent.appendChild(menu);
  }
}
