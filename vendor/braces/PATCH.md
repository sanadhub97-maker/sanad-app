# Local security fork of braces 3.0.3

This is not an upstream release. The upstream MIT source and license are retained.
The package is named `braces` with the local-only version `3.0.4` and is installed as
`braces` through the root npm override. It may be removed only after a verified
upstream fix for https://github.com/advisories/GHSA-vfj7-8cjw-p6xm is adopted.

The parser refuses more than 64 levels of actual brace/parenthesis nesting.
Compile, expand and stringify also validate caller-supplied ASTs iteratively,
rejecting excessive depth, excessive node count and cycles before recursive
walking. Options cannot disable the cap. Existing ordinary glob/range behavior
is retained. These limits address recursive walker stack exhaustion; they do
not claim to make arbitrary glob expansion resource-free.

`npm run test:build-security` checks the installed dependency, direct AST APIs,
malicious nesting, cycles and ordinary glob behavior. CI runs it before the
unchanged full npm audit; no advisory is suppressed or allowlisted.
