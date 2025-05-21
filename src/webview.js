import { Buffer } from 'buffer';
window.Buffer = Buffer;

import VirtualMachine from 'scratch-vm';
import Renderer from 'scratch-render';
import AudioEngine from 'scratch-audio';
const {ScratchStorage, DataFormat} = require('scratch-storage');
const {BitmapAdapter} = require('scratch-svg-renderer');
const validate = require('scratch-parser');

const vscode = acquireVsCodeApi();
const canvas = document.getElementById('scratch-canvas');

const vm = new VirtualMachine();
const renderer = new Renderer(canvas);
const audioEngine = new AudioEngine();
const storage = new ScratchStorage();

storage.addWebSource([storage.AssetType.ImageBitmap, storage.AssetType.Sound], (asset) => {
  return fetch(asset.assetId)
    .then((res) => res.ok ? res.arrayBuffer() : Promise.reject(new Error("Asset not found")))
    .then((data) => ({ data }));
});

storage.addHelper(DataFormat.PNG, {
  decode: (data) => renderer._getBitmapAdapter().decode(data)
});

storage.addHelper(DataFormat.SVG, {
  decode: (data) => new TextDecoder().decode(data)
});

vm.attachRenderer(renderer);
vm.attachV2BitmapAdapter(new BitmapAdapter());
vm.attachAudioEngine(audioEngine);
vm.attachStorage(storage);
vm.start();

document.getElementById("start-btn").onclick = () => {
    vm.greenFlag();
};
document.getElementById("stop-btn").onclick = () => {
    vm.stopAll();
};

vscode.postMessage("test message");

window.addEventListener('load', event => {
  window.addEventListener('message', event => {
    const message = event.data;
    
    switch (message.command) {
      case 'shutdown':
      vm.stopAll();
      break;
      case 'loadSB3':
        vm.loadProject(message.data)
        .then(() => vm.greenFlag());
      }
  });

  vscode.postMessage({message: 'webviewLoaded', data: undefined});
});