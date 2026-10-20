# Graph: semantic zoom

With thousands of facts, drawing every node and edge at once turns the graph
into a grey hairball (`0-before.jpg`). The graph now shows a different level of
detail depending on how far you zoom in.

| Zoom | What you see |
| --- | --- |
| Out | Topic islands with their names, fact counts and bundled links between related topics (`1-overview.jpg`) |
| Middle | Edges fade in; island names move to the island's edge as captions (`2-regions.jpg`) |
| In | Names of the most connected facts, then of every fact that fits, plus lock icons (`3-detail.jpg`) |

- **Topics** come from the graph's structure (Louvain community detection,
  `src/lib/graph/clusters.ts`). Each topic is named after phrases that are
  common in it and rare elsewhere. Names only use titles the viewer can see,
  so a name never leaks a locked fact.
- **Layout** (`src/lib/graph/layout.ts`): islands are discs sized by fact count.
  Topics that share many edges are packed next to each other. Facts start
  spread out on their island and the force simulation tidies them from there.
  Facts with no edges get their own "Not connected yet" island.
- **Interaction:** click an island to zoom into it (`4-dive.jpg`). Hover a fact
  to highlight its neighbours (`5-hover.jpg`). Search results still trace
  their path across topics (`6-search.jpg`).
