#!/usr/bin/env python3
"""Freelo API export utility for migration/import workflows.

This script exports projects and related entities into JSON files.
Endpoints and auth behavior are configurable so you can align it with
Freelo API documentation updates without changing code.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional
from urllib.parse import urljoin



DEFAULT_ENDPOINTS = {
    "projects": {
        "path": "/projects",
        "method": "GET",
        "project_scoped": False,
        "params": {},
    },
    "labels": {
        "path": "/labels",
        "method": "GET",
        "project_scoped": False,
        "params": {},
    },
    "pinned_items": {
        "path": "/pinned-items",
        "method": "GET",
        "project_scoped": False,
        "params": {},
    },
    "tasklists": {
        "path": "/projects/{project_id}/tasklists",
        "method": "GET",
        "project_scoped": True,
        "params": {},
    },
    "tasks": {
        "path": "/projects/{project_id}/tasks",
        "method": "GET",
        "project_scoped": True,
        "params": {},
    },
    "subtasks": {
        "path": "/projects/{project_id}/subtasks",
        "method": "GET",
        "project_scoped": True,
        "params": {},
    },
    "comments": {
        "path": "/projects/{project_id}/comments",
        "method": "GET",
        "project_scoped": True,
        "params": {},
    },
    "users": {
        "path": "/users",
        "method": "GET",
        "project_scoped": False,
        "params": {},
    },
    "files": {
        "path": "/projects/{project_id}/files",
        "method": "GET",
        "project_scoped": True,
        "params": {},
    },
    "notes": {
        "path": "/projects/{project_id}/notes",
        "method": "GET",
        "project_scoped": True,
        "params": {},
    },
}


@dataclass
class AuthConfig:
    header_name: str
    header_value: str


class FreeloExporter:
    def __init__(
        self,
        base_url: str,
        auth: AuthConfig,
        endpoints: Dict[str, Dict[str, Any]],
        page_param: str,
        per_page_param: str,
        per_page_value: int,
        max_pages: int,
        pause_ms: int,
        timeout_s: int,
    ) -> None:
        self.base_url = base_url.rstrip("/") + "/"
        self.default_headers = {
            auth.header_name: auth.header_value,
            "Accept": "application/json",
            "User-Agent": "freelo-export-script/1.0",
        }
        self.endpoints = endpoints
        self.page_param = page_param
        self.per_page_param = per_page_param
        self.per_page_value = per_page_value
        self.max_pages = max_pages
        self.pause_ms = pause_ms
        self.timeout_s = timeout_s

    def _extract_items(self, payload: Any) -> List[Dict[str, Any]]:
        if isinstance(payload, list):
            return payload
        if isinstance(payload, dict):
            for key in ("data", "results", "items", "records"):
                value = payload.get(key)
                if isinstance(value, list):
                    return value
        raise ValueError(
            "Unsupported response format. Adjust extraction in _extract_items()."
        )

    def _next_link(self, payload: Any) -> Optional[str]:
        if not isinstance(payload, dict):
            return None
        for path in (("links", "next"), ("pagination", "next"), ("next",)):
            node = payload
            for key in path:
                if not isinstance(node, dict):
                    node = None
                    break
                node = node.get(key)
            if isinstance(node, str) and node:
                return node
        return None

    def _fetch_paginated(self, path: str, params: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        all_items: List[Dict[str, Any]] = []
        page = 1
        next_url: Optional[str] = None

        while page <= self.max_pages:
            request_params = dict(params or {})
            if next_url:
                url = next_url
            else:
                request_params.setdefault(self.page_param, page)
                request_params.setdefault(self.per_page_param, self.per_page_value)
                url = urljoin(self.base_url, path.lstrip("/"))

            if next_url:
                final_url = url
            else:
                query = urllib.parse.urlencode(request_params)
                final_url = f"{url}?{query}" if query else url

            request = urllib.request.Request(final_url, headers=self.default_headers, method="GET")
            try:
                with urllib.request.urlopen(request, timeout=self.timeout_s) as response:
                    payload = json.loads(response.read().decode("utf-8"))
            except urllib.error.HTTPError as exc:
                body = exc.read().decode("utf-8", errors="ignore")
                raise RuntimeError(f"HTTP {exc.code} {exc.reason}: {body}") from exc

            items = self._extract_items(payload)
            all_items.extend(items)

            next_url = self._next_link(payload)
            if next_url:
                page += 1
                if self.pause_ms:
                    time.sleep(self.pause_ms / 1000)
                continue

            if len(items) < self.per_page_value:
                break

            page += 1
            if self.pause_ms:
                time.sleep(self.pause_ms / 1000)

        return all_items

    def fetch_entity(self, entity_name: str, project_id: Optional[Any] = None) -> List[Dict[str, Any]]:
        config = self.endpoints[entity_name]
        raw_path = config["path"]
        path = raw_path.format(project_id=project_id) if "{project_id}" in raw_path else raw_path
        return self._fetch_paginated(path=path, params=config.get("params") or {})


def load_json(path: Optional[str]) -> Optional[Dict[str, Any]]:
    if not path:
        return None
    with open(path, "r", encoding="utf-8") as fh:
        return json.load(fh)


def upsert_by_id(items: Iterable[Dict[str, Any]]) -> List[Dict[str, Any]]:
    seen: Dict[str, Dict[str, Any]] = {}
    fallback_counter = 0
    for item in items:
        if not isinstance(item, dict):
            continue
        key = item.get("id")
        if key is None:
            fallback_counter += 1
            key = f"__missing_id_{fallback_counter}"
        seen[str(key)] = item
    return list(seen.values())


def build_auth(args: argparse.Namespace) -> AuthConfig:
    token = args.token or os.environ.get("FREELO_API_TOKEN")
    if not token:
        raise SystemExit(
            "Missing API token. Use --token or set FREELO_API_TOKEN environment variable."
        )

    header_name = args.auth_header or os.environ.get("FREELO_AUTH_HEADER", "Authorization")
    scheme = os.environ.get("FREELO_AUTH_SCHEME", "Bearer")

    if args.raw_auth_value:
        header_value = args.raw_auth_value
    else:
        header_value = f"{scheme} {token}".strip()

    return AuthConfig(header_name=header_name, header_value=header_value)


def save_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Export Freelo data for ClickUp import.")
    parser.add_argument("--token", help="Freelo API token (alternative to FREELO_API_TOKEN).")
    parser.add_argument("--auth-header", default=None, help="Authorization header name, default Authorization.")
    parser.add_argument("--raw-auth-value", default=None, help="Use exact header value instead of FREELO_AUTH_SCHEME + token.")
    parser.add_argument("--base-url", default=os.environ.get("FREELO_API_BASE_URL", "https://api.freelo.io/v1"))
    parser.add_argument("--output", default="out/freelo_export", help="Directory for exported JSON files.")
    parser.add_argument("--endpoints-config", default=None, help="Optional JSON file overriding endpoint definitions.")
    parser.add_argument("--page-param", default=os.environ.get("FREELO_PAGE_PARAM", "page"))
    parser.add_argument("--per-page-param", default=os.environ.get("FREELO_PER_PAGE_PARAM", "per_page"))
    parser.add_argument("--per-page-value", type=int, default=int(os.environ.get("FREELO_PER_PAGE_VALUE", "100")))
    parser.add_argument("--max-pages", type=int, default=int(os.environ.get("FREELO_MAX_PAGES", "1000")))
    parser.add_argument("--pause-ms", type=int, default=int(os.environ.get("FREELO_PAUSE_MS", "50")))
    parser.add_argument("--timeout-s", type=int, default=int(os.environ.get("FREELO_TIMEOUT_S", "30")))
    parser.add_argument("--dry-run", action="store_true", help="Only print planned requests without hitting API.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    endpoints = DEFAULT_ENDPOINTS.copy()
    custom = load_json(args.endpoints_config)
    if custom:
        endpoints.update(custom)

    if args.dry_run:
        print("Dry run mode. Planned entity requests:")
        for name, cfg in endpoints.items():
            scope = "project scoped" if cfg.get("project_scoped") else "global"
            print(f"- {name}: {cfg['path']} ({scope})")
        return 0

    auth = build_auth(args)

    exporter = FreeloExporter(
        base_url=args.base_url,
        auth=auth,
        endpoints=endpoints,
        page_param=args.page_param,
        per_page_param=args.per_page_param,
        per_page_value=args.per_page_value,
        max_pages=args.max_pages,
        pause_ms=args.pause_ms,
        timeout_s=args.timeout_s,
    )

    output_dir = Path(args.output)
    summary: Dict[str, Any] = {"base_url": args.base_url, "entities": {}, "generated_at": int(time.time())}

    print("Fetching projects...")
    projects = exporter.fetch_entity("projects")
    save_json(output_dir / "projects.json", projects)
    summary["entities"]["projects"] = len(projects)

    project_ids = [p.get("id") for p in projects if isinstance(p, dict) and p.get("id") is not None]

    for entity in ("users", "labels", "pinned_items"):
        if entity not in endpoints:
            continue
        print(f"Fetching {entity}...")
        items = exporter.fetch_entity(entity)
        save_json(output_dir / f"{entity}.json", items)
        summary["entities"][entity] = len(items)

    project_scoped_entities = [
        name for name, cfg in endpoints.items() if cfg.get("project_scoped") and name != "projects"
    ]

    for entity in project_scoped_entities:
        collected: List[Dict[str, Any]] = []
        by_project: Dict[str, Any] = {}

        for project_id in project_ids:
            print(f"Fetching {entity} for project {project_id}...")
            try:
                items = exporter.fetch_entity(entity, project_id=project_id)
            except RuntimeError as exc:
                by_project[str(project_id)] = {"error": str(exc), "items": []}
                continue

            by_project[str(project_id)] = {"count": len(items), "items": items}
            collected.extend(items)

        deduplicated = upsert_by_id(collected)
        save_json(output_dir / f"{entity}.json", deduplicated)
        save_json(output_dir / "by_project" / f"{entity}.json", by_project)
        summary["entities"][entity] = {
            "deduplicated_count": len(deduplicated),
            "raw_count": len(collected),
        }

    save_json(output_dir / "summary.json", summary)
    print(f"Done. Export stored in: {output_dir}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except RuntimeError as exc:
        print(f"HTTP error: {exc}", file=sys.stderr)
        raise SystemExit(1)
