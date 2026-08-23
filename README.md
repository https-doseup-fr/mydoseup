# Générateur de fiches statiques — MyDoseUp

Génère un fichier HTML par fiche (`dist/fiche/<slug>.html`) à partir
de `index.html`, pour que chaque fiche ait sa propre URL indexable
par Google, avec titre/meta description uniques et contenu texte
visible sans JavaScript.

## Comment ça marche

Le script ouvre `index.html` dans un vrai navigateur (headless) et
appelle **tes propres fonctions JS** (`card()`, `protCard()`) pour
récupérer le HTML exact de chaque fiche — donc aucune logique de
rendu n'est dupliquée. Si tu changes le design ou le texte d'une
fiche dans `index.html`, il te suffit de relancer le script.

Chaque fichier généré est une copie complète de ton site (donc
totalement interactif), avec en plus :
- un `<title>` et une `<meta description>` uniques
- une balise `<link rel="canonical">` propre
- le contenu de la fiche visible immédiatement dans le HTML (pour
  Google et les utilisateurs sans JS)
- un petit script qui ouvre automatiquement la fiche dans
  l'application interactive dès que le JS est chargé

## Utilisation en local

```bash
npm install
npm run build
```

Résultat dans `./dist/` :
```
dist/
  index.html
  sitemap.xml
  fiche/
    creatine-monohydrate.html
    curcumine-curcuma.html
    ... (une par fiche)
```

## Automatisation (recommandé)

Le fichier `.github/workflows/deploy.yml` régénère et redéploie
automatiquement le site à chaque `git push` sur `main`, en utilisant
le mode **"GitHub Actions"** de GitHub Pages (celui déjà configuré
dans Settings > Pages > Source sur ce repo).

1. Rien à configurer côté secrets ni côté branche : tout est géré
   automatiquement par les actions officielles GitHub
   (`configure-pages`, `upload-pages-artifact`, `deploy-pages`)
2. Vérifie juste que **Settings > Pages > Source** est bien réglé
   sur **"GitHub Actions"** (pas "Deploy from a branch")
3. À chaque push sur `main`, l'onglet **Actions** du repo affichera
   le workflow tourner (1-2 min), puis le site sera à jour

Tu n'as plus jamais besoin de toucher aux fichiers HTML générés
à la main — seulement à `index.html` (ton array `DATA`/`PROTEINES`
et le design), comme avant.

## Important

- Le fichier `dist/` est généré, ne pas le modifier à la main.
- Si tu ajoutes une fiche dans `DATA`, elle sera automatiquement
  incluse au prochain build — aucune étape manuelle supplémentaire.
- Ton nom de domaine `mydoseup.com` reste configuré exactement comme
  avant (Settings > Pages > Custom domain) — rien à changer côté DNS.
  Le script copie automatiquement ton fichier `CNAME` (s'il existe à
  la racine du repo) dans `dist/`, pour que le domaine perso ne se
  déconnecte pas à chaque déploiement.
