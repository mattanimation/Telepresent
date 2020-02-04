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

class SignalServerClient {
    serverURI = '';
    connectionAttempts = 0;
    max_connection_attempts = 5;
    is_connected = false;
    connection = null;

    constructor(serverURI, opts){
        this.serverURI = serverURI;
        console.log("opts", opts);
        Object.assign(this, opts);
    }

    connect(){
        const self = this;
        try {
        if (this.connectionAttempts <= this.max_connection_attempts){
            console.log(`attempting to connect to signal server: ${this.serverURI}`);
            this.connectionAttempts += 1;
            this.connection = new WebSocket(this.serverURI);
        }
        else{
            console.warn("Max connection attempts reached, no longer attempting to connect")
            return;
        }
        } catch (error) {
        console.error("failed to connect to signal server, will retry in 3 seconds.", error);
        this.connection = null;
        this.waitRetryConnect();
        } finally {

        if(this.connection !== null && this.connection !== undefined){
            /**
             * handles when connection to server is success
             */
            this.connection.onopen = () => {
                self.is_connected = true;
                //notify server on connection and request info
                self.send({ type: "info" });
                self.onConnect();
            };

            /**
             * hadnles when connection to server closed
             */
            this.connection.onclose = () => {
                self.is_connected = false;
                self.waitRetryConnect();
                self.onDisconnect();
            };

            /**
             * handles when connection to server has thrown an error
             */
            this.connection.onerror = (err) => {
                self.is_connected = false;
                self.waitRetryConnect();
                self.onError(err);
            };

            //handle messages from the server
            this.connection.onmessage = (message) => {
                console.log("Got message", message.data);
                const data = JSON.parse(message.data);

                switch (data.type) {
                    case "login":
                    self.onLogin(data.success);
                    break;
                    case "offer":
                    self.onOffer(data.offer, data.name);
                    break;
                    case "answer":
                    self.onAnswer(data.answer);
                    break;
                    case "candidate":
                    self.onCandidate(data.candidate);
                    break;
                    case "info":
                    self.onInfo(data.users);
                    break;
                    case "leave":
                    self.onLeave(data);
                    break;
                    case "error":
                        console.error(data)
                    break;
                    default:
                    break;
                }
            };
        }
        }
    }

    waitRetryConnect(wait_time=3000){
        console.log(`retrying in ${(wait_time / 1000)} seconds`)
        setTimeout(connect, wait_time);
    }

    send(message){
        this.connection.send(JSON.stringify(message));
    }

    onConnect(){}
    onDisconnect(){}
    onError(err){}
    onLogin(success){}
    onOffer(offer, name){}
    onAnswer(answer){}
    onCandidate(candidate){}
    onLeave(data){}
    onInfo(){}

}