import {
  aggMean,
  aggMedian,
  Aggregator,
  aggWeightedMedian,
  cachedNodeSize,
  Children,
  ChildrenData,
  Coord,
  coordCenter,
  coordGreedy,
  coordQuad,
  coordSimplex,
  coordTopological,
  Decross,
  decrossOpt,
  decrossTwoLayer,
  DefaultConnect,
  DefaultGrid,
  DefaultHierarchy,
  DefaultStratify,
  DefaultSugiyama,
  DefaultZherebko,
  Graph,
  graph,
  graphConnect,
  graphHierarchy,
  GraphLink,
  GraphNode,
  graphStratify,
  grid,
  Group,
  Id,
  IdNodeDatum,
  Lane,
  laneGreedy,
  laneOpt,
  Layering,
  layeringLongestPath,
  layeringSimplex,
  layeringTopological,
  layerSeparation,
  LinkWeight,
  MutGraph,
  NodeSize,
  NodeWeight,
  ParentData,
  ParentIds,
  Rank,
  SimplexWeight,
  sizedSeparation,
  splitNodeSize,
  sugifyCompact,
  sugifyLayer,
  SugiNode,
  sugiNodeLength,
  sugiyama,
  Twolayer,
  twolayerAgg,
  twolayerGreedy,
  twolayerOpt,
  unsugify,
  zherebko,
} from ".";

test("graph()", () => {
  const grf: MutGraph<string, string> = graph<string, string>();
  const a = grf.node("a");
  const b = grf.node("b");
  const link = a.child(b, "0");
  expect(link.data).toBe("0");

  const rnk: Rank<string, string> = (
    node: GraphNode<string, string>,
  ): number | undefined => {
    if (node.data === "a") {
      return 1;
    } else if (node.data === "b") {
      return 0;
    } else {
      return;
    }
  };

  const [bt, at] = grf.topological(rnk);
  expect(bt).toBe(b);
  expect(at).toBe(a);
});

test("graphStratify()", () => {
  const layout: DefaultStratify = graphStratify();
  const id: Id<{ myId: string }> = ({ myId }: { myId: string }): string => myId;
  const parentIds: ParentIds<{ parents: string[] }> = ({
    parents,
  }: {
    parents: string[];
  }): string[] => parents;
  const parentData: ParentData<{ parents: [string, number][] }, number> = ({
    parents,
  }: {
    parents: [string, number][];
  }): [string, number][] => parents;
  const modified = layout.id(id).parentIds(parentIds).parentData(parentData);
  const grf: MutGraph<{ myId: string; parents: [string, number][] }, number> =
    modified([
      { myId: "a", parents: [] },
      { myId: "b", parents: [["a", 0]] },
    ]);
  const [node] = grf.topological();
  expect(node.data.myId).toBe("a");
});

interface Childs {
  childs?: Childs[];
}

interface ChildData {
  childs?: [ChildData, string][];
}

test("graphHierarchy()", () => {
  const layout: DefaultHierarchy = graphHierarchy();
  const children: Children<Childs> = ({
    childs,
  }: Childs): Childs[] | undefined => childs;
  const childrenData: ChildrenData<ChildData, string> = ({
    childs,
  }: ChildData): [ChildData, string][] | undefined => childs;
  const modified = layout.children(children).childrenData(childrenData);
  const grf: MutGraph<ChildData, string> = modified({
    childs: [[{}, "edge"]],
  });
  const [node] = grf.topological();
  expect(node.data.childs).toHaveLength(1);
  expect(node.nchildLinks()).toBe(1);
});

test("graphConnect()", () => {
  const layout: DefaultConnect = graphConnect();
  const sourceId: Id<{ source: string }> = ({
    source,
  }: {
    source: string;
  }): string => source;
  const targetId: Id<{ target: string }> = ({
    target,
  }: {
    target: string;
  }): string => target;
  const nodeDatum: IdNodeDatum<number> = (id: string): number => parseInt(id);
  const modified = layout
    .sourceId(sourceId)
    .targetId(targetId)
    .nodeDatum(nodeDatum);
  const grf: MutGraph<number, { source: string; target: string }> = modified([
    { source: "0", target: "1" },
  ]);
  const [node] = grf.topological();
  expect(node.data).toBe(0);
  expect(node.nchildLinks()).toBe(1);
});

test("sugiyama.layering()", () => {
  const dag = graph<string, number>();
  dag.node("a");

  const rank: Rank<string, unknown> = ({
    data,
  }: GraphNode<string, unknown>) => {
    const res = parseFloat(data);
    return isNaN(res) ? undefined : res;
  };
  const group: Group<string, unknown> = ({
    data,
  }: GraphNode<string, unknown>) => (data === "x" ? "x" : undefined);
  const layering: Layering<string, number> = (grf: Graph) => grf.nnodes();

  const layout = sugiyama()
    .layering(layering)
    .layering(layeringTopological())
    .layering(layeringLongestPath())
    .layering(layeringSimplex().rank(rank).group(group));
  const { width, height } = layout(dag);
  expect(width).toBeGreaterThanOrEqual(0);
  expect(height).toBeGreaterThanOrEqual(0);
});

test("sugiyama.decross()", () => {
  const dag = graph<string, number>();
  dag.node("a");

  const maxAgg: Aggregator = (indices) => {
    let max = -Infinity;
    for (const val of indices) {
      max = Math.max(max, val);
    }
    return max === -Infinity ? undefined : max;
  };
  const twolayer: Twolayer<string, number> = (
    topLayer: SugiNode<string, number>[],
    bottomLayer: SugiNode<string, number>[],
    topDown: boolean,
  ) => {
    if (topDown) {
      bottomLayer.reverse();
    } else {
      topLayer.reverse();
    }
  };
  const decross: Decross<string, number> = (
    layers: SugiNode<string, number>[][],
  ) => {
    for (const layer of layers) {
      layer.reverse();
    }
  };

  const layout = sugiyama()
    .decross(decross)
    .decross(decrossOpt())
    .decross(
      decrossTwoLayer()
        .order(twolayer)
        .order(
          twolayerAgg()
            .aggregator(maxAgg)
            .aggregator(aggWeightedMedian)
            .aggregator(aggMedian)
            .aggregator(aggMean),
        )
        .order(twolayerOpt())
        .order(twolayerGreedy()),
    );
  const { width, height } = layout(dag);
  expect(width).toBeGreaterThanOrEqual(0);
  expect(height).toBeGreaterThanOrEqual(0);
});

test("sugiyama.coord()", () => {
  const dag = graph<string, number>();
  dag.node("a");

  const linkWeight: LinkWeight<unknown, number> = ({
    data,
  }: GraphLink<unknown, number>) => data;
  const nodeWeight: NodeWeight<string, unknown> = ({
    data,
  }: GraphNode<string, unknown>) => {
    const res = parseFloat(data);
    return isNaN(res) ? 0 : res;
  };
  const simplexWeight: SimplexWeight<unknown, number> = ({
    data,
  }: GraphLink<unknown, number>) => {
    return [1, 2, data * 8];
  };
  const coord: Coord<string, number> = (
    layers: SugiNode<string, number>[][],
  ) => {
    for (const layer of layers) {
      for (const node of layer) {
        node.x = 0;
      }
    }
    return 0;
  };

  const layout = sugiyama()
    .coord(coord)
    .coord(coordTopological())
    .coord(coordGreedy())
    .coord(coordCenter())
    .coord(coordQuad().linkCurve(linkWeight).nodeCurve(nodeWeight))
    .coord(coordSimplex().weight(simplexWeight));
  const { width, height } = layout(dag);
  expect(width).toBeGreaterThanOrEqual(0);
  expect(height).toBeGreaterThanOrEqual(0);
});

test("sugiyama()", () => {
  const dag = graph<string, number>();
  dag.node("a");

  const layout: DefaultSugiyama = sugiyama();

  const nodeSize: NodeSize<string, unknown> = ({
    data,
  }: GraphNode<string, unknown>) => [data ? 1 : 2, 1];

  const modified = layout
    .nodeSize(nodeSize)
    .layering(layeringLongestPath())
    .decross(decrossOpt())
    .coord(coordGreedy());
  const { width, height } = modified(dag);
  expect(width).toBeGreaterThanOrEqual(0);
  expect(height).toBeGreaterThanOrEqual(0);
});

test("manual sugiyama() layered", () => {
  const dag = graph<string, number>();
  dag.node("a");

  const layering = layeringLongestPath();
  const decross = decrossOpt();
  const coord = coordGreedy();
  const nodeSize = () => [1, 1] as const;
  const xGap = 1;
  const yGap = 1;

  const [xLen, yLen] = splitNodeSize(cachedNodeSize(nodeSize));
  const numLayers = layering(dag, layerSeparation);
  const [layers, height] = sugifyLayer(
    dag,
    yLen,
    yGap,
    numLayers + 1,
    layering,
  );
  decross(layers);
  const xSep = sizedSeparation(sugiNodeLength(xLen), xGap);
  const width = coord(layers, xSep);
  unsugify(layers);

  expect(width).toBeGreaterThan(0);
  expect(height).toBeGreaterThan(0);
});

test("manual sugiyama() compact", () => {
  const dag = graph<string, number>();
  dag.node("a");

  const layering = layeringLongestPath();
  const decross = decrossOpt();
  const coord = coordGreedy();
  const nodeSize = () => [1, 1] as const;
  const xGap = 1;
  const yGap = 1;

  const [xLen, yLen] = splitNodeSize(cachedNodeSize(nodeSize));
  const ySep = sizedSeparation(yLen, yGap);
  const height = layering(dag, ySep);
  const layers = sugifyCompact(dag, yLen, height, layering);
  decross(layers);
  const xSep = sizedSeparation(sugiNodeLength(xLen), xGap);
  const width = coord(layers, xSep);
  unsugify(layers);

  expect(width).toBeGreaterThan(0);
  expect(height).toBeGreaterThan(0);
});

test("grid()", () => {
  const dag = graph<string, number>();
  dag.node("a");

  const rank: Rank<string, unknown> = ({
    data,
  }: GraphNode<string, unknown>) => {
    const res = parseFloat(data);
    return isNaN(res) ? undefined : res;
  };
  const lane: Lane<string, number> = (
    ordered: readonly GraphNode<string, number>[],
  ) => {
    for (const node of ordered) {
      node.x = 0;
    }
  };

  const layout: DefaultGrid = grid();
  const modified = layout
    .rank(rank)
    .lane(lane)
    .lane(laneGreedy())
    .lane(laneOpt());
  const { width, height } = modified(dag);

  expect(width).toBeGreaterThan(0);
  expect(height).toBeGreaterThan(0);
});

test("zherebko()", () => {
  const dag = graph<string, number>();
  dag.node("a");

  const layout: DefaultZherebko = zherebko();
  const { width, height } = layout(dag);

  expect(width).toBeGreaterThan(0);
  expect(height).toBeGreaterThan(0);
});
