import { Buffer } from 'buffer';
window.Buffer = Buffer;

const Scaffolding = require('@turbowarp/scaffolding/with-music');
import { isPaused, setPaused, onPauseChanged, setup } from "./module.js";

const vscode = acquireVsCodeApi();
const stageWrapper = document.getElementById('stage-wrapper');

const scaffolding = new Scaffolding.Scaffolding();
window.scaffolding = scaffolding;
scaffolding.width = 480;
scaffolding.height = 360;
scaffolding.resizeMode = 'preserve-ratio'; // or 'dynamic-resize' or 'stretch'
scaffolding.editableLists = false;
scaffolding.shouldConnectPeripherals = true;
scaffolding.usePackagedRuntime = false;

scaffolding.setup();
setup(scaffolding.vm);
scaffolding.appendTo(stageWrapper);

document.getElementById("start-btn").onclick = () => {
  scaffolding.greenFlag();
};
document.getElementById("stop-btn").onclick = () => {
  scaffolding.stopAll();
};
document.getElementById("pause-btn").onclick = () => {
  setPaused(!isPaused());
};

window.addEventListener('load', event => {
  window.addEventListener('message', event => {
    const message = event.data;

    switch (message.command) {
      case 'shutdown':
        vm.stopAll();
        break;
      case 'loadSB3':
        scaffolding.loadProject(message.data)
          .then(() => scaffolding.greenFlag());
        break;
      case 'pause':
        console.log('webview paused');
        setPaused(true);
        vscode.postMessage({ message: 'stopped', data: 'pause' });
        break;
      case 'continue':
        setPaused(false);
        break;
      case 'step':
        setPaused(true);
        
    }
  });

  vscode.postMessage({ message: 'webviewLoaded', data: undefined });
});