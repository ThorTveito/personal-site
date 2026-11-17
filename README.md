# personal-site

Personlig nettside for Thor Tveito: statisk HTML/CSS/JS i `site/`, uten byggesteg.
Designreglene står i [site/STYLE.md](site/STYLE.md).

| Side | Fil | Innhold fra |
| --- | --- | --- |
| Forside | `site/index.html` | |
| Bilder | `site/bilder.html` | `site/photos.json` (arbeidsflyten «Hent nye bilder», eller `node scripts/sync-drive.mjs`) |
| Film | `site/film.html` | `site/film.json` (redigeres for hånd) |
| Beretninger | `site/beretninger.html` | `site/beretninger.json` (skrivesiden, eller `node scripts/sync-beretninger.mjs`) |
| Skriv (skjult) | `site/skriv.html` | Lagrer nye beretninger i repoet |

## Publisering (GitHub Pages)

`.github/workflows/pages.yml` publiserer `site/` ved hver push til `main`.
Engangsoppsett: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

## Hente nye bilder fra Google Drive

Legg bildene i Drive-mappa, og kjør så **Actions → Hent nye bilder → Run workflow** på GitHub.
Arbeidsflyten laster ned nye bilder, gjør om HEIC til JPEG (maks 1600 px, uten EXIF), lager miniatyrer
og `photos.json`, committer til `main` og publiserer siden. Bilder som alt finnes hoppes over.

Engangsoppsett, under **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Verdi |
| --- | --- |
| `GOOGLE_API_KEY` | API-nøkkel fra Google Cloud Console med **Google Drive API** slått på (gjerne begrenset til bare den API-en) |
| `DRIVE_FOLDER_ID` | ID-en fra mappeadressen (`drive.google.com/drive/folders/<ID>`). Mappa må være delt som «alle med lenken kan se». |

## Legge til et filmprosjekt

Rediger `site/film.json` (også mulig rett i GitHub, også fra mobilen) og legg til et prosjekt:

```json
{
  "id": "sommerfilm-2026",
  "title": "Sommerfilm",
  "year": "2026",
  "role": "Regi og foto",
  "length": "4 min",
  "url": "https://vimeo.com/123456789",
  "description": "Kort om prosjektet.\n\nTom linje gir nytt avsnitt."
}
```

`url` kan være YouTube, Vimeo (også ulistede lenker) eller en videofil (.mp4/.webm).
Forhåndsbildet hentes automatisk, eller du kan sette `"poster": "sti/til/bilde.jpg"`. Fjern eksempelprosjektet når du legger inn ditt første.

## Skrive en ny beretning

Gå til `skriv.html` på nettsiden (den er ikke i menyen). Første gang på en enhet ber den om en GitHub-nøkkel:

1. Lag en finkornet nøkkel på github.com/settings/personal-access-tokens/new.
2. *Repository access*: bare `ThorTveito/personal-site`.
3. *Repository permissions → Contents*: **Read and write**. Ingenting annet.
4. Lim den inn på skrivesiden. Den lagres bare i den nettleseren. «Glem nøkkelen» sletter den.

Når du trykker Publiser, blir bildene gjort mindre (maks 2000 px, uten EXIF/GPS) og lagt i
`site/beretninger/<id>/`, beretningen legges i `beretninger.json`, og alt blir én commit på `main`.
Siden er oppdatert etter et minutt eller to.

Sikkerheten ligger i nøkkelen, ikke i den skjulte adressen: uten nøkkel kan siden ingenting.
Hvis nøkkelen kommer på avveie, slett den på GitHub.

## Lokalt

```bash
python3 -m http.server 8123 --directory site
```
