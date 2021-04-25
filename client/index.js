import App from './application.js';
import Bus from './eventBus.js';
import Service from './serviceMessages.js';
export const serverUrl = 'https://messages-system-gita.herokuapp.com';
export const socket = new io(serverUrl);
const appliction = new App(new Bus() , new Service());