const { app, BrowserWindow } = require('electron');
const path = require('path');
const fork = require('child_process').fork;

let mainWindow;
let serverProcess;

function startServer() {
  // Start the compiled Express server in a background process
  const serverPath = path.join(__dirname, 'server/dist/index.js');
  
  // Set production environment variables for local execution connected to Cloud Atlas
  const env = {
    ...process.env,
    PORT: '5000',
    NODE_ENV: 'production',
    MONGO_URI: 'mongodb://yash011100_db_user:j3K5dtbNGWlv9w5A@ac-bm2n9bk-shard-00-00.pi5rw0x.mongodb.net:27017/convertease?ssl=true&authSource=admin&retryWrites=true&w=majority',
    CLIENT_URL: 'http://localhost:5000',
    STORAGE_PROVIDER: 'local'
  };

  serverProcess = fork(serverPath, [], { env });

  serverProcess.on('message', (msg) => {
    console.log('[Server Process]:', msg);
  });

  serverProcess.on('error', (err) => {
    console.error('Failed to start Express server:', err);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    title: "ConvertEase AI",
    autoHideMenuBar: true
  });

  // Load the local Express server endpoint (which serves our React app)
  // Give the backend server 1.5 seconds to boot up before loading
  setTimeout(() => {
    mainWindow.loadURL('http://localhost:5000');
  }, 1500);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', () => {
  startServer();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (serverProcess) serverProcess.kill();
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

process.on('exit', () => {
  if (serverProcess) serverProcess.kill();
});
