Party Panda
===========

## Running Locally

1. Install the chrome extension in `chrome/` either by packaging it into a .crx file or through `chrome://extensions`.
2. Copy `server/settings-default.json` and make sure to set "session secret" and "min votes".
3. Start the server with `node server/app.js`. It listens on port 5001 by default.
4. Start a Pandora playlist.
5. Click on the Party Hat in the url bar.
6. Point the extension to the server (e.g. `localhost:5001`), and click the 'link' button.
7. Have users log in at `http://[host]:5001/`. Currently the only supported login mechanism is `codeday.org`, which requires authentication tokens. Alternatively you can use the provided session-based user-uniqueness verification system, enabled by default, however you should be aware that malicious users can spam votes by manually deleting the session cookie.
