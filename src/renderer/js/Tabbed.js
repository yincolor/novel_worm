import { PaneContent } from "./PaneContent.js";
export class TabbedItem {
    /**
     * 
     * @param {String} id 一个全局唯一的ID 
     * @param {String} name 标签页的名称 
     */
    constructor(id, name) {
        this.id = id;
        this.name = name;
        this.tab_id = id + '-tab';
        this.pane_id = id + '-pane';
        this.tab_el = null;
        this.pane_el = null;
        this.pane_content = null;
        this.tab_is_hide = false;
        this.create();
    }
    create() {
        const li = document.createElement('li');
        li.classList.add('nav-item');
        li.setAttribute('href', '#');
        li.setAttribute('data-bs-toggle', 'tab');
        li.setAttribute('data-bs-target', `#${this.pane_id}`);
        li.setAttribute('role', 'tab');
        li.setAttribute('aria-controls', `#${this.pane_id}`);
        li.setAttribute('aria-selected', 'false');
        const tab_btn = document.createElement('button');
        tab_btn.classList.add('small', 'nav-link');
        tab_btn.id = this.tab_id;
        tab_btn.setAttribute('type', 'button');
        tab_btn.setAttribute('data-bs-toggle', 'tab');
        tab_btn.setAttribute('data-bs-target', `#${this.pane_id}`);
        tab_btn.setAttribute('aria-controls', `${this.pane_id}`);
        tab_btn.setAttribute('aria-selected', 'true');
        const close_a = document.createElement('a');
        close_a.setAttribute('href', '#');
        close_a.classList.add('tab-close-btn');
        close_a.innerHTML = `<svg  height="17" width="17">
                            <line x1="4" y1="4" x2="15" y2="15" style="stroke:#dc3545;stroke-width:1.2"/>
                            <line x1="15" y1="4" x2="4" y2="15" style="stroke:#dc3545;stroke-width:1.2"/>
                        </svg>`;
        const span = document.createElement('span');
        span.textContent = this.name;
        // tab_btn.textContent = this.name;
        tab_btn.append(span, close_a);
        li.append(tab_btn);
        this.tab_el = li;  //p1.children[0];
        const p2 = document.createElement('div');
        p2.innerHTML = `<div id="${this.pane_id}" class="tab-pane fade" role="tabpanel" aria-labelledby="${this.tab_id}">这是${this.name}</div>`;
        this.pane_el = p2.children[0];

        span.addEventListener('click', (ev) => {
            // console.log('TabbedItem', '点击：', ev.target);
            console.log('TabbedItem', '点击到标签，展示该标签页：' + this.name);
            if (this.pane_content) {
                this.pane_content.onPageShow();
            }
        });
        close_a.addEventListener('click', (ev) => {
            // console.log('TabbedItem', '点击：', ev.target);
            console.log('TabbedItem', '点击到标签的关闭按钮，关闭该标签页：' + this.name);
            const closeTabbedEvent = new CustomEvent('tabbed-close', { detail: { id: this.id, tab_id: this.tab_id, pane_id: this.pane_id } });
            document.dispatchEvent(closeTabbedEvent);
        });


    }
    hideTab() {
        this.tab_is_hide = true;
        this.tab_el.hidden = true;
    }
    showTab() {
        this.tab_is_hide = false;
        this.tab_el.hidden = false;
    }
    isActive() {
        return this.tab_el.getElementsByClassName('nav-link')[0].classList.contains('active');
    }
    /**
     * 设置页面内容
     * @param {PaneContent} pane_content 
     */
    setContent(pane_content) {
        this.pane_el.innerHTML = '';
        this.pane_content = pane_content;
        this.pane_el.appendChild(pane_content.dom);
    }
    remove() {
        console.log('TabbedItem', '移除标签页：', this.pane_content);
        this.tab_el.remove();
        this.pane_el.remove();
    }
}

export class TabbedManager {
    /** 标签页管理器
     * @param {String} tabbar_id 标签栏ID
     * @param {String} panebox_id 标签页视窗ID
     */
    constructor(tabbar_id, panebox_id) {
        /**
         * @type Array<TabbedItem>
         */
        this.tabbed_list = [];
        this.tabbar_id = tabbar_id;
        this.panebox_id = panebox_id;
        this.tabbar = document.getElementById(this.tabbar_id);
        this.panebox = document.getElementById(this.panebox_id);
        this.left_show_tab_index = 0;
        window.addEventListener('resize', () => {
            this.update();
        });
        document.addEventListener('tabbed-close', (ev) => {
            this.removeItemById(ev.detail?.id);
            ev.stopPropagation();
        })
    }
    create(id, name, contentObj) {
        const item = new TabbedItem(id, name);
        console.log('TabbedManager', `创建标签页: ${id} ${name}`);
        if (contentObj) {
            item.setContent(contentObj);
        }
        if (this.findItemById(id) != null) {
            this.focus(item.tab_id);
            this.findItemById(id).pane_content?.onPageShow();
            item.remove();
            return false;
        }
        this.tabbed_list.push(item);
        this.tabbar.append(item.tab_el);
        this.panebox.append(item.pane_el);
        this.focus(item.tab_id);
        this.update();
        return true;
    }
    focus(tab_id) {
        const tabel = document.querySelector('#' + tab_id);
        const tab = new bootstrap.Tab(tabel);
        tab.show();
        console.log('TabbedManager', '展示选项卡' + tabel.id);
    }
    setContent(id, pane_content) {
        this.findItemById(id)?.setContent(pane_content);
    }
    findItemById(id) {
        for (const tabbed of this.tabbed_list) {
            if (tabbed.id == id) return tabbed;
        }
        return null;
    }
    removeItemById(id) {
        // console.log('TabbedManager', "当前标签页列表：", this.tabbed_list);
        const tabbed_item = this.findItemById(id);
        const index = this.tabbed_list.indexOf(tabbed_item);
        console.log('TabbedManager', `删除标签页 ${index} ${id}`);
        this.tabbed_list.splice(index, 1);

        tabbed_item.pane_content.onClose();
        tabbed_item.remove();
        this.update();
    }
    update() {
        const page_tabs_width = this.tabbar.getBoundingClientRect().width;
        let item_width_t = 0;
        let is_overwrite = false;
        // console.log("TabbedManager", `当前最左边展示的标签的Index = ${this.left_show_tab_index}`);
        for (let i = 0; i < this.tabbed_list.length; i++) {
            const tabbed_item = this.tabbed_list[i];
            if (i < this.left_show_tab_index) {
                tabbed_item.hideTab();
                continue;
            }
            tabbed_item.showTab();
            const tabbed_item_width = tabbed_item.tab_el.getBoundingClientRect().width;
            is_overwrite = ((item_width_t + tabbed_item_width) > page_tabs_width);
            item_width_t += tabbed_item_width;
            if (is_overwrite) {
                tabbed_item.hideTab();
            }
        }
    }
    moveTabsShowView(action) {
        const tab_item_num = this.tabbed_list.length;
        this.left_show_tab_index += (action == 'right') ? 1 : -1;
        if (this.left_show_tab_index < 0) { this.left_show_tab_index = 0; }
        if (this.left_show_tab_index > (tab_item_num - 1)) { this.left_show_tab_index = tab_item_num - 1; }
        this.update();
    }
}
