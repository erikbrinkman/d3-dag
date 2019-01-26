const fs = require("fs"),
  d3_dag = require("../");

module.exports = function(name) {
  return d3_dag.dagStratify()(JSON.parse(fs.readFileSync(`test/data/${name}.json`)));
}
