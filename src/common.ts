var newStackframeId: number = 1;

export class ScratchThread {
  // sprite name
  sprite: string;

  // block id, vscode frame id
  stack: [string, number][] = [];

  // vscode thread id
  id: number;

  constructor(thread: any) {
    this.sprite = thread.target.getName();
    this.id = thread.debugId;

    this.updateStack(thread.stack);
  }

  public updateStack(stack: string[]) {
    stack.forEach((frame) => {
      this.stack.push([frame, newStackframeId]);
      newStackframeId += 1;
    });
  }
}