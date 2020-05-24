declare module "d3-dag"
{
    export namespace DAGTypes
    {
        /** Common Accessors types */
        export namespace Accessor {
            
            export interface id<NodeDatum> {(
                node: NodeDatum,
            ): string }

            export interface children<NodeDatum> {(
                node: NodeDatum,
            ): NodeDatum[] | undefined }

            export interface parentsIds<NodeDatum> {(
                node: NodeDatum,
            ): string[] | undefined }

            export interface linkData<NodeDatum, LinkDatum> {(
                source: NodeDatum,
                target: NodeDatum,
            ): LinkDatum }
        }

        export namespace Hierarchy {

            export interface Operator<NodeDatum, LinkDatum> { 
                /** Construct a DAG from the specified root nodes.*/
                (...rootNodes: NodeDatum[]): Node<NodeDatum, LinkDatum>
                /** sets the id accessor to the given function */
                id(id: Accessor.id<NodeDatum>): this
                /** returns the current id accessor, which defaults to: 
                 * ```js
                 * function (d) { return d.id }
                 * ```
                 **/
                id() : Accessor.id<NodeDatum>
                /** sets the children accessor to the given function */
                children(children: Accessor.children<NodeDatum>): this
                /** returns the current children accessor, which defaults to: 
                 * ```js
                 * function (d) { return d.children }
                 * ```
                 **/      
                children(): Accessor.children<NodeDatum>
                /** sets the linkData accessor to the given function */
                linkData(linkData: Accessor.linkData<NodeDatum, LinkDatum>): this
                /** returns the current linkData accessor, which defaults to: 
                 * ```js
                 * function (source, target) { return {} }
                 * ```
                 **/  
                linkData(): Accessor.linkData<NodeDatum, LinkDatum>
            }
        }

        export namespace Stratify {

            export interface Operator<NodeDatum, LinkDatum> {
                /** Construct a dag from the specified data.
                 * The data should be an array of data elements that contain info about
                 * their parents' ids. */
                (data: NodeDatum[]): Node<NodeDatum, LinkDatum>
                /** sets the id accessor to the given function */
                id(id: Accessor.id<NodeDatum>): this
                /** returns the current id accessor, which defaults to: 
                 * ```js
                 * function (d) { return d.id }
                 * ```
                 **/
                id(): Accessor.id<NodeDatum>
                /** sets the parentIds accessor to the given function */
                parentIds(parentIds: Accessor.parentsIds<NodeDatum>): this
                /** returns the current parentIds accessor, which defaults to: 
                 * ```js
                 * function (d) { return d.parentIds }
                 * ```
                 **/
                parentIds(): Accessor.parentsIds<NodeDatum>
                /** sets the linkData accessor to the given function */
                linkData(linkData: Accessor.linkData<NodeDatum, LinkDatum>): this
                /** returns the current linkData accessor, which defaults to: 
                 * ```js
                 * function (source, target) { return {} }
                 * ```
                 **/
                linkData(): Accessor.linkData<NodeDatum, LinkDatum>
            }
        }

        export namespace Connect {

            export interface Accessor<ConnectType> {(
                link: ConnectType
            ): string }
            
            export interface LinkData<ConnectType, LinkDatum> {(
                link: ConnectType
            ): LinkDatum }

            export interface NodeDatum<ConnectType>{
                id: string,
                parentIds: string[],
                linkData: {[id: string] : ConnectType}
            }

            export interface Operator<ConnectType, LinkDatum>{
                /** Construct a dag from the specified data.
                 * The data should be an array of data elements that contain info about
                 * links in the graph. */
                (data: ConnectType[]): Node<NodeDatum<ConnectType>, LinkDatum>
                /** sets the sourceAccessor accessor to the given function */
                sourceAccessor(sourceAccessor: Accessor<ConnectType>): this
                /** returns the current sourceAccessor accessor, which defaults to: 
                 * ```js
                 * function (link) { return link[0] }
                 * ```
                 **/
                sourceAccessor(): Accessor<ConnectType>
                /** sets the targetAccessor accessor to the given function */
                targetAccessor(targetAccessor: Accessor<ConnectType>): this
                /** returns the current targetAccessor accessor, which defaults to: 
                 * ```js
                 * function (link) { return link[1] }
                 * ```
                 **/
                targetAccessor(): Accessor<ConnectType>
                /** sets the linkData accessor to the given function */
                linkData(linkData: LinkData<ConnectType, LinkDatum>): this
                /** returns the current linkData accessor, which defaults to: 
                 * ```js
                 * function (link) { return link }
                 * ```
                 **/
                linkData(): this
            }
        }

        export interface Node<NodeDatum, LinkDatum> {
            /** A unique string identification for each node.
             * This is necessary in order to check if two nodes are identical.
             * For internal purposes, ids may not contain the null character ('\0').*/
            id: string 
            /** The associated data as specified in the constructor. */
            data: NodeDatum
            /** Array of all child nodes. Empty if this is a leaf. */
            children: this[]
            /** set by depth(), height(),  */
            value?: number
            /** Return an array of all descendant nodes of this node. */
            descendants(): this[]
            /** Returns an array of every link in the DAG. */         
            links(): Link<this, LinkDatum>[]
            /** Copies the dag structure and returns it.
             * The data associated with every node is not copied. */
            copy(): this
            /** Copy and reverse the DAG, returning a new root
             * or pseudo root depending on if there are multiple roots.
             * This is particularly useful if you want to use
             * the opposite accessor in DAG creation.
             * For example, if your data set has childIds,
             * you can use dagStratify with parentIds and
             * simply reverse the DAG post creation. */
            reverse(): this
            /** Set the value of each node to be the number
             * of descendants including itself */
            count(count: number): this
            /** Returns true if the dag is connected. */
            connected(): boolean
            /** Set the value of each node to be zero if its a root node,
             * or the greatest distance to any root node for other nodes. */
            depth(): this
            /** Set the value of each node to be zero if its a leaf node,
             * or the greatest distance to any leaf node for other nodes. */
            height(): this
            /** Invoke the specified function on each node in an arbitrary order. */
            each(callback: (node: this) => void): this
            /** Invoke the specified function on each node such a node is called before any of its parents. */
            eachAfter(callback: (node: this) => void): this
            /** Invoke the specified function on each node such a node is called before any of its children. */
            eachBefore(callback: (node: this) => void): this
            /** Invoke the specified function on each node in breadth first order. */
            eachBreadth(callback: (node: this) => void): this
            /** Return true if this dag is equal to that dag.
             *  For two dags to be equal the data must be strictly (===) equal. */
            equals(that: this): boolean
            /** Return true if function returns true for every node in the DAG. */
            every(callback: (node: this) => boolean): boolean
            /** Return true if function returns true for at least one node in the DAG. */
            some(callback : (node: this) => boolean): boolean
            /** Set the value of every node to be the sum of this functions return value
             * on the current node's data and the value of every descendant's return value. */
            sum(callback : (node: this) => number): this
            /** return number of nodes */
            size(): number
            /** Calls the specified callback function for all nodes. The return value of the callback function is the accumulated result, and is provided as an argument in the next call to the callback function.
             * @param callbackfn A function that accepts up to four arguments. The reduce method calls the callbackfn function one time for each element in the array.
             * @param initialValue If initialValue is specified, it is used as the initial value to start the accumulation. The first call to the callbackfn function provides this value as an argument instead of an array value.
            */
            reduce<U>(callbackfn: (previousValue: U, currentValue: this, currentIndex: number) => U, initialValue: U): U;
        }

        /** Link between 2 Nodes */
        export interface Link<DAGNode, LinkDatum> {
            /** a node that is a parent of target. */
            source: DAGNode
            //source: Node<NodeDatum, LinkDatum>
            /** a node that is a child of source. */
            target: DAGNode
            /** an object with data attached to the link.
             * Modifying this object will preserve the data for that link. */
            data: LinkDatum
        }
                
        /** Sugiyama Layout */
        export namespace Sugiyama {

            export interface Layout<NodeDatum, LinkDatum> extends 
                     Node<NodeDatum, LinkDatum & {
                         /** polyline points */
                         points: {x: number, y: number}[]
                     }>
            {
                /** the x-coordinate of the node. */
                x: number,
                /** the y-coordinate of the node. */
                y: number,
                /** Sugiyama layer */
                layer: number,
            }

            export interface Separator<NodeDatum, LinkDatum>{(
                a: Node<NodeDatum, LinkDatum>,
                b: Node<NodeDatum, LinkDatum>
            ): number }

            export interface Operator<NodeDatum, LinkDatum> {
                /** This constructs a layered representation of the DAG meant for visualization.
                 * The algorithm is based off ideas presented in K. Sugiyama et al. [1979],
                 * but described by S. Hong. The sugiyama layout can be configured with different
                 * algorithms for different stages of the layout.
                 * For each stage there should be adecuate choices for methods that balance speed
                 * and quality for your desired layout,
                 * but any function that meets the interface for that stage is valid. */
                (dag: Node<NodeDatum, LinkDatum>): Layout<NodeDatum, LinkDatum>
                /** sets sugiyama to debug. 
                * If debug is true, dummy nodes will be given more human readable ids,
                * but this can cause conflicts with poorly chosen ids, so it it disabled by default. */
                debug(debug: boolean): this
                /** returns the current debug value, which defaults to false. */
                debug() : this
                /** sets this sugiyama layout's size to the specified two-element array of numbers [width, height].
                 * When size is set, the minimum coordinate of every node is 0, and the maximum x and y coordinates
                 * are width and height respectively. If the DAG only has one node vertically or horizontally,
                 * it will be centered. */
                size(size: [number, number]): this
                /** returns the current layout size, which defaults to [1, 1], and is null if nodeSize was set.*/
                size(): null|[number, number]
                /** sets this sugiyama layout's nodeSize to the specified two-element array of numbers
                 * [nodeWidth, nodeHeight]. When nodeSize is set, the minimum coordinate of every node is 0,
                 * parents and children are at least nodeHeight appart, and neighboring nodes in the same layer
                 * are at least nodeWidth apart. If the DAG only has one node vertically or horizontally,
                 * it will be centered.*/
                nodeSize(nodeSize: null|[number,number]) : this
                /* returns the current layout node size, which defaults to null, and will return null if size was set. */
                nodeSize(): null|[number,number]
                /** sets the layering accessor to the specified function.
                 * A layering accessor takes a dag and assigns every node a layer attribute
                 * from zero to the number of layers - 1. See Sugiyama Layering Acessors. */
                layering(layering: 
                    Layering.Simplex|
                    Layering.CoffmanGraham|
                    Layering.LongestPath|
                    Layering.Topological
                ) : this
                /** returns the current layering accessor, which defaults to d3.layeringSimplex(). */
                layering():
                    Layering.Simplex|
                    Layering.CoffmanGraham|
                    Layering.LongestPath|
                    Layering.Topological
                /** sets the decross accessor to the specified function.
                 * A decross accessor takes a dag as an array of layers where each layer is an array of nodes,
                 * and modifies the order of nodes in each layer to reduce the number of link crossings.*/
                decross(decross: 
                    DeCross.Optimal|
                    DeCross.TwoLayer
                ) : this
                /** returns the current decross accessor, which defaults to d3.decrossTwoLayer(). */
                decross():
                    DeCross.Optimal|
                    DeCross.TwoLayer
                /** sets the coord accessor to the specified function.
                * A coord accessor takes a dag as an array of layers where each layer is an array of nodes
                * and a separation function, which takes adjacent nodes and specifies their relative separation.
                * The coord accessor assigns every node an x property in [0, 1] to specify the actual layout. */
                coord(coord: 
                    Coord.Center|
                    Coord.Vert|
                    Coord.MinCurve|
                    Coord.Greedy|
                    Coord.Topological
                ): this
                /** returns the current coord accessor, which defaults to d3.coordGreedy(). */
                coord(): 
                    Coord.Center|
                    Coord.Vert|
                    Coord.MinCurve|
                    Coord.Greedy|
                    Coord.Topological

                /** sets the separation accessor to the specified function.
                 * The separation accessor function takes two adjacent dag nodes and sets their relative separation,
                * thus any constant function will produce the same results.
                * Another other common setting is: `(a, b) => (a.data !== undefined) + (b.data !== undefined)`
                * which will wrap edges around nodes, but give them no spaceing themselves.
                */
                separation(separation: Separator<NodeDatum, LinkDatum>): this
                /** returns the current separation accessor, which defaults to: `(a, b) => 1` */
                separation(): Separator<NodeDatum, LinkDatum>
            }

            /** Sugiyama Provided Layering Algorithm */
            export namespace Layering {

                // A layering accessor takes a dag and assigns every node a layer attribute
                // from zero to the number of layers
                interface Accessor {():{_layeringSignature_}} // opaque typing
                
                export interface LongestPath extends Accessor {
                    /** Set whether longest path should go top down or not.
                     * If set to true (the default), longest path will start at the top,
                     * putting only nodes that need to be at hte top layer,
                     * otherwise it will put as many nodes as possible in the top layer. */
                    topDown(topDown: boolean): this
                    /** returns whether longest path should go top down or not. */
                    topDown(): boolean
                }

                export interface CoffmanGraham extends Accessor {
                    /** Set the maximum width of any layer. If set to 0 (the default),
                     * the width is set to the rounded square root of the number of nodes. */
                    width(width: number): this
                    /** returns maximum width of any layer. */
                    width(): number
                }

                export interface Simplex extends Accessor {
                    /** Setting debug to true will cause the simplex solver to use more human readable names,
                    * which can help debug optimizer errors. These names will cause other types of failures
                    * for poorly constructed node ids, and is therefore disabled by default. */               
                    debug(debug: boolean): this
                    /** returns the current debug value, which defaults to false. */
                    debug(): boolean
                }

                export interface Topological extends Accessor { }
            }

            /** Sugiyama Provided Cross Reduction Algorithm */
            export namespace DeCross {

                // A decross accessor takes a dag as an array of layers where each layer is an array of nodes,
                // and modifies the order of nodes in each layer to reduce the number of link crossings.
                interface Accessor {():{_DeCrossSignature_}} // opaque typing

                export interface Optimal extends Accessor {
                   /** If set, the variables for the MILP will be given more human readable names,
                    * which can help debug optimization errors. This can cause new optimization errors
                    * if the node ids are poorly formed, and is disabled by default.*/               
                   debug(debug: boolean): this
                   /** returns the current debug value, which defaults to false. */
                   debug(): this
                }

                // A twolayer order accessor takes two layers of nodes as arrays, and changes the order
                // of the second layer in order to minimize the number of crossings.
                interface TwolayerOrderAccessor {():{ _TwolayerOrderSignature_}} // opaque typing
                export interface TwolayerMedian extends TwolayerOrderAccessor {}
                export interface TwolayerMean extends TwolayerOrderAccessor {}
                export interface TwolayerOpt extends TwolayerOrderAccessor {
                    /** sets twolayerOpt to debug to debug. If debug is true, the optimization formulation
                     * will be given more human readable names that help debugging the optimization,
                     * but may cause conflicts if used with poorly chosen node ids. */
                    debug(debug: boolean): this
                    /** returns the current debug value, which defaults to false. */
                    debug(): this
                }
                export interface TwoLayer extends Accessor {
                    /** sets the order accessor to the specified function */
                    order(order:
                        TwolayerMedian|
                        TwolayerMean|
                        TwolayerOpt
                    ): this
                    /** returns the current order accessor, which defaults to d3.twolayerMedian(). */
                    order():
                        TwolayerMedian|
                        TwolayerMean|
                        TwolayerOpt
                    
                 }
            }

            /** Sugiyama Provided Coord Accessors */
            export namespace Coord {

                // A coord accessor takes a dag as an array of layers where each layer is an array of nodes
                // and a separation function, which takes adjacent nodes and specifies their relative separation.
                // The coord accessor assigns every node an x property in [0, 1] to specify the actual layout.
                interface Accessor {():{ _CoordSignature_}} // opaque typing

                export interface Center extends Accessor {}

                export interface Vert extends Accessor {}
                
                export interface MinCurve extends Accessor {
                    /** sets the weight to the specified number and returns this coordMinCurve accessor.
                     * Weight must be a value between 0 includive and 1 exclusive.
                     * Heigher weights prioritize minimizing curves more,
                     * while lower weights prioritize minimizing child closeness.
                     * Since minimizing only curves is not well defined, weight can not be 1. */
                    weight(weight: number): this
                    /** returns the current weight, which defaults to 0.5. */
                    weight(): number
                }
                
                export interface Greedy extends Accessor {}
                
                export interface Topological extends Accessor {}
            }
        }

        /** Zherebk Layout */
        export namespace Zherebko {

            export interface Layout<NodeDatum, LinkDatum>  extends 
                Node<NodeDatum, LinkDatum & {
                    /** */
                    index: number
                    /** polyline points */
                    points: {x: number, y: number}[]
                }>
            {
                /** the x-coordinate of the node. */
                x: number,
                /** the y-coordinate of the node. */
                y: number,
                /** Zherebko layer */
                layer: number,
            }
            
            export interface Operator<NodeDatum, LinkDatum> {
                /** This constructs a topological representation of the DAG meant for visualization.
                 * The algorithm is based off a PR by D. Zherebko.
                 * The nodes are topologically ordered, and edges are positioned into "lanes"
                 * to the left and right of the nodes.
                 */
                (dag: Node<NodeDatum, LinkDatum>): Layout<NodeDatum, LinkDatum>
                /** sets this zherebko layout's size to the specified two-element array of numbers [width, height] */
                size(size: [number, number]): this
                /** returns the current layout size, which defaults to [1, 1].*/
                size(): [number, number]
            }
        }
        
        /** Arquint Layout */
        export namespace Arquint {

            export interface Layout<NodeDatum, LinkDatum>  extends 
                     Node<NodeDatum, LinkDatum & {
                         /** polyline points */
                         points: {x: number, y: number}[]
                     }>
            {
                /** the left x-coordinate of the node. */
                x0: number,
                /** the right x-coordinate of the node. */
                x1: number,
                /** the bottom y-coordinate of the node. */
                y0: number,
                /** the top y-coordinate of the node. */
                y1: number,
                /** Arquint layer */
                layer: number,
                /** Arquint column index */
                columnIndex: number,
            }

            export interface InterLayerSeparator<NodeDatum, LinkDatum>{(
                arr: Node<NodeDatum, LinkDatum>[]
            ): number }

            export interface ColumnRelative{(
                columnIndex: number
            ): number }

            export interface Operator<NodeDatum, LinkDatum> {    
                /** This treats nodes not as points (i.e. producing x & y coordinates) but as rectangles.
                 * Each node has a property heightRatio specifying its height in comparison to other nodes.
                 * The implementation was contributed by the author L. Arquint and provides different algorithms
                 * to distribute the nodes along the x-axis.
                 */
                (dag: Node<NodeDatum, LinkDatum>): Layout<NodeDatum, LinkDatum>
                /** sets this arquint layout's size to the specified two-element array of numbers [width, height] */
                size(size: [number, number]): this
                /** returns the current layout size, which defaults to [1, 1].*/
                size(): [number, number]
                /** sets the decross accessor to the specified function.
                 * A decross accessor takes a dag as an array of layers where each layer is an array of nodes,
                 * and modifies the order of nodes in each layer to reduce the number of link crossings.*/
                decross(decross: 
                    Sugiyama.DeCross.Optimal|
                    Sugiyama.DeCross.TwoLayer
                ) : this
                /** returns the current decross accessor, which defaults to d3.decrossTwoLayer(). */
                decross():
                    Sugiyama.DeCross.Optimal|
                    Sugiyama.DeCross.TwoLayer
                /** sets the column accessor to the specified function
                 * A column accessor takes a dag as an array of layers where each layer is an array of nodes,
                 * and sets node.columnIndex to the index of the column in which it should appear.*/
                columnAssignment(columnAssignment: 
                    ColumnAssignment.SimpleLeft|
                    ColumnAssignment.SimpleCenter|
                    ColumnAssignment.Adjacent|
                    ColumnAssignment.Complex
                ): this
                /** returns the current column accessor, which defaults to d3.columnComplex(). */
                columnAssignment():
                    ColumnAssignment.SimpleLeft|
                    ColumnAssignment.SimpleCenter|
                    ColumnAssignment.Adjacent|
                    ColumnAssignment.Complex
                /** sets the column to coord accessor to the specified function 
                 *  A column to coord accessor takes a dag as an array of layers where each layer is an array of nodes
                 *  and each node has an assigned column index, a column width function and a column separation function.
                 * The column to coord accessor assigns every node an x0 and x1 property in [0, 1] to specify the actual layout. */
                column2Coord(coord: 
                    Column2Coord.Column2CoordRect
                ):this
                /** returns the current column to coord accessor, which defaults to d3.column2CoordRect(). */
                column2Coord(): Column2Coord.Column2CoordRect
                /** sets the inter layer accessor to the specified function, which defaults to 1
                 * A inter layer accessor takes a layer (i.e. an array of nodes) and its index and returns the relative distance
                 * to the previous layer. It is not called for the first layer, because it does not have a previous layer.*/
                interLayerSeparation(interLayerSeparation: InterLayerSeparator<NodeDatum, LinkDatum>): this
                /** returns the current inter layer accessor, which defaults to 1. */
                interLayerSeparation(): InterLayerSeparator<NodeDatum, LinkDatum>
                /** sets the column width accessor to the specified function, which defaults to 10.
                 * A column width accessor takes a column index and returns the relative width of the column. */
                columnWidth(columnWidth: ColumnRelative): this
                /** returns the current column width accessor, which defaults to 10. */
                columnWidth(): ColumnRelative
                /** sets the column separation accessor to the specified function, which defaults to 1.
                 * A column separation accessor takes a column index and returns the relative distance to the next column. */
                columnSeparation(columnSeparation: ColumnRelative): this
                /** returns the current column separation accessor, which defaults to 1. */
                columnSeparation(): ColumnRelative
            }

            /** Arquint Provided ColumnAssignment Accessors */
            export namespace ColumnAssignment {

                // A column accessor takes a dag as an array of layers where each layer is an array of nodes,
                // and sets node.columnIndex to the index of the column in which it should appear.
                interface Accessor {():{ _ColumnAssignmentSignature_}} // opaque typing

                export interface SimpleLeft extends Accessor {}
                
                export interface SimpleCenter extends Accessor {}
                
                export interface Adjacent extends Accessor {
                    /** Set whether the column adjacent accessor should center the adjacent node. It defaults to false. */
                    center(center: boolean): this
                    /** returns whether the column adjacent accessor should center the adjacent node. It defaults to false. */
                    center(): boolean
                }
                
                export interface Complex extends Accessor {
                    /** Set whether the column complex accessor should center the parent node for each subtree. It defaults to false. */
                    center(center: boolean): this
                    /** returns whether the column complex accessor should center the parent node for each subtree. It defaults to false. */
                    center(): boolean
                }
                
            }

            /** Arquint Provided Column2Coord Accessors */
            export namespace Column2Coord {

                //  A column to coord accessor takes a dag as an array of layers where each layer is an array of nodes
                //  and each node has an assigned column index, a column width function and a column separation function.
                //  The column to coord accessor assigns every node an x0 and x1 property in [0, 1] to specify the actual layout.
                interface Accessor {():{ _Column2CoordSignature_}} // opaque typing

                export interface Column2CoordRect extends Accessor {}
            }
        }
    }
    

    /** Constructs a new hierarchy operator with the default settings. */
    export function dagHierarchy<NodeDatum, LinkDatum>() : DAGTypes.Hierarchy.Operator<NodeDatum, LinkDatum>
    /** Constructs a new stratify operator with the default settings. */
    export function dagStratify<NodeDatum, LinkDatum>() : DAGTypes.Stratify.Operator<NodeDatum, LinkDatum>
    /** Constructs a new connect operator with the default settings. */
    export function dagConnect<NodeDatum, LinkDatum>() : DAGTypes.Connect.Operator<NodeDatum, LinkDatum>

    // * * * * * * * * * * 
    //
    //     Sugiyama
    //
    // * * * * * * * * * * 
    /** Construct a new Sugiyama layout operator with the default settings. */
    export function sugiyama<NodeDatum, LinkDatum>(): DAGTypes.Sugiyama.Operator<NodeDatum, LinkDatum>
    // * * * * * * * * * * 
    // Sugiyama Step 2/4 : Layering
    // * * * * * * * * * * 
    /** Sugiyama Step 2/4 : Layering
     * 
     * Construct a longest path layering accessor.
     * This layering accessor assigns every node a layer such that the longest path (the height) is minimized.
     * This often results in very wide graphs, but is fast. */
    export function layeringLongestPath(): DAGTypes.Sugiyama.Layering.LongestPath
    /** Sugiyama Step 2/4 : Layering
     * 
     * Constructs a Coffman-Graham layering accessor with default options.
     * Assigns every node a layer such that the width, not counting dummy nodes, is always less than some constant.
     * This can result in tall graphs, but is also reasonably fast. */
    export function layeringCoffmanGraham(): DAGTypes.Sugiyama.Layering.CoffmanGraham
    /** Sugiyama Step 2/4 : Layering
     * 
     * Constructs a simplex layering accessor with default options.
    * Assigns every node a layer such that the number of dummy nodes,
    * nodes inserted on edges that span more than one layer, is minimized.
    * This is often known as the network simplex layering from Gansner et al. [1993].
    * This is the most expensive built-in layering assignment accessor. */
    export function layeringSimplex(): DAGTypes.Sugiyama.Layering.Simplex
    /** Sugiyama Step 2/4 : Layering
     * 
     * Construct a topological layering accessor. This layering accessor
     * assigns every node a unique layer resulting is extremely tall layouts.
     * However, when combined with the coordTopological coordinate assignment accessor,
     * this can produce pleasing dag layouts. This is a very fast layering assignment method,
     * but may cause other steps to take lponger due to the introduction of many dummy nodes  */
    export function layeringTopological(): DAGTypes.Sugiyama.Layering.Topological
    // * * * * * * * * * * 
    // Sugiyama Step 3/4 : Crossing Reduction (node organization)
    // * * * * * * * * * * 
    /** Sugiyama Step 3/4 : Crossing Reduction (node organization)
     * 
     * Construct a an optimal decross accessor with default arguments.
     * This operator minimized the number of crossings, but does so by solving a mixed-integer linear program (MILP),
     * and may therefore be very slow.
     */
    export function decrossOpt(): DAGTypes.Sugiyama.DeCross.Optimal
    /** Sugiyama Step 3/4 : Crossing Reduction (node organization)
     * 
     * Construct a two layer decross accessor with default arguments.
     * The two layer accessor heuristically minimizes the crossings between each layer one at a time
     * by adjusting the positions of the bottom layer.
     * This can much much faster than using the optimal method. */
    export function decrossTwoLayer(): DAGTypes.Sugiyama.DeCross.TwoLayer
    /** Construct a twolayer median accessor.
     * This accessor orders the bottom layer by the medians of their parents. */
    export function twolayerMedian(): DAGTypes.Sugiyama.DeCross.TwolayerMedian
    /** Construct a twolayer mean accessor. This accessor orders the bottom layer
     * by the means of their parents. */
    export function twolayerMean(): DAGTypes.Sugiyama.DeCross.TwolayerMean
    /** Construct a twolayer optimal accessor. This accessor orders the bottom layer
     * to minimize the number of crossings.
     * This is done using a MILP, and so will be much slower than the other two layer accessors,
     * but generally faster than the full optimal corssing minimiztion. */
    export function twolayerOpt(): DAGTypes.Sugiyama.DeCross.TwolayerOpt
    // * * * * * * * * * * 
    // Sugiyama Step 4/4 : Coordinate assignement
    // * * * * * * * * * * 
    /** Sugiyama Step 4/4 : Coordinate assignement
     * 
     * Construct a center coordinate accessor.
     * This accessor keeps spread every node apart by separation and then centers each layer.
     * The result isn't a particularly great distribution of nodes,
     * but it doesn't require any type of optimization, and so is very fast.*/
    export function coordCenter(): DAGTypes.Sugiyama.Coord.Center
    /** Sugiyama Step 4/4 : Coordinate assignement
     * 
     * Construct a vertical coordinate accessor.
     * This accessor positions nodes so that the distance between nodes and the their neightbors
     * is minimized, while the curve through dummy nodes is minimized.
     * This accessor solves a quadratic program (QP) and so may take significant time,
     * especially as the number of nodes grows. */
    export function coordVert(): DAGTypes.Sugiyama.Coord.Vert
    /** Sugiyama Step 4/4 : Coordinate assignement
     * 
     * Construct a minimum curve accessor. This accessor weights between minimizing all curves through nodes,
     * and the distance between a node and it's neightbor, including dummy nodes.
     * This also solves a QP and so is about as performant as coordVert. */
    export function coordMinCurve(): DAGTypes.Sugiyama.Coord.MinCurve
    /** Sugiyama Step 4/4 : Coordinate assignement
     * 
     * Construct a greedy coordinate accessor. This accessor assigns coordinates as the mean of their parents
     * and then spaces them out to respect their separation.
     * Nodes with higher degree that aren't dummy nodes are given higher priority for shifting order,
     * i.e. are less likely to be moved from the mean of their parents.
     * This solution results in a layout that is more pleaseoing than spread,
     * but much faster to compute than vert or minCurve. */
    export function coordGreedy(): DAGTypes.Sugiyama.Coord.Greedy
    /** Sugiyama Step 4/4 : Coordinate assignement
     * 
     * Construct a topological coordinate accessor.
     * This accessor only works with a topological layering,
     * and minimizes the curve of edges such that all nodes are positioned vertically.
     * See layeringTopological for an example of what this coordinate assignment looks like. */
    export function coordTopological(): DAGTypes.Sugiyama.Coord.Topological


    // * * * * * * * * * * 
    //
    //     Zherebko
    //
    // * * * * * * * * * * 
    /** Construct a new Zherebko layout operator with the default settings. */
    export function zherebko<NodeDatum, LinkDatum>() : DAGTypes.Zherebko.Operator<NodeDatum, LinkDatum>


    // * * * * * * * * * * 
    //
    //     Arquint
    //
    // * * * * * * * * * * 
    /** Construct a new Arquint layout operator with the default settings. */
    export function arquint<NodeDatum, LinkDatum>() : DAGTypes.Arquint.Operator<NodeDatum, LinkDatum>    
    // * * * * * * * * * * 
    // Arquint Column Accessors
    // * * * * * * * * * * 
    /** Arquint Column Accessors
     * 
     * Constructs a column simple left accessor.
     * For each layer, this accessor assigns each node to a column starting from the left side.
     * Due to the layer local decision process, nodes can overlap if nodes in different layers have
     * different heights. */
    export function columnSimpleLeft(): DAGTypes.Arquint.ColumnAssignment.SimpleLeft
    /** Arquint Column Accessors
     * 
     * Constructs a column simple center accessor.
     * For each layer, this accessor assigns each node to a column while centering them (per-layer).
     * Due to the layer local decision process, nodes can overlap if nodes in different layers have
     * different heights. */    
    export function columnSimpleCenter(): DAGTypes.Arquint.ColumnAssignment.SimpleCenter
    /** Arquint Column Accessors
     * 
     * Constructs a column adjacent accessor.
     * Assigns column indices to the layer with most nodes first. Afterwards starting from the layer
     * with most nodes, column indices are assigned to nodes in adjacent layers.
     * Column indices are assigned with respect to the node's parents or children
     * while maintaining the same ordering in the layer.
     * In comparison to columnSimpleLeft and columnSimpleCenter,
     * this accessor takes the adjacent layer into account and tries to assign a column index that is near
     * the column index of the child or parent. Because nodes can be placed in the same column even though
     * they do not have a children/parents relation with each other, nodes can overlap if nodes in different
     * layers have different heights. */
    export function columnAdjacent(): DAGTypes.Arquint.ColumnAssignment.Adjacent
    /** Arquint Column Accessors
     * 
     * Constructs a column complex accessor. Instead of doing the assignment of nodes to columns per-layer,
     * this accessor considers the entire subtree per node. Therefore, the assignment happens depth-first. */
    export function columnComplex(): DAGTypes.Arquint.ColumnAssignment.Complex
    // * * * * * * * * * * 
    // Arquint Column To Coord Acessors
    // * * * * * * * * * * 
    /** Arquint Column To Coord Acessors
     * 
     * Construct a column to coordinate accessor for rectangles.
     * This accessor assigns x0 and x1 coordinates to each node based on their layering and columnIndex.
     * Furthermore, columnWidth and columnSeparation are used to calculate the width of each
     * column (and hence the width of nodes in that column) resp. the distance between columns. */
    export function column2CoordRect(): DAGTypes.Arquint.Column2Coord.Column2CoordRect
}

