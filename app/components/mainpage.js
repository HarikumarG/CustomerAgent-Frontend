import Component from '@glimmer/component';
import { action, computed } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import jQuery from 'jquery'
import {inject as service} from '@ember/service';

export default class MainpageComponent extends Component {
    @service ('websockets') websockets;
    @tracked status = "Logged in";
    @tracked loginpage = true;
    @tracked chatpage = false;
    @tracked date = null;
    @tracked canDisconnect = true;
    @tracked canSend = true;
    @tracked textInput="";
    @tracked name = null;
    conn = null;
    isAgent = null;
    alertbool = true;
    to = null;
    time = null;

    @action dropdown(value) {
        this.isAgentInput = value;
    }
    @action onLogin() {
        if(this.nameInput != undefined && this.passwordInput != undefined && this.isAgentInput != undefined) {
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
            this.sendData(packet);
        }
    }
    @action onClear() {
        document.getElementById("messages").textContent = '';
    }
    @action onDisconnect() {
        if(this.isAgent == false) {
            this.conn.close();
        } else {
            let packet = {
                type:"leave",
                isAgent:this.isAgent,
                name:this.name,
                to:this.to,
                message:null
            }
            this.sendData(packet);
        }
    }
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
    sendReq() {
        jQuery.ajax({
            url:"http://localhost:8080/CustomerAgent/login",
            type: "POST",
            contentType:"application/json; charset=utf-8",
            dataType:"json",
            data: JSON.stringify({
                "name":this.nameInput,
	            "password":this.passwordInput,
	            "isAgent": this.isAgentInput
            })
        }).then((response) => {
            console.log(response);
            if(response == "SUCCESS") {
                this.name = this.nameInput;
                this.loginpage = false;
                this.chatpage = true;
                if(this.isAgentInput == "true") {
                    this.isAgent = true;
                } else {
                    this.isAgent = false;
                }
                this.initialize();
            } else {
                alert("Invalid credentials");
                location.reload();
            }
        }).catch(function (error) {
            console.log(error);
        })
    }


    initialize() {
        const socket = this.websockets.socketFor('ws://localhost:9090/');
        let packet = {
            type:"login",
            isAgent:this.isAgent,
            name:this.name,
            to:null,
            message:null
        }
        socket.on('open',() => {
            console.log("Connected to the server");
            this.conn = socket;
            this.sendData(packet);
        });
        socket.on('close',function(){
            console.log("Not connected to ther server");
        });  
        socket.on('message',(message) => {
            var data = JSON.parse(message.data);
            console.log(data);
            this.handler(data);
        });
        if(this.isAgent) {
            this.alertbool = true;
            this.status = "Wait for Customer to Connect";
        } else {
            this.status = "Wait for Agent to Connect";
        }
    }
    sendData(packet) {
        this.conn.send(JSON.stringify(packet));
    }


    handlelogin(toName) {
        this.alertbool = false;
        this.to = toName;
        this.canDisconnect = false;
        this.canSend = false;
        this.status = "Connected to "+toName;
    }
    handleleave() {
        if(this.isAgent == true) {
            this.alertbool = true;
            this.to = null;
            this.canDisconnect = true;
            this.canSend = true;
            this.status = "Wait for Customer to Connect";
        } else {
            alert("Agent disconnected...\nTry back after some time");
            location.reload();
        }
    }
    handlenouser() {
        if(this.isAgent == false) {
            alert("No agents available ...\nTry back after sometime");
            location.reload();
        }
    }
    handlebusy() {
        if(this.isAgent == false) {
            alert("Everyone rejected your request...\nTry back after sometime");
            location.reload();
        }
    }
    handleask(toName) {
        var ask = window.confirm(toName+": This customer wants to connect with you");
        if(ask == true && this.alertbool == true) {
            this.alertbool = false;
            let packet = {
                type:"askresponse",
                isAgent:this.isAgent,
                name:this.name,
                to:toName,
                message:"yes"
            }
            this.sendData(packet);
        } else {
            if(ask != true) {
                console.log("You have given response as no");
            } else if(this.alertbool == false) {
                alert("You already gave response as true");
            }
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


    handler(data) {
        switch(data.type) {
            case "connected":
            {
                this.handlelogin(data.to);
                break;
            }
            case "leave":
            {
                this.handleleave();
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
                console.log("No such handler");
                break;
            }
        }
    }
}
