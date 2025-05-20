import * as vscode from "vscode";
import * as path from "path";
import { GoboscriptDebugAdapterFactory } from './debugAdapter';
const GoboscriptAdapter = require('./debugAdapter');

export function activate(context: vscode.ExtensionContext) {
  // const panel = vscode.window.createWebviewPanel(
  //   "scratchPlayer",
  //   "Scratch VM Player",
  //   vscode.ViewColumn.One,
  //   {
  //     enableScripts: true,
  //     localResourceRoots: [
  //       vscode.Uri.file(path.join(context.extensionPath, "dist")),
  //     ],
  //   }
  // );
  // const disposable = vscode.commands.registerCommand(
  //   "goboscript.helloWorld",
  //   () => {
  //     const scriptUri = panel.webview.asWebviewUri(
  //       vscode.Uri.file(
  //         path.join(context.extensionPath, "dist", "webview.bundle.js")
  //       )
  //     );

  //     panel.webview.html = getWebviewContent(scriptUri);
  //   }
  // );

  // context.subscriptions.push(disposable);

  const factory = new GoboscriptDebugAdapterFactory();
  factory.attach(context);
  context.subscriptions.push(
    vscode.debug.registerDebugAdapterDescriptorFactory('goboscript', factory)
  );
}

function test(abc: string) {
  console.log(abc);
}
