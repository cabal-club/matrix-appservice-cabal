# matrix-appservice-cabal

Bridge matrix and cabal thorugh a common channnel (aka room).

I made this following the simple [HOWTO.md](https://github.com/matrix-org/matrix-appservice-bridge/blob/HEAD/HOWTO.md) tutorial made by the matrix team, this is very experimental.


## Setup


1. Edit `config.yml` to your liking.

2. Type node index.js -r -u "http://localhost:9000" (the URL is the URL that the homeserver will try to use to communicate with the application service) and a file cabal-registration.yaml will be produced. In your Synapse install, edit homeserver.yaml to include this file:

```
app_service_config_files: ["/path/to/slack/bridge/cabal-registration.yaml"]
```

3. Then restart your homeserver. Your application service is now registered.

4. Run the service

```
node index.js -p 9000
```

5. You can use pm2 for long-running processes


# License
MIT
