# personal-site

Personlig nettside for Thor Tveito: statisk HTML/CSS/JS i `site/`, uten byggesteg.
Designreglene står i [site/STYLE.md](site/STYLE.md).

| Side | Fil | Innhold fra |
| --- | --- | --- |
| Forside | `site/index.html` | |
| Bilder | `site/bilder.html` | `site/photos.json` (`node scripts/build-photos.mjs`) |
| Beretninger | `site/beretninger.html` | `site/beretninger.json` (skrivesiden, eller `node scripts/sync-beretninger.mjs`) |
| Skriv (skjult) | `site/skriv.html` | Lagrer nye beretninger i repoet |

## Publisering (GitHub Pages)

`.github/workflows/pages.yml` publiserer `site/` ved hver push til `main`.
Engangsoppsett: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

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
