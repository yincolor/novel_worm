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
ipcMain.on('dev-tools', ()=>{ mainWindow?.openDevTools() });
ipcMain.handle('save-book',async (ev, book_name, save_content) => {
    const os = require('os');
    const path = require('path'); 
    console.log(`保存书籍《${book_name}》`);
    const default_path = os.homedir(); 
    const {canceled, filePath} = await dialog.showSaveDialog(mainWindow, {
        title:'保存书籍', 
        defaultPath: path.join(default_path, `《${book_name}》.txt`), 
        message:"选择保存的文件路径"
    }); 
    console.log(`选择的保存路径为：${(!canceled)?filePath:'没有选择文件保存路径'}`);
    if(!canceled){
        let is_saved = false;
        try {
            const fs = require('fs'); 
            fs.writeFileSync(filePath, save_content, {encoding:'utf-8'});
            is_saved = true; 
        } catch (error) {
            is_saved = false;
            console.log('保存小说失败：'); 
            console.log(error);
        }
        if(is_saved){
            return {is_ok: true, file_path: filePath};
        }else {
            return {is_ok: false, file_path: null}; 
        }
    }else {
        return {is_ok: false, file_path: null};
    }    
});