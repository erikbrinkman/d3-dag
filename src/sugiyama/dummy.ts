import { LayoutDagNode } from "../dag/node";

export class DummyNode extends LayoutDagNode<undefined, undefined> {
  x?: number;
  y?: number;

  constructor(id: string) {
    super(id, undefined);
  }
}
