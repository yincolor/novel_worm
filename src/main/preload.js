const { contextBridge,ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('local', {
    nodeVersion: () => process.versions.node,
    chromeVersion: () => process.versions.chrome,
    electronVersion: () => process.versions.electron,
    v8Version: ()=> process.versions.v8, 
    quit: ()=>{ipcRenderer.send('app-quit');},
    reload: ()=>{ipcRenderer.send('app-reload');},
    devTools: ()=>{ipcRenderer.send('dev-tools')},
});