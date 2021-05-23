import { LayoutDagNode } from "../dag/node";

export class DummyNode extends LayoutDagNode<undefined, undefined> {
  constructor() {
    super(undefined);
  }
}
