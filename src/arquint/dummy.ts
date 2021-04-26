import { LayoutDagNode } from "../dag/node";

export class DummyNode extends LayoutDagNode<undefined, undefined> {
  columnIndex?: number;
  x0?: number;
  x1?: number;
  y0?: number;
  y1?: number;

  constructor() {
    super(undefined);
  }
}
