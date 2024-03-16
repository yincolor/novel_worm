export class Component {
    /**
     * @param {{}} param 
     */
    constructor(param) {
        this.id = param?.id;
        this.type = param?.type;
        this.text = param?.text;
        this.children = param?.children || [];
        this.dom = null;
        this.class_list = param?.class_list;
        this.onclick = param?.onclick;
        this.onchange = param?.onchange; 
    }
    html() {
        if (typeof (this.dom) == 'object' && this.children) {
            for (const el of this.children) {
                this.dom?.append(el.html());
            }
        }
        if (this.class_list?.length > 0) {
            this.dom.classList.add(...this.class_list);
        }
        return this.dom;
    }
    addClassList(...class_list) {
        this.class_list.push(...class_list);
    }
}
export class Text extends Component {
    constructor(param) {
        super(param);
        this.dom = document.createElement('span');
        this.dom.textContent = this.text;
        // this.dom.innerText = this.text; 
    }
    update(_text) {
        this.text = _text;
        this.dom.textContent = _text;
        // this.dom.innerText = _text; 
    }
}
export class Input extends Component {
    constructor(param) {
        super(param);
        this.dom = document.createElement('input');
        this.dom.classList.add('form-control');
        this.dom.setAttribute('type', this.type || 'input');
    }
    value(data) {
        if (data != undefined && data != null) {
            this.dom.value = data;
        } else {
            return this.dom.value;
        }
    }
    isEmpty() {
        return this.dom.value == '';
    }
}
export class TextArea extends Input {
    constructor(param) {
        super(param);
        this.dom = document.createElement('textarea');
        this.dom.classList.add('form-control');
        this.dom.setAttribute('rows', 4);
    }
}
export class DatePicker extends Component {
    constructor(param) {
        super(param);
        this.dom = document.createElement('div');
        this.dom.classList.add('d-flex', 'flex-row')
        this.start_datetime = document.createElement('input');
        this.end_datetime = document.createElement('input');
        this.sep = document.createElement('span');
        this.start_datetime.setAttribute('type', 'datetime-local');
        this.start_datetime.classList.add('form-control-sm');
        this.start_datetime.step = 1; 
        
        this.end_datetime.setAttribute('type', 'datetime-local');
        this.end_datetime.classList.add('form-control-sm') ; 
        this.end_datetime.step = 1; 
        this.sep.innerText = '-';
        this.dom.append(this.start_datetime, this.sep, this.end_datetime)
    }
    /**
     * 
     * @param {Date} start_date 
     * @param {Date} end_date 
     * @returns 
     */
    value(start_date, end_date) {
        if (arguments.length == 2) {
            this.setStartDatetime(start_date);
            this.setEndDatetime(end_date);
        } else {
            return { start: this.format(this.getStartDatetime()), end: this.format(this.getEndDatetime()) }
        }
    }
    /** 获取开始时间 */
    getStartDatetime() {
        return new Date(this.start_datetime.value);
    }
    /** 获取结束时间 */
    getEndDatetime() {
        return new Date(this.end_datetime.value);
    }
    /**
     * 设置开始时间
     * @param {Date} date 
     */
    setStartDatetime(date) {
        this.start_datetime.value = this.format(date)
    }
    /**
     * 设置结束时间
     * @param {Date} date 
     */
    setEndDatetime(date) {
        this.end_datetime.value = this.format(date)
    }

    /**
     * 
     * @param {Date} date 
     * @returns
     */
    format(date) {
        if ( (date instanceof Date) && (!isNaN(date.getTime())) ) {
            const year = date.getFullYear();
            const month = (date.getMonth() + 1 + "").padStart(2, '0');
            const day = ("" + date.getDate()).padStart(2, '0');
            const hour = (date.getHours() + "").padStart(2, '0');
            const minutes = (date.getMinutes() + "").padStart(2, '0');
            const seconds = (date.getSeconds() + "").padStart(2,'0'); 
            return `${year}-${month}-${day} ${hour}:${minutes}:${seconds}`;
        } else {
            return null;
        }
    }
}
export class Button extends Component {
    constructor(param) {
        super(param);
        this.dom = document.createElement('button');
        this.dom.classList.add('btn');
        this.dom.textContent = this.text;
        this.dom.onclick = this.onclick;
    }

    /** 更新按钮文本 */
    updateText(_text){
        this.text = _text;
        this.dom.textContent = _text;
    }
    /** 按钮失效 */
    disable(){
        this.dom.disabled = true; 
    }
    /** 按钮生效 */
    enable(){
        this.dom.disabled = false; 
    }
}
export class Switches extends Button {
    constructor(param) {
        super(param);
        this._is_checked = param.is_checked ? true : false;
        this.setChecked(this._is_checked);
        this.dom.onclick = () => {
            this.setChecked(!this._is_checked);
            this.onclick(this.getChecked());
        }
    }

    setChecked(is_checked) {
        this._is_checked = is_checked;
        this.dom.textContent = this._is_checked ? "开启" : "关闭";
    }
    getChecked() { return this._is_checked; }
}
export class Select extends Component {
    constructor(param) {
        super(param);
        this.dom = document.createElement('select');
        this.dom.classList.add('form-select');
        this.options = param?.options; 
        this.dom.onchange = this.onchange; 
        /* options like : {
            print_line: { name: "向文件打印一行文字" },
            exec_command: { name: '执行终端命令'}
        } */
        if (this.options && Object.keys(this.options).length > 0) {
            for (const key of Object.keys(this.options)) {
                const opt = document.createElement('option');
                opt.textContent = this.options[key].name;
                opt.value = key; 
                this.dom.append(opt);
            }
        }
    }
    value(data) {
        if (data != undefined && data != null) {
            this.dom.value = data;
        } else {
            return this.dom.value;
        }
    }
    isEmpty() {
        return this.dom.value == '';
    }
}
export class Table extends Component {
    constructor(param) {
        super(param);
        this.columns = param.columns ?? [];
        this.dom = document.createElement('table');
        this.dom.classList.add('table', 'table-sm', 'table-striped');
        this.dom.setAttribute('data-resizable',true); 
        this.thead = document.createElement('thead');
        this.thead_tr = document.createElement('tr');
        for (const col of this.columns) {
            const th = document.createElement('th');
            th.innerText = col;
            this.thead_tr.append(th);
        }
        this.tbody = document.createElement('tbody');
        this.thead.append(this.thead_tr);
        this.dom.append(this.thead, this.tbody);
    }
    html() {
        if (this.children) {
            for (const el of this.children) {
                if (el instanceof TableRow) {
                    this.tbody.append(el.html());
                }
            }
        }
        if (this.class_list?.length > 0) {
            this.dom.classList.add(...this.class_list);
        }
        return this.dom;
    }
    update() {
        this.tbody.innerHTML = "";
        for (const el of this.children) {
            if (el instanceof TableRow) {
                this.tbody.append(el.html());
            }
        }
    }
    addRow(tableRow) {
        this.children?.push(tableRow);
        this.update();
    }
    clearAll() {
        this.tbody.innerHTML = "";
        this.children = [];
    }
}
export class TableRow extends Component {
    constructor(param) {
        super(param);
        this.dom = document.createElement('tr');
    }
    html() {
        this.dom.innerHTML = '';
        if (this.children) {
            for (const el of this.children) {
                const td = document.createElement('td');
                if (el && el.html) {
                    td.append(el.html());
                } else {
                    td.innerText = el;
                }
                this.dom.append(td);
            }
        }
        if (this.class_list?.length > 0) {
            this.dom.classList.add(...this.class_list);
        }
        return this.dom;
    }
}
export class VBox extends Component {
    constructor(param) {
        super(param);
        this.dom = document.createElement('div');
        this.dom.classList.add('d-flex', 'flex-column');
    }
}
export class HBox extends Component {
    constructor(param) {
        super(param);
        this.dom = document.createElement('div');
        this.dom.classList.add('d-flex', 'flex-row');
    }
}

