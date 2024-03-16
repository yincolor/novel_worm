/**
 * 书源管理器 全静态，可以在页面任意地点调用
 */
export class BookSourceManager {

    static source_db_name = 'ty_book_source_db';
    static tbl_book_source = {
        name: 'book_source',
        columns: {
            site_url: { primaryKey: true, notNull: true, dataType: "string" },
            name: { notNull: true, dataType: "string" },
            is_use: { notNull: true, dataType: "number", default: 1 },
            script: { notNull: true, dataType: "string" }
        }
    };
    static db_mata = {
        name: this.source_db_name,
        tables: [this.tbl_book_source]
    };
    static connection = new JsStore.Connection();

    /** 判断是否已经初始化了，如果初始化尚未进行，就优先初始化 */
    static is_init = false;
    static init_num = 0;

    /** 传递给书源的参数 */
    static book_source_args = {
        openIframe: async function (src, timeout = 7000) {
            const i = document.createElement('iframe');
            i.height = 0; i.width = 0;
            i.src = src;
            return new Promise((resolve, _) => {
                i.onload = async () => {
                    console.log("iframe加载完毕", src);
                    resolve(i);
                }
                i.onerror = () => {
                    console.log('iframe加载失败', src);
                    resolve(null);
                }
                document.getElementById('iframe-container').append(i);
                setTimeout(() => {
                    console.log("iframe加载网页超时了，无论如何都返回iframe对象");
                    resolve(i);
                }, timeout);
            });
        },
        closeIframe: function (iframe) { if (iframe) { document.getElementById('iframe-container').removeChild(iframe); } },
        parserToHtml: function (html_content) { return (new DOMParser()).parseFromString(html_content, 'text/html'); },
        asleep: async function (ms) { return new Promise((resolve) => { setTimeout(resolve, ms); }); }
    };

    /** 初始化书源管理器 */
    static async init() {
        console.log('Database', "初始化 - 书源管理器");
        const is_created = await this.connection.initDb(this.db_mata);
        if (is_created) {
            console.log('Database', "书源管理器-数据库创建成功");
        }
        console.log('Database', "书源管理器-数据库初始化成功");
        this.is_init = true;
        this.init_num += 1;
    }

    static async updateBookSourceIsUse(_site_url, _is_use_new) {
        const noOfRowsUpdated = await this.connection.update({
            in: this.tbl_book_source.name,
            set: { is_use: _is_use_new ? 1 : 0 },
            where: { site_url: _site_url }
        });
        console.log('Database', _site_url + " 改变书源状态：" + noOfRowsUpdated);
    }

    static async getAllBookSource() {
        const res = await this.connection.select({
            from: this.tbl_book_source.name
        });
        return res;
    }

    // static async getEnableBookSource() {
    //     const res = await this.connection.select({
    //         from: this.tbl_book_source.name,
    //         where: { is_use: 1 }
    //     });
    //     return res;
    // }

    /**
     * 获取生效的书源对象
     * @returns 
     */
    static async getEnableBookSourceObj() {
        const res = await this.connection.select({
            from: this.tbl_book_source.name,
            where: { is_use: 1 }
        });
        if (res && res.length) {
            const source_list = []
            for (const item of res) {
                const { name, site_url, script } = item;
                try {
                    // const func = new Function('args = arguments[0]; \n' + script);
                    // const source = func(this.book_source_args);

                    source_list.push(this.createBookSourceByScript(script));
                } catch (error) {
                    alert(`获取生效书源失败，书源：${name} - ${site_url}`);
                    console.log(error);
                }
            }
            return source_list;
        } else {
            return [];
        }
    }

    /**
     * 根据书源的代码文本生成书源
     * @param {String} source_script 书源的代码文本
     * @returns 
     */
    static createBookSourceByScript(source_script) {
        const func = new Function('args = arguments[0]; \n' + source_script);
        const source = func(this.book_source_args);
        return source; 
    }

    /**
     * 获取书源在数据库中的信息，通过站点url
     * @param {String} _site_url 站点url 
     * @returns 
     */
    static async getBookSourceDataBySiteUrl(_site_url) {
        if (this.is_init == false) {
            await this.init();
        }
        const res = await this.connection.select({
            from: this.tbl_book_source.name,
            where: { site_url: _site_url }
        });
        return res;
    }

    /**
     * 获取书源对象，经过预处理，直接就可以使用的书源对象
     * @param {String} _site_url 站点url 
     * @returns {Object | null} 书源对象 或者 null
     */
    static async getBookSourceObj(_site_url) {
        const res = await this.connection.select({
            from: this.tbl_book_source.name,
            where: { site_url: _site_url }
        });
        if (res && res.length > 0) {
            const source_script = res[0]?.script;
            const func = new Function('args = arguments[0]; \n' + source_script);
            if (func) {
                return func(this.book_source_args);
            } else {
                return null;
            }
        } else {
            return null;
        }
    }

    static async createSource(source_data) {
        if (this.is_init == false) {
            await this.init();
        }
        const noOfRowsInserted = await this.connection.insert({
            into: this.tbl_book_source.name,
            upsert: true,
            values: [source_data], /* 可以插入多行，但是我不使用 */
        });
    }

    static async deleteBookSourceBySiteUrl(_site_url) {
        await this.connection.remove({
            from: this.tbl_book_source.name,
            where: { site_url: _site_url }
        });
    }
}

/**
 * 书架数据管理器 全静态，可以在页面任意地点调用
 */
export class BookshelfManager {

    static db_name = 'ty_bookshelf_db';
    /** 书籍详情 书籍详情页面的url是主键 */
    static tbl_book_info = {
        name: 't_book_info',
        columns: {
            book_info_url: { primaryKey: true, notNull: true, dataType: "string" },
            site_url: { notNull: true, dataType: "string" },
            name: { notNull: true, dataType: "string" },
            author: { notNull: true, dataType: "string" },
            latest_chapter: { notNull: true, dataType: "string" },
            intro: { notNull: true, dataType: "string" },
            reading_chapter_index: { notNull: true, dataType: 'number', default: 0 } /* 当前正在阅读的章节，如果不设置，默认是0 */
        }
    };
    /** 章节列表 章节内容的url是主键 */
    static tbl_chapter_list = {
        name: 't_chapter_list',
        columns: {
            chapter_url: { primaryKey: true, notNull: true, dataType: "string" },
            chapter_name: { notNull: true, dataType: "string" },
            book_info_url: { notNull: true, dataType: "string" },
            site_url: { notNull: true, dataType: "string" },
            c_index: { notNull: true, dataType: "number" },  /* c_inde 是本章节在书籍中的序号，用于排序 */
            is_save: { notNull: true, dataType: "number" }, /* 内容是否已经保存 0 尚未保存 1 已经保存 */
            content: { notNull: true, dataType: "string" }, /* 章节内容 */
        }
    };

    static db_mata = {
        name: this.db_name,
        tables: [this.tbl_book_info, this.tbl_chapter_list]
    };
    static connection = new JsStore.Connection();

    /** 判断是否已经初始化了，如果初始化尚未进行，就优先初始化 */
    static is_init = false;
    static init_num = 0;

    /** 初始化管理器 */
    static async init() {
        console.log('Database', "初始化 - 书架管理器");
        const is_created = await this.connection.initDb(this.db_mata);
        if (is_created) {
            console.log('Database', "书架管理器创建成功");
        }
        console.log('Database', "书架管理器初始化成功");
        this.is_init = true;
        this.init_num += 1;
    }
    /** 获取全量的书籍信息 */
    static async getAllBook() {
        const book_info_list = await this.connection.select({ from: this.tbl_book_info.name });
        /**
         * @type [{chapter_url, book_info_url}]
         */
        const chapter_list = await this.connection.select({ from: this.tbl_chapter_list.name });
        /** 统计每一本书章节的数量 */
        const count_map = {};
        for (const chapter of chapter_list) {
            const { book_info_url } = chapter;
            if (count_map[book_info_url]) {
                count_map[book_info_url]++;
            } else {
                count_map[book_info_url] = 1;
            }
        }
        for (let i = 0; i < book_info_list.length; i++) {
            const book_info = book_info_list[i];
            const book_info_url = book_info.book_info_url;
            book_info_list[i].chapter_num = count_map[book_info_url] || 0;
        }
        return book_info_list;
    }
    /** 根据书籍详情页面获取书籍（返回一个对象，而不是列表） */
    static async getBookInfoByInfoUrl(_book_info_url) {
        if (this.is_init == false) {
            await this.init();
        }
        const res = await this.connection.select({
            from: this.tbl_book_info.name,
            where: { book_info_url: _book_info_url }
        });
        if (res.length > 0) {
            return res[0];
        } else {
            return null;
        }
    }
    /** 根据书籍详情的URL获取章节列表 */
    static async getChapterListByInfoUrl(_book_info_url) {
        if (this.is_init == false) {
            await this.init();
        }
        const res = await this.connection.select({
            from: this.tbl_chapter_list.name,
            where: { book_info_url: _book_info_url }
        });
        return res;
    }
    /** 根据书籍详情的URL和c_inde获取单个章节 */
    static async getChapterItem(_book_info_url, _c_index) {
        const res = await this.connection.select({
            from: this.tbl_chapter_list.name,
            where: { book_info_url: _book_info_url, c_index: _c_index }
        });
        if (res && res.length > 0) {
            return res[0];
        } else {
            return null;
        }
    }
    /** 根据章节Url获取单个章节 */
    static async getChapterItemByChapterUrl(_chapter_url) {
        const res = await this.connection.select({
            from: this.tbl_chapter_list.name,
            where: { chapter_url: _chapter_url }
        });
        if (res && res.length > 0) {
            return res[0];
        } else {
            return null;
        }
    }
    /**
     * 获取所有书籍的章节数量（已缓存的和未缓存的）
     * @returns {Promise<{ book_info_url: {save, no_save} }>}
     */
    static async getAllBookChapterNum() {
        const res = await this.connection.select({
            from: this.tbl_chapter_list.name,
            aggregate: {
                count: 'chapter_url'
            },
            groupBy: ['book_info_url', 'is_save']
        });
        const m = {};
        for (const r of res) {
            if (!m[r.book_info_url]) {
                m[r.book_info_url] = {
                    save: 0,
                    no_save: 0
                };
            }
            if (r.is_save == 1) {
                m[r.book_info_url].save += r['count(chapter_url)'];
            } else {
                m[r.book_info_url].no_save += r['count(chapter_url)'];
            }
        }
        return m;
    }

    /**
     * 获取一本书中尚未保存内容的章节对象
     * @param {String} book_info_url 
     * @returns {Promise<{chapter_url, chapter_name, book_info_url, site_url, c_index, is_save, content} | null>}
     */
    static async getOneNoSaveChapter(book_info_url) {
        const res = await this.connection.select({
            from: this.tbl_chapter_list.name,
            where: { book_info_url: book_info_url, is_save: 0 },
            limit: 1
        });
        if (res && res.length > 0) {
            return res[0];
        } else {
            return null;
        }
    }
    /**
     * 设置书籍正在阅读的章节索引
     * @param {String} _book_info_url 书籍详情网址 
     * @param {Number} _new_reading_chapter_index 新的正在阅读的章节索引
     */
    static async setBookReadingChapterIndex(_book_info_url, _new_reading_chapter_index) {
        await this.connection.update({
            in: this.tbl_book_info.name,
            set: {
                reading_chapter_index: _new_reading_chapter_index
            },
            where: { book_info_url: _book_info_url }
        });
    }
    /** 保存章节内容，调整保存状态为1（内容已保存） */
    static async saveChapterContent(chapter_url, content) {
        await this.connection.update({
            in: this.tbl_chapter_list.name,
            set: {
                is_save: 1,
                content: content
            },
            where: { chapter_url: chapter_url }
        });
    }
    /** 将书籍数据保存入数据库 */
    static async saveBookInfo(book_info_url, site_url, name, author, latest_chapter, intro, reading_chapter_index = 0) {
        await this.connection.insert({
            into: this.tbl_book_info.name,
            upsert: true,
            values: [{ book_info_url, site_url, name, author, latest_chapter, intro, reading_chapter_index }], /* 可以插入多行，但是我不使用 */
        });
    }
    /** 将章节列表数据保存入数据库 */
    static async saveChapterList(book_info_url, site_url, chapter_url_name_list) {
        const save_list = [];
        if (chapter_url_name_list && chapter_url_name_list.length > 0) {
            for (let i = 0; i < chapter_url_name_list.length; i++) {
                const { chapter_name, chapter_url } = chapter_url_name_list[i];
                save_list.push({ chapter_url, chapter_name, book_info_url, site_url, c_index: i, is_save: 0, content: "" })
            }
            await this.connection.insert({
                into: this.tbl_chapter_list.name,
                upsert: true,
                values: save_list, /* 可以插入多行，但是我不使用 */
            });
        }
    }
    /** 删除书籍 */
    static async deleteBook(book_info_url) {
        const rows_deleted_info = await this.connection.remove({
            from: this.tbl_book_info.name,
            where: {
                book_info_url: book_info_url
            }
        });
        const rows_deleted_chapters = await this.connection.remove({
            from: this.tbl_chapter_list.name,
            where: {
                book_info_url: book_info_url
            }
        });
        console.log('Database', `删除书架的数据：书籍详情${rows_deleted_info}行 章节列表${rows_deleted_chapters}行`);
    }

}

console.log('Database', '首次初始化各种管理器');
/** 首次初始化书源管理器 */
BookSourceManager.init();
/** 首次初始化书架管理器 */
BookshelfManager.init(); 
