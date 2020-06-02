
//Utils----------------------------------------------------------------------------

function getSafeMessage(message){
  return String(message).replace(/[^a-zA-Z| |.|[0-9]]+/g, '');
}
function isMask(ip){
  let format = /^((\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.){3}(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])$/.test(ip)

  if(format){
    let val = w._getBinaryFromIp(ip)
    if(val == -1) return false
    for(bitcount = 0; bitcount<(8*4-1); bitcount++){
      if(((val>>bitcount+1) & 1) < ((val>>bitcount) & 1)){
        return false;
      }
    }
  }
  return format;
}
function isGateway(ip){
  return /^((\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.){3}(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])$/.test(ip)
}

//Single page responsiveness --------------------------------------------------------

let w = new WinkSeeker();

let filterForm = {
  progressBar: {
    enable: ()=>{document.getElementById("progressGroup").hidden = false},
    disable: ()=>{document.getElementById("progressGroup").hidden = true},
    setValue: (val)=>{$('#progress').attr('aria-valuenow', val).css('width', val+'%')},
    updateMessage: (message)=>{
      document.getElementById("progressMessage").innerHTML = getSafeMessage(message);
    }
  },
  updatePossibilities: ()=>{
    let p = ~w._getBinaryFromIp(filterForm.maskValue) -2;
    filterForm.possibilities = p;
    document.getElementById("prossibilities").innerHTML = String(p);
  },
  possibilities: 0,
  maskValue: '255.255.255.0',
  gatewayValue: '192.168.0.1',
  getMask: ()=>{
    let input = document.getElementById("maskFilterInput");
    input.value = (isMask(input.value) === false ? '255.255.255.0' : input.value);
    filterForm.maskValue = input.value;
    filterForm.updatePossibilities();
  },
  getGateway: ()=>{
    let input = document.getElementById("gatewayFilterInput");
    input.value = (isGateway(input.value) === false ? '192.168.0.1' : input.value);
    filterForm.gatewayValue = input.value;
    filterForm.updatePossibilities();
  },
  button: {
    setLabel: (message)=>{
      document.getElementById("btnStartStop").innerHTML = getSafeMessage(message);
    },
    onClick: ()=>{
      if(searchWindow.status === 'running'){
        searchWindow.stop();
      }
      else{
        w.subnetMask = filterForm.maskValue;
        w.defaultGateway = filterForm.gatewayValue;
        searchWindow.start();
      }
    }
  },
}

let searchWindow = {
  start: ()=>{
    w.start();
    searchWindow.status = 'running';
    searchWindow.enable();
    searchWindow.enableSearchSpinner();
    filterForm.progressBar.enable();
    searchWindow.element.scrollIntoView();
    filterForm.button.setLabel('Stop');
  },
  stop:  ()=>{
    w.stop();
    filterForm.button.setLabel('Start search');
    searchWindow.disableSearchSpinner();
    searchWindow.status = 'waiting';
    filterForm.progressBar.disable();
  },
  status: 'waiting',
  element: document.getElementById("searchWindow"),
  enableSearchSpinner: ()=>{document.getElementById("searchSpinner").hidden = false},
  disableSearchSpinner: ()=>{document.getElementById("searchSpinner").hidden = true},
  enable: ()=>{document.getElementById("searchWindow").hidden = false},
  disable: ()=>{document.getElementById("searchWindow").hidden = true},
  winkersTable: document.getElementById("winkResults"),
  resultsUpdate: (ipsList)=>{
    if(typeof this.nRows === 'undefined') this.nRows=0;
    if(this.nRows !== ipsList.length){
      console.log(ipsList);
      while(this.nRows<ipsList.length){
        searchWindow.winkersTable.innerHTML += "<tr><td><a href='"+ipsList[this.nRows]+"'>"+ipsList[this.nRows]+'</a></tr></td>';
        this.nRows+=1;
      }
    }
  },
}

//Application initializatino and loop -----------------------------------------------

function startApp(){
  filterForm.updatePossibilities();
  filterForm.progressBar.disable();
  searchWindow.disable();
}

function runAppLoop(){
  searchWindow.resultsUpdate(w.winkedBackIps);
  filterForm.progressBar.setValue(100*(w.progress/filterForm.possibilities));
  filterForm.progressBar.updateMessage('Sent ' + w.progress + ' requests');
  if(w.progress == 0)
    searchWindow.stop()
}

startApp();
setInterval(()=>runAppLoop(), 500);
