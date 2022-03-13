const axios = require('axios');
const Config = require("./config");

let MatchAlertService = {
    createAlert: async (matchId, message, type) => {
        return axios.post(`https://api.esac.gg/api/console/match_alerts`,{
            "token"  : Config.TOKEN,
            "matchId": matchId,
            "message": message,
            "type"   : type
        })
    }
};

module.exports = MatchAlertService;
