const Config = require("./config");
const MatchData = require("./matchData");
const maniaExchange = require("./maniaexchange");
const EsacApi = require("./esacApi");

let RouterController = {
    gameServer: null,
    xmlRpcWs: null,
    setGameServer: gameServer => {
        this.gameServer = gameServer;
    },
    setXmlRpcWs: ws => {
        this.xmlRpcWs = ws;
    },
    startMatch: () => {
        return (req, res) => {
            console.log(req.body);

            /**
             * @property {array} data.maps
             * @property {array} data.matchSettings
             * @property data.format
             * @property {array} data.participants
             * @property {int} data.matchId
             * @property data.matchEndCondition
             */
            let data = req.body;

            if (data.token !== Config.TOKEN) {
                res.statusMessage = "Not authorized.";
                res.status(400).end();
                return;
            }

            let maps          = data.maps;
            let matchSettings = data.matchSettings;
            let participants  = data.participants;

            MatchData.setFormat(data.format);
            MatchData.setMatchId(data.matchId);
            MatchData.setWhitelist(participants);
            MatchData.setMatchEndCondition(data.matchEndCondition);
            MatchData.setWaitingForModeScriptChange(true);
            MatchData.setMatchSettings(matchSettings);

            if (data.hasOwnProperty('teams')) {
                /**
                 *  teamName, participantId
                 */
                MatchData.setTeams(data.teams);
            }

            this.xmlRpcWs.send(JSON.stringify({
                'type': 'query',
                'data': {
                    'query': 'SetScriptName',
                    'params': [`Trackmania/TM_${MatchData.getFormat().type}_Online.Script.txt`]
                }
            }));

            //Remove standby map
            this.xmlRpcWs.send(JSON.stringify({
                'type': 'query',
                'data': {
                    'query': 'RemoveMap',
                    'params': ["Vergasse.Map.Gbx"]
                }
            }));

            let mapsDownloaded = 0;

            maps.forEach(map => {
                maniaExchange.downloadMap(map).then(() => {
                    this.xmlRpcWs.send(JSON.stringify({
                        'type': 'query',
                        'data': {
                            'query': 'AddMap',
                            'params': [`${map.id}.Map.Gbx`]
                        }
                    }));

                    mapsDownloaded++;

                    if (mapsDownloaded === maps.length) {
                        this.xmlRpcWs.send(JSON.stringify({
                            'type': 'query',
                            'data': {
                                'query': 'NextMap',
                                'params': []
                            }
                        }));
                    }
                });
            });

            if (MatchData.getFormat().type === "Teams") {
                this.xmlRpcWs.send(JSON.stringify({
                    'type': 'query',
                    'data': {
                        'query': 'SetModeScriptSettings',
                        'params': [{'S_UseClublinks': true}]
                    }
                }));
            }

            EsacApi
                .updateStatus(Config.MATCH_STATUS_LIVE, Config.SERVER_STATUS_LIVE)
                .then(() => {
                    console.log("Match status updated as live.");
                })
                .catch(() => {
                    //TODO: should something else be done here?
                    console.log("Could not update status as live.");
                });

            res.statusMessage = "Successfully configured match.";
            res.status(200).end();
        }
    },
    updateWhitelist: () => {
        return (req, res) => {
            let data = req.body;

            if (data.token !== Config.TOKEN) {
                res.statusMessage = "Not authorized.";
                res.status(400).end();
                return;
            }

            MatchData.setWhitelist(data.participants);

            res.statusMessage = "Successfully configured match.";
            res.status(200).end();
        }
    },
    ping: () => {
        return (req, res) => {
            res.statusMessage = "I am up.";
            res.status(200).end();
        }
    },
    cancel: () => {
        return (req, res) => {
            console.log("Cancelling match.");
            this.xmlRpcWs.send(JSON.stringify({
                'type': 'query',
                'data': {
                    'query': 'ChatSendServerMessage',
                    'params': ["Match cancelled."]
                }
            }));

            // LIVE because on exit is switching to ended. Different to debug easier.
            // Could make a process where we compare match server and game server.
            // Where not equal, there's a problem if it stays to long this way.
            EsacApi
                .updateStatus(Config.MATCH_STATUS_ENDED, Config.SERVER_STATUS_LIVE)
                .then(() => {
                    console.log("Updated Status to ENDED. Restarting server.");
                })
                .catch(() => {
                    console.log("Update Status failed. Restarting server.");
                })
                .finally(() => {
                    process.exit();
                });
        }
    }
};

module.exports = RouterController;