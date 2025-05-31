import { Buffer } from 'buffer';
window.Buffer = Buffer;

const Scaffolding = require('@turbowarp/scaffolding/with-music');
import { isPaused, setPaused, onPauseChanged, setup, singleStep, getRunningThread } from "./module.js";

const vscode = acquireVsCodeApi();
const stageWrapper = document.getElementById('stage-wrapper');
import { ScratchThread } from './common.ts';

const scaffolding = new Scaffolding.Scaffolding();
window.scaffolding = scaffolding;
scaffolding.width = 480;
scaffolding.height = 360;
scaffolding.resizeMode = 'preserve-ratio'; // or 'dynamic-resize' or 'stretch'
scaffolding.editableLists = false;
scaffolding.shouldConnectPeripherals = true;
scaffolding.usePackagedRuntime = false;

scaffolding.setup();

scaffolding.vm.runtime.compilerOptions = { enabled: false, warpTimer: false };

var newThreadId = 1;

const _pushThread = scaffolding.vm.runtime._pushThread;
scaffolding.vm.runtime._pushThread = function (...args) {
  vscode.postMessage({ message: 'startThread', data: new ScratchThread({target: args[1], stack: [args[0]], debugId: newThreadId}) });
  newThreadId += 1;
  return _pushThread.apply(this, args);
};

function makeThreadId(thread) {
  return thread.target.getName() + ": " + thread.topBlock;
}

function createIds() {
  scaffolding.vm.runtime.threads.forEach((thread) => {
    if (thread.debugId === undefined) {
      thread.debugId = newThreadId;
      newThreadId += 1;
    }
  });
}

function sendThreads() {
  createIds();
  var threads = [];
  scaffolding.vm.runtime.threads.forEach(thread => {
    threads.push(new ScratchThread(thread));
  });
  vscode.postMessage({ message: 'threads', data: threads });
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
    console.log("webview message: ", event);

    switch (message.command) {
      case 'shutdown':
        vm.stopAll();
        break;
      case 'loadSB3':
        scaffolding.loadProject(message.data)
          .then(() => scaffolding.greenFlag());
        break;
      case 'getThreads':
        sendThreads();
        break;
      case 'pause':
        setPaused(true);
        
        sendThreads();
        vscode.postMessage({ message: 'stopped', data: 'pause' });
        break;
      case 'continue':
        setPaused(false);
        break;
      case 'step':
        singleStep();
        sendThreads();
        vscode.postMessage({ message: 'stepped', data: getRunningThread().debugId });
        break;
    }
  });

  vscode.postMessage({ message: 'webviewLoaded', data: undefined });
});