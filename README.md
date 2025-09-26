# TBFAR506 – Ateliers multimédia

Ce dépôt regroupe les travaux pratiques du module TBFAR506. Une page d’accueil statique est disponible à la racine pour GitHub Pages et redirige automatiquement vers le TD&nbsp;1.

## Accès rapide

- **Landing page** : [`index.html`](https://hc-sky.github.io/TBFAR506_Hugo/)
- **TD 1 – Sensibilisation multimédia** : [`td1/index.html`](td1/index.html)
- **TD 2 – Babylon.js (build GitHub Pages)** : [`docs/TD2/babylon/index.html`](https://hc-sky.github.io/TBFAR506_Hugo/docs/TD2/babylon/)
- **TD 2 – Three.js (build GitHub Pages)** : [`docs/TD2/threejs/index.html`](https://hc-sky.github.io/TBFAR506_Hugo/docs/TD2/threejs/)

### Développement local

- Babylon.js : `cd TD2/babylon && npm install && npm run dev`
- Three.js : `cd TD2/threejs && npm install && npm run dev`

## Déploiement GitHub Pages

GitHub Pages sert directement le fichier `index.html` à la racine. Celui-ci propose une redirection automatique vers le TD&nbsp;1 et des liens vers les autres contenus.

Les projets Vite (`TD2/babylon` et `TD2/threejs`) sont configurés pour générer leurs builds dans le dossier `docs/TD2/...` avec des chemins relatifs, ce qui les rend directement utilisables sur GitHub Pages.

### Mettre à jour les builds GitHub Pages

1. Babylon.js
	- `cd TD2/babylon`
	- `npm install` (une seule fois)
	- `npm run build`
	- Les fichiers statiques sont générés dans `docs/TD2/babylon`
2. Three.js
	- `cd TD2/threejs`
	- `npm install`
	- `npm run build`
	- Les fichiers statiques sont générés dans `docs/TD2/threejs`

Commitez ensuite les fichiers du dossier `docs/` pour qu'ils soient pris en compte lors du déploiement GitHub Pages.