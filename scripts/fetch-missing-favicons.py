#!/usr/bin/env python3
"""
Fetch missing feed favicons using Google Favicon API.
Runs standalone — no DB or local server needed.
Usage: python3 scripts/fetch-missing-favicons.py
"""
import os
import sys
import json
import urllib.request
import urllib.error
from pathlib import Path

FEEDS_DIR = Path(__file__).parent.parent / "client" / "public" / "images" / "feeds"
GOOGLE_FAVICON_URL = "https://www.google.com/s2/favicons?domain={domain}&sz=64"
GOOGLE_GLOBE_MAX_BYTES = 400  # Google's generic globe for unknown domains is tiny
TIMEOUT = 10

# Map feed UUID → known domain (from homepage API + known news sources)
FEED_DOMAINS = {
    # International
    "f6fb9557-df88-482f-a4f0-c4a86502a087": "mongabay.com",          # Mongabay
    "25a186c4-56b2-44a5-9e83-c2cdc499c3eb": "mongabay.com",          # Mongabay (2nd feed)
    "c0454565-a812-43e3-a9ef-2f28553c144e": "climatechangenews.com",  # Climate Home News
    "1613a1b3-1dc9-44fb-a9b7-887c88a75a93": "filac.org",             # FILAC
    "23c11c6f-55e5-49ad-9189-2596f43f509a": "conaf.cl",              # CONAF
    "3fd9362f-23fb-4b54-af58-a1bdf1335531": "ictnews.org",           # Indian Country Today
    "2bb8a2fc-7e58-418e-bacc-58625b76ee52": "amazonwatch.org",       # Amazon Watch
    "70072a10-450e-4d84-8251-4b3af9f82774": "culturalsurvival.org",  # Cultural Survival
    "9631d264-db05-4932-a9d7-a5a0e6c2cba4": "e360.yale.edu",         # Yale E360
    "2ba7cf2d-2858-4fd8-a332-1d6b66691c27": "grist.org",             # Grist
    "74161cd4-7705-4767-8589-e6a6532e61f2": "theguardian.com",       # The Guardian – Environment
    "d2c38ce3-7db7-4a70-a9b7-8bcd7a938da0": "adn.com",              # Alaska News (Anchorage Daily News)
    "67707fa7-986d-4260-a777-c2650330efd6": "globalvoices.org",      # Global Voices
    "63e76cd6-8e5b-4108-be04-a03103053e10": "insideclimatenews.org", # Inside Climate News
    "085a0b61-1869-4d34-919b-c579a2646619": "telesurtv.net",         # TeleSUR
    "fc75bb5f-e66e-42ea-a566-70ecd4f6efd8": "kathmandupost.com",     # Kathmandu Post
    "e43ef096-aa04-45c3-ae5c-2294c47794f6": "albertanativenews.com", # Alberta Native News
    "608519f4-e5dc-48d9-afa3-4a7c66bf3c2f": "news.un.org",           # UN News
    "f3dd7ab1-1b04-4bd8-ab5f-d43548570e62": "ccib.ca",               # CCIB
    "87fc5c51-c6a5-48b3-a49f-f35cb55e3546": "aljazeera.com",         # Al Jazeera – Indigenous
    "605185b8-5259-40b3-8203-ddaf73dd2abc": "ciperchile.cl",         # Ciper
    "3d23fd4c-909e-4fd5-91fc-b431bcf67e53": "ienearth.org",          # Indigenous Environmental Network
    "3e9a0b2b-4b8a-4ab6-8b3b-e3043730ffaa": "wayuunetwork.com",      # Escuela de Comunicaciones Wayuu
    "90230417-3230-4421-9339-180e699720c0": "indigenouscorporatetraining.com",  # Working Effectively with Indigenous Peoples
    "657e2514-e66c-4492-ae37-13a14fce6646": "iwgia.org",             # IWGIA Noticias (es)
    "db1dbc7d-0f84-46fb-8d2b-779f0f05076d": "nctr.ca",               # NCTR
    "01e39e01-d16b-4a29-ae7b-613d3c6f3088": "afn.ca",                # Assembly of First Nations
    "3e3bb857-8ac9-4dba-a9aa-8718f92cfabd": "ccib.ca",               # CCIB (2nd feed)
    "57be671c-061b-4a8c-8089-dd42b4075267": "gov.bc.ca",             # BC Gov – Reconciliation
    "9bf0ad51-4517-4b87-ad66-104ff6d30a54": "rnz.co.nz",             # RNZ Pacific
    "68733d3a-060f-40d0-bb30-75d551e8c393": "premiumtimesng.com",    # Premium Times
    "eaeec879-e541-4b89-a56d-b28adc7f6dea": "mapuexpress.org",       # Wallmapu Futa Trawun (via mapuexpress)
    "01bccec0-07a0-47a8-acdb-346c1f14ba5e": "iwgia.org",             # IWGIA News
    "9290d918-aa60-4e40-8c95-0c78dbaebd37": "mapuexpress.org",       # Mapuexpress
    "1a5d487f-c191-440f-923d-797c5188a0c8": "prensa-latina.cu",      # Prensa Latina
    "a0d7a42e-5650-405a-80b8-2493005e10e1": "mapuchediario.cl",       # Mapuche Diario
    "d7a7cbfe-2c70-4cf3-a5bb-afb141427132": "eldesconcierto.cl",     # El Desconcierto
    "e9f234d7-5830-4631-ba83-af2fa07ec026": "desiertoradio.cl",      # Desierto FM
    "5e5ae99b-226b-464e-8e42-14069ee29105": "iwgia.org",             # IWGIA – Chile
    "cb396a32-604a-448e-981d-7638a0552800": "rapanui.cl",             # moeVarua Rapa Nui
    "c8ef6674-da32-4574-ac2f-025dca2d4421": "futawillimapu.cl",      # Fütawillimapu
    "f17d24a5-5516-45d3-997b-858ec706c82f": "1ta.cl",                # 1ta.cl
}


def fetch_favicon_google(domain: str):
    url = GOOGLE_FAVICON_URL.format(domain=domain)
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            data = resp.read()
            if len(data) <= GOOGLE_GLOBE_MAX_BYTES:
                return None  # Generic globe = domain not found
            return data
    except Exception:
        return None


def fetch_direct_ico(domain: str):
    for proto in ["https", "http"]:
        url = f"{proto}://{domain}/favicon.ico"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
                ct = resp.headers.get("Content-Type", "")
                if "image" not in ct and "ico" not in ct:
                    continue
                data = resp.read()
                if len(data) > 100:
                    return data
        except Exception:
            continue
    return None


def main():
    FEEDS_DIR.mkdir(parents=True, exist_ok=True)

    missing = {
        fid: domain
        for fid, domain in FEED_DOMAINS.items()
        if not (FEEDS_DIR / f"{fid}.png").exists()
    }

    print(f"Feeds with known domains: {len(FEED_DOMAINS)}")
    print(f"Missing favicons to fetch: {len(missing)}")
    print()

    succeeded = 0
    failed = []

    for fid, domain in missing.items():
        sys.stdout.write(f"  {domain:<45} ... ")
        sys.stdout.flush()

        data = fetch_favicon_google(domain)
        if not data:
            data = fetch_direct_ico(domain)

        if data:
            out_path = FEEDS_DIR / f"{fid}.png"
            out_path.write_bytes(data)
            print(f"✓ ({len(data)} bytes)")
            succeeded += 1
        else:
            print("✗ not found")
            failed.append(domain)

    print()
    print(f"Done: {succeeded} fetched, {len(failed)} failed")
    if failed:
        print("Failed domains:")
        for d in failed:
            print(f"  - {d}")


if __name__ == "__main__":
    main()
