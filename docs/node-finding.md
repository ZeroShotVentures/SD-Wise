# Finding an Answer in a Private Knowledge Graph

A question over organisational knowledge has two answers. One is the best fact in the graph. The other is the best fact the asker is allowed to read. These are often different nodes, and the distance between them is itself a result: it names the person who holds the stronger fact.

The procedure below separates those two answers on purpose. It locates a handful of large, topically relevant nodes, walks the edges among them without consulting access, and only then projects the result onto the asker's permissions. The walk is free to discover a locked fact. The reply never quotes it. It quotes the nearest fact the asker may see, and it names who can open the better one.

## 1. The graph

The knowledge of an organisation is a directed graph \(G = (V, E)\).

Each node \(v \in V\) is one fact. It carries a text and a unit vector \(\mathbf{e}(v) \in \mathbb{R}^{d}\) in a shared embedding space. Facts that mean similar things lie near each other under cosine similarity

\[
\cos(u, v) = \mathbf{e}(u) \cdot \mathbf{e}(v).
\]

An edge \(u \to v\) records that \(u\) bears on \(v\): a message that produced a decision, a later note that revised an earlier one, a meeting that depended on a document. Edges are the relations the organisation actually has. Proximity in the embedding space is a different relation, and the search uses both.

The size of a node is the number of edges that end on it, its in-degree

\[
d^{-}(v) = \lvert\{ u \to v \in E \}\rvert.
\]

A large node is a fact many other facts point at. It is a meeting point the graph has already elected, which makes it a sound place to start a walk. A leaf, however close to the question in embedding space, has almost no trail leaving it.

Each node also carries an access set \(A(v)\), the people allowed to read its text. Person \(p\) sees \(v\) when \(p \in A(v)\). During the search this set is ignored until a best fact has been chosen. The embedding and the topology of a locked node may be used to find it. Its text may not be returned.

## 2. Entry

Let \(q\) be the question, embedded with the same map as the nodes, so \(\mathbf{e}(q)\) lives in the same space.

Nearest-neighbour search over \(\{\mathbf{e}(v)\}\) returns a pool of the \(N\) nodes closest to \(q\) (a pool of 64 is enough; the index orders by cosine alone). Size is applied in a second pass, because an approximate nearest-neighbour index cannot rank by a mixture of similarity and degree. Score each survivor by

\[
s(v) = \cos(q, v) \cdot \log\bigl(1 + d^{-}(v)\bigr)
\]

and discard any node whose cosine is less than half the best cosine in the pool. The logarithm keeps one enormous hub from erasing a smaller hub that is actually about the question. The cosine floor drops a hub that is large and off topic.

The entry set \(H\) is the \(k\) highest-scoring nodes, with \(k\) between 5 and 10. These are the doors. Everything after this step happens along edges.

A node with no embedding cannot enter \(H\). It can still be reached later, if an edge connects it to a node the walk has already accepted.

## 3. The walk

The walk treats the graph as fully visible. Filtering by \(A(v)\) at this stage would make a locked fact unreachable, and the person who holds it would never be named.

Each hub in \(H\) is a root. The walks share one visited set and one budget. From a node \(u\), both directions are open. Incoming edges are expanded first: they are the facts that made \(u\) large, the mass of evidence aimed at the hub. Outgoing edges continue the trail, toward a revision or a dependent fact.

The edge decides that a neighbour may be considered. The embedding decides whether it is worth taking. A hub may have thousands of in-edges, so each expansion keeps only a beam of \(b = 8\) neighbours, the ones with the greatest cosine to \(q\). A neighbour \(w\) joins the walk when it is new and

\[
\cos(q, w) \ge \max\bigl(\tau,\; \cos(q, u) - \delta\bigr),
\]

with a floor \(\tau = 0.20\) and a slack \(\delta = 0.05\). The floor refuses a hop into an unrelated region. The slack allows a single step through a bridge that sits slightly off the question, on the way to a closer fact.

Three limits bound the walk, shared by every root:

- depth 3, which is the hub, the facts that point at it, and one step past those facts;
- beam 8 at every expansion;
- a visit budget of 48 nodes.

The best fact is the visited node nearest the question,

\[
A^{\star} = \operatorname*{arg\,max}_{v \,\in\, \mathrm{visited}} \cos(q, v).
\]

Ties prefer higher in-degree, then the node reached earlier. The path from its entry hub to \(A^{\star}\) is kept: it is the provenance of the hit, and it is the ground on which a visible substitute is chosen. \(A^{\star}\) may be the hub itself. A large node is allowed to be the answer, not only the door into one.

## 4. Access

Only here does the asker \(p\) enter.

If \(p \in A(A^{\star})\), the best fact is also the readable fact. The reply is the text of \(A^{\star}\). There is nothing further to ask for.

If \(p \notin A(A^{\star})\), the reply has two parts, and both are required.

**The readable answer.** Let \(G'\) be the subgraph of visited nodes and the edges the walk actually crossed. Among visited nodes that \(p\) can see, choose \(A_{p}\) by this order:

1. fewest hops from \(A^{\star}\) in \(G'\);
2. greatest cosine with \(A^{\star}\);
3. greatest cosine with \(q\).

Hop count alone ties every sibling under a hub. Similarity to \(A^{\star}\) breaks the tie toward the node that means the same thing. Similarity to \(q\) keeps a near copy about a different subject from winning. \(A_{p}\) is what the asker reads. If the walk touched nothing \(p\) can see, there is no readable answer, and the reply carries only the referral.

**The holder.** The people to ask are \(A(A^{\star}) \setminus \{p\}\), the holders of the stronger fact. The reply may say that a better fact exists and who holds it. It may not include the sentence.

Showing both is the point of running the walk without access. A search that never left the asker's visible subgraph would return \(A_{p}\) and stop, with no evidence that anything better was nearby and no one to send the asker to. A search that returned \(A^{\star}\) outright would hand over a fact the asker is not allowed to have. The projection keeps the stronger fact as a pointer and the weaker one as prose.

## 5. A question, followed through

Someone asks when the December payroll cut-off falls. The embedding lands near a payroll hub of high in-degree and near a one-off calendar note. The size-aware score keeps the hub.

The walk prefers the edges into that hub and stops on the node that states the cut-off date. That node is \(A^{\star}\). The asker is not in its access set. Two hops away on the same walk is an older, visible note that names the usual cut-off week. That note is \(A_{p}\) and is what gets read back. The holder of \(A^{\star}\) is named as the person to ask for the exact date.

## 6. What the procedure guarantees

The entry probe examines a fixed pool, independent of how large the graph becomes. The walk examines at most 48 nodes and, at each, a beam of 8 neighbours. The access step is a shortest-path computation on that same small subgraph. Cost sits in the walk, and the walk is capped where hubs are widest.

Three properties follow from the order of the stages.

The best fact is chosen on the full graph, so a missing permission cannot hide it from the search. The text returned to the asker is always drawn from a node in their access set, or withheld entirely. Whenever those two nodes differ, the holders of the better one are part of the result, computed from the access set of \(A^{\star}\) and from the path that connected it to \(A_{p}\).
