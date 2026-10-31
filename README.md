# Avalon

A local-network server for **The Resistance: Avalon**. Players join from their phones, and a game master screen runs the lobby and shows the public board.

- **Players:** `http://<server-ip>:3000`. Enter a name to join. When the game starts, your phone shows your secret role (tap to reveal) and what it knows while the board plays the intro. Once every connected human player taps Skip intro, the game starts. Propose teams, vote, and play quest cards from your phone.
- **Game master / board:** `http://localhost:3001`. See who joined, pick the optional roles, start or abort a game, play the intro (a quick overview of the roles and how to play; it advances on its own and starts the game when it ends, or you can skip it), and show the board (quest track, rejected-team count, vote results, log). This works well on a TV.

It has **no dependencies**: only Node's built-in modules (Node 18+), so it runs as-is on a Raspberry Pi 3.

## Run

```sh
npm start          # or: node src/server.js
npm test           # game-rule tests
```

| Env var       | Default   | Purpose                                             |
|---------------|-----------|-----------------------------------------------------|
| `PLAYER_PORT` | `3000`    | Player app                                          |
| `GM_PORT`     | `3001`    | Game master app                                     |
| `HOST`        | `0.0.0.0` | Interface to listen on                              |
| `GM_HOST`     | `HOST`    | Set to `127.0.0.1` to keep the GM page on the Pi only |

**Testing alone:** open `localhost:3000/?seat=1`, `?seat=2`, … in separate tabs. Each seat is its own player.

## Rules implemented

- 5–10 players, with the official good/evil split and quest sizes. With 7+ players, quest 4 needs two Fail cards to fail.
- Merlin and the Assassin are always in play. Percival, Morgana, Mordred and Oberon are optional. The rest are Loyal Servants and Minions.
- Secret knowledge:
  - Merlin sees evil, except Mordred.
  - Percival sees Merlin and Morgana but can't tell which is which.
  - Evil players see each other, except Oberon.
- Team vote: a majority must approve, and a tie is a rejection. Votes are revealed to everyone. Five rejections in a row: evil wins.
- Quest cards are anonymous, and only the number of Fails is shown. Good players can only play Success.
- Three failed quests: evil wins. Three successful quests: the Assassin names a player, and if it's Merlin, evil wins.

## Layout

```
src/game.js      game state + rules (pure, unit-tested)
src/server.js    two HTTP servers sharing one Game; Server-Sent Events push live state
public/          player.html/js, gm.html/js, shared common.js + style.css
public/art.js    role cards and medallions, plus SVG seals and chalices
public/art/      role portraits cropped from public-domain paintings (see CREDITS.md)
public/fonts/    bundled open-licensed fonts (Cinzel, EB Garamond; see OFL.txt), so play works offline
test/            node:test suite
```

Each player's event stream gets a view built just for them, so secret roles never reach another player's browser.
Game state lives in memory. Players reconnect automatically using a token stored in their browser.
If the server restarts, everyone re-joins.

## Raspberry Pi as a service

```ini
# /etc/systemd/system/avalon.service
[Unit]
Description=Avalon game server
After=network-online.target

[Service]
WorkingDirectory=/home/pi/avalon
ExecStart=/usr/bin/node src/server.js
Restart=on-failure
User=pi

[Install]
WantedBy=multi-user.target
```

`sudo systemctl enable --now avalon`
