import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { GoboscriptDebugAdapterFactory } from "./debugAdapter";
const GoboscriptAdapter = require("./debugAdapter");

export function activate(context: vscode.ExtensionContext) {
  const taskProvider = vscode.tasks.registerTaskProvider("goboscript", {
    provideTasks: async () => {
      return [
        new vscode.Task(
          { type: "goboscript" },
          vscode.TaskScope.Workspace,
          "build",
          "goboscript",
          new vscode.ShellExecution("goboscript build --output project.sb3")
        ),
      ];
    },
    resolveTask(_task: vscode.Task): vscode.Task | undefined {
      return _task;
    },
  });

  context.subscriptions.push(taskProvider);

  const factory = new GoboscriptDebugAdapterFactory();
  factory.attach(context);
  context.subscriptions.push(
    vscode.debug.registerDebugAdapterDescriptorFactory("goboscript", factory)
  );
}
