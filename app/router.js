import EmberRouter from '@ember/routing/router';
import config from './config/environment';

export default class Router extends EmberRouter {
  location = config.locationType;
  rootURL = config.rootURL;
}

Router.map(function() {
    this.route('mainpage',{path:'/'});
    this.route('customer',{path:'/customer'});
    this.route('agent',{path:'/agent'});
});
