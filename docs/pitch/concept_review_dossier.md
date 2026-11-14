# Espoo EventCompass: Project Review & Critical Critique Dossier
**Target Hackathon:** Junction 2026 (Nov 13–15, 2026)  
**Track:** City of Espoo — *Rethinking Recruitment* (1st Prize: €1,500 | Total Pool: €3,000)  
**Builder Profile:** Solo hacker with a background in Computational Sociolinguistics and Social Network Analysis (University of Eastern Finland / Prof. Mikko Laitinen).  
**Tech Stack:** React 18, TypeScript, Tailwind CSS, NVIDIA Nemotron 3.5 Super VL (1M context on B300 cluster), Google Gemini.

---

## 1. The Core Ground Truth & Problem (Direct from Espoo Mentors)
* **The Reality:** Despite the title "Rethinking Recruitment", Espoo explicitly clarified that **traditional hiring is NOT their priority**. The real pain point is **Event Admissions & Quality Curation**.
* **The Scale:** Espoo hosts flagship matchmaking and innovation events handling **500 to 5,000 applicants for 150 to 1,500 seats**.
* **Current Failure Mode:** Espoo currently uses an external AI solution that scrapes applicants' **LinkedIn profiles**. It fails because LinkedIn is flooded with AI-generated buzzwords and polished keyword-stuffing: *everyone looks qualified and identical, but real competence signal is lost.*
* **Non-Negotiable Constraints from Mentors:**
  1. **Human-in-the-Loop is Mandatory:** A human municipal organizer MUST make the final admission decision (compliance, ethics, fairness). AI assists and explains; it never makes black-box rejections.
  2. **Before and During the Event:** Must cover pre-event admissions curation and on-site attendee interaction.
  3. **NO Forced Shoehorning:** Must NOT force people into rigid 1-on-1 calendar appointments. The choice of who to talk to must remain organic and attendee-driven.

---

## 2. What Is Already Built & Running in the Working Prototype
The web application is fully coded, built with zero TypeScript errors, and running locally:

1. **The Curator's Cockpit (Pre-Event Admin View):**
   - **Ranking Engine Toggle (Live Demo Mode):** 1-click toggle comparing *"Legacy LinkedIn AI"* (which puts buzzword spammers at 95% and buries quiet builders at 48%) vs. *"EventCompass Artifact Triage"* (which rescues hidden gems and flags synthetic text).
   - **Mandatory Human-in-the-Loop Gate:** Sticky curator action bar (`Approve Ticket`, `Waitlist`, `Flag`) with reviewer notes and timestamps.
   - **Explainable Reasoning Trace:** Live integration with NVIDIA Nemotron 3.5 Super VL streaming step-by-step chain-of-thought justifications.
2. **The Event Compass (On-Site Organic Discovery View):**
   - **2D Problem-Space Nebula Radar:** Interactive spatial map with 5 clusters (Edge AI, Quantum, CleanTech, Sovereign Cloud, BioTech).
   - **Perspective Switcher:** View the map through any admitted attendee's lens. Dynamic resonance lines highlight mutual technical challenges without forced bookings.
   - **Contextual Conversation Sparks:** Pre-computed and live AI-synthesized icebreakers that give two strangers an immediate technical problem to discuss instead of awkward small talk.
3. **Live AI Intake & De-Jargonizer Studio:**
   - **Talent Intake:** Compares surface CV claims vs. micro-scenario answers and verified code/hardware artifacts.
   - **Company Need De-Jargonizer:** Strips corporate HR fluff (*"10x AI Rockstar Ninja"*) into 3 testable technical bottlenecks and scenario questions.
4. **Espoo Scale Simulator & Governance:**
   - Interactive slider from 500 to 5,000 applicants calculating staff triage hours saved (e.g. 100+ hours) and 100% EU AI Act human-audit compliance.

---

## 3. The New Scientific Inspirations (Network Science & Corpus Linguistics)
Rather than positioning this as generic "AI matching", we ground the product in proven network and language science principles:

1. **Corpus Keyness (Fluff Detection):** Inspired by statistical corpus linguistics (measuring term overrepresentation against reference corpora). We separate authentic engineering depth from synthetic ChatGPT prose by measuring collocation entropy and rare domain terms vs. generic PR filler.
2. **Granovetter’s Weak Ties & Structural Holes:** International talent in Finland lacks strong-tie social networks (alumni, family circles). Left alone, events devolve into strong-tie homophily (locals talking to locals). EventCompass acts as a **structural bridge generator**, using shared technical problem spaces to connect peripheral foreign builders directly to central company nodes.
3. **Emergent Modularity (Gephi Community Detection):** Avoiding rigid, top-down category tags. The event floor self-organizes around active technical bottlenecks.
4. **Tie-Potential via Affiliation Foci (Scott Feld):** Tie strength is modeled as an overlap between an applicant's verified artifacts and a company's active bottlenecks.

---

## 4. Specific Questions for External Critical Review
Please review this project critically from the perspective of an experienced hackathon judge, municipal tech consultant, and senior engineer:

1. **Blind Spots & Weaknesses:** What are the most obvious flaws, potential user frictions, or red flags a city official or judge might see in this concept?
2. **Scientific Grounding vs. Over-Engineering:** Does the network science / corpus keyness framing elevate the pitch, or does it risk sounding too academic? How can we communicate it so a non-technical city organizer immediately "gets" it?
3. **Live Demo Polish:** Given that we already have a working web dashboard, what is the single most impactful feature or tweak we can show at the booth to lock in 1st place?
4. **Feasibility & Ethical Guardrails:** Does our "human-in-the-loop" curation model adequately address EU AI Act requirements and public sector fairness?
