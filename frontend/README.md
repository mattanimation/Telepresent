# Telepresent Frontend

This uses the browser implementation of WEBRTC. It is meant to be light weight and simple to use or modify. no PWA (react or vue), no jquery, just vanilla javascript, css, and html.

## Supported browsers

* [x] - Chrome (python and goland clients)
* [/] - Firefox (python client)

## Local Dev or testing

### Installation
* `yarn install`

### Usage
* `PORT=5001 yarn start`

## Server usage
This gets spun up as part of the `docker-compose.yaml` file at the top of this repo. Just use that.

---

### Clients
There are a couple of clients that can be used right now. They are part of this repo under `clients` and are submodules so feel free to modify.

* Python (using AIORTC)
* Go (using PION)

or you can write your own!

