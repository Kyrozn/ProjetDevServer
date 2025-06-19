# ProjetDevServer

ProjetDevServer est une application serveur développée en TypeScript. Ce projet permet de gérer et d'exécuter un serveur Node.js compilé depuis du code TypeScript.

## Prérequis

- [Node.js](https://nodejs.org/)
- [npm](https://www.npmjs.com/)
- [TypeScript](https://www.typescriptlang.org/)
- [Docker](https://www.docker.com/)

## Installation

Clonez le dépôt et installez les dépendances :

```bash
git clone https://github.com/Kyrozn/ProjetDevServer.git
cd ProjetDevServer
npm install
```

## Compilation

Après avoir récupéré les dernières modifications avec `git pull`, compilez le code TypeScript :

```bash
npx tsc
```
## Votre Propre Image Docker :
```bash
docker build -t unity-headless-server .
```
## Lancement du serveur

Démarrez le serveur avec la commande suivante :

```bash
node ./dist/server.js
```

## Structure du projet

```
ProjetDevServer/
├── src/            # Code source TypeScript
├── dist/           # Fichiers compilés JavaScript
├── package.json
├── tsconfig.json
└── README.md
```

## Scripts utiles

- `npm run build` : Compile le projet TypeScript.
- `npm start` : Lance le serveur (si configuré dans package.json).

## Contribution

Les contributions sont les bienvenues ! Veuillez ouvrir une issue ou une pull request.

## Licence

Ce projet est sous licence MIT.