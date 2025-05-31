import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

import {
  LoggingDebugSession,
  InitializedEvent,
  TerminatedEvent,
  Thread,
  ThreadEvent,
  StoppedEvent,
  StackFrame,
  Source,
} from "@vscode/debugadapter";
import { DebugProtocol } from "@vscode/debugprotocol";
import * as jszip from "jszip";
import { ScratchThread } from "./common";

export class GoboscriptInlineDebugSession extends LoggingDebugSession {
  panel: vscode.WebviewPanel;
  context: vscode.ExtensionContext;
  _keepAlive?: NodeJS.Timeout;

  webviewLoaded: Boolean = false;
  _loadSB3?: NodeJS.Timeout;

  vmThreads: { [id: number]: ScratchThread } = {};

  diagnostics: any;

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

    this.panel.webview.onDidReceiveMessage((message) => {
      this.handleWebviewMessage(message);
    });
  }

  getSourceLocation(sprite: string, blockId: string) {
    if (this.diagnostics.sprites_diagnostics[sprite].debug_info.blocks['"' + blockId + '"'] === undefined) {
      return undefined;
    }
    var range = this.diagnostics.sprites_diagnostics[sprite].debug_info.blocks['"' + blockId + '"'];
    var path = this.diagnostics.sprites_diagnostics[sprite].translation_unit.path;
    var content = fs.readFileSync(path, {encoding: 'utf-8'}).slice(0, range.start);
    const lines = (content.match(/\n/g) || '').length + 1;

    return {
      path: path,
      linenum: lines,
    };
  }

  handleWebviewMessage(message: any) {
    console.log("ext message: ", message.message);
    switch (message.message) {
      case "webviewLoaded":
        this.webviewLoaded = true;
        break;
      case "stepped":
      case "stopped":
        for (var id in this.vmThreads) {
          var event = new StoppedEvent(id, this.vmThreads[id].id);
          this.sendEvent(event);
        }
        break;
      case "startThread":
        this.vmThreads[message.data.id] = message.data;
        this.sendEvent(new ThreadEvent("started", message.data.id));
        break;
      case "threads":
        message.data.forEach((thread: ScratchThread) => {
          this.vmThreads[thread.id] = thread;
        });
    }
  }

  protected initializeRequest(
    response: DebugProtocol.InitializeResponse,
    args: DebugProtocol.InitializeRequestArguments
  ): void {
    response.body = response.body || {};
    response.body.supportsConfigurationDoneRequest = true;
    response.body.supportSuspendDebuggee = true;
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
          vscode.workspace.fs
            .readFile(vscode.Uri.file((args as any).project))
            .then((content) => {
              jszip.loadAsync(content).then((zip) => {
                this.diagnostics = zip!
                  .file("artifact.json")!
                  .async("string")
                  .then((data) => {
                    this.diagnostics = JSON.parse(data);
                  });

                this.panel.webview.postMessage({
                  command: "loadSB3",
                  data: content.buffer,
                });
              });
            });
        }
      }, 500);
    }
    this.sendResponse(response);
  }

  protected threadsRequest(
    response: DebugProtocol.ThreadsResponse,
    request?: DebugProtocol.Request
  ): void {
    response.body = response.body || {};
    response.body.threads = [];

    for (const id in this.vmThreads) {
      response.body.threads.push(new Thread(this.vmThreads[id].id, id));
    }

    this.sendResponse(response);
  }

  protected pauseRequest(
    response: DebugProtocol.PauseResponse,
    args: DebugProtocol.PauseArguments,
    request?: DebugProtocol.Request
  ): void {
    // TODO: PauseArguments supplies a thread id. Should we allow individual threads to be paused?
    this.panel.webview.postMessage({
      command: "pause",
      data: undefined,
    });

    this.sendResponse(response);
  }

  protected nextRequest(
    response: DebugProtocol.NextResponse,
    args: DebugProtocol.NextArguments,
    request?: DebugProtocol.Request
  ): void {
    this.panel.webview.postMessage({ command: "step", data: args.granularity });
    this.sendResponse(response);
  }

  protected continueRequest(
    response: DebugProtocol.ContinueResponse,
    args: DebugProtocol.ContinueArguments,
    request?: DebugProtocol.Request
  ): void {
    this.panel.webview.postMessage({
      command: "continue",
      data: undefined,
    });

    this.sendResponse(response);
  }

  protected stackTraceRequest(
    response: DebugProtocol.StackTraceResponse,
    args: DebugProtocol.StackTraceArguments,
    request?: DebugProtocol.Request
  ): void {
    response.body = response.body || {};
    response.body.stackFrames = [];
    if (args.threadId in this.vmThreads) {
      for (const [block, id] of this.vmThreads[args.threadId].stack) {
        var source = this.getSourceLocation(this.vmThreads[args.threadId].sprite, block);
        if (source === undefined) {
            continue;
        }
        
        response.body.stackFrames.push(
          new StackFrame(
            id,
            "name",
            new Source(path.basename(source.path), source.path),
            source.linenum
          )
        );
      }
    }

    response.body.stackFrames.reverse();

    this.sendResponse(response);
  }

  protected disconnectRequest(
    response: DebugProtocol.DisconnectResponse,
    args: DebugProtocol.DisconnectArguments
  ): void {
    console.log("shutting down vm...");
    this.panel.webview.postMessage({ command: "shutdown", data: undefined });
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
      <button id="pause-btn">pause</button>
      <br>
      <div id="stage-wrapper" style="position: absolute; left: 5px; right: 5px; top: 30px; bottom: 5px;"></div>
      <script src="${scriptUri}"></script>
    </body>
    </html>
  `;
}

function makeThreadId(thread: any) {
  return thread.target.getName() + ": " + thread.topBlock;
}
