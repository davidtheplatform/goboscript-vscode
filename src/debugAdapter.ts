import * as vscode from "vscode";
import * as path from "path";

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
  _keepAlive?: NodeJS.Timeout;

  constructor(context: vscode.ExtensionContext) {
    super("inline-debug.txt");
    this.setDebuggerLinesStartAt1(true);
    this.setDebuggerColumnsStartAt1(true);

    this.panel = vscode.window.createWebviewPanel(
      "scratchPlayer",
      "Scratch VM Player",
      vscode.ViewColumn.One,
      {
        enableScripts: true,
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

    this.panel.webview.onDidReceiveMessage((message: any) => {
      console.log("got message: ", message);
    });
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
    console.log("adsf");

    this.sendResponse(response);
    // this.sendEvent(new StoppedEvent("entry", 1));
    // setTimeout(() => this.sendEvent(new TerminatedEvent()), 2000);

    this._keepAlive = setInterval(() => {
      console.log("Adapter still alive...");
    }, 1000);
  }

  protected disconnectRequest(
    response: DebugProtocol.DisconnectResponse,
    args: DebugProtocol.DisconnectArguments
  ): void {
    console.log("disconnect request");
    clearInterval(this._keepAlive);
    this.sendResponse(response);
    this.sendEvent(new TerminatedEvent());
  }

  protected terminateRequest(
    response: DebugProtocol.DisconnectResponse,
    args: DebugProtocol.DisconnectArguments
  ): void {
    console.log("terminate request");
    this.panel.webview.postMessage({command: 'shutdown', data: undefined});
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
    <body>
      <canvas id="scratch-canvas" width="480" height="360"></canvas>
      <button id="start-btn">start</button>
      <button id="stop-btn">stop</button>
      <script src="${scriptUri}">
    </body>
    </html>
  `;
}
