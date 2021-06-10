/**
 * You can rearrange raw edge data into a {@link Dag} using {@link connect} to create a
 * default {@link ConnectOperator}.
 *
 * @module
 */
import {
  Dag,
  DagNode,
  LayoutChildLink,
  LayoutDagNode,
  LayoutDagRoot
} from "./node";
import { Up, assert } from "../utils";
import { verifyDag, verifyId } from "./verify";

/**
 * The default node data on dags built using connect
 */
export interface ConnectDatum {
  id: string;
}

/**
 * The interface for getting a node id from data. The function must return an
 * appropriate id for given link data. This operator will only be called once
 * for each data point.
 *
 * `i` will increment in the order links are processed.
 */
export interface IdOperator<LinkDatum = never> {
  (d: LinkDatum, i: number): string;
}

/**
 * The operators that parametrize {@link ConnectOperator}
 */
interface Operators {
  sourceId: IdOperator;
  targetId: IdOperator;
}

type OpLinkDatum<O extends IdOperator> = Parameters<O>[0];
/**
 * The constraint applied to data passed into {@link ConnectOperator}
 * conditioned on its operators.
 */
type OpsLinkDatum<Ops extends Operators> = OpLinkDatum<Ops["sourceId"]> &
  OpLinkDatum<Ops["targetId"]>;

/**
 * An operator that constructs a {@link Dag} from link data.
 *
 * Create a default connect operator with {@link connect}. The accessor for the
 * {@link sourceId | source id string}, {@link targetId | target id string},
 * and whether to allow {@link single} nodes can all be modified.
 *
 * Links in the dag will have the same data as the objects passed in, and nodes
 * will have the ids referenced as either the source or the target.
 */
export interface ConnectOperator<Ops extends Operators> {
  /**
   * Construct a {@link Dag} from the specified data. The data should be an array of
   * data elements that contain info about links in the graph. For example:
   *
   * ```json
   * [
   *   ["Eve", "Cain"],
   *   ["Eve", "Seth"],
   *   ["Seth", "Enos"],
   *   ["Seth", "Noam"],
   *   ["Eve", "Abel"],
   *   ["Eve", "Awan"]
   * ]
   * ```
   */
  <L extends OpsLinkDatum<Ops>>(data: readonly L[]): Dag<ConnectDatum, L>;

  /**
   * Sets the source accessor to the given {@link IdOperator} and returns this
   * {@link ConnectOperator}. This should return the source id of the link
   * data. The default accessor is:
   *
   * ```js
   * function sourceAccessor(link) {
   *   return link[0];
   * }
   * ```
   */
  sourceId<NewId extends IdOperator>(
    id: NewId
  ): ConnectOperator<Up<Ops, { sourceId: NewId }>>;
  /** Gets the current sourceId accessor. */
  sourceId(): Ops["sourceId"];

  /**
   * Sets the target accessor to the given {@link IdOperator} and returns this
   * {@link ConnectOperator}. This should return the target id of the link
   * data. The default accessor is:
   *
   * ```js
   * function sourceAccessor(link) {
   *   return link[1];
   * }
   * ```
   */
  targetId<NewId extends IdOperator>(
    id: NewId
  ): ConnectOperator<Up<Ops, { targetId: NewId }>>;
  /** Gets the current targetId accessor. */
  targetId(): Ops["targetId"];

  /**
   * Sets the allowance for single nodes. If enabled and the source id equals
   * the target id, then a single node with no parents will be created.
   * Otherwise a self loop will be created which will result in an error. Note
   * only single nodes without parents or children need to be specified this
   * way, otherwise any other connection to a node will creat it. (default: false)
   */
  single(val: boolean): ConnectOperator<Ops>;
  /** get the current single node setting. */
  single(): boolean;
}

function buildOperator<Ops extends Operators>(
  options: Ops & { single: boolean }
): ConnectOperator<Ops> {
  function connect<L extends OpsLinkDatum<Ops>>(
    data: readonly L[]
  ): Dag<ConnectDatum, L> {
    assert(data.length, "can't connect empty data");
    const nodes = new Map<string, DagNode<ConnectDatum, L>>();
    const hasParents = new Set<string>();
    for (const [i, datum] of data.entries()) {
      // create dag
      const source = verifyId(options.sourceId(datum, i));
      let sourceNode = nodes.get(source);
      if (sourceNode === undefined) {
        sourceNode = new LayoutDagNode<ConnectDatum, L>({ id: source });
        nodes.set(source, sourceNode);
      }
      const target = verifyId(options.targetId(datum, i));
      let targetNode = nodes.get(target);
      if (targetNode === undefined) {
        targetNode = new LayoutDagNode<ConnectDatum, L>({ id: target });
        nodes.set(target, targetNode);
      }

      if (source !== target || !options.single) {
        sourceNode.dataChildren.push(new LayoutChildLink(targetNode, datum));
        hasParents.add(target);
      }
    }

    const roots: DagNode<ConnectDatum, L>[] = [];
    for (const [id, node] of nodes.entries()) {
      if (!hasParents.has(id)) {
        roots.push(node);
      }
    }
    verifyDag(roots);
    return roots.length > 1 ? new LayoutDagRoot(roots) : roots[0];
  }

  function sourceId(): Ops["sourceId"];
  function sourceId<NI extends IdOperator>(
    id: NI
  ): ConnectOperator<Up<Ops, { sourceId: NI }>>;
  function sourceId<NI extends IdOperator>(
    id?: NI
  ): Ops["sourceId"] | ConnectOperator<Up<Ops, { sourceId: NI }>> {
    if (id === undefined) {
      return options.sourceId;
    } else {
      const { sourceId: _, ...rest } = options;
      return buildOperator({ ...rest, sourceId: id });
    }
  }
  connect.sourceId = sourceId;

  function targetId(): Ops["targetId"];
  function targetId<NI extends IdOperator>(
    id: NI
  ): ConnectOperator<Up<Ops, { targetId: NI }>>;
  function targetId<NI extends IdOperator>(
    id?: NI
  ): Ops["targetId"] | ConnectOperator<Up<Ops, { targetId: NI }>> {
    if (id === undefined) {
      return options.targetId;
    } else {
      const { targetId: _, ...rest } = options;
      return buildOperator({ ...rest, targetId: id });
    }
  }
  connect.targetId = targetId;

  function single(): boolean;
  function single(val: boolean): ConnectOperator<Ops>;
  function single(val?: boolean): boolean | ConnectOperator<Ops> {
    if (val === undefined) {
      return options.single;
    } else {
      return buildOperator({ ...options, single: val });
    }
  }
  connect.single = single;

  return connect;
}

interface ZeroString {
  readonly [0]: string;
}

function isZeroString(d: unknown): d is ZeroString {
  try {
    return typeof (d as ZeroString)[0] === "string";
  } catch {
    return false;
  }
}

function defaultSourceId(d: ZeroString): string {
  assert(
    isZeroString(d),
    `default source id expected datum[0] to be a string but got datum: ${d}`
  );
  return d[0];
}

interface OneString {
  readonly [1]: string;
}

function isOneString(d: unknown): d is OneString {
  try {
    return typeof (d as OneString)[1] === "string";
  } catch {
    return false;
  }
}

function defaultTargetId(d: OneString): string {
  assert(
    isOneString(d),
    `default target id expected datum[1] to be a string but got datum: ${d}`
  );
  return d[1];
}

/**
 * Creates a new {@link ConnectOperator} with the default settings. This is
 * bundled as {@link dagConnect}
 */
export function connect(
  ...args: never[]
): ConnectOperator<{
  sourceId: IdOperator<ZeroString>;
  targetId: IdOperator<OneString>;
}> {
  assert(
    !args.length,
    `got arguments to connect(${args}), but constructor takes no aruguments. ` +
      "These were probably meant as data which should be called as connect()(...)"
  );
  return buildOperator({
    sourceId: defaultSourceId,
    targetId: defaultTargetId,
    single: false
  });
}
