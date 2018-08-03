// Return true of function returns true for every node
const sentinel = {};

export default function(func) {
  try {
    this.each((n, i) => {
      if (!func(n, i)) {
        throw sentinel;
      }
    });
  } catch (err) {
    if (err === sentinel) {
      return false;
    } else {
      throw err;
    }
  }
  return true;
}
