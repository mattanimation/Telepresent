<div style="text-align:center;" markdown="1">

# Telepresent
![present](Assets/present.png#center)
**WebRTC based video and controls for robots or whatever**
</div>

This is more or less an experiment to see if I can create a more simple path to allow people to control their own robots over a secure and p2p connection (webrtc). It leverages the audio, video _and_ data channels, and allows for abstraction of the controls by sending a common gamepad state to then be interpreted however to the client.

**Note:**
Despite webrtc being a thing for a while now there are still some inconsistencies in the implementations that are out there.
Chrome and Firefox have different encoders that are compatible, and the backend or other peers need to have matching encoding for both audio and video

Also, not all encodings are the same. If you have 2 peers that have VP8 and VP9, there are slight variations that make them unable to talk

the two major tools used for the non-broweser implementations that are in this project are:
* AIORTC (python)
* PION (golang)

<div style="text-align:center;" markdown="1">

![TelepresentInterface](Assets/telepresent_interface.gif#center)

</div>

## Tested Operating Systems
* Linux (All parts :) )
* OSX (Frontend :| )
* Windows ( >:( stop it )

## Setup
* Spin up a Digital Ocean Droplet with the **COTURN** docker instance running.
* Spin up a Digital Ocean Droplet and run the `docker-compose.yaml` file on there.
* Run one of the clients on a machine that has a webcam. (_make sure and update the  `config.json` file to include the coturn as ICE server and signal server URI_)
* Connect to the frontend (wherever it is hosted)
* enter a name and click `Join`
*  


### Troubleshooting

if can't connect with websockets that aren't ssl, then open firefox `about:config` and change websockets to `allowInsecureFromHTTPS`

video issues:
* `sudo usermod -a -G video {username}`
* `ls -l /dev/video*`
* `cat /sys/class/video4linux/video6/name`
* `v4l2-ctrl --list-devices`

audio issues;
* `sudo usermod -a -G video {username}`
* `sudo fuser -v /dev/snd*`
* `sudo modprobe snd-hda-intel`
* `sudo modprobe snd_usb_audio`
* `arecord -l`
* `pacmd list-sources`

`about:webrtc` in firefox to see details

---



## RESOURCES

### Custom but opensource
* [coturn](https://github.com/coturn/coturn)
* [pion](https://github.com/pion/turn)
* [docker version of coturn](https://github.com/bprodoehl/docker-turnserver)
* https://github.com/coturn/coturn/blob/master/build-docker.sh
* https://github.com/coturn/coturn/tree/master/docker

### public stun servers:
[source](https://gist.github.com/mondain/b0ec1cf5f60ae726202e)



## Mods
try and use with Quic!
* https://webrtchacks.com/first-steps-with-quic-datachannel/
* https://bloggeek.me/who-needs-quic-in-webrtc/
* https://webrtchacks.com/first-steps-with-quic-datachannel/



### Handy References
* [Unreal pixel streaming](https://docs.unrealengine.com/en-US/Platforms/PixelStreaming/PixelStreamingReference/index.html)
* https://medium.com/@danielgwilson/https-and-create-react-app-3a30ed31c904
* https://gist.github.com/sagivo/3a4b2f2c7ac6e1b5267c2f1f59ac6c6b
* https://github.com/simplewebrtc/signalmaster
* https://github.com/Swizec/webrtc-sample
* https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling
* https://www.tutorialspoint.com/webrtc/webrtc_signaling.htm
* https://python-sounddevice.readthedocs.io/en/0.3.14/examples.html#using-a-stream-in-an-asyncio-coroutine
* http://docs.mikeboers.com/pyav/develop/api/audio.html#module-av.audio.frame
* https://github.com/aiortc/
* https://aiortc.readthedocs.io/en/latest/api.html#webrtc
* https://bloggeek.me/common-beginner-mistakes-in-webrtc/
* https://bloggeek.me/google-free-turn-server/
* https://bloggeek.me/webrtc-vs-websockets/
* https://bloggeek.me/webrtc-multiparty-architectures/
* https://www.youtube.com/watch?v=IA6Z9ey89Qc  - telepresence for cars (Phantom Auto)
* https://developer.mozilla.org/en-US/docs/Web/Media/Formats/Video_codecs
* https://github.com/Netflix/vmaf
* https://github.com/w3c/webrtc-quic
* https://www.youtube.com/watch?v=hq5S5iKJ-v0&list=PL4_h-ulX5eNdJljPgBWAgD8l49YOjeMoc&index=7 - mobile robot!



### troubleshooting
* https://blog.addpipe.com/troubleshooting-webrtc-connection-issues/
* https://blog.codeship.com/webrtc-issues-and-how-to-debug-them/
* https://webrtchacks.com/sdp-anatomy/
* https://test.webrtc.org/
* about:webrtc (firefox)
* https://networktest.twilio.com/
* http://blog.tadhack.com/2015/06/08/turn-to-turn-streamstack/
* https://stackoverflow.com/questions/55914278/webrtc-screen-share-not-working-on-lte-in-usa
