
// TELEPRESENT
/**
* The MIT License (MIT)

Copyright (c) 2020 Matt Murray <mattanimation@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
console.log(window.location);
const ws_proto = window.location.protocol === "http:" ? "ws" : "wss";
const isLocal = window.location.host.indexOf('localhost') || window.location.host.indexOf('127.0.0.1');
const SIGNAL_SERVER_HOST = `${ws_proto}://${isLocal ? window.location.host.replace(window.location.port, window.location.port -1) : window.location.host}/ss`; //`wss://ss.retrowave.tech`;
let LOGGED_IN = false;
// peer connection, data channel and signal server connection
let pc, dc, ssc = null;
let selectedRobot, clientName, dataChannel;
// intervals for updating and sending gamepad data
let dcInterval = null;
let gpdcInterval = null;

// ui elements
const _video = document.getElementById("video");
const _audio = document.getElementById("audio");
const dataChannelLog = document.getElementById("data-channel");
const loginInput = document.getElementById("loginInput");
const loginBtn = document.getElementById("loginBtn");
const clientList = document.getElementById("clientList");
const robotModal = document.getElementById("robotSelectedModal");
const robotCardContainer = document.getElementById("robotCardContainer");
const notificationContainer = document.getElementById("notificationContainer");
const gamepadStatus = document.getElementById("gamepadStatus");
const signalServerStatus = document.getElementById("signalServerStatus");
const answerSDP = document.getElementById("answer-sdp");
const offerSDP = document.getElementById("offer-sdp");
const peerConnectionStateTxt = document.getElementById('peer-connection-state');
const iceGatheringStateTxt = document.getElementById('ice-gathering-state');
const iceConnectionStateTxt = document.getElementById('ice-connection-state');
const signalStateTxt = document.getElementById('signaling-state');
const modalRobotId = document.getElementById('modalRobotId');
const rtcConnectionProgress = document.getElementById('rtcConnectionProgress');

// -- joy
const joyContainer = document.getElementById('joyContainer');
const jstick = document.getElementById('zone_joystick')
const elDebug = document.getElementById('debug');
const elDump = elDebug.querySelector('.dump');
//const joyResult = document.getElementById('joyResult');

// ======================== Joypad SETUP =====================
// virtual joystick - for when no gamepad is possible
const max_linear = 5.0; // m/s
const max_angular = 2.0; // rad/s
const max_distance = 50.0; // pixels;
//let linear_speed = 0.0;
//let angular_speed = 0.0;
let joystick = null;

function setupJoystick(should_debug=false){

  // three variations to play with
  const joysticks = {
    dynamic: {
      zone: jstick,
      color: '#3273dc',
      multitouch: true
    },
    semi: {
      zone: jstick,
      mode: 'semi',
      catchDistance: 150,
      color: 'blue'
    },
    static: {
      zone: jstick,
      mode: 'static',
      position: {
        left: '50%',
        top: '50%'
      },
      color: 'red'
    }
  };
  
  // Get debug elements and map them
  const els = {
    position: {
      x: elDebug.querySelector('.position .x .data'),
      y: elDebug.querySelector('.position .y .data')
    },
    force: elDebug.querySelector('.force .data'),
    pressure: elDebug.querySelector('.pressure .data'),
    distance: elDebug.querySelector('.distance .data'),
    angle: {
      radian: elDebug.querySelector('.angle .radian .data'),
      degree: elDebug.querySelector('.angle .degree .data')
    },
    direction: {
      x: elDebug.querySelector('.direction .x .data'),
      y: elDebug.querySelector('.direction .y .data'),
      angle: elDebug.querySelector('.direction .angle .data')
    },
    speed: {
      linearSpeed: elDebug.querySelector('.speed .linearSpeed .data'),
      angularSpeed: elDebug.querySelector('.speed .angularSpeed .data')
    }
  };
  
  function bindNipple() {
    joystick.on('start', function(evt, data) {
      dump(evt.type);
      debug(data);
      // start message pub
      
    }).on('move', function(evt, data) {
      // calc output that would be useful for ROS twist message
      //linear_speed = Math.sin(data.angle.radian) * max_linear * data.distance/max_distance;
      //angular_speed = -Math.cos(data.angle.radian) * max_angular * data.distance/max_distance;
      //console.log(data)
      if (data.direction !== undefined && data.direction !== null){
        // normalize the nipple into -1/+1 and 0 being rest pos, no deadzone
        const rsx = (data.distance / max_distance) * (data.direction.x === "right" ? 1 : -1);
        const lsy = (data.distance / max_distance) * (data.direction.y === "up" ? 1 : -1);
        //assign to left and right axis assuming typical controll would be
        //left stick throttle and right stick angle
        joystick.state.LEFT_STICK_Y = lsy; //angular_speed;
        joystick.state.RIGHT_STICK_X = rsx; //linear_speed;
        console.log(`rsx: ${rsx} | lsy: ${lsy}`);
      }
      
      // data.speed = {linearSpeed: data.angle.radian, angularSpeed: data.angle.radian}
      
      debug(data);

    }).on('dir:up plain:up dir:left plain:left dir:down ' +
          'plain:down dir:right plain:right',
          function(evt, data) {
      dump(evt.type);
    }).on('pressure', function(evt, data) {
      debug({
        pressure: data
      });
    }).on('end', function(evt, data) {
      dump(evt.type);
      debug(data);
      // force back to 0 for safety
      //linear_speed = 0.0;
      //angular_speed = 0.0;
    });
  }
  
  function createNipple(type) {
    console.log("creating virtual joystick")
    if (joystick) {
      joystick.destroy();
    }
    joystick = nipplejs.create(joysticks[type]);
    joystick.state = {...GAMEPAD_MSG};
    bindNipple();
  }
  
  // Print data into elements
  function debug(obj) {

    if(should_debug){

      function parseObj(sub, el) {
        for (var i in sub) {
          if (typeof sub[i] === 'object' && el) {
            parseObj(sub[i], el[i]);
          } else if (el && el[i]) {
            el[i].innerHTML = sub[i];
          }
        }
      }

      setTimeout(function() {
        parseObj(obj, els);
      }, 0);

    }
  }
  
  var nbEvents = 0;
  
  // Dump data
  function dump(evt) {
    setTimeout(function() {
      if (elDump.children.length > 4) {
        elDump.removeChild(elDump.firstChild);
      }
      var newEvent = document.createElement('div');
      newEvent.innerHTML = '#' + nbEvents + ' : <span class="data">' +
        evt + '</span>';
      elDump.appendChild(newEvent);
      nbEvents += 1;
    }, 0);
  }

  createNipple('dynamic');
}

function destroyJoystick(){
  console.log("Setting joystick to null");
  if (joystick !== null){
    joystick.destroy();
    joystick = null;
    joyContainer.remove();
  }
}

// -- end joystick setup

// ======================== GAMEPAD SETUP =====================
let gp, gamepad = null;
let GAMEPAD_SEND_RATE = 1 * 0.05 * 1000; // 0.1 = 10 hrtz to ms
console.log("GAMEPAD_SEND_RATE", GAMEPAD_SEND_RATE);

/**
 * logs gamepad event data
 * @param {event} evt
 */
function log_gp(evt) {
  console.log(typeof evt);
  var v = JSON.stringify(evt);
  console.log(v);
  console.log(evt.toString());
  return v;
}

let time_start = null;
/**
 * get time delta since time start
 * @returns: time delta
 */
function current_stamp() {
  if (time_start === null) {
    time_start = new Date().getTime();
    return 0;
  } else {
    return new Date().getTime() - time_start;
  }
}

/**
 * handle game pad events
 */
function setupGamepad() {
  gamepad = new Gamepad();
  console.log("setting up gamepad")
  gamepad.bind(Gamepad.Event.CONNECTED, (device) => {
    // a new gamepad connected
    console.log("GP connected", device);
    addNotification(`Connected to: ${device.id}`, "is-success");
    gamepadStatus.classList.remove("has-text-danger");
    gamepadStatus.classList.add("has-text-success");
    //gamepadStatus.childNodes[1].innerHTML = `Connected: ${device.id}`;
    gp = device;

    //destroy virtual joypad if the gamepad is connected
    destroyJoystick();

  });

  gamepad.bind(Gamepad.Event.DISCONNECTED, (device) => {
    // gamepad disconnected
    console.log("GP disconnected");
    gamepadStatus.classList.remove("has-text-success");
    gamepadStatus.classList.add("has-text-danger");
    //gamepadStatus.childNodes[1].innerHTML = 'disconnected';
    addNotification("Gamepad Disconnected");
  });

  gamepad.bind(Gamepad.Event.UNSUPPORTED, (device) => {
    // an unsupported gamepad connected (add new mapping)
    console.log("GP unsuppored...");
    addNotification("Gamepad Unsuppored");
  });

  gamepad.bind(Gamepad.Event.BUTTON_DOWN, (e) => {
    // e.control of gamepad e.gamepad pressed down
    //log_gp(e)
  });

  gamepad.bind(Gamepad.Event.BUTTON_UP, (e) => {
    // e.control of gamepad e.gamepad released
    //log_gp(e)
  });

  gamepad.bind(Gamepad.Event.AXIS_CHANGED, (e) => {
    // e.axis changed to value e.value for gamepad e.gamepad
    //log_gp(e)
  });

  if (!gamepad.init()) {
    console.error(
      "Your browser does not support gamepads, get the latest Google Chrome or Firefox"
    );
  } else {
    //setInterval(function(){
    //    if(gp)
    //       console.log(gp.id, gp.state, gp.timestamp)
    //}, 500)
  }
}


// ===================== UI ELEMENT STUFF ========================
// make sure text is valid characters
let inputValid = false;
loginInput.addEventListener('input', ()=>{
  //loginInput.checkValidity();
  loginInput.setCustomValidity('');
});

loginInput.addEventListener('invalid', ()=>{
  if(loginInput.value === ""){
    addNotification("You need to have a username human...");
    loginInput.setCustomValidity('Need to enter a username');
  }else{
    addNotification("Usernames should only contain upper and lowercase letters...");
    loginInput.setCustomValidity('Usernames can only contain upper and lowercase letters. Try again!');
  }
  loginInput.value = ''
  inputValid = false
})

//when a user clicks the login button
loginBtn.addEventListener("click", (event) => {
  inputValid = true;
  loginInput.checkValidity();
  if(!inputValid) {return;}
  if (LOGGED_IN === false) {
    clientName = `human_${loginInput.value}`;
    send({
      type: "login",
      name: clientName
    });
  } else {
    addNotification("You are alredy logged in", 'is-warning');
  }
});


/**
 * add a robot card view element that will be connected to when clicked
 * @param {string} name name of robot that is on signal server
 * @param {string} desc description of that robot
 */
function addRobotCard(name, desc) {
  const inhtml = `
    <div class="column is-one-third" data-robot="${name}">
        <div class="card">
            <div class="card-image has-text-centered">
                <span class="icon is-large has-text-danger">
                    <i class="mdi mdi-48px mdi-robot"></i>
                </span>
            </div>
            <div class="card-content has-text-centered">
                <div class="media">
                    <div class="media-content">
                        <p class="title is-4">${name}</p>
                    </div>
                </div>
                <div class="content">
                  <p>${desc}</p>
                  <div class="field">
                    <div class="b-checkbox is-info is-inline">
                        <input id="Acheck" class="styled" checked type="checkbox">
                        <label for="Acheck">
                            Audio
                        </label>
                    </div>
                    <div class="b-checkbox is-info is-inline">
                        <input id="Vcheck" class="styled" checked type="checkbox">
                        <label for="Vcheck">
                            Video
                        </label>
                    </div>
                  </div>
                </div>
            </div>
        </div>
    </div>`;
  const cardDiv = htmlToElement(inhtml);
  const connectBtn = htmlToElement(`<button class="button is-small is-info">Connect</button>`)
  robotCardContainer.append(cardDiv);
  cardDiv.getElementsByClassName('content')[0].append(connectBtn);
  connectBtn.addEventListener('click', (evt)=>{cardClicked(evt, cardDiv)});
}


/**
 * when a robot card has been clicked, use it's name and attempt to connect to it
 * @param {event} evt
 * @param {element} card
 */
function cardClicked(evt, card) {
  console.log(evt, card);
  console.log(card.dataset);
  const chkbxs = card.getElementsByClassName('styled');
  const audioCheck = chkbxs[0].checked;
  const videoCheck = chkbxs[1].checked;
  //console.log(chkbxs, audioCheck,videoCheck)
  if(!audioCheck && !videoCheck){
    addNotification("Dangerous way to drive, no audio and video...", 'is-warning');
  }
  connectToRobot(card.dataset.robot, audioCheck, videoCheck);
  card.classList.add('is-active');
  rtcConnectionProgress.classList.add('is-active');
  modalRobotId.innerHTML = card.dataset.robot;
  robotModal.classList.add("is-active");
}

/**
 * generic message notification handler
 * @param {string} msg notification message
 * @param {string} lvl  class name
 */
function addNotification(msg = "warning", lvl = "is-danger") {
  //clear container
  while (notificationContainer.firstChild) {
    notificationContainer.removeChild(notificationContainer.firstChild);
  }
  const delBtnhtml = `<button class="delete" id="noteClose"></button>`;
  const noteCloseBtn = htmlToElement(delBtnhtml);
  const inhtml = `
    <div class="notification ${lvl}" id="GPNote">
        ${msg}
    </div>`;
  const note = htmlToElement(inhtml);
  note.append(noteCloseBtn);
  notificationContainer.append(note);
  //const noteCloseBtn = document.getElementById("noteClose");
  noteCloseBtn.addEventListener("click", evt => {
    //notificationContainer.remove(note);
    note.remove();
  });
  setTimeout(() => {
    // remove notification
    note.remove();
  }, 3000);
}

/**
 * handle closing modal and connection to current robot connection
 */
function closeModal() {
  robotModal.classList.remove("is-active");
  disconnectFromRobot();
}

// ==================== WebRTC Stuff ======================

/**
 * creates a new instance of the peer connection
 */
function setupPeer() {

  console.log("Setting up Peer");
  /**
   * An RTCConfiguration may look like this:
   *
   * { "iceServers": [ { urls: "stun:stun.example.org", },
   *                   { url: "stun:stun.example.org", }, // deprecated version
   *                   { urls: ["turn:turn1.x.org", "turn:turn2.x.org"],
   *                     username:"jib", credential:"mypass"} ] }
   *
   * This function normalizes the structure of the input for rtcConfig.iceServers for us,
   * so we test well-formed stun/turn urls before passing along to C++.
   *   msg - Error message to detail which array-entry failed, if any.
   */

  

  // create the peer connection
  pc = new RTCPeerConnection(CONFIG);

  // connect audio / video
  pc.addEventListener("track", function(evt) {
    console.log("got track event: ", evt);
    if (evt.track.kind == "video") {
      _video.srcObject = evt.streams[0];
    } else {
      _audio.srcObject = evt.streams[0];
    }
  });

  pc.onconnectionstatechange = function(evt){
    console.log("WTC Connection State Change:", evt);
    console.log("Connection State: ", pc.connectionState);
    peerConnectionStateTxt.textContent = pc.connectionState;
    if (pc.connectionState === 'connected'){
      rtcConnectionProgress.classList.remove('is-active');
    }
  }

  pc.oniceconnectionstatechange = function(evt){
    console.log("ICE Connection State Change:", evt);
    iceConnectionStateTxt.textContent = pc.iceConnectionState;
  }

  pc.onicegatheringstatechange = function(evt){
    console.log("Ice Gathering State Change: ", evt);
    iceGatheringStateTxt.textContent = pc.iceGatheringState;
  }

  pc.onsignalingstatechange = function(evt){
    console.log("Peer Signal State Change: ", evt);
    signalStateTxt.textContent = pc.signalingState;
  }

  // data channel
  //{ordered: false, maxRetransmits:0, maxPacketLifetime:500} // Unordered, 500ms lifetime, no retransmissions
  const dataChannelParameters = {ordered: true};
  // generic ping pong connection channel
  /*
  dc = pc.createDataChannel("chat", dataChannelParameters);
  dc.onclose = function() {
    clearInterval(dcInterval);
    dataChannelLog.textContent += "- close\n";
  };
  dc.onopen = function() {
    dataChannelLog.textContent += "- open\n";
    dcInterval = setInterval(function() {
      const message = "ping " + current_stamp();
      dataChannelLog.textContent += "> " + message + "\n";
      dc.send(message);
    }, 1000);
  };
  dc.onmessage = function(evt) {
    console.log(evt);
    dataChannelLog.textContent += "< " + evt.data + "\n";

    if (evt.data.substring(0, 4) === "pong") {
      const elapsed_ms = current_stamp() - parseInt(evt.data.substring(5), 10);
      dataChannelLog.textContent += " RTT " + elapsed_ms + " ms\n";
    }
  };
  */

  //create a data channel to send gamepad inputs to connected robot
  gpdc = pc.createDataChannel("gamepad", dataChannelParameters);
  gpdc.onclose = function() {
    console.log("closed gamepad channel");
    clearInterval(gpdcInterval);
  };
  gpdc.onopen = function() {
    console.log("opened gamepad channel");
    gpdcInterval = setInterval(function() {
      let message = {};
      if (gp !== null && gp !== undefined) {
        message = JSON.stringify({
          id: gp.id,
          state: gp.state,
          ts: gp.timestamp
        });
      }
      else if(joystick !== null && joystick !== undefined){
        message = JSON.stringify({
          id: 'VirtualJoystick',
          state: joystick.state,
          ts: Date.now()
        });
      }
      
      dataChannelLog.textContent += "> " + message + "\n";        
      if(gpdc.readyState === 'open'){
        gpdc.send(message);
      }

    }, GAMEPAD_SEND_RATE);
  };
  gpdc.onmessage = function(evt) {
    console.log(evt);
    // not really taking in messages from other peer yet, but can be implemented
    dataChannelLog.textContent += "< " + evt.data + "\n";
  };

  console.log("RTCPeerConnection object was created");
  console.log(pc);

  //setup ice handling
  //when the browser finds an ice candidate we send it to another peer
  pc.onicecandidate = function(event) {
    if (event.candidate) {
      send({
        type: "candidate",
        candidate: event.candidate
      });
    }
  };
}

/**
 * make webrtc offer to connected robot
 * @param {string} robotName
 */
function connectToRobot(robotName = "", audioCheck=true, videoCheck=true) {
  console.log(`Attempting to connect to ${robotName}`);
  if (pc === null || pc === undefined) {
    addNotification("PeerConnection Error");
    return;
  }
  if (robotName !== "") {
    // reset peer if was connected once already
    console.log(pc.signalingState);
    if (pc.signalingState === "closed" && LOGGED_IN) {
      console.log("IS LOGGED IN BUT HAS CLOSED ONCE BEFORE?");
      setupPeer();
    }
    selectedRobot = robotName;
    // handle firefox bug
    const is_ff = navigator.userAgent.toLowerCase().includes('firefox')
    let dir = is_ff ? 'sendrecv' : 'recvonly';

    if(videoCheck)
      pc.addTransceiver("video", { direction: dir});
    if(audioCheck)
      pc.addTransceiver("audio", { direction: dir});

    //set best encoder = VP9 (google owns but is open and stadia uses it)

    //make an offer
    pc.createOffer().then(function(offer) {
      return pc.setLocalDescription(offer);
    })
    .then(function() {
        const offer = pc.localDescription;
        console.log("created offer", offer);
        offerSDP.textContent = offer.sdp;
        send({
          type: "offer",
          offer: offer
        });
    }).catch(function(e) {
        alert(e);
    });

  }
}

/**
 * close connection to robot
 */
function disconnectFromRobot() {
  if(selectedRobot === null || selectedRobot === undefined){
    return;
  }
  console.log(`Disconnection from: ${selectedRobot}`);
  if (pc !== null && pc !== undefined) {
    // close data channel
    if (dc) {
      dc.close();
    }

    // tell client you are hanging up
    send({
      type: "leave"
    });

    // close peer connection
    setTimeout(function() {
      pc.close();
    }, 500);

    // clear any text from prev session
    //answerSDP.textContent = "";
    //offerSDP.textContent = "";
    dataChannelLog.textContent = "";
  }
}

/**
 * send message to signal server
 * @param {object} message object message to be converted to JSON and sent to signal server
 */
function send(message) {
  if (ssc !== undefined && ssc != null){
    //add name of user we are trying to send messages to
    if (selectedRobot) {
      message.name = selectedRobot;
    }
    if(message.type == 'leave'){
        message.name = clientName;
    }

    ssc.send(message);
  }
}

//============================= SIGNAL SERVER STUFF ===========================

/**
 * Create a new instance of the signal server client that allows the peers
 * to share offers and answer sdps
 */
ssc = new SignalServerClient(SIGNAL_SERVER_HOST, {
  onError: handleError,
  onDisconnect: handleDisconnect,
  onConnect: handleConnect,
  onLogin: handleLogin,
  onInfo: handleInfo,
  onAnswer: handleAnswer,
  onCandidate: handleCandidate,
  onOffer: handleOffer,
  onLeave: handleLeave
});

/**
 * handle info event from server that is user data
 * @param {string} users
 */
function handleInfo(users) {
  //clear list
  while (clientList.firstChild) {
    clientList.firstChild.remove();
  }
  while (robotCardContainer.firstChild) {
    robotCardContainer.firstChild.remove();
  }
  // add user or robot
  users.forEach(u => {
    if (u.toLowerCase().indexOf("robot") !== -1) {
      addRobotCard(u, "no description at this time");
    } else {
      const inhtml = `
        <li>
          <a ${u.includes(clientName)?'class="is-active"':''}>
            <span class="icon is-medium">
              <i class="mdi mdi-24px mdi-account-arrow-right"></i>
            </span>
            ${u}
          </a>
        </li>`;
      const el = htmlToElement(inhtml);
      clientList.append(el); 
    }
  });
}

/**
 * signal server response to logging in
 * @param {bool} success
 */
function handleLogin(success) {
  if (success === false) {
    alert("oops...try a different username");
  } else {
    // create a config and then use to instansiate a peer connection
    LOGGED_IN = true;
    setupPeer();
  }
}

/**
 * handle when offer is sent back from signal server
 * @param {string} offer the webrtc offer gobbledegook
 * @param {string} name uid of other party to connect to
 */
function handleOffer(offer, name) {
  console.log("GOT OFFER!");
  selectedRobot = name;
  pc.setRemoteDescription(offer);
  offerSDP.textContent = offer.sdp;

  pc.createAnswer(
    function(answer) {
      pc.setLocalDescription(answer);

      send({
        type: "answer",
        answer: answer
      });
    },
    function(error) {
      alert("oops...error");
    }
  );
}

/**
 * get answer from offer sent to other party
 * @param {string} answer
 */
function handleAnswer(answer) {
  console.log("GOT ANSWER", answer);
  console.log(answer.sdp);
  answerSDP.textContent = answer.sdp;
  pc.setRemoteDescription(answer).then(()=>{
    console.log("Remote Description set")
  });
}

/**
 * whenever a potential connection candidate is returned
 * @param {string} candidate
 */
function handleCandidate(candidate) {
  console.log("got candidate: ", candidate);
  if (candidate.candidate.length > 2) {
    pc.addIceCandidate(new RTCIceCandidate(candidate));
  }
}



function handleConnect() {
  console.log("SS connection open");
  addNotification("Connected to signal server", "is-success");
  signalServerStatus.classList.remove("has-text-warning");
  signalServerStatus.classList.add("has-text-success");
  signalServerStatus.childNodes[1].classList.remove("mdi-cloud-alert");
  signalServerStatus.childNodes[1].classList.add("mdi-cloud-check");
  //signalServerStatus.childNodes[1].innerHTML = 'signal server connected';
}

function handleDisconnect() {
  console.log("SS connection closed");
  addNotification("Disconnected from signal server");
  signalServerStatus.classList.remove("has-text-success");
  signalServerStatus.classList.add("has-text-warning");
  signalServerStatus.childNodes[1].classList.remove("mdi-cloud-check");
  signalServerStatus.childNodes[1].classList.add("mdi-cloud-alert");
  //signalServerStatus.childNodes[1].innerHTML = 'signal server disconnected';
}

function handleError(err) {
  console.error("Got error", err);
  signalServerStatus.classList.remove("has-text-success");
  signalServerStatus.classList.add("has-text-danger");
  signalServerStatus.childNodes[1].classList.remove("mdi-cloud-check");
  signalServerStatus.childNodes[1].classList.add("mdi-cloud-alert");
  //signalServerStatus.childNodes[1].innerHTML = 'signal server error';
  addNotification(`Signal Server Error: ${err}`);
}

function handleLeave(data){
  if (data.name === selectedRobot && selectedRobot !== undefined){
    closeModal();
    addNotification(`${selectedRobot} suddenly disconnected...`)
  }
}



// begin things
setupJoystick(true);
setupGamepad();
ssc.connect();

