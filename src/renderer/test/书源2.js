
const _name = "笔趣阁新";
const _site = "https://m.ydxrf.com";

async function get(url, encode = 'utf8') {
    const res = await fetch(url);
    const decoder = new TextDecoder(encode);
    const buffer = await res.arrayBuffer();
    const data = decoder.decode(buffer);
    return data;
}

function parserToHtml(html_content) {
    const parser = new DOMParser();
    return parser.parseFromString(html_content, 'text/html');
}

async function asleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

async function openIframe(src, delay=7000) {
    const i = document.createElement('iframe');
    i.height = 0;
    i.width = 0;
    i.src = src;
    return new Promise((resolve, _) => {
        i.onload = async (ev) => {
            console.log("iframe加载完毕", src);
            console.log(ev);
            await asleep(delay);
            resolve(i);
        }
        i.onerror = (ev) => {
            console.log('iframe加载失败', src);
            console.log(ev);
            resolve(null);
        }
        document.getElementById('iframe-container').append(i);
    });
}
function closeIframe(iframe) {
    if (iframe) {
        document.getElementById('iframe-container').removeChild(iframe);
    }
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
            iframe = await openIframe('https://m.ydxrf.com/user/search.html?q=' + key);
            const dom = iframe.contentDocument;
            const list = dom.getElementById('main')?.getElementsByClassName('info')
            if (list && list.length > 0) {
                for (let i = 1; i < list.length; i++) {
                    const item = list[i];
                    const name = item.children[0]?.textContent?.trim()
                    const author = item.children[1].textContent.trim().replace('作者：', '')
                    const latest_chapter = "";
                    const href = item?.parentNode?.getAttribute('href')
                    if (href) {
                        const info_url = _site + href;
                        res_list.push({ name, author, latest_chapter, info_url });
                    }
                }
            }
        } catch (error) {
            console.log(error);
        } finally {
            closeIframe(iframe);
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
    let res = {};
    if (url.startsWith(_site)) {
        const html_content = await get(url);
        const doc = parserToHtml(html_content);
        const info = doc.getElementsByClassName('info')[0];
        const name = info?.children[0]?.textContent;
        const author = info?.children[1]?.textContent?.replace('作    者', '');
        const latest_chapter = info?.getElementsByClassName('newest')[0]?.getElementsByTagName('a')[0]?.textContent?.trim();
        const intro = doc.getElementsByClassName('introbar')[0]?.textContent?.trim().replace('简介：',''); 
        res = { name, author, latest_chapter, intro, chapter_list_req_type: 'HTML_CONTENT', chapter_list_url: html_content }
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
        const doc = parserToHtml(chapter_list_url);
        const l = doc.getElementsByClassName('chapter')[0]?.children
        if (l) {
            for (const item of l) {
                const chapter_name = item.getElementsByTagName('a')[0]?.textContent;
                const chapter_url = _site + item.getElementsByTagName('a')[0]?.getAttribute('href');
                chapter_list.push({ chapter_name, chapter_url });
            }
        }
    } else {
        chapter_list = [];
    }
    return chapter_list;
}


return {
    name: _name,
    site: _site,
    search: _search,
    info: _info,
    chapter_list:_chapter_list, 
    test: async () => {
        const i = await openIframe('https://m.ydxrf.com/user/search.html?q=%E9%BB%91%E6%9A%97');
        console.log(i);
    }
}; 