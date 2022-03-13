const MatchAlertService = require( "./matchAlertService");
const MatchData         = require("./matchData");
const EsacApi           = require("./esacApi");
const Config            = require("./config");

var inactivityCheckTimeout = null;

let InactivityCountdown = {
    inactivityCheckTimeout: null,
    xmlRpcWsClient: null,
    setXmlRpcWsClient: client => {
        InactivityCountdown.xmlRpcWsClient = client;
    },
    cancelForInactivity: () => {
        MatchAlertService.createAlert(
            MatchData.getMatchId(),
            "Match cancelled due to inactivity.",
            "secondary"
        );
        InactivityCountdown.endMatch("Match cancelled due to inactivity.");
    },
    setTimeout: () => {
        inactivityCheckTimeout = setTimeout(function() {
            MatchAlertService.createAlert(
                MatchData.getMatchId(),
                "Match cancelled due to inactivity.",
                "secondary"
            );
            InactivityCountdown.endMatch("Match cancelled due to inactivity.");
        }, 300000);
        console.log(`set timeout id: ${inactivityCheckTimeout}`);
    },
    clearTimeout: () => {
        console.log(`clearing timeout id: ${inactivityCheckTimeout}`);
        clearTimeout(inactivityCheckTimeout);
    },
    endMatch: msg => {
        if (MatchData.hasMatchEnded()) {
            console.log("end match x2 avoided 3Head");
            return;
        }

        console.log(msg);
        // gameServer.query("ChatSendServerMessage", [msg]);
        InactivityCountdown.xmlRpcWsClient.send(JSON.stringify({
            'type': 'query',
            'data': {
                'query': 'ChatSendServerMessage',
                'params': [msg]
            }
        }));
        // players.forEach((player) => {
        //   gameServer.query("Kick", [login, msg])
        // });

        // LIVE because on exit is switching to ended. Different to debug easier.
        // Could make a process where we compare match server and game server.
        // Where not equal, there's a problem if it stays to long this way.
        EsacApi
            .updateStatus(Config.MATCH_STATUS_ENDED, Config.SERVER_STATUS_LIVE, true)
            .then(() => {
                console.log("Updated Status to ENDED. Restarting server.");
            })
            .catch(() => {
                console.log("Update Status failed. Restarting server.");
            })
            .finally(() => {
                process.exit();
            });

        MatchData.setMatchHasEnded(true);
    }
};

module.exports = InactivityCountdown;