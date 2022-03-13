const axios = require('axios');
const Config = require("./config");
const MatchData = require("./matchData");
const BASE_URL = "https://api.esac.gg/api/console/dedicated_controllers";

let EsacApi = {
    updateStatus: (matchStatus, serverStatus, isCancelled = false) => {
        return axios.default.put(BASE_URL+"/status", {
            "token"               : Config.TOKEN,
            "matchId"             : MatchData.getMatchId(),
            "matchStatusId"       : matchStatus,
            "controllerStatusId"  : serverStatus,
            "joinLink"            : Config.ROOM_NAME,
            "isCancelled"         : isCancelled
        });
    },
    addServer: (token, port) => {
        return axios.default.post(BASE_URL, {
            "token"     : token,
            "port"      : port
        });
    },
    addResults: (results, matchId, token) => {
        return axios.default.post(BASE_URL+"/results", {
            "results": results,
            "matchId": matchId,
            "token": token
        })
    },
    addTime: (time, nickname, matchId, mapId, token) => {
        return axios.default.post("https://api2.esac.gg/api/matches/time_results", {
            "time": time,
            "nickname": nickname,
            "matchId": matchId,
            "mapId": mapId,
            "token": token
        })
    }
};

module.exports = EsacApi;
