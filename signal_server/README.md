# Signal Server

While true that WebRTC is a peer to peer technology, there is a step that requires an intermediary to exchange information on each end before a true p2p connection can be achieved. In this implementation we use a simple socket server.

A benefit of this is we can see the other peers available or connected in realtime, and allows for it to be expanded upon to whatever degree.

## Local Dev

### Installation
* `yarn install`

### Usages
* `PORT=5000 yarn start`

## Server Dev
just use the `docker-compose.yaml` file in the top of this repo.


## Clients
* Javascript (in frontend code)

you can write your own!

### Messages
For now the message "types" that are handled are:
* `Info` - for users or other info on server side
* `Login` - for peer to be "available" to connect to
* `Offer` - when an offer is sent or recieved
* `Answer` - when an answer is sent or recieved
* `Candidate` - when an ICE candidate is shared with peer
* `Leave` - when a user leaves (willingly)
* `Error` - bad things

### TODO
* [] - code cleanup / tighten up
* [] - switch to socket.io for more common interface?

