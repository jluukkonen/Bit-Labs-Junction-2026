# Junction 2026 — City of Espoo Challenge
> **Project:** Espoo EventCompass (Admissions Curation & Organic Discovery)  
> **Challenge:** Rethinking Recruitment / Event Admissions & Competence Curation  
> **Hacker:** Solo  
> **Venue:** Hype Areena, Espoo | Nov 13–15, 2026  

---

## 📁 Repository Structure

```text
/Volumes/United/Junction 2026/
├── docs/
│   ├── mentor_debrief_espoo.md       # Live notes & intel directly from Espoo booth
│   ├── project_concept.md            # Architecture, two modules, UX flow, and AI logic
│   ├── discord_transcripts/          # Discord channel dumps (#espoo, #announcements, etc.)
│   ├── challenge_briefs/             # Junction platform challenge descriptions & rules
│   └── pitch/                        # Pitch script, slides structure, and submission text
├── data/
│   ├── raw/                          # Scraped or raw input data
│   ├── processed/                    # Cleaned / parsed datasets
│   ├── applicants_sample.json        # Test applicants pool (builders, spam, researchers)
│   └── event_profiles.json           # Event themes & admission criteria
├── src/                              # Prototype source code (Cockpit Dashboard & Discovery Map)
└── assets/                           # Diagrams, screenshots, and visual assets
```

---

## 🎯 Core Solution Architecture

1. **Module 1: The Curator's Cockpit (Pre-Event)**
   - Problem: Organizers receive 500–5,000 applicants; current LinkedIn AI matching is generic and buzzword-dominated.
   - Solution: Multi-signal competence evaluator (GitHub/project artifacts, problem-solving responses, actual domain fit) + Explainable scoring + 1-click **Human-in-the-Loop** verification (`Approve`, `Waitlist`, `Flag`).

2. **Module 2: The Event Compass (During Event)**
   - Problem: Attendees and companies get shoehorned into awkward, rigid 1-on-1s or wander aimlessly.
   - Solution: Soft, non-forced organic radar. Attendees explore topic clusters and problem spaces, generating contextual conversation sparks on their own terms.
