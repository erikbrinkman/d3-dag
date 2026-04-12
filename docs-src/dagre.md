# Dagre Comparison

d3-dag offers a dagre-compatible wrapper that supports dagre's API while using
d3-dag's layout engine under the hood. The **Quality** preset controls the
speed/quality trade-off of the d3-dag renderer. Both panels below render the
same graph — the only difference is the layout algorithm.

See the [dagre API docs](https://erikbrinkman.github.io/d3-dag/variables/dagre.html) for the full adapter reference.

<style>
.compare-container {
  display: flex;
  flex-wrap: wrap;
}
.compare-panel {
  flex: 1;
  min-width: 300px;
}
.compare-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}
.compare-controls label {
  display: flex;
  align-items: center;
}
.react-flow__handle {
  visibility: hidden;
}
</style>

<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@xyflow/react@12/dist/style.min.css" />

<div id="cmp-root"></div>

<script type="module" src="../compare-app.js"></script>
