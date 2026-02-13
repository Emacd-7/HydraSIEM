# Comparative Analysis: Graph-based Intrusion Detection vs. Traditional Flat Logs

This document provides a technical comparison between Project Hydra's Graph-based Fusion Engine and traditional SIEM approaches that rely on flat log lists.

## 1. Data Representation

| Feature | Traditional SIEM (Flat Logs) | Project Hydra (Graph-based) |
| :--- | :--- | :--- |
| **Structure** | Linear, chronological list of events (rows & columns). | Network of nodes (Users, IPs, Resources) and edges (Interactions). |
| **Context** | Single-event focus. Correlating separate events requires complex queries. | Inherently relational. "User A" is directly connected to "Server B". |
| **Dimensionality** | High volume, low operational density. 10,000 logs = 10,000 rows. | High density. 10,000 logs might condense into 50 nodes and 200 edges. |

## 2. Detection Logic

### Traditional: Signature & Thresholds
Traditional detection relies heavily on:
*   **Signatures**: "If specific string found, alert."
*   **Thresholds**: "If > 5 failures in 1 minute, alert."
*   **Weakness**: Misses "Low & Slow" attacks or complex lateral movement that spans days and multiple accounts.

### Hydra: Risk Fusion & Community Detection
Hydra utilizes:
*   **Community Detection (Louvain)**: Identifies clusters of unrelated accounts interacting with the same obscure resources (indicating a botnet or coordinated attack).
*   **Graph Centrality**: Identifies compromised "bridge" nodes that connect sensitive internal clusters to external IPs.
*   **Risk Propagation**: If a file is "infected" (high risk), any user who touches it inherits risk points automatically via the edge connection.

## 3. Incident Response Efficiency

| Metric | Traditional Workflow | Hydra Workflow |
| :--- | :--- | :--- |
| **Triage Time** | **High**. Analysts must manually sift through hundreds of "Critical" alerts to find false positives. | **Low**. The Fusion Engine pre-clusters related alerts. Top-level risk scores prioritize attention. |
| **Forensics** | **Manual Joins**. "Show me what else IP X touched." -> Wait for query -> "Now show me IP Y." | **Visual Traversal**. Click Node X -> See immediate neighbors. Visual pathfinding reveals the attack chain instantly. |
| **Explainability** | "Rule 104 triggered." (Obscure) | "User X is High Risk because they accessed 5 High-Sensitivity databases at 3 AM outside their usual community." (Semantic) |

## 4. Conclusion

While flat logs are essential for compliance and raw storage, they are insufficient for modern threat hunting. **Project Hydra's graph approach transforms "Data" into "Intelligence"**, allowing SOC analysts to see the *structure* of an attack rather than just its *symptoms*.
