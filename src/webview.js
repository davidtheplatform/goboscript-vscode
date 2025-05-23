import { Buffer } from 'buffer';
window.Buffer = Buffer;

const Scaffolding = require('@turbowarp/scaffolding/with-music');
import { isPaused, setPaused, onPauseChanged, setup, singleStep, getRunningThread } from "./module.js";

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

scaffolding.vm.runtime.compilerOptions = {enabled: false, warpTimer: false}

const _pushThread = scaffolding.vm.runtime._pushThread;
scaffolding.vm.runtime._pushThread = function(...args) {
  vscode.postMessage({ message: 'startThread', data: {blockId: args[0], targetName: args[1].getName()}});
  return _pushThread.apply(this, args);
};

function makeThreadId(thread) {
  return thread.target.getName() + ": " + thread.topBlock;
}

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
      case 'getThreads':
        var threads = [];
        scaffolding.vm.runtime.threads.forEach(thread => {
          threads.push(makeThreadId(thread));
        });
        vscode.postMessage({ message: 'threads', data: threads });
        break;
      case 'pause':
        setPaused(true);
        vscode.postMessage({ message: 'stopped', data: 'pause' });
        break;
      case 'continue':
        setPaused(false);
        break;
      case 'step':
        singleStep();
        vscode.postMessage({ message: 'stepped', data: makeThreadId(getRunningThread()) });
        break;
    }
  });

  vscode.postMessage({ message: 'webviewLoaded', data: undefined });
});