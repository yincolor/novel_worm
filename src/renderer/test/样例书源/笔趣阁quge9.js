
const _name = "笔趣阁quge9";
const _site = "https://m.quge9.cc";

async function get(url, encode = 'utf8') {
    const res = await fetch(url);
    const decoder = new TextDecoder(encode);
    const buffer = await res.arrayBuffer();
    const data = decoder.decode(buffer);
    return data;
}


/** 
 * 搜索逻辑 
 * 
 */
async function _search(key) {
    const res_list = [];
    if (!!key) {
        let iframe = null;
        try {
            /** 创建一个iframe节点请求搜索页面，超时时间设置为3000毫秒 */
            iframe = await args.openIframe('https://m.quge9.cc/s?q=' + key, 1000);
            /** 等待3秒后再去获取iframe的信息 */
            await args.asleep(3000);
            if (iframe) {
                const dom = iframe.contentDocument;
                const list = dom?.getElementsByClassName('item');
                if (list && list.length > 0) {
                    /** 遍历搜索结果的列表元素，获取搜索列表数据 */
                    for (let i = 1; i < list.length; i++) {
                        const item = list[i];
                        const a = item?.children[1].getElementsByTagName('a')[0];
                        const name = a.textContent?.trim();
                        const author = item?.getElementsByTagName('span')[0]?.textContent?.trim()
                        const latest_chapter = "无";
                        const info_url = _site + a?.getAttribute('href');
                        res_list.push({ name, author, latest_chapter, info_url });
                    }
                }
            }
        } catch (error) {
            console.log(error);
        } finally {
            args.closeIframe(iframe);
        }
    }
    console.log(res_list);
    return res_list;
}

/**
 * 
 * @param {String} url 
 */
async function _info(url) {
    let res = null;
    let iframe = null;
    try {
        // const html_content = await get(url);
        iframe = await args.openIframe(url, 2000);
        const doc = iframe.contentDocument;
        const book_box = doc.getElementsByClassName('book_box')[0];
        const name = book_box?.getElementsByClassName('name')[0]?.textContent?.trim();
        const author = book_box?.getElementsByClassName('dd_box')[0]?.children[0]?.textContent?.replace("作者：", '')?.trim();
        const latest_chapter = doc?.getElementsByClassName('book_last')[0]?.children[0]?.getElementsByTagName('dd')[0]?.textContent?.trim();
        const intro = doc?.getElementsByClassName('book_about')[0]?.children[0]?.getElementsByTagName('dd')[0]?.textContent?.replace('展开全部>>', '')?.trim();
        const chapter_list_url = _site + doc?.getElementsByClassName('book_more')[0]?.getElementsByTagName('a')[0]?.getAttribute('href');
        res = { name, author, latest_chapter, intro, chapter_list_req_type: 'GET', chapter_list_url };
    } catch (error) {
        console.error(_name, '请求书籍详情异常：', error);
        res = null;
    } finally {
        args.closeIframe(iframe);
    }
    return res;
}

/**
 * 章节列表逻辑
 * @param {String} chapter_list_url 章节网址 
 * @param {Object} _info_res 书籍缓存
 * @returns 
 */
async function _chapter_list(chapter_list_url, _info_res) {
    let chapter_list = [];
    const chapter_list_req_type = _info_res?.chapter_list_req_type;
    if (_info_res && chapter_list_req_type && chapter_list_req_type == 'GET') {
        console.log(_name, '请求章节网址：', chapter_list_url);
        const html_content = await get(chapter_list_url);
        console.log(html_content);
        const doc = args.parserToHtml(html_content);
        const list = doc.getElementsByTagName('dd');
        console.log(_name, '获取章节元素列表：', list);
        if (list && list.length && list.length > 0) {
            for (const item of list) {
                const a = item.getElementsByTagName('a')[0];
                if (a.getAttribute('href') == '#footer') {
                    continue;
                }
                const chapter_name = a?.textContent;
                /* href 值例如：/wap_html/21853/10597765.html，完整的章节内容网址：https://m.ydxrf.com/wap_html/21853/10597765.html */
                const chapter_url = _site + a?.getAttribute('href');
                console.log(_name, '获得章节：', chapter_name, chapter_url);
                chapter_list.push({ chapter_name, chapter_url });
            }
        }
    } else {
        chapter_list = [];
    }
    return chapter_list;
}

/**
 * 
 * @param {String} chapter_url 
 * @returns 
 */
async function _chapter_content(chapter_url) {
    let cur_request_url = chapter_url;
    let contents = [];
    const max_cycle = 9;
    let cycle = 0;
    do {
        cycle += 1;
        console.log(_name, '请求章节内容网址：', cur_request_url); 
        const html_content = await get(cur_request_url);
        const doc = args.parserToHtml(html_content);
        const str = doc.getElementById('chaptercontent').innerText;
        contents.push(str);
        cur_request_url = _site + doc.getElementById('pb_next').getAttribute('href');
    } while (cur_request_url.indexOf('_') > 0 && cycle <= max_cycle);
    const chapter_content = contents.join('\n');
    return chapter_content;
}

return {
    name: _name,
    site: _site,
    search: _search,
    info: _info,
    chapter_list: _chapter_list,
    chapter_content: _chapter_content
}; 