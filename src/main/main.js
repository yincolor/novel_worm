const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');

/** 解锁跨域 */
app.commandLine.appendSwitch('disable-site-isolation-trials'); 
/** 禁用菜单 */
Menu.setApplicationMenu(null); 


let mainWindow; /* 主窗口 */
function createWindow(html_filename) {
    const path = require('path');
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600, 
        minWidth: 640,
        minHeight: 360,
        icon: "res/icon.png",
        webPreferences: {
            webSecurity:false, /* 禁用同源策略，让窗口也能request小说网站的URL */
            preload: path.join(__dirname, './preload.js') ,
            devTools:true /* 开启调试窗口 */
        }
    });
    // win.setMenu(null); /* 取消菜单栏 */
    mainWindow.loadFile('src/renderer/' + html_filename);
    // mainWindow.openDevTools();
}


// console.log("定义应用程序事件回调", (new Date()).getTime());
app.on('ready', () => {
    // console.log("开始创建主窗口渲染进程", (new Date()).getTime());
    createWindow("index.html");
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) { createWindow(); }
    })
});
app.on('window-all-closed', () => {
    // console.log("窗口关闭, 应用程序退出. ", (new Date()).getTime());
    if (process.platform !== 'darwin') { 
        app.quit(); 
    }
}); 
ipcMain.on('app-quit', ()=>{app.quit();});
ipcMain.on('app-reload', ()=>{ mainWindow?.reload(); });
ipcMain.on('dev-tools', ()=>{ mainWindow?.openDevTools() })