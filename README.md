# Bomb App (SignalR)

Tre sidor:
- `/` – Kod-inmatning
- `/bomb` – Bombvy (nedräkning + status + animation)
- `/admin` – Admin (reset, pausa/starta, sätt tid)

## Krav
- .NET 8 SDK
- Node 20+

## Starta backend
```bash
cd server
dotnet restore
dotnet run --urls=http://localhost:5000
```

## Starta frontend
```bash
cd client
npm install
npm run dev
```

Frontend proxar `/api` och `/bomhub` till `http://localhost:5000`, så ingen CORS-konfig krävs under dev.

## Konfiguration
- Ändra korrekt kod i `BombService.cs` (`_correctCode`).
- Ändra default-nedräkning i `StartNewCountdown(60)` och `Reset(60)`.

## Regler
- Tiden når 0 → explosion.
- Två felaktiga kodförsök (2) → explosion.
- `Admin` kan pausa/starta, resetta, sätta tid (med/utan autostart).
