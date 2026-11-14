# Independent Red-Team Audit & Critical Evaluation Dossier

## 1. The Real-World Problem Statement (City of Espoo)
* **Official Brief:** "How can recruitment and matchmaking events organized by City of Espoo help companies and talent relevantly find and connect with each other, despite AI-generated job search materials and AI-assisted recruitment processes becoming common?"
* **Direct Mentor Intel (Marika & Melissa, City of Espoo):**
  - **Not Traditional Recruitment:** The city is NOT trying to build an ATS or job board. Their headache is **Event Admissions Curation & Match Quality**.
  - **Scale & Asymmetry:** At peak, 5,000 people apply for 1,500 seats. In recent specialized events, ~500 apply for ~150 seats.
  - **The "Two-Sided Description Gap":** Talented professionals struggle to communicate what they can actually contribute (resumes are either sparse or inflated with ChatGPT fluff). Companies struggle to articulate what they actually need (job descriptions are generic corporate boilerplate).
  - **The Current Solution Fails:** Espoo currently uses an external AI tool that scans applicants' LinkedIn URLs. Mentors state it fails because every profile now looks polished and identical with AI keywords, drowning out real competence.
  - **Non-Negotiables:**
    1. Human-in-the-loop: City staff MUST be the final decision-maker.
    2. Before & during the event (and after/follow-up).
    3. NO forced shoehorning into rigid 1-on-1 calendar tables. Attendees must keep autonomy.

---

## 2. What We Actually Built in 12 Hours (The Reality Check)
A working React 18 + TypeScript web prototype running locally (`/Volumes/United/Junction 2026/src/`), hooked to an NVIDIA Nemotron 3.5 Super VL model on a B300 GPU cluster:
1. **Curator Cockpit (Pre-Event Admin):**
   - Displays a queue of 10 mock applicants.
   - Toggle comparing a naive "Legacy LinkedIn Scorer" (ranks buzzword spammers high) vs. our "Artifact Triage" (ranks concrete answers high).
   - Sticky human decision buttons (`Approve`, `Waitlist`, `Flag`).
   - Live AI reasoning trace box querying Nemotron 3.5 on B300.
2. **The Event Compass (On-Site Discovery):**
   - 2D SVG spatial radar grouping companies and attendees into 5 broad thematic zones (Edge AI, Quantum, CleanTech, Sovereign Cloud, BioTech).
   - Perspective switcher showing resonance lines to companies and peers.
   - "Conversation Spark" box displaying a 2-sentence technical talking point / icebreaker.
3. **Live AI Intake & De-Jargonizer:**
   - Form taking applicant text and querying Nemotron to score "Fluff Index" vs. "Competence Score".
   - Form taking corporate HR job ads and extracting 3 technical bottlenecks.
4. **Scale & ROI Simulator:**
   - Sliders from 500 to 5,000 applicants calculating staff hours saved.

---

## 3. The Uncomfortable Questions & Suspected Naiveties
We want a ruthless, cold-blooded examination of our work. Address these specific tensions:

1. **The "Two-Sided Description Problem" — Did we actually solve it, or just invent a prompt?**
   - Companies write vague job ads because hiring managers don't give HR the real details, or because company needs change week-to-week. Does an AI "de-jargonizer" actually solve organizational dysfunction, or is it just wishful thinking?
   - If an applicant struggles to articulate what they can do, why would they suddenly write a brilliant answer to our "micro-scenario prompt"?
2. **The Cold-Start & Low-Data Reality:**
   - Many of the best builders don't have public GitHub repos (proprietary code, enterprise NDAs, hardware lab work). If our system penalizes candidates who lack public artifacts, are we just creating a new bias favoring open-source hobbyists?
3. **The Event Floor Reality (The Social Friction Problem):**
   - Does a "Conversation Spark" on a screen actually make an introverted immigrant engineer walk up to a senior director in a loud room? What happens when the company rep is already surrounded by 4 people?
4. **The "After the Event" Void:**
   - The brief explicitly asked for solutions addressing "before, during, or after... registering to, attending, and following-up". Our prototype has ZERO follow-up features. What happens on Monday morning after the event ends?
5. **The Public Sector Procurement Reality:**
   - Finnish municipalities have strict equality, accessibility, and anti-discrimination laws. Does an AI triage system—even with human sign-off—create legal liabilities under the EU AI Act (Annex III High-Risk AI in Employment/Education/Services)?

---

## 4. Prompt for External AI (ChatGPT / Claude Opus / Gemini Pro)
*Copy and paste everything above into an external AI, and append this prompt:*

> "You are an expert in municipal governance, human resources technology, and labor market economics. Review the above project dossier critically.
> Do NOT flatter this prototype. Tear it apart from first principles. 
> 1. Where is this solution naive about human behavior and municipal bureaucracy?
> 2. What are the 3 biggest operational failure modes if the City of Espoo actually tried to use this next month?
> 3. What concrete, practical adjustments must be made so this isn't just a hackathon toy, but a defensible, deployable system?"
