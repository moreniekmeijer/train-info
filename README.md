# Trein UT → ASD

Minimalistische mobiele webapp die actuele NS-treininfo toont voor de verbinding **Utrecht Centraal → Amsterdam Centraal**, elke ochtend tussen 08:00 en 09:00.

## Functies

- Laadt automatisch bij openen
- Toont vertrektijden, vertragingen, uitgevallen treinen en werkzaamheden
- "Geen afwijkingen bekend" als alles normaal rijdt
- Geschikt als bladwijzer op het beginscherm van je telefoon

## Techniek

- **Frontend**: Vite + React + TypeScript
- **Proxy**: Netlify Function (`netlify/functions/ns-proxy.ts`) — houdt de API-sleutel verborgen
- **API**: NS Reisinformatie API v2/v3 via `gateway.apiportal.ns.nl`
- **Hosting**: Netlify (gratis plan, 125.000 functie-aanroepen/maand)

> **Waarom een proxy?**  
> De NS API blokkeert directe browserverzoeken (geen CORS). De API-sleutel mag ook nooit in de frontend staan. De Netlify Function lost beide problemen op: de sleutel staat veilig als omgevingsvariabele op de server.

## Lokaal draaien

### 1. NS API-sleutel aanmaken

Registreer gratis op [apiportal.ns.nl](https://apiportal.ns.nl/), maak een abonnement aan op de **NS Reisinformatie API** en kopieer je sleutel.

### 2. Omgevingsvariabele instellen

```bash
cp .env.example .env
# Vul NS_API_KEY in .env in
```

### 3. Netlify CLI installeren

```bash
npm install -g netlify-cli
```

### 4. Starten

```bash
netlify dev
```

De app is dan beschikbaar op `http://localhost:8888`.

> `netlify dev` simuleert de productieomgeving inclusief de serverless functie en laadt `.env` automatisch.

## Deployen op Netlify

### Via GitHub (aanbevolen)

1. Push dit project naar een GitHub-repository
2. Log in op [app.netlify.com](https://app.netlify.com) en klik **Add new site → Import an existing project**
3. Selecteer je GitHub-repo
4. Netlify detecteert `netlify.toml` automatisch:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
5. Ga naar **Site configuration → Environment variables** en voeg toe:
   - **Key**: `NS_API_KEY`
   - **Value**: jouw NS API-sleutel
6. Klik **Deploy site**

Elke `git push` naar `main` triggert automatisch een nieuwe deployment.

## Projectstructuur

```
train-info/
├── netlify/
│   └── functions/
│       └── ns-proxy.ts      ← Serverless proxy (API-sleutel veilig op server)
├── src/
│   ├── api.ts               ← NS API client (via proxy)
│   ├── types.ts             ← TypeScript types
│   ├── App.tsx              ← Hoofdcomponent
│   ├── App.css              ← Stijlen
│   ├── index.css            ← Globale stijlen
│   └── main.tsx             ← Entry point
├── public/
│   └── train.svg            ← Favicon
├── .env.example             ← Voorbeeld omgevingsvariabelen
├── netlify.toml             ← Netlify configuratie
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## Op je beginscherm zetten (iOS/Android)

- **iOS Safari**: Deel → "Zet op beginscherm"
- **Android Chrome**: Menu → "Toevoegen aan startscherm"

De app gedraagt zich daarna als een native app (geen adresbalk).
