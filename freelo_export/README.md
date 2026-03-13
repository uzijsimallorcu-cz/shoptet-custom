# Freelo API export pro následný import do ClickUp

Tato složka obsahuje připravený exportér, který stáhne data z Freelo API do JSON souborů tak, aby šly dál transformovat/importovat do ClickUp.

Exportér cílí na požadované entity:
- projects
- labels
- pinned items
- tasklists
- tasks
- subtasks
- comments
- users
- files
- notes

## Co skript dělá
1. Načte všechny projekty (`projects`) jako základ.
2. Stáhne globální entity (`users`, `labels`, `pinned_items`).
3. Pro každý projekt stáhne projektové entity (`tasklists`, `tasks`, `subtasks`, `comments`, `files`, `notes`).
4. Uloží výstup:
   - agregovaně po entitách (`out/freelo_export/<entity>.json`)
   - detailně po projektech (`out/freelo_export/by_project/<entity>.json`)
   - souhrn (`out/freelo_export/summary.json`)

## Instalace
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r freelo_export/requirements.txt
```

## Konfigurace
1. Zkopíruj `.env.example` a nastav token + parametry podle Freelo dokumentace.
2. Zkontroluj endpointy v `endpoints.freelo.v1.example.json` a případně uprav přesnou cestu dle dokumentace.

> Poznámka: API schéma se může lišit podle verze/tenantu Freelo, proto jsou endpointy i paginace záměrně konfigurovatelné.

## Spuštění
### 1) Kontrola (bez volání API)
```bash
python freelo_export/export_freelo_data.py --dry-run --endpoints-config freelo_export/endpoints.freelo.v1.example.json
```

### 2) Reálný export
```bash
export FREELO_API_TOKEN='...'
python freelo_export/export_freelo_data.py \
  --endpoints-config freelo_export/endpoints.freelo.v1.example.json \
  --output out/freelo_export
```

## Důležité přizpůsobení podle Freelo API dokumentace
Před ostrým během ověř v dokumentaci:
- Base URL (`FREELO_API_BASE_URL`)
- Auth hlavičku + formát tokenu (`FREELO_AUTH_HEADER`, `FREELO_AUTH_SCHEME`)
- Paginaci (`page/per_page` vs `offset/limit` nebo `links.next`)
- Přesné endpointy pro každou entitu (globální vs projektově scoped)
- Limity API (rate-limit) a případně navýšit `FREELO_PAUSE_MS`

## Výstupní struktura
```text
out/freelo_export/
  projects.json
  users.json
  labels.json
  pinned_items.json
  tasklists.json
  tasks.json
  subtasks.json
  comments.json
  files.json
  notes.json
  summary.json
  by_project/
    tasklists.json
    tasks.json
    subtasks.json
    comments.json
    files.json
    notes.json
```

## Co dál pro ClickUp import
Doporučený další krok je transformační skript `Freelo JSON -> ClickUp CSV/JSON`, který mapuje:
- project -> Space/Folder/List
- tasklist -> List/Section
- task + subtask -> Task/Subtask
- users -> assignee map
- labels -> tags
- comments -> task comments
- files -> attachments
- notes -> docs/comments podle cílové struktury
