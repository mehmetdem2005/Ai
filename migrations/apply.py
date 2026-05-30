"""Supabase Management API üzerinden bir migration SQL dosyasını uygular.

Çağrı:
    SUPABASE_PAT=sbp_xxx SUPABASE_PROJECT_REF=wsiossnmvuoemirsjwaw \\
        python3 migrations/apply.py migrations/2026_admin.sql

PAT ve project_ref env'den okunur — repo'da hiçbir şekilde saklı değildir.
"""
import os
import sys
import pathlib
import json
import urllib.request
import urllib.error


def apply_sql(project_ref: str, pat: str, sql: str) -> dict:
    url = f"https://api.supabase.com/v1/projects/{project_ref}/database/query"
    req = urllib.request.Request(
        url,
        data=json.dumps({"query": sql}).encode("utf-8"),
        method="POST",
        headers={
            "Authorization": f"Bearer {pat}",
            "Content-Type": "application/json",
            "User-Agent": "Sovereign-Migrate/1.0 (curl-compatible)",
            "Accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            return {"status": resp.status, "body": resp.read().decode("utf-8")}
    except urllib.error.HTTPError as e:
        return {"status": e.code, "body": e.read().decode("utf-8", errors="replace")}


def main() -> int:
    if len(sys.argv) < 2:
        print("kullanım: python3 migrations/apply.py <migration.sql>", file=sys.stderr)
        return 2
    sql_path = pathlib.Path(sys.argv[1])
    if not sql_path.is_file():
        print(f"dosya yok: {sql_path}", file=sys.stderr)
        return 2

    pat = os.environ.get("SUPABASE_PAT")
    ref = os.environ.get("SUPABASE_PROJECT_REF")
    if not pat:
        print("env SUPABASE_PAT lazım (Supabase personal access token, sbp_...)", file=sys.stderr)
        return 2
    if not ref:
        supa_url = os.environ.get("SUPABASE_URL", "")
        if "supabase.co" in supa_url:
            ref = supa_url.split("//", 1)[-1].split(".", 1)[0]
    if not ref:
        print("env SUPABASE_PROJECT_REF lazım (örn. wsiossnmvuoemirsjwaw)", file=sys.stderr)
        return 2

    sql = sql_path.read_text(encoding="utf-8")
    print(f"→ {sql_path} ({len(sql):,} char) → project {ref}")
    result = apply_sql(ref, pat, sql)
    print(f"HTTP {result['status']}")
    print(result["body"][:2000])
    return 0 if 200 <= result["status"] < 300 else 1


if __name__ == "__main__":
    sys.exit(main())
