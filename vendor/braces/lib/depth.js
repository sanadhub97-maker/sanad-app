'use strict';
// Local mitigation for GHSA-vfj7-8cjw-p6xm. Never recurse during validation.
const MAX_DEPTH = 64;
const assertTreeDepth = ast => {
  const pending = [{ node: ast, depth: 0 }];
  const seen = new WeakSet();
  let count = 0;
  while (pending.length) {
    const { node, depth } = pending.pop();
    if (!node || typeof node !== 'object') continue;
    if (depth > MAX_DEPTH || seen.has(node) || ++count > 65538) {
      throw new RangeError('Brace AST exceeds the safe depth or size limit');
    }
    seen.add(node);
    if (node.nodes) {
      for (const child of node.nodes) pending.push({ node: child, depth: depth + 1 });
    }
  }
};
module.exports = { MAX_DEPTH, assertTreeDepth };
