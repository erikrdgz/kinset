/**
 * The domain entry point.
 *
 * `legacy` holds the audited v1 shape and the original catalog, still used by the plan
 * editor and the existing tests. The other modules are the structured model the redesign
 * builds on. Both are exported from here so call sites import from one place while the
 * old code is lifted across incrementally.
 */
export * from "./legacy";
export * from "./exercises";
export * from "./selection";
export * from "./schema";
export * from "./migrate";
export * from "./metrics";
export * from "./session";
