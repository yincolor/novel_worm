const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('local', {
    nodeVersion: () => process.versions.node,
    chromeVersion: () => process.versions.chrome,
    electronVersion: () => process.versions.electron,
    v8Version: () => process.versions.v8,
    /** 退出应用 */
    quit: () => { ipcRenderer.send('app-quit'); },
    /** 重新加载应用窗口 */
    reload: () => { ipcRenderer.send('app-reload'); },
    /** 打开应用调试窗口 */
    devTools: () => { ipcRenderer.send('dev-tools') },
    /** 保存书籍为本地文本文件 */
    saveBook: async (book_name, content) => {
        const { is_ok, file_path } = await ipcRenderer.invoke('save-book', book_name, content);
        return { is_ok, file_path };
    },
    getAppData: () => {
        return { name: '窃墨蠕虫', version: '0.4.1' };
    }
});