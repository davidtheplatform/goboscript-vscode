import * as vscode from "vscode";
import * as path from "path";
import * as fs from 'fs';

import {
  LoggingDebugSession,
  InitializedEvent,
  TerminatedEvent,
  StoppedEvent,
} from "@vscode/debugadapter";
const VirtualMachine = require("scratch-vm");
import { DebugProtocol } from "@vscode/debugprotocol";

export class GoboscriptInlineDebugSession extends LoggingDebugSession {
  panel: vscode.WebviewPanel;
  context: vscode.ExtensionContext;
  _keepAlive?: NodeJS.Timeout;

  webviewLoaded: Boolean = false;
  _loadSB3?: NodeJS.Timeout;

  constructor(context: vscode.ExtensionContext) {
    super("debug_log.txt");
    this.setDebuggerLinesStartAt1(true);
    this.setDebuggerColumnsStartAt1(true);

    this.context = context;
    
    this.panel = vscode.window.createWebviewPanel(
      "scratchPlayer",
      "Scratch Player",
      vscode.ViewColumn.Two,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(context.extensionPath, "dist")),
        ],
      }
    );

    const scriptUri = this.panel.webview.asWebviewUri(
      vscode.Uri.file(
        path.join(context.extensionPath, "dist", "webview.bundle.js")
      )
    );

    this.panel.webview.html = getWebviewContent(scriptUri);
    
    this.panel.webview.onDidReceiveMessage(message => {
      this.handleWebviewMessage(message);
    });
  }

  handleWebviewMessage(message: any) {
    switch (message.message) {
      case 'webviewLoaded':
        this.webviewLoaded = true;
        break;
    }
  }

  protected initializeRequest(
    response: DebugProtocol.InitializeResponse,
    args: DebugProtocol.InitializeRequestArguments
  ): void {
    response.body = response.body || {};
    response.body.supportsConfigurationDoneRequest = true;
    this.sendResponse(response);
    this.sendEvent(new InitializedEvent());
  }

  protected launchRequest(
    response: DebugProtocol.LaunchResponse,
    args: DebugProtocol.LaunchRequestArguments
  ): void {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
      vscode.window.showErrorMessage("No workspace folder open");
    } else {
      this._loadSB3 = setInterval(() => {
        if (this.webviewLoaded) {
          clearInterval(this._loadSB3);
          vscode.workspace.fs.readFile(vscode.Uri.file((args as any).project))
          .then((content) => {
            this.panel.webview.postMessage({command: 'loadSB3', data: content.buffer});
          });
        }
      }, 500);
    }
    this.sendResponse(response);

    // this._keepAlive = setInterval(() => {
    //   console.log("Adapter still alive...");
    // }, 1000);
  }

  protected disconnectRequest(
    response: DebugProtocol.DisconnectResponse,
    args: DebugProtocol.DisconnectArguments
  ): void {
    console.log("shutting down vm...");
    this.panel.webview.postMessage({command: 'shutdown', data: undefined});
    this.panel.dispose();
    clearInterval(this._keepAlive);
    this.sendResponse(response);
    this.sendEvent(new TerminatedEvent());
  }
}

export class GoboscriptDebugAdapterFactory
  implements vscode.DebugAdapterDescriptorFactory
{
  value: any;
  attach(value: vscode.ExtensionContext) {
    this.value = value;
  }
  createDebugAdapterDescriptor(): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {
    return new vscode.DebugAdapterInlineImplementation(
      new GoboscriptInlineDebugSession(this.value)
    );
  }
}

function getWebviewContent(scriptUri: vscode.Uri) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
	  
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Scratch VM</title>
    </head>
    <body style="padding: 5px;">
      <button id="start-btn">start</button>
      <button id="stop-btn">stop</button>
      <br>
      <div id="stage-wrapper" style="position: absolute; left: 5px; right: 5px; top: 30px; bottom: 5px;"></div>
      <script src="${scriptUri}"></script>
    </body>
    </html>
  `;
}