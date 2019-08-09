export function dagHierarchy<Datum>(): DagLayout<Datum>;
export function sugiyama<Datum>(): SugiyamaLayout<Datum>;
export function zherebko<Datum>(): ZherebkoLayout<Datum>;
export function arquint<Datum>(): ArquintLayout<Datum>;
export function layeringLongestPath<Datum>(): LayeringAccessor<Datum>;
export function layeringCoffmanGraham<Datum>(): LayeringAccessor<Datum>;
export function layeringSimplex<Datum>(): LayeringAccessor<Datum>;
export function layeringTopological<Datum>(): LayeringAccessor<Datum>;
export function coordCenter<Datum>(): CoordAccessor<Datum>;
export function coordVert<Datum>(): CoordAccessor<Datum>;
export function coordMinCurve<Datum>(): CoordAccessor<Datum>;
export function coordGreedy<Datum>(): CoordAccessor<Datum>;
export function coordTopological<Datum>(): CoordAccessor<Datum>;
export function coordCenterRect<Datum>(): ArquintCoordAccessor<Datum>;
export function columnSimpleLeft<Datum>(): ColumnAccessor<Datum>;
export function columnSimpleCenter<Datum>(): ColumnAccessor<Datum>;
export function columnComplex<Datum>(): ColumnComplexAccessor<Datum>;

export interface DagLayout<Datum> {
    (...roots: Datum[]): Node<Datum>;
    id(id: (node: Datum) => any): this;
    children(children: (node: Datum) => Datum[]): this;
}

export interface SugiyamaLayout<Datum> {
    (node: Node<Datum>): PointNode<Datum>;
    size(size: [number, number]): this;
    layering(layering: LayeringAccessor<Datum>): this;
    coord(coord: CoordAccessor<Datum>): this;
}

export interface ZherebkoLayout<Datum> {
    (node: Node<Datum>): PointNode<Datum>;
    size(size: [number, number]): this;
}

export interface ArquintLayout<Datum> {
    (node: Node<Datum>): RectangleNode<Datum>;
    size(size: [number, number]): this;
    layering(layering: (node: Node<Datum>) => void): this;
    decross(decross: (layers: Node<Datum>[][]) => void): this;
    columnAssignment(columnAssignment: (layers: Node<Datum>[][]) => void): this;
    coord(coord: ArquintCoordAccessor<Datum>): this;
    interLayerSeparation(interLayerSeparation: (layer: Node<Datum>[]) => number): this;
    columnWidthFunction(columnWidthFunction: (columnIndex: number) => number): this;
    columnSeparationFunction(columnSeparationFunction: (columnIndex: number) => number): this;
}

export interface Node<T> {
    id: number;
    heightRatio: number;
    data: T;
    children: Node<T>[];
    descendants(): this[];
}

export interface PointNode<T> extends Node<T> {
    x: number;
    y: number;
    links(): PointLink<T>[];
}

export interface RectangleNode<T> extends Node<T> {
    x0: number;
    x1: number;
    y0: number;
    y1: number;
    links(): RectangleLink<T>[];
}

export interface Link<T> {
    source: Node<T>;
    target: Node<T>;
}

export interface PointLink<T> extends Link<T> {
    source: PointNode<T>;
    target: PointNode<T>;
}

export interface RectangleLink<T> extends Link<T> {
    source: RectangleNode<T>;
    target: RectangleNode<T>;
}

export interface LayeringAccessor<T> {
    (node: Node<T>): void;
}

export interface CoordAccessor<T> {
    (layers: Node<T>[][], 
        separationFunction: (a: Node<T>, b: Node<T>) => number): void;
}

export interface ArquintCoordAccessor<T> {
    (layers: Node<Datum>[][], 
        columnWidthFunction: (columnIndex: number) => number, 
        columnSeparationFunction: (columnIndex: number) => number): void;
}

export interface ColumnAccessor<T> {
    (layers: Node<T>[][]): void;
}

export interface ColumnComplexAccessor<T> extends ColumnAccessor<T> {
    center(center: boolean): this;
}
