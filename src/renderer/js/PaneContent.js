import { Base64 } from "./Base64.js";
import { BookSourceManager, BookshelfManager } from "./Database.js";
import { Button, HBox, Input, Switches, Table, TableRow, Text, VBox } from "./Component.js";

/** 发送关闭页面事件 */
function emitClosePageEvent(id) {
    const closeTabbedEvent = new CustomEvent('close-page', { detail: { id } });
    document.dispatchEvent(closeTabbedEvent);
}
/** 发送创建页面事件 */
function emitAddPageEvent(id, name, content_class, param) {
    const _event = new CustomEvent('add-page', {
        detail: {
            id: id, //'book-info-' + encode_str,
            name: name,  //'详情-' + book_name,
            param: param,  // { site_url, book_name, book_info_url, from_page: 'search' },
            content: content_class //BookInfo
        },
        bubbles: false
    });
    document.dispatchEvent(_event);
}
/** 发送页面滚动到顶部的事件 */
function emitViewScrollTopEvent() {
    const closeTabbedEvent = new CustomEvent('view-scroll-top');
    document.dispatchEvent(closeTabbedEvent);
}
export class PaneContent {
    constructor(id, param) {
        this.id = id;
        this.param = param || null;
        this.dom = document.createElement('div');
        this.start();
        console.log('PaneContent', `启动页面 ${this.id}`);
    }

    start() {
        /* 构建页面布局、定义响应 */
    }

    /** 当前页面被展示时调用 */
    onPageShow() {
        console.log('PaneContent', `响应事件 - 页面展示：${this.id}`);
    }

    onClose() {
        console.log('PaneContent', "当标签页关闭时调用的onClose方法。");
    }
}
/** 首页书架界面 */
export class MainPage extends PaneContent {
    constructor(id) {
        super(id);
    }
    start() {
        this.book_table = new Table({
            columns: ['书籍名称', '作者', '阅读进度', '书源', '操作'],
            children: []
        });
        const component = new VBox({
            children: [
                this.book_table
            ]
        });
        this.dom = component.html();

        this.book_list = [];
        this.updateBookshelf();
    }

    onPageShow() {
        console.log('MainPage', '展示书架页面事件，更新书架');
        this.updateBookshelf();
    }
    /** 更新书架内容 */
    async updateBookshelf() {
        this.book_list = await BookshelfManager.getAllBook();
        const source_cache = {}; 
        this.book_table.children = [];
        for (const book of this.book_list) {
            const { book_info_url, site_url, name, author, latest_chapter, intro, reading_chapter_index, chapter_num } = book;
            let _book_source = null; 
            if(source_cache[site_url]){
                _book_source = source_cache[site_url];
            }else {
                console.log('MainPage', '加载书源数据：', site_url); 
                _book_source = await BookSourceManager.getBookSourceObj(site_url);
                source_cache[site_url] = _book_source; 
            }
            const site_name = _book_source?.name || '丢失的书源';
            const row = this.createBookTableRow(site_url, book_info_url, name, author, reading_chapter_index, chapter_num, site_name);
            this.book_table.children.push(row);
        }
        this.book_table.update();
    }

    /** 创建书架列表项 */
    createBookTableRow(site_url, book_info_url, book_name, book_author, reading_chapter_index, chapter_num, source) {
        return new TableRow({
            children: [
                `《${book_name}》`, book_author,
                `${reading_chapter_index + 1}/${chapter_num}`,
                source,
                new HBox({
                    children: [
                        this.createStartReadButton(site_url, book_name, book_info_url),
                        this.createOpenInfoButton(site_url, book_name, book_info_url),
                    ]
                }),
            ]
        });
    }

    /** 创建首页书架，书籍的开始阅读按钮 */
    createStartReadButton(site_url, book_name, book_info_url) {
        return new Button({
            text: '阅读',
            class_list: ['text-nowrap', 'btn-primary', 'btn-sm'],
            onclick: async () => {
                console.log('MainPage', `开始阅读按钮被点击，阅读书籍：${site_url}, ${book_info_url}`);
                const encode_str = Base64.encodeNoEqualsSign(book_info_url);
                emitAddPageEvent('content-reader-' + encode_str, '阅读-' + book_name, ChapterContent, { site_url, book_name, book_info_url, from_page: 'bookshelf' });
            }
        });
    }
    /** 创建详情按钮 */
    createOpenInfoButton(site_url, book_name, book_info_url) {
        return new Button({
            text: '详情',
            class_list: ['text-nowrap', 'btn-danger', 'btn-sm'],
            onclick: async () => {
                console.log('MainPage', `打开详情按钮被点击，打开书籍详情：${site_url}, ${book_name}, ${book_info_url}`);
                const encode_str = Base64.encodeNoEqualsSign(book_info_url);
                emitAddPageEvent('book-info-' + encode_str, '详情-' + book_name, BookInfo, { site_url, book_name, book_info_url, from_page: 'bookshelf' });
            }
        });
    }
}
/** 搜索列表界面 */
export class SearchList extends PaneContent {
    constructor(id) {
        super(id);
        this.search_table_cache = [];
        this.current_search_key = "";
    }
    start() {
        this.search_table = new Table({
            columns: ['书名', '作者', '最新章节', '网站', '操作'],
            children: []
        });
        this.search_name_input = new Input({ type: "text", class_list: ['form-control-sm'] });
        this.search_btn = new Button({
            text: "搜索关键词",
            class_list: ['text-nowrap', 'btn-primary'],
            onclick: async () => {
                this.startSearch();
            }
        });
        const component = new VBox({
            children: [
                new HBox({
                    children: [
                        new Text({ text: "搜索: ", class_list: ['text-nowrap'] }),
                        this.search_name_input,
                        this.search_btn,
                    ]
                }),
                new VBox({
                    class_list: ['flex-grow-1'],
                    children: [this.search_table]
                })
            ]
        });
        this.dom = component.html();
    }
    async startSearch() {
        if (this.search_name_input.isEmpty()) {
            alert('搜索栏无输入');
            return;
        }
        const search_key = this.search_name_input.value();
        console.log('SearchList', "搜索关键词：" + search_key);
        if (search_key.length < 2) {
            alert('搜索关键词字数必须 >= 2，现在的关键词字数：' + search_key.length);
            return;
        }
        console.log('SearchList', '搜索关键词无问题，开始执行搜索');
        this.search_table_cache = [];
        this.current_search_key = search_key;
        this.search_btn.disable();
        await this.updateSearchList();

        const bookSourceListEnabled = await BookSourceManager.getEnableBookSourceObj();
        for (const book_source of bookSourceListEnabled) {
            try {
                if (book_source && Object.keys(book_source).length > 0) {
                    /** 获取正确的书源 */
                    const search_list = await book_source.search(search_key);
                    for (const search_item of search_list) {
                        search_item.site_name = book_source.name;
                        search_item.site_url = book_source.site;
                        this.search_table_cache.push(search_item);
                    }
                }
            } catch (error) {
                console.error(error);
                break;
            }
            console.log('SearchList', '更新当前搜索结果缓存，缓存长度：' + this.search_table_cache.length);
            console.log(this.search_table_cache);
            await this.updateSearchList();
        }
        this.search_btn.enable();
    }

    createSearchTableRow(name, author, latest_chapter, site_name, site_url, book_info_url) {
        const site_desc = `${site_name}(${site_url})`;
        return new TableRow({
            children: [name, author, latest_chapter, site_desc,
                new HBox({
                    children: [
                        this.createOpenBookInfoButton(site_url, name, book_info_url),
                    ]
                })
            ]
        });
    }

    async updateSearchList() {
        this.search_table_cache.sort((book1, book2) => {
            return this.bookNameCorrelationCompare(book1.name, book2.name);
        });
        this.search_table.children = [];
        for (const item of this.search_table_cache) {
            const { name, author, latest_chapter, site_name, site_url, info_url } = item;
            const row = this.createSearchTableRow(name, author, latest_chapter, site_name, site_url, info_url);
            this.search_table.children.push(row);
        }
        this.search_table.update();
    }

    /**
     * 书名和搜索关键词之间相关性的比较
     * @param {String} name1 书名1
     * @param {String} name2  书名2
     */
    bookNameCorrelationCompare(name1, name2) {
        const regex = new RegExp('\\b' + this.current_search_key + '\\b', 'g');
        const matches1 = name1.match(regex);
        const matches2 = name2.match(regex);
        const val1 = name1.indexOf(this.current_search_key) * 50 + (matches1 ? matches1.length : 0) * 50;
        const val2 = name2.indexOf(this.current_search_key) * 50 + (matches2 ? matches2.length : 0) * 50;
        return val2 - val1;
    }
    /** 创建打开书籍详情页面的按钮 */
    createOpenBookInfoButton(site_url, book_name, book_info_url) {
        return new Button({
            text: '详情',
            class_list: ['text-nowrap', 'btn-danger', 'btn-sm'],
            onclick: async () => {
                console.log('SearchList', "打开书籍详情：" + site_url + ', ' + book_info_url);
                const encode_str = Base64.encodeNoEqualsSign(book_info_url);
                emitAddPageEvent('book-info-' + encode_str, '详情-' + book_name, BookInfo, { site_url, book_name, book_info_url, from_page: 'search' });
            }
        });
    }
}
/** 小说详情界面 两种情况：1、需要网络请求数据 2、从数据库读取数据 */
export class BookInfo extends PaneContent {
    constructor(id, param) { super(id, param); }
    start() {
        /* 传入的参数 { site_url, book_name, book_info_url, from_page } */
        this.site_url = this.param?.site_url;
        this.book_info_url = this.param?.book_info_url;
        this.from_page = this.param?.from_page; /* 书籍详情页面是从哪个页面打开的？如果是search，那么就网络请求书籍详情，如果是bookshelf，那么就去数据库查找书籍详情 */
        /* 页面元素 */
        this.book_name = new Text({ text: '《书名待加载...》' });
        this.book_author = new Text({ text: '作者待加载...' });
        this.latest_chapter = new Text({ text: '最新章节待加载...' });
        this.intro = new Text({ text: '介绍待加载...' });
        this.save_or_del_btn = this.createSaveOrDeleteBookFromBookshelfButton();
        this.force_network_update_btn = this.createForceNetworkUpdateButton();
        this.start_read_btn = this.createStartReadButton();
        this.chapter_list_table = new Table({
            columns: ['章节列表', '缓存状态'],
            children: []
        });
        const component = new VBox({
            children: [
                new HBox({
                    children: [this.book_name, this.book_author]
                }),
                this.latest_chapter,
                new HBox({
                    children: [
                        this.save_or_del_btn,
                        this.force_network_update_btn,
                        this.start_read_btn
                    ],
                    class_list: ['justify-content-center']
                }),
                this.intro,
                this.chapter_list_table
            ]
        });
        this.dom = component.html();

        /* 页面缓存信息 */
        this.book_source = null; /* 本书的书源 */
        this.info_data = null; /* 书籍详情信息 */
        this.chapter_list = []; /* 章节列表 */

        /* 刷新详情页面 */
        this.updateBookInfo();
    }

    onPageShow() {
        this.updateBookInfo();
    }

    /** 创建“放入书架”或“删除书籍”按钮 */
    createSaveOrDeleteBookFromBookshelfButton() {
        return new Button({
            text: '？',
            class_list: ['text-nowrap', 'btn-primary', 'btn-sm'],
            onclick: async () => {
                console.log('BookInfo', `将《${this.book_name.text}》放入书架，当前详情页面来源：${this.from_page}`);
                if (this.info_data) {
                    if (this.from_page == 'search') {
                        await this.saveBookInfoToDatabase();
                    } else {
                        const is_remove = confirm(`是否从书架删除《${this.book_name}》?`);
                        if (is_remove) {
                            await this.deleteBookInfoFromDatabase();
                        }
                    }
                    /* 发送关闭当前页面的事件 */
                    emitClosePageEvent(this.id);
                } else {
                    alert("无法点击按钮，书籍详情为空")
                }
            }
        });
    }
    /** 创建“网络更新”按钮 */
    createForceNetworkUpdateButton() {
        return new Button({
            text: '强制网络更新',
            class_list: ['text-nowrap', 'btn-primary', 'btn-sm'],
            onclick: async () => {
                console.log('BookInfo', `将《${this.book_name.text}》的信息进行强制网络更新`)
                this.updateBookInfo(true);
            }
        });
    }
    /** 创建BookInfo界面的“开始阅读”按钮 */
    createStartReadButton() {
        return new Button({
            text: '开始阅读',
            class_list: ['text-nowrap', 'btn-danger', 'btn-sm'],
            onclick: async () => {
                console.log('BookInfo', `开始阅读：《${this.book_name.text}》`);
                if (this.info_data) {
                    const _chapter_name = this.chapter_list[0].chapter_name;
                    const _chapter_url = this.chapter_list[0].chapter_url;
                    const is_save = (this.chapter_list[0]?.is_save == 1) ? 1 : 0;
                    console.log('BookInfo', `打开章节：${_chapter_name} ${_chapter_url} ${is_save == 0 ? '尚未缓存' : '已缓存'}`);
                    let chapter_item = await BookshelfManager.getChapterItemByChapterUrl(_chapter_url);
                    // console.log("BookInfo", '从书架数据库中获得章节对象：', chapter_item);
                    if (!chapter_item) {
                        console.log('BookInfo', '没有从书架数据库中查到该章节，可能是尚未放入书架;');
                        const is_save_to_bookshelf = confirm('阅读章节内容，需要先将本书放入书架，是否放入书架？');
                        if (is_save_to_bookshelf) {
                            await this.saveBookInfoToDatabase();
                            chapter_item = await BookshelfManager.getChapterItemByChapterUrl(_chapter_url);
                        } else {
                            return;
                        }
                    }
                    const encode_str = Base64.encodeNoEqualsSign(this.book_info_url);
                    emitAddPageEvent('content-reader-' + encode_str, '阅读-' + this.info_data.name, ChapterContent, {
                        site_url: this.site_url, book_name: this.info_data.name, book_info_url: this.book_info_url, from_page: 'bookinfo'
                    });
                } else {
                    alert("无法点击按钮，书籍详情为空")
                }
            }
        });
    }

    /** 保存书籍详情到数据库中 */
    async saveBookInfoToDatabase() {
        if (this.info_data && this.chapter_list) {
            /* 书籍详情 */
            const book_info_url = this.book_info_url;
            const site_url = this.site_url;
            const name = this.info_data.name;
            const author = this.info_data.author;
            const latest_chapter = this.info_data.latest_chapter;
            const intro = this.info_data.intro;
            const reading_chapter_index = 0;
            /* 保存书籍详情 */
            await BookshelfManager.saveBookInfo(book_info_url, site_url, name, author, latest_chapter, intro, reading_chapter_index);
            /* 章节列表 */
            await BookshelfManager.saveChapterList(book_info_url, site_url, this.chapter_list);
        }
    }
    /** 删除书籍详情从数据库中 */
    async deleteBookInfoFromDatabase() {
        if (this.book_info_url) {
            await BookshelfManager.deleteBook(this.book_info_url);
        }
    }

    /**
     * 更新书籍详情 
     * @param {boolean} fouce_by_network 是否要强制通过网络更新书籍详情数据
     */
    async updateBookInfo(fouce_by_network) {
        const info_data = await this.getBookInfoData(fouce_by_network);
        if (info_data) {
            /** 更新书籍详情 */
            this.book_name.update(`《${info_data.name}》`);
            this.book_author.update(`作者：${info_data.author}`);
            this.latest_chapter.update(`最新章节：${info_data.latest_chapter}`);
            this.intro.update(`介绍：${info_data.intro}`);
            if (this.from_page == 'search') {
                this.save_or_del_btn.updateText('放入书架');
            } else {
                this.save_or_del_btn.updateText('删除书籍');
            }
            this.info_data = info_data;
            /** 获取章节列表 */
            this.chapter_list = await this.getChapterList();
            console.log('BookInfo', '获取新的章节列表：', this.chapter_list);
            this.updateChapterListTable();
        } else {
            this.info_data = null;
        }
    }

    /** 更新章节列表界面 */
    async updateChapterListTable() {
        this.chapter_list_table.children = [];
        if (this.chapter_list && this.chapter_list.length && this.chapter_list.length > 0) {
            for (const chapter of this.chapter_list) {
                const { chapter_name, chapter_url, is_save } = chapter;
                const row = await this.createChapterButtonRow(chapter_name, chapter_url, is_save);
                this.chapter_list_table.children.push(row);
            }
            this.chapter_list_table.update();
            console.log('BookInfo', "刷新章节列表 table 成功");
        } else {
            console.log('BookInfo', "更新章节列表界面失败，this.chapter_list 有问题：");
            console.log(this.chapter_list);
            alert('[BookInfo] 获取章节列表失败.');
        }
    }

    /** 创建BookInfo界面的单个章节的按钮 */
    async createChapterButtonRow(_chapter_name, _chapter_url, is_save = 0) {
        return new TableRow({
            children: [
                new Button({
                    text: _chapter_name,
                    class_list: ['text-nowrap', 'btn-sm'],
                    onclick: async () => {
                        console.log('BookInfo', `打开章节：${_chapter_name} ${_chapter_url} ${is_save == 0 ? '尚未缓存' : '已缓存'}`);
                        let chapter_item = await BookshelfManager.getChapterItemByChapterUrl(_chapter_url);
                        console.log("BookInfo", '从书架数据库中获得章节对象：', chapter_item);
                        if (!chapter_item) {
                            console.log('BookInfo', '没有从书架数据库中查到该章节，可能是尚未放入书架;');
                            const is_save_to_bookshelf = confirm('阅读章节内容，需要先将本书放入书架，是否放入书架？');
                            if (is_save_to_bookshelf) {
                                await this.saveBookInfoToDatabase();
                                chapter_item = await BookshelfManager.getChapterItemByChapterUrl(_chapter_url);
                            } else {
                                return;
                            }
                        }
                        const c_index = chapter_item.c_index;
                        await BookshelfManager.setBookReadingChapterIndex(this.book_info_url, c_index);
                        const encode_str = Base64.encodeNoEqualsSign(this.book_info_url);
                        emitAddPageEvent('content-reader-' + encode_str, '阅读-' + this.info_data.name, ChapterContent, {
                            site_url: this.site_url, book_name: this.info_data.name, book_info_url: this.book_info_url, from_page: 'bookinfo'
                        });
                    }
                }),
                new Text({ text: `${is_save == 0 ? "尚未缓存" : "已缓存"}` })
            ]
        });
    }

    /** 获取书籍详情信息，如果没有找到，返回null*/
    async getBookInfoData(fouce_by_network = false) {
        let book_info_data = null;
        /* 1、获取对应的书源 */
        const book_source = await this.getBookSource();
        if (!book_source) { return; /* 如果书源没有找到，则直接退出 */ }
        /* 2、判断书籍详情页面的from_page是search还是bookshelf */
        if (this.from_page == 'bookshelf' && fouce_by_network == false) {
            /* 从书架打开的详情页面 */
            /* 从数据库获取书籍的详情 */
            book_info_data = await BookshelfManager.getBookInfoByInfoUrl(this.book_info_url);
            // book_info_data = book_info_res[0];
        } else if (this.from_page == 'search' || fouce_by_network) {
            /* 从搜索页面打开的详情页面 或 需要强行获取网络详情数据 */
            /* 需要网络请求书籍详情数据 */
            try {
                book_info_data = await book_source.info(this.book_info_url);
            } catch (error) {
                console.log(error);
                alert("异常：网络爬取书籍详情信息失败，book_info_url = " + this.book_info_url);
                book_info_data = null;
            }
        } else {
            alert("异常：书籍详情页的getBookInfoData方法执行在没有考虑到的情况中")
        }
        console.log('BookInfo', '获取书籍信息：');
        console.log(book_info_data);
        return book_info_data;
    }
    /** 获取章节列表，如果存在异常，返回null，如果没有获取到，返回空数组[] */
    async getChapterList() {
        /* 1、检查书籍详情数据，如果没有，那么没有必要请求章节列表 */
        if (!this.info_data) { return null; }
        let chapter_list = null;
        /* 2、获取对应的书源 */
        const book_source = await this.getBookSource();
        if (!book_source) { return null; /* 如果书源没有找到，则直接退出 */ }
        /* 3、获取书籍的详情 */
        if (this.from_page == 'bookshelf') {
            /* 在数据库中找到对应的章节列表 */
            chapter_list = await BookshelfManager.getChapterListByInfoUrl(this.book_info_url);
        } else {
            /* 尝试网络请求 崭新的章节列表 */
            chapter_list = await book_source.chapter_list(this.info_data?.chapter_list_url, this.info_data);
        }
        return chapter_list;
    }
    /** 获取本书的书源，如果没有找到，返回null */
    async getBookSource() {
        let source = null;
        if (this.book_source) {
            source = this.book_source;
        } else {
            const _book_source = await BookSourceManager.getBookSourceObj(this.site_url);
            if (_book_source) {
                source = _book_source
                this.book_source = source; /* 将书源缓存入页面 */
            } else {
                alert('BookInfo 异常：无法找到该书籍对应的书源, info_url = ' + this.book_info_url);
                source = null;
            }
        }
        return source;
    }
}
/** 书源列表界面 */
export class BookSource extends PaneContent {
    constructor(id, param) {
        super(id, param);
    }

    start() {
        this.source_table = new Table({
            columns: ['名称', '站点', '是否启用', '操作'],
            children: []
        });
        this.add_btn = new Button({
            text: "添加书源",
            class_list: ['text-nowrap', 'btn-primary'],
            onclick: async () => {
                /** 添加书源按钮点击后弹出输入框，将书源json粘贴进去，点击确定提交 */
                this.openSourceEditerDialog();
            }
        });
        const component = new VBox({
            children: [
                new HBox({ children: [this.add_btn], class_list: ['justify-content-end'] }),
                new VBox({ children: [this.source_table], class_list: ['flex-grow-1'] })
            ]
        });
        this.dom = component.html();

        /** 初始化数据库 */
        this.updateBookSourceTable();
    }
    /** 刷新书源列表 */
    async updateBookSourceTable() {
        console.log('刷新书源列表信息');
        const res = await BookSourceManager.getAllBookSource();
        this.source_table.children = [];
        for (const source of res) {
            const { name, site_url, is_use } = source;
            const row = this.createBookSourceTableRow(name, site_url, is_use);
            this.source_table.children.push(row);
        }
        this.source_table.update();
    }
    createBookSourceTableRow(name, site_url, is_use) {
        return new TableRow({
            children: [
                name,
                site_url,
                this.createBookSourceStateSwitches(site_url, is_use),
                new HBox({
                    children: [
                        this.createBookSourceEditerButton(site_url, name),
                        this.createBookSourceDeleteButton(site_url),
                    ]
                })
            ]
        });
    }
    /** 创建书源是否启用的开关 */
    createBookSourceStateSwitches(site_url, is_use) {
        return new Switches({
            is_checked: (is_use == 1 ? true : false),
            onclick: async (_is_checked) => {
                BookSourceManager.updateBookSourceIsUse(site_url, _is_checked);
            }
        });
    }
    /** 创建书源编辑按钮 */
    createBookSourceEditerButton(site_url, name) {
        return new Button({
            text: '编辑',
            class_list: ['text-nowrap', 'btn-primary', 'btn-sm'],
            onclick: async () => {
                this.openSourceEditerDialog(site_url);
            }
        });
    }
    createBookSourceDeleteButton(site_url) {
        return new Button({
            text: '删除',
            class_list: ['text-nowrap', 'btn-danger', 'btn-sm'],
            onclick: async () => {
                await BookSourceManager.deleteBookSourceBySiteUrl(site_url);
                this.updateBookSourceTable();
            }
        });
    }
    async openSourceEditerDialog(site_url) {
        /** 创建编辑结构 */
        const dialog = document.createElement('dialog');
        const textarea = document.createElement('textarea');
        const br = document.createElement('br');
        const br2 = document.createElement('br');
        const ok_btn = document.createElement('button');
        const cancel_btn = document.createElement('button');
        const read_txt_file_btn = document.createElement('button'); 
        
        textarea.rows = 8;
        textarea.cols = 40; 
        ok_btn.textContent = ' 确定 ';
        cancel_btn.textContent = ' 取消 ';
        read_txt_file_btn.textContent = ' 读取文本文件 '; 

        ok_btn.onclick = async () => {
            let source_data = null;
            const text = textarea.value;
            try {
                const _s = BookSourceManager.createBookSourceByScript(text);
                console.log('BookSource', '读取代码文本，生成书源：', _s?.name);
                if (_s?.name && _s?.site) {
                    source_data = { site_url: _s.site, name: _s.name, is_use: 1, script: text }
                } else {
                    alert('[BookSource] 读取书源代码文本异常，没有找到书源的name 和 site返回值');
                    source_data = null;
                }
            } catch (error) {
                console.log('BookSource', '创建书源失败：');
                console.error(error);
                source_data = null;
            }
            /** 更新 或 新增 书源 */
            if (source_data && Object.keys(source_data).length > 0) {
                await BookSourceManager.createSource(source_data);
            }
            dialog.close();
        }

        cancel_btn.onclick = () => {
            dialog.close();
        }
        read_txt_file_btn.onclick = async () => {
            const {is_ok,text} = await local.readTextFile();
            if(is_ok){
                console.log('BookSource', '读取到文本：', text);
                textarea.value = text; 
            }
        }

        dialog.append(read_txt_file_btn, br, textarea, br2, ok_btn, cancel_btn);

        /* 判断是否为新增书源，如果不是，则将之前的内容 */
        if (site_url && site_url.length && site_url.length > 0) {
            const res = await BookSourceManager.getBookSourceDataBySiteUrl(site_url);
            const context = res[0].script;
            textarea.value = context;
        }

        document.body.append(dialog);
        dialog.showModal();
        dialog.onclose = () => {
            document.body.removeChild(dialog);
            this.updateBookSourceTable();
        }
    }


}
/** 小说章节内容界面  1、需要网络请求数据 2、从数据库读取数据 来源：从首页书架跳转、从书籍详情跳转 */
export class ChapterContent extends PaneContent {
    constructor(id, param) { super(id, param); }
    start() {
        /* 传入的参数 { site_url, book_name, book_info_url, from_page } */
        this.site_url = this.param?.site_url;
        this.book_name = this.param?.book_name;
        this.book_info_url = this.param?.book_info_url;
        this.from_page = this.param?.from_page; /* 书籍详情页面是从哪个页面打开的？如果是bookinfo，那么就是从书籍详情跳转而来，如果是bookshelf，那么就是从首页书架跳转而来 */
        /* 页面元素 */
        this.book_name_dom = new Text({ text: `《${this.book_name}》` });
        this.chapter_name_dom = new Text({ text: '章节名待加载...' });
        this.chapter_content_dom = new Text({ text: '章节内容待加载...' });
        this.next_chapter_btn = this.createNextChapterButton();
        this.prev_chapter_btn = this.createPrevChapterButton();
        this.next_chapter_foot_btn = this.createNextChapterButton();
        this.prev_chapter_foot_btn = this.createPrevChapterButton();
        const component = new VBox({
            children: [
                new HBox({ children: [this.book_name_dom, this.chapter_name_dom], class_list: ['justify-content-center'] }),
                new HBox({ children: [this.prev_chapter_btn, this.next_chapter_btn], class_list: ['justify-content-around'] }),
                this.chapter_content_dom,
                new HBox({ children: [this.prev_chapter_foot_btn, this.next_chapter_foot_btn], class_list: ['justify-content-around'] })
            ]
        });
        this.dom = component.html();

        /* 参数 */
        this.book_source = null;
        this.chapter_list_len = -1;

        /* 刷新内容页面 */
        this.updateChapterContent();
    }

    onPageShow() {
        console.log("检测打开小说内容界面的事件发生，更新小说界面");
        this.updateChapterContent();
    }

    /** 更新 */
    async updateChapterContent() {
        console.log('ChapterContent', '开始更新书源');
        const source = await this.getBookSource();
        const book_info = await BookshelfManager.getBookInfoByInfoUrl(this.book_info_url);
        if (source && book_info) {
            this.disableNextPrevButton();
            const reading_chapter_index = book_info['reading_chapter_index'] || 0;
            const { chapter_url, chapter_name, book_info_url, site_url, c_index, is_save, content } = await BookshelfManager.getChapterItem(this.book_info_url, reading_chapter_index);
            if (is_save != 1) {
                /* 当前章节尚未保存内容或保存状态异常，则将内容通过网路请求，并存入数据库中 */
                // console.log('ChapterContent', '开始获取章节文本内容');
                const _chapter_content = await source.chapter_content(chapter_url);
                console.log('ChapterContent', '成功获取章节文本，文本长度：', _chapter_content.length);
                this.chapter_content_dom.dom.innerText = _chapter_content;
                BookshelfManager.saveChapterContent(chapter_url, _chapter_content);
            } else {
                /* 当前章节在数据库中保存着，直接取出来 */
                const _chapter_content = content;
                this.chapter_content_dom.dom.innerText = _chapter_content;
            }
            this.chapter_name_dom.update(chapter_name);
            this.enableNextPrevButton();
        } else {
            console.error('ChapterContent', '获取书源 或者 书籍信息失败');
            console.log('ChapterContent', "souce = ", source);
            console.log('ChapterContent', "book_info = ", book_info);
        }
    }

    /** 创建“下一章”按钮 */
    createNextChapterButton() {
        return new Button({
            text: '下一章',
            class_list: ['text-nowrap', 'btn-primary', 'btn-sm'],
            onclick: async () => {
                console.log('ChapterContent', `《${this.book_name_dom.text}》点击了下一章按钮，当前详情页面来源：${this.from_page}`);
                try {
                    const book_info = await BookshelfManager.getBookInfoByInfoUrl(this.book_info_url);
                    const _chapter_num = await this.getChapterNum();
                    if (_chapter_num > 0) {
                        const next_reading_chapter_index = (Number(book_info['reading_chapter_index']) || 0) + 1; /* 下一个章节的索引 */
                        if (next_reading_chapter_index < _chapter_num) {
                            /** 下一章可以被获取到 */
                            await BookshelfManager.setBookReadingChapterIndex(this.book_info_url, next_reading_chapter_index);
                            await this.updateChapterContent();
                            emitViewScrollTopEvent();
                        }
                    }
                } catch (error) {
                    console.log("请求下一章数据失败");
                    console.log(error);
                    alert('请求下一章失败 ' + error);
                    this.enableNextPrevButton();
                }
            }
        });
    }

    /** 创建“上一章”按钮 */
    createPrevChapterButton() {
        return new Button({
            text: '上一章',
            class_list: ['text-nowrap', 'btn-primary', 'btn-sm'],
            onclick: async () => {
                console.log('ChapterContent', `《${this.book_name_dom.text}》点击了下一章按钮，当前详情页面来源：${this.from_page}`);
                // this.disableNextPrevButton();
                try {
                    const book_info = await BookshelfManager.getBookInfoByInfoUrl(this.book_info_url);
                    const next_reading_chapter_index = (Number(book_info['reading_chapter_index']) || 0) - 1; /* 上一个章节的索引 */
                    if (next_reading_chapter_index >= 0) {
                        /** 上一章可以被获取到 */
                        await BookshelfManager.setBookReadingChapterIndex(this.book_info_url, next_reading_chapter_index);
                        await this.updateChapterContent();
                        emitViewScrollTopEvent();
                    }
                } catch (error) {
                    console.log("请求上一章数据失败");
                    console.log(error);
                    alert('请求上一章失败 ' + error);
                    this.enableNextPrevButton();
                }
                // this.enableNextPrevButton();
            }
        });
    }
    /**
     * 获取本书的章节数量
     * @returns {Number}
     */
    async getChapterNum() {
        if (this.chapter_list_len > 0) { return this.chapter_list_len; }
        const chapter_list = await BookshelfManager.getChapterListByInfoUrl(this.book_info_url);
        const list_len = chapter_list.length;
        this.chapter_list_len = list_len;
        return list_len;
    }

    /** 禁用下一章 和  上一章的按钮 */
    disableNextPrevButton() {
        this.next_chapter_btn.disable();
        this.next_chapter_foot_btn.disable();
        this.prev_chapter_btn.disable();
        this.prev_chapter_foot_btn.disable();
    }
    /** 生效下一章 和  上一章的按钮 */
    enableNextPrevButton() {
        this.next_chapter_btn.enable();
        this.next_chapter_foot_btn.enable();
        this.prev_chapter_btn.enable();
        this.prev_chapter_foot_btn.enable();
    }

    /** 获取本书的书源，如果没有找到，返回null */
    async getBookSource() {
        let source = null;
        if (this.book_source) {
            source = this.book_source;
        } else {
            const book_source_obj = await BookSourceManager.getBookSourceObj(this.site_url);
            console.log('ChapterContent', this.site_url + ' 从数据库获取书源：', book_source_obj);
            if (book_source_obj) {
                this.book_source = book_source_obj; /* 将书源缓存入页面 */
                source = book_source_obj;
            } else {
                alert('异常：无法找到该书籍对应的书源, info_url = ' + this.book_info_url);
                source = null;
            }
        }
        return source;
    }
}
/** 缓存管理器界面 */
export class CacheManager extends PaneContent {
    constructor(id, param) { super(id, param) }
    start() {
        this.rand_num = Math.floor(Math.random() * 10000)
        this.cache_table = new Table({
            columns: ['书名', '缓存进度', '来源', '操作'],
            children: []
        });
        // this.downloading_chapter_text = new Text({ text: "正在缓存：无" });
        this.component = new VBox({
            children: [
                // this.downloading_chapter_text,
                // new Text({ text: "* 大概会是一个管理小说章节缓存的界面（下载、清空、导出）" }),
                this.cache_table,
            ]
        });
        this.dom = this.component.html();
        this.download_data = {};
        this.updateCacheInfo().then(() => {
            console.log("CacheManager", '首次刷新完毕，开始循环扫描');
            /** 清理之前的缓存定时执行器 */
            if (window.downloader_id) {
                clearInterval(window.downloader_id);
            }
            console.log('CacheManager', '创建定时执行器'); 
            window.downloader_id = setInterval(async () => {
                console.log('CacheManager', this.rand_num, '扫描是否有正想要缓存章节的书：', JSON.stringify(this.download_data));
                const book_url_key_list = Object.keys(this.download_data);
                if (book_url_key_list.length > 0) {
                    let have_update = false;
                    for (const url_key of book_url_key_list) {
                        const book = this.download_data[url_key];
                        if (book?.is_downloading && book?.downloading_chapter_url == null) {
                            /** 找到了书籍 且该书处于可以缓存的状态，并且这个书还没有正在缓存的章节，找一个尚未缓存的章节进行缓存 */
                            const chapter = await BookshelfManager.getOneNoSaveChapter(url_key);
                            if (chapter) {
                                console.log('CacheManager', '开始下载：', chapter?.chapter_url, chapter?.chapter_name);
                                try {
                                    book.downloading_chapter_url = chapter.chapter_url;
                                    const source = await BookSourceManager.getBookSourceObj(chapter.site_url);
                                    const new_chapter_content = await source.chapter_content(chapter.chapter_url);
                                    await BookshelfManager.saveChapterContent(chapter.chapter_url, new_chapter_content);
                                    have_update = true;
                                } catch (error) {
                                    console.log("CacheManager", '下载失败：' + chapter.chapter_url);
                                    console.log(error);
                                } finally {
                                    book.downloading_chapter_url = null;
                                }
                            }
                        }
                    }
                    if (have_update) {
                        await this.updateCacheInfo();
                    }
                }
            }, 5000);
        });
    }

    onClose() {
        if (window.downloader_id) {
            console.log('CacheManager', this.rand_num, '关闭定时执行器', window.downloader_id);
            clearInterval(window.downloader_id);
        }
    }

    /** 更新缓存界面信息 */
    async updateCacheInfo() {
        const book_save_no_save_num_map = await BookshelfManager.getAllBookChapterNum();  //
        this.book_list = await BookshelfManager.getAllBook();
        this.cache_table.children = [];
        for (const book of this.book_list) {
            const { book_info_url, site_url, name, author, latest_chapter, intro, reading_chapter_index, chapter_num } = book;
            // const chapter_list = await BookshelfManager.getChapterListByInfoUrl(book_info_url);
            /** 初始化下载缓存数据 */
            if (!this.download_data[book_info_url]) {
                this.download_data[book_info_url] = {
                    is_downloading: false,
                    downloading_chapter_url: null,
                }
            }
            /** 获取当前书籍是否正在下载 */
            const is_downloading = this.download_data[book_info_url].is_downloading;
            /** 获取有多少章节已经保存了 */
            const { save, no_save } = book_save_no_save_num_map[book_info_url];
            let save_chapter_num = save;  //0;
            /** 获取该书的章节总数 */
            const chapter_list_len = save + no_save; // chapter_list.length;
            /** 站点信息 */
            const site_str = site_url || '书籍的书源丢失了';
            /** 创建该书籍的缓存数据 */
            const row = this.createCacheTableRow(site_url, book_info_url, name, save_chapter_num, chapter_list_len, site_str, is_downloading);
            this.cache_table.children.push(row);
        }
        this.cache_table.update();
    }
    /** 创建缓存书籍列表 */
    createCacheTableRow(site_url, book_info_url, book_name, save_chapter_num, chapter_list_len, source_name, is_downloading) {
        return new TableRow({
            children: [
                `《${book_name}》`,
                `${save_chapter_num}/${chapter_list_len}`,
                source_name,
                new HBox({
                    children: [
                        this.createStartStopDownloadButton(site_url, book_info_url, is_downloading),
                        this.createSaveToLocalButton(site_url, book_info_url, book_name, save_chapter_num, chapter_list_len), 
                    ]
                }),
            ]
        });
    }
    /** 创建开始和暂停下载的按钮 */
    createStartStopDownloadButton(site_url, book_info_url, is_downloading) {
        return new Button({
            text: is_downloading ? '暂停缓存' : '开始缓存',
            class_list: ['text-nowrap', 'btn-primary', 'btn-sm'],
            onclick: (ev) => {
                const old_downloading_state = this.download_data[book_info_url].is_downloading
                this.download_data[book_info_url].is_downloading = old_downloading_state ? false : true;
                // this.updateCacheInfo();
                ev.target.textContent = this.download_data[book_info_url].is_downloading ? '暂停缓存' : '开始缓存';
            }
        });
    }
    /** 创建保存网址 */
    createSaveToLocalButton(site_url, book_info_url, book_name, save_chapter_num, chapter_list_len) {
        return new Button({
            text: '导出本地',
            class_list: ['text-nowrap', 'btn-primary', 'btn-sm'],
            onclick: async (ev) => {
                if (save_chapter_num < chapter_list_len) {
                    const is_ignore_completed = confirm(`《${book_name}》还有${chapter_list_len - save_chapter_num}个章节尚未缓存，继续导出将忽略没有缓存的章节，是否继续？`);
                    if (is_ignore_completed == false) {
                        return;
                    }
                }
                const chapter_list = await BookshelfManager.getSavedChapterListByInfoUrl(book_info_url);
                const content_list = [];
                for (let i = 0; i < chapter_list.length; i++) {
                    const chapter = chapter_list[i];
                    const { chapter_name, content } = chapter;
                    content_list.push(`${chapter_name}\n${content}`); 
                }
                const save_content = content_list.join('\n\n'); 
                const {is_ok, file_path} = await local.saveBook(book_name, save_content); 
                if(is_ok){
                    alert(`《${book_name}》保存书籍成功，文件路径：${file_path}`);
                }else {
                    alert(`《${book_name}》保存失败`);
                }
            }
        });

    }
}
/** 应用关于界面 */
export class AppAbout extends PaneContent {
    constructor(id) {
        super(id);
    }
    start() {
        const {name, version} = local.getAppData(); 
        this.component = new VBox({
            children: [
                new Text({ text: "* 应用名称：" + name }),
                new Text({ text: "* 应用版本: " + version }),
                new Text({ text: "* 应用介绍: 这是一个管理、阅读网络小说的爬虫工具，需要配置书源才能使用。" }),
                new Text({ text: "* 作者: ty" }),
                new Text({ text: "* 项目地址: https://github.com/yincolor/novel_worm" }),
                new Text({ text: "* 开源协议: GNU Affero General Public License v3.0" }),
                new Text({ text: '* 客户端组件版本: ' }),
                new Text({ text: `* -- Electron: ${local.electronVersion()}` }),
                new Text({ text: `* -- Chromium: ${local.chromeVersion()}` }),
                new Text({ text: `* -- Node: ${local.nodeVersion()}` }),
                new Text({ text: `* -- V8: ${local.v8Version()}` }),
            ]
        });
        this.dom = this.component.html();
    }
}
/** 应用帮助界面 */
export class AppHelp extends PaneContent {
    constructor(id) {
        super(id);
    }
    start() {
        this.component = new VBox({
            children: [
                new Text({ text: "* 1、本软件和【阅读3.0】一样也是爬取盗版小说网站的小说，不过因为使用electron编写，因此和【阅读】的书源并不兼容。" }),
                new Text({ text: "* 2、因为electron的安全管理已经被关闭了（只有这样才能实现跨域访问），书源在执行时拥有控制整个应用的权限，不当使用书源极有可能会破坏整个应用，因此请小心检查任何陌生的书源后再使用。" }),
                new Text({ text: `* 3、书源其实就是js的代码片段，这段代码必须以此结尾：“return { name, site, search, info, chapter_list, chapter_content }; ”` }),
                new Text({ text: `* 在源码目录下，有书源的例子可以参考：src/renderer/test/书源*.js` }),
                new Text({ text: `* 书源在执行时会获得一个变量“args”，存放着一些预制的方法：` }),
                new Text({ text: `* -- async openIframe(src_url, timeout = 7000) 返回一个打开src_url网站的iframe对象，当加载时间超过timeout毫秒后，不管是否已经加载成功，都会返回这个iframe对象` }),
                new Text({ text: `* -- closeIframe(iframeObj) 将传入的iframe对象关闭，清理openIframe创建的iframe元素` }),
                new Text({ text: `* -- parserToHtml(html_content) 将传入的html_content字符串转换为HTML document对象` }),
                new Text({ text: `* -- asleep(timeout) 可以在异步async函数中执行，强制延时等待timeout毫秒的时间再向下执行` }),
                new Text({ text: `* -- async openPostIframe(post_url, data, timeout) openIframe的post请求版本，data是post的请求数据，目前只支持一维的键值对结构` }),
                new Text({ text: `* -- closePostIframe(iframe) closeIframe方法的POST请求版本，和openPostIframe配合的` }),
            ]
        });
        this.dom = this.component.html();
    }
}