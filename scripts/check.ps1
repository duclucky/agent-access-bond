$ErrorActionPreference = "Stop"
npm run lint:contracts
npm run test:direct
npm run test:deployment
npm run lint
npm run build

