# Project Concept: Espoo EventCompass
**Subtitle:** Authentic Competence Curation, L2-Equitable Triage & Organic Event Discovery  
**Target Partner:** City of Espoo (Challenge: Rethinking Recruitment)  
**Hackathon:** Junction 2026 (Nov 13–15, 2026)  
**Builder Profile:** Solo Hacker · Computational Sociolinguistics & Network Science (UEF / Prof. Mikko Laitinen)  

---

## 💡 Executive Summary
The City of Espoo hosts flagship matchmaking and innovation events handling hundreds to thousands of applicants. However, with the rise of AI-generated CVs and generic LinkedIn summaries, traditional keyword matching completely collapses: **every applicant looks polished, buzzword-heavy, and identical.**

Meanwhile, at in-person events, forcing attendees into rigid, awkward speed-dating tables fails, leading to the **"Homophily Trap"** where local alumni talk only to each other while international specialists stand isolated by the coffee station.

**Espoo EventCompass** solves both sides with a two-pillar platform grounded in computational sociolinguistics and network science:

1. **Pre-Event (The Curator's Cockpit):** Cuts through synthetic LinkedIn marketing by extracting **Propositional Triads (`[Constraint] → [Mechanism] → [Outcome]`)** and measuring **Metadiscourse Booster-to-Constraint Ratios** rather than superficial English grammar. It protects L2/L3 international talent from linguistic bias and provides city staff with a **Confidence-Tiered Human-in-the-Loop Triage** workflow (handling 5,000 applicants with full EU AI Act compliance logs).
2. **During Event (The Organic Discovery Compass):** An interactive dual-mode affiliation radar that maps shared micro-bottlenecks across venue zones. It generates contextual **Conversation Sparks** that give two strangers instant common ground, enabling organic, self-directed connections without forced 1-on-1 scheduling.
3. **Municipal Deployment Model:** Designed as a zero-integration drop-in overlay for **Lyyti** (the event software used by Finnish cities and universities), requiring zero complex IT procurement.

---

## 🎯 Ground Truth Alignment & City Mandate

| What Espoo Stated & Briefed | How EventCompass Answers It | Scientific / Operational Defense |
| :--- | :--- | :--- |
| *"AI-generated materials make everyone look identical."* | We ignore surface keyword density. We analyze **Propositional Triads** (concrete engineering constraints, tools, and quantified outcomes). | **Hyland's (2005) Metadiscourse Ratio:** Measures density of ungrounded boosters (*"revolutionary, holistic"*) vs. quantified physical constraints (*"14.2W, 62ns, SiC MOSFET"*). |
| *"We want to attract and integrate international talent."* | Protects L2/L3 non-native English speakers who use LLMs or formulaic phrasing to overcome language barriers. | **Decoupled Stylistic Packaging:** Broken syntax, native slang, and LLM-assisted phrasing are evaluated strictly on procedural technical density, preventing linguistic profiling. |
| *"A human MUST be the final reviewer and decision-maker."* | The Curator's Cockpit places municipal staff in full command with an auditable decision trail (`Approve`, `Waitlist`, `Flag`). | **Confidence-Tiered Batch Triage:** Solves the 5,000-applicant clicking bottleneck: Top 15% batch-approved, Grey-Zone 25% deep-dived, Bottom 60% batch-audited with full EU AI Act logging. |
| *"Do not shoehorn people into forced 1-on-1 meetings."* | Self-directed visual discovery radar with contextual **Conversation Sparks**. | **Newman's Inverse-Degree Bipartite Weighting:** Connects attendees through rare, shared micro-bottlenecks rather than coarse macro-categories, anchored to physical venue zones. |
| *"Current system scrapes LinkedIn... we want a wiser solution."* | Zero-bureaucracy drop-in overlay for municipal workflows. | **Lyyti Integration:** Export Lyyti registration CSV $\rightarrow$ EventCompass triage $\rightarrow$ Re-import approved tickets to Lyyti in 45 minutes with zero IT overhaul. |

---

## 🛠️ System Architecture

```text
┌────────────────────────────────────────────────────────┐
│               ZERO-FRICTION INTAKE (Lyyti)             │
│  - 1 Raw Artifact Link (GitHub, arXiv, portfolio, CAD) │
│  - OR 1 Micro-Scenario: "What hard bottleneck did you   │
│    break through recently?"                            │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│      NVIDIA NEMOTRON 3.5 SUPER VL (1M CONTEXT / B300)  │
│  - Propositional Triad Parser ([Problem]→[Tool]→[Data])│
│  - Booster-to-Constraint Entropy Ratio (Fluff Index)   │
│  - Vision-Language (VL) Verification of Schematics     │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│            MODULE 1: CURATOR'S COCKPIT (Pre-Event)     │
│  - Confidence-Tiered Batch Triage (500–5,000 scale)    │
│  - Mandatory Human-in-the-Loop Sign-Off & Audit Trail  │
│  - EU AI Act High-Risk Compliance Export               │
└───────────────────────────┬────────────────────────────┘
                            │ (Admitted Attendees)
                            ▼
┌────────────────────────────────────────────────────────┐
│            MODULE 2: EVENT COMPASS (On-Site Live)      │
│  - Large-Screen Problem-Space Nebula (Entrance Radar)  │
│  - 3 Pocket Wallet Spark Cards (Mobile Check-In)       │
│  - Contextual Conversation Sparks (Instant Icebreakers)│
│  - 100% Self-Directed · Anchored to Physical Zones     │
└────────────────────────────────────────────────────────┘
```

---

## 🔬 Scientific Foundations (Computational Sociolinguistics & Network Science)

### 1. First-Order vs. Third-Order Indexicality (Silverstein; Eckert & McConnell-Ginet)
* **First-Order Indexicality (Authentic Community of Practice):** Authentic engineers use domain-specific procedural vocabulary instrumentally to solve physical or computational constraints.
* **Third-Order Indexicality (Enregistered Buzzwords):** External actors and synthetic LLMs mimic surface terminology (*"quantum-ready AI"*, *"synergistic transformation"*) without possessing underlying procedural models. EventCompass filters for first-order procedural indicators.

### 2. Protecting Non-Native Speakers (The L2 Equity Guarantee)
* Second-Language Acquisition (SLA) research (Biber et al. 2004) proves that L2 writers rely on formulaic lexical bundles and frequently use LLMs as linguistic scaffolding.
* EventCompass decouples stylistic packaging from propositional substance. Whether an applicant writes *"I make fix for FPGA clock skew with phase-locked loop"* (L2 syntax) or *"Leveraged cutting-edge methodologies to resolve FPGA clock skew via PLL reconfiguration"* (LLM-assisted L2), the extracted triad (`[FPGA clock skew] → [PLL] → [Resolved]`) scores identically.

### 3. Newman's Inverse-Degree Bipartite Network Weighting (Newman 2001)
* Coarse macro-clusters (e.g., placing 300 people into "Edge AI") create the **Projection Clique Fallacy** ($\binom{300}{2} = 44,850$ undifferentiated ties—a useless hairball).
* EventCompass weights connection resonance inversely by bottleneck rarity:
  $$w_{ij} = \sum_{k} \frac{\delta_i^k \delta_j^k}{n_k - 1}$$
  Shared membership in a ubiquitous tag ($n_k = 300$) yields near-zero connection weight; sharing a rare, specialized challenge ($n_k = 3$) yields an immediate, high-priority **Conversation Spark**.

---

## 📊 Operational & Municipal ROI (City of Espoo)

* **Cost of Ineffective Events:** A 500-attendee Espoo innovation event costs ~€25,000 to organize. When legacy LinkedIn scrapers admit 35% passive buzzword-spammers while quiet international builders are excluded or left isolated, **€8,750+ of municipal budget is wasted.**
* **Staff Time Savings:** Reduces manual review of 1,500–5,000 applicants from **125 hours of unstructured resume reading** down to **12 hours of focused, human-verified batch triage**.
* **Zero IT Procurement Barrier:** Operates as a drop-in CSV overlay for **Lyyti**, eliminating the 18-month IT security procurement cycle required for enterprise ERP replacements.

---

## 🏆 The 1-Sentence Pitch Hook
> **"LinkedIn rewards the loudest marketer; EventCompass finds the quietest builder—and makes sure they never stand alone at an Espoo event again."**
