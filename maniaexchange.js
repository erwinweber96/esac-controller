const Axios = require("axios");
const fs    = require('fs');

let ManiaExchange = {
  downloadMap: async function(map) {
    const response = await Axios({
      method: 'GET',
      url: `https://trackmania.exchange/maps/download/${map.id}`,
      responseType: 'stream'
    });
  
    response.data.pipe(fs.createWriteStream(`/var/volumes/maps/${map.id}.Map.Gbx`));
  
    return new Promise((resolve, reject) => {
      response.data.on('end', () => {
        resolve()
      });
  
      response.data.on('error', () => {
        reject()
      })
    });
  }  
};

module.exports = ManiaExchange;