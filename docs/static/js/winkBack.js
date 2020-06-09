
/*
* Description: The basic idea is to send a get request to all possible IP addresses in 
* the local network. As the Browser can't figure out what is the local IPv4, Gateway or 
* Mask it will simply try brute force all possible IPs available. 
* Arguments:
*   scanInterval: defines how often a request will be sent. If this time is too smal the 
*     browser may crash or simply not reach the configured speed.
*   parallelWinks: defines how many requests will be waited at the same time. Without 
*     this the browser may crash. And it also doesn't guarantee the navigator will always 
*     run waiting the maximum number of requests, it will deppend on the browser and how 
*     it manages the code.
*   fetchTimeout: if this configuration is too fast it may miss the request, if is too 
*     long the browser may crash deppending on the other configurations.
*   debugMessages: if you with to see debug messages in the console se this yo true.
*
*/
class WinkSeeker {
  //Set private properties
  #scanInterval;
  #parallelWinks;
  #fetchTimeout;
  #debugMessages;
  #winkedBackIps;
  #loopInterval;

  constructor(
      scanInterval = 50,
      parallelWinks=256, 
      fetchTimeout=3000, 
      debugMessages=false
    ){
    this.#scanInterval = scanInterval;
    this.#parallelWinks = parallelWinks;
    this.#fetchTimeout = fetchTimeout;
    this.#debugMessages = debugMessages;
    this.#winkedBackIps = [];
    this.#loopInterval = false;
    this.countRequests = 0;
    this.lastConsoleMessage = "";
    this.mask = "255.255.255.0";
    this.gateway = "192.168.0.1";
  }

  get winkedBackIps(){
    return this.#winkedBackIps;
  }

  get progress(){
    return this.countRequests;
  }

  set subnetMask(val){
    this.mask=val;
  }

  set defaultGateway(val){
    this.gateway=val;
  }

  printToConsole(message){
    if(this.#debugMessages) console.log(message);
  }

  /*
  * Description: This function calls fetch and abots the promise after 
  * some timeout. Timeout can be configured by fetchTimeout.
  */
  fetchWithTimeout(ms, IP, fetchMode='cors') {
    let controller = new AbortController();
    let signal = controller.signal;
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        controller.abort();
        reject(new Error("timeout"));
      }, ms);
      fetch(IP, {mode:fetchMode,signal}).then(resolve, reject);
    });
  }

  _getBinaryFromIp(ip){
    let binIp=0;
    ip.split('.').forEach((e,i)=>{
      binIp |= e<<((3-i)*8);
    });
    return binIp;
  }
  _getIpFromBin(bin){
    return(
      String((bin>>(8*3))&0xff) + '.' +
      String((bin>>(8*2))&0xff) + '.' +
      String((bin>>(8*1))&0xff) + '.' +
      String(bin&0xff));
  }

  /*
  * Description: Ips are genereted over and over. To do that the _getNextIp
  * will roll the possible IPs according to the mask and gateway, iterating 
  * every call. It ignores the default gateways and sends a request to all 
  * ips in the range.
  */
  _getNextIp(){
    if( this.countRequests === 0 ) {
      this.startValue = this._getBinaryFromIp(this.gateway);
      this.maxCount = ~this._getBinaryFromIp(this.mask);
    }
    let ip = 'http://' + this._getIpFromBin(this.startValue+this.countRequests);
    this.countRequests++;
    if(this.countRequests >= this.maxCount){
      this.countRequests=0;
      this.stop();
    }
    return (ip);
  }

  /*
  * Description: A wink doesn't expect any spetial response. All status 
  * "200" will be considered a valid IP.
  * If you wish to change this function to directly access the response, 
  * keep in mind cors limitations.
  * Note that it just sends a GET request. Is possible to change the 
  * mode or other configurations in the function fetchWithTimeout, where 
  * fetch is actually called. 
  */
  winkTo(IP){
    this.printToConsole('winking to '+IP);
    this.#parallelWinks-=1;
    this.fetchWithTimeout(this.#fetchTimeout, IP)
    .then( response => {
      if (response.status !== 200) {
        this.#parallelWinks+=1;
        this.printToConsole(IP +': Looks like there was a problem. Status Code: ' +
          response.status);
        return;
      }
      this.printToConsole("Someone answered! IP: " + IP);
      this.#winkedBackIps.push(IP);
      //Code something here if you want to call a spetial handler
    })
    .catch(error => {
      if(error.toString() !== 'Error: timeout'){
        //If couldn't fetch try with no-cors. A silence means there is something
        fetch(IP, {mode:'no-cors'})
        .catch(error => {
          IP = ''
        });
        setTimeout(()=>{
          if(IP !== ''){
            this.#winkedBackIps.push(IP);
          }
        }, this.#fetchTimeout);
      }
      this.#parallelWinks+=1;
      this.printToConsole(IP +': '+ error.toString());
    })
  }

  _runLoop(){
    if(this.#parallelWinks > 0) this.winkTo(this._getNextIp());
  }

  start(ms = this.#scanInterval){
    if(!this.#loopInterval){
      this.printToConsole('Start winking at '+ ms + 'ms');
      this.#loopInterval = setInterval(()=>this._runLoop(), ms);
    }
    else {
      this.printToConsole('The method alread started, call stop then start again if you with to restart');
    }
  }

  stop(){
    if(this.#loopInterval !== false){
      this.printToConsole('Stop winking');
      clearInterval(this.#loopInterval);
      this.#loopInterval = false;
      this.countRequests = 0;
    }
    else{
      this.printToConsole('There is no current interval to be stopped');
    }
  }

  pause(){
    if(this.#loopInterval !== false){
      this.printToConsole('Pause winking');
      clearInterval(this.#loopInterval);
      this.#loopInterval = false;
    }
    else{
      this.printToConsole('There is no current interval to be paused');
    }
  }

}
