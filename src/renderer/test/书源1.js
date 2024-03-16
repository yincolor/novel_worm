console.log('书源获得参数：', args);

const _name = "笔趣阁5200";
const _site = "http://www.biqu5200.net";

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
            resolve(i);
        }
        i.onerror = (ev) => {
            console.log('iframe加载失败', src);
            console.log(ev);
            resolve(null);
        }
        document.getElementById('iframe-container').append(i);
        setTimeout(() => {
            console.log("iframe加载网页超时了，无论如何都返回iframe对象");
            resolve(i); 
        }, delay);
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
        try {
            const html_content = await get('http://www.biqu5200.net/modules/article/search.php?searchkey=' + key, 'gbk');
            const doc = parserToHtml(html_content);
            const list = doc.getElementById('hotcontent')?.getElementsByTagName('table')[0]?.getElementsByTagName('tbody')[0]?.getElementsByTagName('tr');
            if (list && list.length > 0) {
                for (let i = 1; i < list.length; i++) {
                    const item = list[i];
                    const name = item.children[0].children[0].textContent;
                    const author = item.children[2].textContent;
                    const latest_chapter = item.children[1].children[0].textContent;
                    const info_url = _site + item.children[0].children[0].getAttribute('href');
                    res_list.push({ name, author, latest_chapter, info_url });
                }
            }

        } catch (error) {
            console.log(error);
        }
    }
    console.log(res_list);
    return res_list;
}

/**
 * 书籍详情逻辑
 * @param {String} url 
 */
async function _info(url) {
    let res = {};
    if (url.startsWith(_site)) {
        const html_content = await get(url, 'gbk');
        const doc = parserToHtml(html_content);
        const info = doc.getElementById('info');
        const name = info.children[0].textContent;
        const author = info.children[1].textContent.replace('作    者：', '');
        const latest_chapter = "";
        const intro = doc.getElementById('intro').textContent.trim();
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
        const l = doc.getElementById('list')?.children[0]?.children;
        if (l) {
            let t = 0;
            for (const item of l) {
                if (item.nodeName == 'DT') {
                    t += 1;
                    continue;
                }
                if (t > 1) {
                    const chapter_name = item.getElementsByTagName('a')[0]?.textContent;
                    const chapter_url = _site + item.getElementsByTagName('a')[0]?.getAttribute('href');
                    chapter_list.push({ chapter_name, chapter_url });
                }
            }
        }
    } else {
        chapter_list = [];
    }
    return chapter_list;
}

async function _chapter_content(chapter_url) {
    // const html_content = await get(chapter_url, 'gbk');
    // console.log("书源1", '打开一个iframe, url = '+ chapter_url);
    iframe = await openIframe(chapter_url, 3000);
    const doc = iframe.contentDocument;
    // console.log(doc);
    // const doc = parserToHtml(html_content);
    const chapter_content = doc?.getElementById('content')?.innerText;
    // console.log('获取内容：', chapter_content);
    closeIframe(iframe);
    // console.log("关闭iframe");
    return chapter_content;
}

return {
    name: _name,
    site: _site,
    search: _search,
    info: _info,
    chapter_list: _chapter_list,
    chapter_content: _chapter_content,
}; 