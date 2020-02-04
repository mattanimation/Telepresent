/**
 * Simple Signaling server to Telepresent webrtc connections
 */
const WebSocket = require('ws');

const PORT = process.env.PORT || 80;

const wss = new WebSocket.Server ({port: PORT}, ()=>{
    console.log("signal server alive on ", PORT)
}); 


//all connected to the server users 
const users = {};


//when a user connects to our sever 
wss.on('connection', (connection, req)=> {
   const ip = req.connection.remoteAddress;
   //if behing reverse proxy...
   // const rev_ip = req.headers['x-forwarded-for'].split(/\s*,\s*/)[0];
   console.log(`User connected: ${ip}`); // - ${rev_ip}`);

	
   //when server gets a message from a connected user
   connection.on('message', (message)=> { 
	
      let data; 
      let conn;
      //accepting only JSON messages 
      try {
         data = JSON.parse(message); 
      } catch (e) { 
         console.log("Invalid JSON"); 
         data = {}; 
      } 
		
      //switching type of the user message 
      switch (data.type) { 
         //when a user tries to login 
			
         case "login": 
            console.log("User logged", data.name); 
				
            //if anyone is logged in with this username then refuse 
            if(users[data.name]) { 
               sendTo(connection, { 
                  type: "login", 
                  success: false 
               }); 
            } else { 
               //save user connection on the server
               connection.name = data.name;
               users[connection.name] = connection; 
					
               sendTo(connection, { 
                  type: "login", 
                  success: true 
               });

               setTimeout(()=>{
                informUsers();
               },100);
               
            } 
				
            break; 
				
         case "offer": 
            //for ex. UserA wants to call UserB 
            console.log("Sending offer to: ", data.name); 
				
            //if UserB exists then send him offer details 
            conn = users[data.name];
				
            if(conn != null && conn != undefined) { 
               //setting that UserA connected with UserB 
               connection.otherName = data.name;
               conn.otherName = connection.name;
               console.log(`this connection ${connection.name} is going to talk with: ${connection.otherName}`)
               console.log(`${conn.name} is going to get an offer from ${connection.name}`)
					
               sendTo(conn, { 
                  type: "offer", 
                  offer: data.offer, 
                  name: connection.name 
               });
            } 
				
            break;  
				
         case "answer": 
            console.log("Sending answer to: ", data.name); 
            //for ex. UserB answers UserA 
            conn = users[data.name]; 
				
            if(conn != null) { 
               connection.otherName = data.name; 
               sendTo(conn, { 
                  type: "answer", 
                  answer: data.answer 
               }); 
            } 
				
            break;  
				
         case "candidate": 
            console.log("Sending candidate to:",data.name); 
            conn = users[data.name];  
				
            if(conn != null) { 
               sendTo(conn, { 
                  type: "candidate", 
                  candidate: data.candidate 
               });
            } 
				
            break;  
				
         case "leave": 
            console.log(`${data.name} is leaving...`); 
            conn = users[connection.otherName]; 
				
            //notify the other user so he can disconnect his peer connection 
            if(conn !== null && conn !== undefined) {
               
               sendTo(conn, { 
                  type: "leave",
                  name: data.name
               });
               conn.otherName = null;
               connection.otherName = null; 
            }  
				
            break;
        
        case "info":
            broadcast({
                type: 'info',
                users: Object.keys(users)
            })
            break;
				
         default: 
            sendTo(connection, { 
               type: "error", 
               message: "Command not found: " + data.type 
            }); 
				
            break; 
      }  
   });  
	
   //when user exits, for example closes a browser window 
   //this may help if we are still in "offer","answer" or "candidate" state 
   connection.on("close", ()=> { 
      if(connection.name !== undefined) { 
         console.log(`${connection.name} closed... ${connection.otherName} won't be happy`);
         if(connection.otherName) { 
            console.log("Disconnecting from ", connection.otherName);
            const conn = users[connection.otherName];   
				
            if(conn !== null && conn !== undefined) {
               conn.otherName = null; 
               sendTo(conn, { 
                  type: "leave",
                  name: connection.name
               });
            }  
         }
         delete users[connection.name];
         informUsers();
      } 
   });

   connection.on("error", (err)=>{
      console.error(`${connection.name} error: ${err}`);
   })

   // tell everyone someone showed up except that connection
   informUsers(connection);
	
});


function informUsers(connection=null){
   broadcast({
      type: 'info',
      users: Object.keys(users)
   }, connection)
}

/**
 * sends message as json
 * @param {websocket} connection 
 * @param {object} message 
 */
function sendTo(connection, message) { 
   connection.send(JSON.stringify(message)); 
}

/**
 * send message to all connected parties
 * @param {object} message 
 * @param {websocket} ws 
 */
function broadcast(message, ws=null){
    wss.clients.forEach(c => {
      if (c.readyState === WebSocket.OPEN) {
         // skip client if it matches the connection passed in
         // behavior: send to all but that connection
         if (ws !== null && c === ws)
            return
         else
            sendTo(c, message);
      }
    })
}


// The signals we want to handle
// NOTE: although it is tempting, the SIGKILL signal (9) cannot be intercepted and handled
var signals = {
   'SIGHUP': 1,
   'SIGINT': 2,
   'SIGTERM': 15
 };
 
 // Do any necessary shutdown logic for our application here
 const shutdown = (signal, value) => {
   console.log("shutdown!");
   process.exit(128 + value);
 };
 
 // Create a listener for each of the signals that we want to handle
 Object.keys(signals).forEach((signal) => {
   process.on(signal, () => {
     console.log(`process received a ${signal} signal`);
     shutdown(signal, signals[signal]);
   });
 });
 