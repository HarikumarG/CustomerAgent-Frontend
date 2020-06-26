import Component from '@glimmer/component';
import { action, computed } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import jQuery from 'jquery'
import {inject as service} from '@ember/service';
import Validator from '../models/validator';
import Ember from 'ember';

export default class MainpageComponent extends Component {
    @service ('websockets') websockets;
    @tracked status = "Enter login credentials";
    conn = null;
    name = null;
    isAgent = null;
    alertbool = true;

    @action dropdown(value) {
        this.isAgentInput = value;
    }
    @action onLogin() {
        console.log(this.nameInput);
        console.log(this.passwordInput);
        console.log(this.isAgentInput);
        //this.sendReq();
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
                if(this.isAgentInput == "true") {
                    this.isAgent = true;
                } else {
                    this.isAgent = false;
                }
                this.initialize();
            } else {
                this.status = "Invalid credentials";
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
        this.status = "Connected to "+toName;
    }
    handleleave() {
        if(this.isAgent == true) {
            this.alertbool = true;
            this.status = "Wait for Customer to Connect";
        } else {
            alert("Agent disconnected...\nTry back after some time");
            location.reload();
        }
    }
    handlenouser() {
        if(this.isAgent == false) {
            alert("No user available ...\nTry back after sometime");
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
        var ask = confirm(toName+": This customer wants to connect with you");
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
                console.log(data);
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
