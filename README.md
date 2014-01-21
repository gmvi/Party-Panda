Party Panda
===========

## Running Locally

1. Install the chrome extension in `chrome/` either by packaging it into a .crx file or through `chrome://extensions`.
2. Edit `server/app.js` and set MAX to the number of people at the party.
3. Start the server with `node server/app.js`. It listens on port 5001 by default.
4. Start a Pandora playlist.
5. Click on the Party Panda extension icon.
6. Point the extension to the websocket server, which defaults to `[host]:5002/`, and click the 'link' button.
7. Have users log in at `http://[host]:5001/`. Currently the only supported login mechanism is `codeday.org`
