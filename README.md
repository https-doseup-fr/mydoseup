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
automatiquement le site à chaque `git push` sur `main` :

1. Crée un compte sur [Netlify](https://netlify.com) et connecte ton repo
2. Récupère ton `NETLIFY_AUTH_TOKEN` et ton `NETLIFY_SITE_ID`
   (User settings > Applications > Personal access tokens, et
   Site settings > General > Site details)
3. Dans GitHub : Settings > Secrets and variables > Actions,
   ajoute ces deux valeurs comme secrets
4. À chaque push, GitHub Actions régénère les 63+ fiches et
   déploie automatiquement sur Netlify

Tu n'as plus jamais besoin de toucher aux fichiers HTML générés
à la main — seulement à `index.html` (ton array `DATA`/`PROTEINES`
et le design), comme avant.

## Important

- Le fichier `dist/` est généré, ne pas le modifier à la main ni le
  committer si tu utilises l'automatisation Netlify ci-dessus.
- Si tu ajoutes une fiche dans `DATA`, elle sera automatiquement
  incluse au prochain build — aucune étape manuelle supplémentaire.
