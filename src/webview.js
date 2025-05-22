import { Buffer } from 'buffer';
window.Buffer = Buffer;

const Scaffolding = require('@turbowarp/scaffolding/with-music');

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
scaffolding.appendTo(stageWrapper);

document.getElementById("start-btn").onclick = () => {
  scaffolding.greenFlag();
};
document.getElementById("stop-btn").onclick = () => {
  scaffolding.stopAll();
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
    }
  });

  vscode.postMessage({ message: 'webviewLoaded', data: undefined });
});