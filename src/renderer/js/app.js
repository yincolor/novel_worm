import { TabbedManager } from './Tabbed.js';
import { PaneContent, MainPage, SearchList, BookSource, BookInfo, CacheManager, AppHelp, AppAbout } from './PaneContent.js';

const tabbedManager = new TabbedManager('page-tabs', 'page-view');

/** 添加页面 */
function createPage(id, name, content) {
    if (!(id && name)) return -1;
    const is_created = tabbedManager.create(id, name, (new content(id)) );
    if (!is_created) return -2;
    return 1;
}

/** 左侧导航栏按钮点击后设置选中状态 */
function mainNavActiveItem(id) {
    const new_el = document.getElementById(id);
    const old_active_el = document.getElementById('main-nav').getElementsByClassName('nav-link active')[0];
    if (old_active_el != new_el) {
        if (old_active_el) {
            old_active_el.classList.remove('active');
        }
        new_el.classList.add('active');
    }
}

function Main() {
    window.win_name = "小说蠕虫的主窗口，由TY编写"; 
    
    /** 设置左侧导航栏的点击响应 */
    document.getElementById('main-page').onclick = () => { 
        createPage('main-page', '我的书架', MainPage); 
        mainNavActiveItem('main-page'); 
    }
    document.getElementById('search-list').onclick = () => { 
        createPage('search-list', '小说搜索', SearchList);
        mainNavActiveItem('search-list'); 
    }; 
    document.getElementById('book-source-manage').onclick = () => { 
        createPage('book-source-manage', '书源管理', BookSource); 
        mainNavActiveItem('book-source-manage'); 
    }
    document.getElementById('cache-manage').onclick = () => { 
        createPage('cache-manage', '缓存管理', CacheManager); 
        mainNavActiveItem('cache-manage'); 
    }
    document.getElementById('app-help').onclick = () => { 
        createPage('app-help', '帮助', AppHelp); 
    }
    document.getElementById('app-about').onclick = () => { 
        createPage('app-about', '关于本软件', AppAbout); 
    }
    document.getElementById('app-reload').onclick = () => {  
        local.reload(); 
    }
    document.getElementById('app-dev-tools').onclick = () => { 
        local.devTools(); 
    }
    document.getElementById('app-quit').onclick = () => { 
        local.quit(); 
    }
    document.getElementById('tabbar-scroller-left-btn').onclick = () => { 
        tabbedManager.moveTabsShowView('left'); 
    }
    document.getElementById('tabbar-scroller-right-btn').onclick = () => { 
        tabbedManager.moveTabsShowView('right'); 
    }

    /*监听新增页面事件*/
    document.addEventListener('add-page', (ev) => {
        console.log(ev);
        const { id, name, content } = ev.detail;
        const param = ev.detail?.param; 
        const is_created = tabbedManager.create(id, name, (new content(id, param)) );
        if (is_created) {
            console.log("Main",'创建页面成功', `id=${id} name=${name}`);
            // tabbedManager.setContent(id, new content(id, param));
        }
    });
    /** 监听关闭页面事件 */
    document.addEventListener('close-page', (ev) => {
        const { id } = ev.detail;
        tabbedManager.removeItemById(id);
    });
    /** 监听页面滚动到顶部的事件，操作page-view滚动到顶部 */
    document.addEventListener('view-scroll-top', ( )=>{
        console.log("操作滚动到顶部");
        document.getElementById('page-view').scrollTop = 0 ; 
    })
    console.log('Main', '创建初始页面 - main_page');
    createPage('main-page', '我的书架', MainPage);
    mainNavActiveItem('main-page');
};
Main();