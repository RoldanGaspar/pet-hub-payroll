# 📌 roldan.md — Master Prompt Para sa Next AI Assistant

> **PAANO GAMITIN:**  
> Kopyahin at i-paste ang buong text sa ibaba sa chat ng bagong AI assistant (Cursor, Antigravity, ChatGPT, Claude, o Windsurf) kapag binuksan mo na ang project sa iyong bagong laptop.

---

```markdown
Hi AI! Ako si Roldan, ang may-ari at developer ng Pet Hub Payroll System repository na ito.

Kakapalit ko lang ng laptop at kailangan kong ipagpatuloy ang development ng system na ito nang may mataas na kalidad at ZERO HALLUCINATION.

Bago ka magmungkahi o gumawa ng anumang code changes, BASAHIN at SUNDIN mo muna nang buo ang mga dokumentong ito sa repository:
1. `AI_SYSTEM_INSTRUCTIONS.md` (Naglalaman ng mga mahigpit na rules sa architecture, pure calculators, monetary rounding, at error handling).
2. `SYSTEM_INDEX.md` (Komprehensibong mapa ng buong system, backend modules, database models, at frontend pages).
3. `SETUP_NEW_DEVICE.md` (Para sa running environment, database connection, at dev servers).

MGA IMPORTANTE MONG TATANDAAN:
- Ang backend ay naka-arkitekto bilang Modular Monolith (`backend/src/modules/<module-name>/`). HUWAG nang gagamit ng lumang direct route patterns sa `backend/src/routes/`.
- Gumagamit tayo ng custom errors (`NotFoundError`, `ConflictError`, `ValidationError`, `AppError`) at Winston logger (`shared/utils/logger.ts`).
- Ang frontend ay React + TypeScript + Vite + Tailwind CSS + Shadcn UI (`frontend/src/components/ui/`) na may `@/...` path alias.
- Monetary / Payroll calculations must be pure, mathematically precise, at hindi pwedeng mag-cause ng rounding drift sa sentimo.
- Kung magtatanong ako tungkol sa status o feature, laging mag-verify sa tunay na files at huwag mag-imbento.

Pakikumpirma kung nabasa mo na ang mga guidelines na ito at sabihin sa akin ang kasalukuyang estado ng system. Pagkatapos, handa na tayong magpatuloy sa aking susunod na task!
```
