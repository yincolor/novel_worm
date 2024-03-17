
const _name = "笔趣阁新";
const _site = "https://m.ydxrf.com";

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
            iframe = await args.openIframe('https://m.ydxrf.com/user/search.html?q=' + key, 3000); 
            /** 等待3秒后再去获取iframe的信息 */
            await args.asleep(4000); 
            if (iframe) {
                const dom = iframe.contentDocument;
                const search = dom?.getElementsByClassName('search')[0]; 
                // console.log(_name, '获取搜索界面：', search, search.innerHTML); 
                const list = search?.children;
                if (list && list.length > 0) {
                    /** 遍历搜索结果的列表元素，获取搜索列表数据 */
                    for (let i = 1; i < list.length; i++) {
                        const item = list[i];
                        console.log("检测节点类型：", item.nodeType);
                        if (item.nodeName != 'A') {
                            continue;
                        }
                        const name = item?.getElementsByClassName('title')[0]?.textContent?.trim();
                        const author = item?.getElementsByTagName('p')[0]?.textContent?.replace('作者：', '')?.trim();
                        const latest_chapter = "无";
                        const info_url = _site + item?.getAttribute('href');
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
    try {
        const html_content = await get(url);
        const doc = args.parserToHtml(html_content);
        const info = doc?.getElementsByClassName('info')[0];
        const name = info?.children[0]?.textContent;
        const author = info?.children[1]?.textContent?.replace('作    者', '');
        const latest_chapter = info?.getElementsByClassName('newest')[0]?.getElementsByTagName('a')[0]?.textContent?.trim();
        const intro = (doc.getElementsByClassName('introbar')[0]?.textContent?.trim().replace('简介：', '')) || '无介绍';
        res = { name, author, latest_chapter, intro, chapter_list_req_type: 'HTML_CONTENT', chapter_list_url: html_content }; 
    } catch (error) {
        console.error(_name, '请求书籍详情异常：', error); 
        res = null; 
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
    if (_info_res && chapter_list_req_type && chapter_list_req_type == 'HTML_CONTENT') {
        const doc = args.parserToHtml(chapter_list_url);
        const l = doc.getElementsByClassName('chapter')[0]?.children
        if (l) {
            for (const item of l) {
                const a = item.getElementsByTagName('a')[0]; 
                const chapter_name = a?.textContent; 
                /* href 值例如：/wap_html/21853/10597765.html，完整的章节内容网址：https://m.ydxrf.com/wap_html/21853/10597765.html */
                const chapter_url = _site + a?.getAttribute('href');
                chapter_list.push({ chapter_name, chapter_url });
            }
        }
    } else {
        chapter_list = [];
    }
    return chapter_list;
}

async function _chapter_content(chapter_url) {
    // console.log(_site, '打开一个iframe, url = '+ chapter_url);
    iframe = await args.openIframe(chapter_url, 1500);
    await args.asleep(1000); 
    const doc = iframe.contentDocument;
    const chapter_content = doc?.getElementById('text')?.innerText
    // console.log('获取内容：', chapter_content);
    args.closeIframe(iframe);
    // console.log("关闭iframe");
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