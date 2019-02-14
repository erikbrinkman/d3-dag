const tape = require("tape");

function close(a, b, atol = 1e-13, rtol = 1e-7) {
  return Math.abs(a - b) <= atol + rtol * Math.abs(b);
}

function allClose(a, b, atol = 1e-13, rtol = 1e-7) {
  if (a.length != b.length) {
    return false;
  } else if (a.every((ai, i) => close(ai, b[i], atol, rtol))) {
    return true;
  } else {
    return false;
  }
}

tape.Test.prototype.allClose = function(actual, expected, message) {
  this._assert(allClose(actual, expected), {
    message: message || "should all be close",
    operator: "allClose",
    actual: actual,
    expected: expected,
  });
};

module.exports = tape;
