import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import jQuery from 'jquery'
import {inject as service} from '@ember/service';

export default class MainpageComponent extends Component {
    @service ('websockets') websockets;
    @tracked status = "Wait for Customer to Connect";
    @tracked loginpage = true;
    @tracked chatpage = false;
    @tracked date = null;
    @tracked canDisconnect = true;
    @tracked canSend = true;
    @tracked textInput="";
    @tracked name = null;
    @tracked onchat= null;
    @tracked to = [];

    isAgent = "true";
    conn = null;
    time = null;
    //When agent clicks Signin button
    @action onLogin() {
        if(this.nameInput != undefined && this.passwordInput != undefined) {
            setInterval(() => {
                var d = new Date();    
                this.date = d.toDateString(); 
                this.time = d.getHours()+":"+d.getMinutes();
            }, 1000);
            this.sendReq();
        } else {
            alert("Fill all the fields");
            location.reload();
        }
    }
    //When agent clicks Logout button
    @action onLogout() {
        this.conn.close();
        location.reload();
    }
    //When agent clicks Send button
    @action onSend(sendChat) {
        if(sendChat != null) {
            var val = this.textInput;
            if(val.length > 0) {
                this.textInput = "";
                let packet = {
                    type:"message",
                    isAgent:this.isAgent,
                    name:this.name,
                    to:sendChat,
                    message:val
                }
                this.insertMessagetoDOM(packet,true);
                this.sendData(packet);
            }
        } else {
            alert("Select a customer to send");
        }
    }
    //When agent wants to clear the messages
    @action onClear() {
        document.getElementById("messages").textContent = '';
    }
    //When agent clicks Disconnect button
    @action onDisconnect(disconnectChat) {
        if(disconnectChat != null) {
            let packet = {
                type:"leave",
                isAgent:this.isAgent,
                name:this.name,
                to:disconnectChat,
                message:"null"
            }
            this.sendData(packet);
        } else {
            alert("Select a customer to disconnect");
        }
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
    }
    //sends packet to the server
    sendData(packet) {
        this.conn.send(JSON.stringify(packet));
    }


    //When connected display the person connected to..
    handlelogin(sendto) {
        this.to = [...this.to,{
            sendto
        }];
        this.status = "";
        //once connected enable all buttons to access
        this.canDisconnect = false;
        this.canSend = false;
    }
    //if Customer disconnects then agent should be notified
    handleleave(data) {
        var i = this.to.length;
        while(i--) {
            if(this.to[i] && this.to[i].hasOwnProperty("sendto") && this.to[i]["sendto"] === data.to) {
                this.to.splice(i,1);
                this.to = [...this.to];                    
            }
        }
        if(this.to.length == 0) {
            this.status = "Wait for Customer to Connect";
            this.canDisconnect = true;
            this.canSend = true;
        }
        if(data.to != "null") {
            alert(data.to+": This User Left...");
        }
    }
    //ask agent whether he/she wants to connect to the customer
    handleask(toName) {
        var ask = window.confirm(toName+": This customer wants to connect with you");
        if(ask == true) {
            let packet = {
                type:"askresponse",
                isAgent:this.isAgent,
                name:this.name,
                to:toName,
                message:"yes"
            }
            this.sendData(packet);
        } else {
            console.log("You have given response as no");
            let packet = {
                type:"askresponse",
                isAgent:this.isAgent,
                name:this.name,
                to:toName,
                message:"no"
            }
            this.sendData(packet);
        }
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
            case "message":
            {
                this.insertMessagetoDOM(data,false);
                break;
            }
            case "ask":
            {
                this.handleask(data.to);
                break;
            }
            default:
            {
                console.log("No such case type exist");
                break;
            }
        }
    }

    onChat(toName) {
        this.onClear();
        this.onchat = toName;
    }
}
