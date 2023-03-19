import { graph, MutGraph, MutGraphNode } from ".";
import { err, U } from "../utils";
import { IdOperator, verifyId } from "./utils";

/**
 * An operator that creates node data from an id
 *
 * The index passed in is the edge index where the id is first seen.
 */
export interface IdNodeDatumOperator<out D = unknown> {
  (id: string, index: number): D;
}

/**
 * The operators that parametrize {@link Connect}
 */
export interface ConnectOps<out N = unknown, in L = never> {
  /** the source id operator */
  sourceId: IdOperator<L>;
  /** the target id operator */
  targetId: IdOperator<L>;
  /** the node datum operator */
  nodeDatum: IdNodeDatumOperator<N>;
}

/**
 * The constraint applied to data passed into {@link Connect}
 * conditioned on its operators.
 */
type ConnectLinkDatum<Ops extends ConnectOps> = Ops extends ConnectOps<
  unknown,
  infer L
>
  ? L
  : never;

export interface Connect<NodeDatum, Ops extends ConnectOps<NodeDatum>> {
  /**
   * An operator that constructs a {@link graph!Graph} from link data.
   *
   * Create a default connect operator with {@link graphConnect}. The accessor for the
   * {@link sourceId | source id string}, {@link targetId | target id string},
   * and whether to allow {@link single} nodes can all be modified.
   *
   * Links in the dag will have the same data as the objects passed in, and nodes
   * will have the ids referenced as either the source or the target.
   *
   * @example
   * ```typescript
   * const data = [ ["parent", "child"] ];
   * const create = graphConnect();
   * const dag = create(data);
   * ```
   *
   * @example
   * ```json
   * [
   *   ["Euler", "Lagrange"],
   *   ["Lagrange", "Fourier"],
   *   ["Fourier", "Dirichlet"],
   *   ["Lagrange", "Poisson"],
   *   ["Laplace", "Poisson"],
   *   ["Poisson", "Dirichlet"]
   * ]
   * ```
   */
  <L extends ConnectLinkDatum<Ops>>(data: readonly L[]): MutGraph<NodeDatum, L>;

  /**
   * Sets the source accessor to the given {@link graph/utils!IdOperator} and returns this
   * Connect. This should return the source id of the link
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
  ): Connect<NodeDatum, U<Ops, "sourceId", NewId>>;
  /** Gets the current sourceId accessor. */
  sourceId(): Ops["sourceId"];

  /**
   * Sets the target accessor to the given {@link graph/utils!IdOperator} and returns this
   * Connect. This should return the target id of the link
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
  ): Connect<NodeDatum, U<Ops, "targetId", NewId>>;
  /** Gets the current targetId accessor. */
  targetId(): Ops["targetId"];

  /**
   * Sets the id node datum  accessor to the given {@link IdNodeDatumOperator} and returns this
   * Connect. This function allows you to decide what data to attach to nodes created via the connect method. The default simple wraps it in an object with an `id` field.
   * data. The default accessor is:
   *
   * ```js
   * function nodeDatumAccessor(id) {
   *   return { id };
   * }
   * ```
   */
  nodeDatum<
    NewNodeDatum,
    NewNodeDatumOp extends IdNodeDatumOperator<NewNodeDatum>
  >(
    data: NewNodeDatumOp & IdNodeDatumOperator<NewNodeDatum>
  ): Connect<NewNodeDatum, U<Ops, "nodeDatum", NewNodeDatumOp>>;
  /** Get the current id node datum operator */
  nodeDatum(): Ops["nodeDatum"];

  /**
   * Sets the allowance for single nodes. If enabled and the source id equals
   * the target id, then a single node with no parents will be created.
   * Otherwise a self loop will be created which will result in an error. Note
   * only single nodes without parents or children need to be specified this
   * way, otherwise any other connection to a node will create it. (default: false)
   */
  single(val: boolean): Connect<NodeDatum, Ops>;
  /** get the current single node setting. */
  single(): boolean;
}

function buildConnect<N, LinkDatum, Ops extends ConnectOps<N, LinkDatum>>(
  operators: Ops & ConnectOps<N, LinkDatum> & { single: boolean }
): Connect<N, Ops> {
  function connect<L extends LinkDatum>(data: readonly L[]): MutGraph<N, L> {
    const connected = graph<N, L>();
    const nodes = new Map<string, MutGraphNode<N, L>>();

    for (const [i, datum] of data.entries()) {
      // create dag
      const source = verifyId(operators.sourceId(datum, i));
      let sourceNode = nodes.get(source);
      if (sourceNode === undefined) {
        sourceNode = connected.node(operators.nodeDatum(source, i));
        nodes.set(source, sourceNode);
      }
      const target = verifyId(operators.targetId(datum, i));
      let targetNode = nodes.get(target);
      if (targetNode === undefined) {
        targetNode = connected.node(operators.nodeDatum(target, i));
        nodes.set(target, targetNode);
      }

      if (source !== target || !operators.single) {
        connected.link(sourceNode, targetNode, datum);
      }
    }

    return connected;
  }

  function sourceId(): Ops["sourceId"];
  function sourceId<NI extends IdOperator>(
    id: NI
  ): Connect<N, U<Ops, "sourceId", NI>>;
  function sourceId<NI extends IdOperator>(
    id?: NI
  ): Ops["sourceId"] | Connect<N, U<Ops, "sourceId", NI>> {
    if (id === undefined) {
      return operators.sourceId;
    } else {
      const { sourceId: _, ...rest } = operators;
      return buildConnect({ ...rest, sourceId: id });
    }
  }
  connect.sourceId = sourceId;

  function targetId(): Ops["targetId"];
  function targetId<NI extends IdOperator>(
    id: NI
  ): Connect<N, U<Ops, "targetId", NI>>;
  function targetId<NI extends IdOperator>(
    id?: NI
  ): Ops["targetId"] | Connect<N, U<Ops, "targetId", NI>> {
    if (id === undefined) {
      return operators.targetId;
    } else {
      const { targetId: _, ...rest } = operators;
      return buildConnect({ ...rest, targetId: id });
    }
  }
  connect.targetId = targetId;

  function nodeDatum(): Ops["nodeDatum"];
  function nodeDatum<NN, ND extends IdNodeDatumOperator<NN>>(
    id: ND
  ): Connect<NN, U<Ops, "nodeDatum", ND>>;
  function nodeDatum<NN, ND extends IdNodeDatumOperator<NN>>(
    id?: ND
  ): Ops["nodeDatum"] | Connect<NN, U<Ops, "nodeDatum", ND>> {
    if (id === undefined) {
      return operators.nodeDatum;
    } else {
      const { nodeDatum: _, ...rest } = operators;
      return buildConnect({ ...rest, nodeDatum: id });
    }
  }
  connect.nodeDatum = nodeDatum;

  function single(): boolean;
  function single(val: boolean): Connect<N, Ops>;
  function single(val?: boolean): boolean | Connect<N, Ops> {
    if (val === undefined) {
      return operators.single;
    } else {
      return buildConnect({ ...operators, single: val });
    }
  }
  connect.single = single;

  return connect;
}

/** default interface for tuples that start with a string */
export interface ZeroString {
  /** the zero property */
  readonly 0: string;
}

function isZeroString(d: unknown): d is ZeroString {
  try {
    return typeof (d as ZeroString)[0] === "string";
  } catch {
    return false;
  }
}

function defaultSourceId(d: ZeroString): string {
  if (isZeroString(d)) {
    return d[0];
  } else {
    throw err`default source id expected datum[0] to be a string but got datum: ${d}; you should check the data you're passing to \`graphConnect()\` to make sure it looks like \`[[source_id, target_id], ...]\` or set a custom accessor with \`graphConnect().source(d => ...).target(d => ...)\``;
  }
}

/** default interface for functions whose second element is a string */
export interface OneString {
  /** the one property */
  readonly 1: string;
}

function isOneString(d: unknown): d is OneString {
  try {
    return typeof (d as OneString)[1] === "string";
  } catch {
    return false;
  }
}

function defaultTargetId(d: OneString): string {
  if (isOneString(d)) {
    return d[1];
  } else {
    throw err`default target id expected datum[1] to be a string but got datum: ${d}; you should check the data you're passing to \`graphConnect()\` to make sure it looks like \`[[source_id, target_id], ...]\` or set a custom accessor with \`graphConnect().source(d => ...).target(d => ...)\``;
  }
}

function defaultNodeDatum(id: string): string {
  return id;
}

/** default ops of the default connect operator */
export interface DefaultConnectOps
  extends ConnectOps<string, readonly [string, string]> {
  /** the default source id operator */
  sourceId: IdOperator<ZeroString>;
  /** the default target id operator */
  targetId: IdOperator<OneString>;
  /** the default node datum operator */
  nodeDatum: IdNodeDatumOperator<string>;
}

/** the default connect operator */
export type DefaultConnect = Connect<string, DefaultConnectOps>;

/**
 * Creates a new {@link Connect} with the default settings. This is
 * bundled as {@link graphConnect}
 */
export function graphConnect(...args: never[]): DefaultConnect {
  if (args.length) {
    throw err`got arguments to graphConnect(${args}), but constructor takes no arguments; these were probably meant as data which should be called as \`graphConnect()(...)\``;
  } else {
    // NOTE I think because source and target are both IdOperators, typescript
    // tries to cache the inference, but in so doing, gets it wrong.
    return buildConnect<string, ZeroString & OneString, DefaultConnectOps>({
      sourceId: defaultSourceId,
      targetId: defaultTargetId,
      nodeDatum: defaultNodeDatum,
      single: false,
    });
  }
}
