// console.log('书源获得参数：', args);

const _name = "梦幻小说网";
const _site = "http://www.pan5.org";

async function get(url, encode = 'utf8') {
    const res = await fetch(url);
    const decoder = new TextDecoder(encode);
    const buffer = await res.arrayBuffer();
    const data = decoder.decode(buffer);
    return data;
}

async function postSearchForm(url, key) {
    const formData = new FormData();
    formData.append('key', key);
    const res = await fetch(url, {
        method: 'post',
        body: formData,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:123.0) Gecko/20100101 Firefox/123.0',
        }
    });
    return await res.text();
}

function parserToHtml(html_content) {
    const parser = new DOMParser();
    return parser.parseFromString(html_content, 'text/html');
}

// async function asleep(ms) {
//     return new Promise((resolve) => {
//         setTimeout(resolve, ms);
//     });
// }

// async function openIframe(src, delay = 7000) {
//     const i = document.createElement('iframe');
//     i.height = 0;
//     i.width = 0;
//     i.src = src;
//     return new Promise((resolve, _) => {
//         i.onload = async (ev) => {
//             console.log("iframe加载完毕", src);
//             console.log(ev);
//             resolve(i);
//         }
//         i.onerror = (ev) => {
//             console.log('iframe加载失败', src);
//             console.log(ev);
//             resolve(null);
//         }
//         document.getElementById('iframe-container').append(i);
//         setTimeout(() => {
//             console.log("iframe加载网页超时了，无论如何都返回iframe对象");
//             resolve(i);
//         }, delay);
//     });
// }
// function closeIframe(iframe) {
//     if (iframe) {
//         document.getElementById('iframe-container').removeChild(iframe);
//     }
// }

/** 
 * 搜索逻辑 
 * 
 */
async function _search(key) {
    const res_list = [];
    if (!!key) {
        // console.log("梦幻小说网", '创建iframe', args.openPostIframe);
        const iframe = await args.openPostIframe('http://www.pan5.org/search.php', {key: key}, 2000);
        try {
            // console.log("梦幻小说网", '获取iframe节点');
            const doc = iframe.contentDocument;
            // console.log("梦幻小说网", '获取搜索列表');
            const list = doc.getElementsByClassName('secd-rank-list');
            if (list && list.length && list.length > 0) {
                for (let i = 1; i < list.length; i++) {
                    const item = list[i];
                    // console.log("梦幻小说网", item);
                    const name = item?.children[0]?.children[1]?.children[0]?.textContent;
                    const author = item?.children[0]?.children[1]?.children[1]?.children[0]?.textContent;
                    const latest_chapter = item?.children[0]?.children[1]?.children[4]?.children[0]?.textContent?.replace('最近更新 ', '')?.trim();
                    const info_url = _site + item?.children[0]?.children[1]?.children[0]?.getAttribute('href');/*http://www.pan5.org + /xs/51793.html*/
                    res_list.push({ name, author, latest_chapter, info_url });
                }
            }
        } catch (error) {
            console.log(error);
        }
        args.closePostIframe(iframe);
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
        const html_content = await get(url);
        const doc = args.parserToHtml(html_content);
        const title = doc.getElementsByClassName('title')[0]
        const name = title?.children[0]?.textContent;
        const author = title?.children[1].textContent;
        const latest_chapter = doc?.getElementsByClassName('title')[1]?.children[0]?.children[0]?.textContent;
        const intro = title?.parentNode?.children[3]?.textContent?.trim()?.replace('内容介绍：', '');
        const chapter_list_url = _site + doc?.getElementsByClassName('header')[0]?.children[0]?.children[1]?.getAttribute('href');
        res = { name, author, latest_chapter, intro, chapter_list_req_type: 'GET', chapter_list_url }
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
        const html_content = await get(chapter_list_url);
        const doc = args.parserToHtml(html_content);
        const lis = doc.getElementById('listsss')?.children;
        if (lis) {
            /** 首先进行排序 */
            const chapter_group_list = [];
            for (const li of lis) {
                const index_str = li.getAttribute('data-id');
                if (index_str) {
                    const index = Number(index_str);
                    chapter_group_list[index] = li;
                }
            }
            console.log(chapter_group_list);
            for (const group_item of chapter_group_list) {
                if (group_item) {
                    const items = group_item.children;
                    for (const item of items) {
                        const chapter_name = item.getElementsByTagName('a')[0]?.textContent;
                        const chapter_url = chapter_list_url + item.getElementsByTagName('a')[0]?.getAttribute('href');
                        chapter_list.push({ chapter_name, chapter_url });
                    }
                }
            }
        }
    } else {
        chapter_list = [];
    }
    return chapter_list;
}

/**
 * 章节内容逻辑
 * @param {String} chapter_url 章节内容网址 
 * @returns 
 */
async function _chapter_content(chapter_url) {
    iframe = await args.openIframe(chapter_url, 2000);
    const doc = iframe.contentDocument;
    const chapter_content = doc?.getElementById('txt').innerText
    args.closeIframe(iframe);
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