import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import jQuery from 'jquery'
import {inject as service} from '@ember/service';

export default class CustomerComponent extends Component {
    @service ('websockets') websockets;
    @tracked status = "Logged in";
    @tracked loginpage = true;
    @tracked chatpage = false;
    @tracked date = null;
    @tracked canDisconnect = true;
    @tracked canSend = true;
    @tracked textInput="";
    @tracked name = null;
    
    bot = false;
    isAgent = "false";
    conn = null;
    to = null;
    time = null;
    
    constructor() {
        super(...arguments);
        setInterval(() => {
            var d = new Date();    
            this.date = d.toDateString(); 
            this.time = d.getHours()+":"+d.getMinutes();
        }, 1000);
        this.notifyMe();
        window.addEventListener('focus',()=>{
            this.active = true;
        });
        window.addEventListener('blur',()=> {
            this.active = false;
        });
    }
    //When customer clicks Signin button
    @action onLogin() {
        if(this.nameInput != undefined && this.passwordInput != undefined) {
            this.sendReq();
        } else {
            alert("Fill all the fields");
            location.reload();
        }
    }
    //When customer clicks Send button
    @action onSend() {
        var val = this.textInput;
        if(val.length > 0) {
            this.textInput = "";
            let packet = {
                type:"message",
                isAgent:this.isAgent,
                name:this.name,
                to:this.to,
                message:val
            }
            this.insertMessagetoDOM(packet,true);
            if(this.bot == false) {
                this.sendData(packet);
            } else {
                console.log(val);
                this.conn.close();
                alert("Your issue is saved...");
                location.reload();
            }
        }
    }
    //When customer wants to clear the messages
    @action onClear() {
        document.getElementById("messages").textContent = '';
    }
    //When customer clicks Disconnect button
    @action onDisconnect() {
        this.conn.close();
        location.reload();
    }
    //When the message should be displayed to the chat area
    insertMessagetoDOM(packet,isFromMe) {
        console.log("Insert message to DOM ",packet,isFromMe);
        const chatArea = document.querySelector("#messages");
        let message = document.createElement('div');
        message.classList.add("message");
        if(isFromMe) {
            message.classList.add("message--mine");
        } else {
            message.classList.add("message--theirs");
        }
        let nameEl = document.createElement('div');
        nameEl.classList.add("message__name");
        var t = document.createTextNode(packet.name);
        nameEl.appendChild(t);
        let timeEl = document.createElement('small');
        timeEl.classList.add("form-text");
        timeEl.classList.add("time");
        var ti = document.createTextNode(this.time);
        timeEl.appendChild(ti);
        let nameCon = document.createElement('div');
        nameCon.classList.add("message__bubble");
        var msg = document.createTextNode(packet.message);
        nameCon.appendChild(msg);
        nameCon.appendChild(timeEl);
        message.appendChild(nameEl);
        message.appendChild(nameCon);
        chatArea.appendChild(message);
        chatArea.scrollTop = chatArea.scrollHeight - chatArea.clientHeight;
    }
    //Sends request to backend and receives response
    sendReq() {
        jQuery.ajax({
            url:"http://localhost:8080/CustomerAgent/login",
            type: "POST",
            contentType:"application/json; charset=utf-8",
            dataType:"json",
            data: JSON.stringify({
                "name":this.nameInput,
	            "password":this.passwordInput,
	            "isAgent": this.isAgent
            })
        }).then((response) => {
            console.log(response);
            //if Success then login and initialize the socket connection
            if(response == "SUCCESS") {
                this.name = this.nameInput;
                this.loginpage = false;
                this.chatpage = true;
                window.addEventListener('popstate', function (event) {
                    this.conn.close();
                    location.reload();
                });
                this.initialize();
            } else {
                alert("Invalid credentials");
                location.reload();
            }
        }).catch(function (error) {
            console.log(error);
        })
    }


    //Initialize the socket connection
    initialize() {
        const socket = this.websockets.socketFor('ws://localhost:8080/CustomerAgent/chat');
        let packet = {
            type:"login",
            isAgent:this.isAgent,
            name:this.name,
            to:"null",
            message:"null"
        }
        socket.on('open',() => {
            console.log("Connected to the server");
            this.conn = socket;
            //if connection is opened then send details to the server
            this.sendData(packet);
        });
        socket.on('close',function(){
            console.log("Socket is closed");
        });  
        //on receiving the message call the handler to handle the packet
        socket.on('message',(message) => {
            var data = JSON.parse(message.data);
            console.log(data);
            this.handler(data);
        });
            this.canDisconnect = false;
            this.status = "Wait for Agent to Connect";
    }
    //sends packet to the server
    sendData(packet) {
        this.conn.send(JSON.stringify(packet));
    }

    //When connected display the person connected to..
    handlelogin(toName) {
        //once connected enable all buttons to access
        this.to = toName;
        this.canDisconnect = false;
        this.canSend = false;
        this.status = "Connected to "+toName;
    }
    //if Agent leaves then customer should be informed and reload the page
    handleleave(data) {
        alert("Agent disconnected...\nTry back after some time");
        this.conn.close();
        location.reload();
    }
    //if no agents available to connect to the customer
    handlenouser() {
        if(this.isAgent == "false") {
            // alert("No agents available ...\nTry back after sometime");
            // this.conn.close();
            // location.reload();
            this.bot = true;
            this.canSend = false;
            this.to = "Bot";
            var txt = "Hi "+this.name+"...Thanks for waiting..We are sorry for your inconvenience..But currently there is no agent available online..Please type a detailed description of your issue..Our support agent will reply to your email as soon as possible";

            this.status = "Connected to ChatBot";
            let packet = {
                name:"Bot",
                message:txt
            }
            this.insertMessagetoDOM(packet,false);
        }
    }
    //if everyone rejected customer's request
    handlebusy() {
        if(this.isAgent == "false") {
            alert("Everyone rejected your request...\nTry back after sometime");
            this.conn.close();
            location.reload();
        }
    }
    //for incoming messages from agent
    handlemessage(data) {
        if (Notification.permission === "granted" && this.active == false) {
            var msg = data.name+": Sent you a message";
            var notification = new Notification(msg);
        }
        this.insertMessagetoDOM(data,false);
    }

    //Main handler which handles the incoming packet from the server
    handler(data) {
        switch(data.type) {
            case "connected":
            {
                this.handlelogin(data.to);
                break;
            }
            case "leave":
            {
                this.handleleave(data);
                break;
            }
            case "noagent":
            {
                this.handlenouser();
                break;
            }
            case "busy":
            {
                this.handlebusy();
                break;
            }
            case "message":
            {
                this.handlemessage(data);
                break;
            }
            default:
            {
                console.log("No such case type exist");
                break;
            }
        }
    }
    //Request permission to enable notifications
    notifyMe() {
        if (!("Notification" in window)) {
            alert("This browser does not support desktop notification");
        }
        else if (Notification.permission !== "denied") {
            Notification.requestPermission().then(function (permission) {
                if (permission === "granted") {
                    console.log("Notification is active");
                }
            });
        }
    }
}