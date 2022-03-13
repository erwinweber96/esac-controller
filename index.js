const ManiaController   = require("./lib/client.js");
const WebSocket         = require('ws');
const express           = require('express');
const axios             = require('axios');
const fs                = require('fs');
const bodyParser        = require('body-parser');
const fileDownload      = require('js-file-download');
const maniaExchange     = require("./maniaexchange");
const EsacApi           = require("./esacApi");
const Config            = require("./config");
const ProcessListener   = require("./processListener");
const MatchData         = require("./matchData");
const RouterController  = require("./routerController");
const PortainerService  = require("./portainerService");
const MatchAlertService = require("./matchAlertService");
const InactivityCoundown = require("./inactivityCountdown");

const gameServer = new ManiaController();
const wss        = new WebSocket.Server({ port: Config.WSS_PORT });
const app        = express();

let xmlRpcWsClient = null;
let jsonParser = bodyParser.json();
var inactivityCheckTimeout = null;
var currentMapId = "Vergasse";
// RouterController.setGameServer(gameServer);

//TODO: load standby settings

process.on('uncaughtException', ProcessListener.uncaughtException(xmlRpcWsClient));
process.on('exit',              ProcessListener.onExit(xmlRpcWsClient));
process.on('SIGINT',            ProcessListener.onExit(xmlRpcWsClient));
process.on('SIGTERM ',          ProcessListener.onExit(xmlRpcWsClient));
process.on('SIGKILL ',          ProcessListener.onExit(xmlRpcWsClient));

// gameServer.connect(Config.DEDICATED_XML_PORT, Config.DEDICATED_IP);
// gameServer.addListeners();
// gameServer.query('Authenticate', [Config.DEDICATED_LOGIN, Config.DEDICATED_PASSWORD]);

function ping(ws) {
  ws.send(JSON.stringify({
    'ping': 'ping'
  }));
}

function pong(ws) {
  setTimeout(() => {
    ping(ws);
  }, 3000);
}

let ackTimeout = setTimeout(() => {
    console.log("initiated timeout");
    PortainerService.restartXmlRpcReceiver();
}, 5000);

wss.on('connection', function connection(ws) {
  xmlRpcWsClient = ws;
  RouterController.setXmlRpcWs(xmlRpcWsClient);
  InactivityCoundown.setXmlRpcWsClient(xmlRpcWsClient);
  ws.on('message', function incoming(message) {
    let response  = JSON.parse(message);
    if (response.type === "ACK") {
      clearTimeout(ackTimeout);
      console.log("ACK received.");
      addServer();
      ping(ws);
      return;
    }

    if (response.pong) {
      pong(ws);
      return;
    }

    let call      = response.call[0];
    let data      = response.call[1][0];
    let callbackData;

    switch(call) {
      case 'noPlayers':
        let message = 'Match cancelled: No players present at the start of the match.';
        console.log(message);

        MatchAlertService.createAlert(
            MatchData.getMatchId(),
            message,
            "secondary"
        );

        endMatch(message, true);
        break;
      case 'ManiaPlanet.PlayerInfoChanged':
        console.log('ManiaPlanet.PlayerInfoChanged');

        /**
         * @property {string} NickName
         * @property {string} Login
         */
        callbackData = data;

        if (!isAuthorized(callbackData.NickName)) {
          if (!callbackData.Login) {
            break;
          }

          console.log(`About to kick: ${callbackData.NickName} (${callbackData.Login})`);
          ws.send(JSON.stringify({
            'type': 'query',
            'data': {
              'query': 'Kick',
              'params': [callbackData.Login, "Not Authorized."]
            }
          }));

          break;
        } else {
          let found = false;
          MatchData.getPlayers().forEach(player => {
            if (player.Login === callbackData.Login) {
              found = true;
            }
          });
          if (!found) {
            MatchData.pushPlayer(callbackData);
          }
        }

        if (MatchData.getFormat().type === "Teams" && MatchData.isWarmup()) {
          ws.send(JSON.stringify({
            'type': 'query',
            'data': {
              'query': 'SetModeScriptSettings',
              'params': [{'S_UseClublinks': true}]
            }
          }));

          ws.send(JSON.stringify({
            'type': 'query',
            'data': {
              'query': 'SetForcedClubLinks',
              'params': [
                `https://club-link.evotm.workers.dev/?name=${encodeURIComponent(MatchData.getTeams()[0].teamName)}&primary=08f&secondary=fff&emblem=T1`,
                `https://club-link.evotm.workers.dev/?name=${encodeURIComponent(MatchData.getTeams()[1].teamName)}&primary=f60&secondary=fff&emblem=T2`
              ]
            }
          }));

          let whitelist = MatchData.getWhitelist();
          let teamId    = null;
          whitelist.forEach(player => {
            if (player.nickname === callbackData.NickName) {
              teamId = player.participantId;
            }
          });

          let targetTeam = null;
          MatchData.getTeams().forEach((team, index) => {
            if (team.participantId === teamId) {
              targetTeam = index;
            }
          });

          if (targetTeam !== null) {
            ws.send(JSON.stringify({
              'type': 'query',
              'data': {
                'query': 'ForcePlayerTeam',
                'params': [
                  callbackData.Login,
                  targetTeam
                ]
              }
            }));
          }
        }

        break;

      case "ManiaPlanet.EndMap":
        if (MatchData.isWarmup()) {
          console.log("Still warmup");
          break;
        }

        if (!MatchData.getRealWarmupStarted()) {
          console.log("Real warmup has not started yet");
          break;
        }

        MatchData.increaseNumberOfMapsPlayed();
        console.log(`Number of maps played: ${MatchData.getNumberOfMapsPlayed()}`);

        if (!MatchData.getMatchEndCondition().max_maps_played) {
          break;
        }

        if (MatchData.getNumberOfMapsPlayed() >= MatchData.getMatchEndCondition().max_maps_played) {
          let statusMsg = "Match ended. Kicking players.";
          endMatch(statusMsg);
        }

        break;

      case 'ManiaPlanet.ModeScriptCallbackArray':
        let callbackName = response.call[1][0];
        let rawCallbackData = response.call[1][1];
        switch(callbackName) {
          case "Maniaplanet.StartMap_Start":
            if (MatchData.isWaitingForModeScriptChange()) {
              MatchData.getMatchSettings().forEach(matchSetting => {
                // gameServer.query("SetModeScriptSettings", [matchSetting]);
                ws.send(JSON.stringify({
                  'type': 'query',
                  'data': {
                    'query': 'SetModeScriptSettings',
                    'params': [matchSetting]
                  }
                }));
                ws.send(JSON.stringify({
                  'type': 'query',
                  'data': {
                    'query': 'SetModeScriptSettings',
                    'params': [{'S_UseClublinks': true}]
                  }
                }));
              });

              MatchData.setWaitingForModeScriptChange(false);
              // gameServer.query("RestartMap", []);
              ws.send(JSON.stringify({
                'type': 'query',
                'data': {
                  'query': 'RestartMap',
                  'params': []
                }
              }));
              console.log("was waiting for mode script change and updated match settings");
            }

            break;

          case 'Maniaplanet.StartRound_Start':
            if (MatchData.isWarmup()) {
              break;
            }

            if (MatchData.getFormat().type !== "TimeAttack") {
              InactivityCoundown.clearTimeout();
              InactivityCoundown.setTimeout();
            }

            break;

          case 'Trackmania.Scores':
            if (MatchData.getFormat().type === "TimeAttack" || !MatchData.getMatchId()) {
              break;
            }

            if (MatchData.isWarmup()) {
              break;
            }

            /**
             * @property {array} players
             */
            callbackData = JSON.parse(rawCallbackData[0]);

            console.log({"trackmaniaScoresCB" : callbackData});
            console.log({"teamsScore": callbackData.teams});

            if (MatchData.getFormat().type === "Teams") {
              let results = callbackData.teams.map(team => {
                return {
                  teamName: team.name,
                  score: team.matchpoints
                }
              });
              console.log({'teamResults': results});
              EsacApi
                  .addResults(results, MatchData.getMatchId(), Config.TOKEN)
                  .then(() => {
                    console.log("Round Results added.")
                  }).catch(() => {
                    console.log("Could not add Round Results.")
                  });
            } else {
              let results = callbackData.players.map(player => {
                if (MatchData.getMatchEndCondition().points_reached) {
                  if (player.matchpoints >= MatchData.getMatchEndCondition().points_reached) {
                    MatchData.increaseNumberOfPlayersWithPointsReached();

                    if (MatchData.getNumberOfPlayersWithPointsReached() >=
                        MatchData.getMatchEndCondition().number_of_players_with_points_reached)
                    {
                      let statusMsg = "Match ended. Kicking players.";
                      endMatch(statusMsg);
                    }
                  }
                }

                return {
                  nickname: player.name,
                  score: player.matchpoints
                }
              });

              EsacApi
                  .addResults(results, MatchData.getMatchId(), Config.TOKEN)
                  .then(() => {
                    console.log("Round Results added.")
                  }).catch(() => {
                console.log("Could not add Round Results.")
              });
            }

            //reset to avoid double callbacks
            MatchData.setNumberOfPlayersWithPointsReached(0);

            break;

          case "Trackmania.WarmUp.End":
            if (!MatchData.getMatchId()) {
              break;
            }

            if (MatchData.getRealWarmupStarted()) {
              ws.send(JSON.stringify({
                'type': 'endMatchIfServerEmpty',
                'data': {}
              }));
            }

            MatchData.setWarmup(false);
            //PRE/MATCH WU DIFFERENCE
            ws.send(JSON.stringify({
              'type': 'query',
              'data': {
                'query': 'SetModeScriptSettings',
                'params': [{'S_WarmUpDuration': 60}]
              }
            }));
            break;

          case "Trackmania.WarmUp.Start":
            MatchData.setWarmup(true);

            if (MatchData.getMatchId()) {
              MatchData.setRealWarmupStarted(true);

              MatchData.getMatchSettings().forEach(matchSetting => {
                ws.send(JSON.stringify({
                  'type': 'query',
                  'data': {
                    'query': 'SetModeScriptSettings',
                    'params': [matchSetting]
                  }
                }));
                ws.send(JSON.stringify({
                  'type': 'query',
                  'data': {
                    'query': 'SetModeScriptSettings',
                    'params': [{'S_UseClublinks': true}]
                  }
                }));
              });
            }

            break;

          case "ManiaPlanet.BeginMap":
            callbackData = JSON.parse(rawCallbackData[0]);

            if (!callbackData.FileName) {
              break;
            }

            let mapFileName = callbackData.FileName;
            currentMapId = mapFileName.split(".")[0];

            break;

          case "ManiaPlanet.EndMatch":
            if (!MatchData.getMatchId()) {
              break;
            }

            if (MatchData.isWarmup()) {
              break;
            }

            if (!MatchData.getRealWarmupStarted()) {
              console.log("Real warmup has not started yet");
              break;
            }

            let statusMsg = "Match ended. Kicking players.";
            endMatch(statusMsg);

            break;
          case "Trackmania.Event.WayPoint":
            if (!MatchData.getMatchId()) {
              break;
            }

            if (MatchData.getFormat().type !== "TimeAttack") {
              InactivityCoundown.clearTimeout();
              InactivityCoundown.setTimeout();
            }

            /**
             * @property {number} time
             * @property {number} racetime
             * @property {number} isendrace
             * @property {number} isendlap
             * @property {array} curlapcheckpoints
             * @property {string} login
             * @property {string} accountid
             * @type {any}
             */
            callbackData = JSON.parse(rawCallbackData[0]);

            let nickname = "";
            if ((callbackData.isendrace || callbackData.isendlap) && !MatchData.isWarmup()) {
              MatchData.getPlayers().forEach((player) => {
                if (player.Login === callbackData.login) {
                  let result = {
                    "nickname" : player.NickName,
                    "time" : callbackData.racetime,
                    "mapId": currentMapId
                  };

                  if (MatchData.getFormat().type !== "TimeAttack") {
                    EsacApi
                        .addTime([result], MatchData.getMatchId(), Config.TOKEN)
                        .then(() => {
                          console.log("Time Attack Results added.")
                        }).catch(() => {
                      console.log("Could not add Time Attack Results.")
                    });
                  } else {
                    EsacApi
                        .addResults([result], MatchData.getMatchId(), Config.TOKEN)
                        .then(() => {
                          console.log("Time Attack Results added.")
                        }).catch(() => {
                      console.log("Could not add Time Attack Results.")
                    });
                  }

                }
              });
            }

            break;
        }
    }
  });
});

app.post('/match', jsonParser, RouterController.startMatch());
app.put("/whitelist", jsonParser, RouterController.updateWhitelist());
app.get("/ping", jsonParser, RouterController.ping());
app.post('/cancel', jsonParser, RouterController.cancel());
app.listen(Config.PORT);

function isAuthorized(nickname) {
  if (!nickname) {
    return true;
  }

  let found = false;

  MatchData.getWhitelist().forEach(player => {
    if (player.nickname === nickname) {
      return found = true;
    }
  });

  return found;
}

function endMatch(msg, isCancelled = false) {
  if (MatchData.hasMatchEnded()) {
    console.log("end match x2 avoided 3Head");
    return;
  }

  console.log(msg);
  // gameServer.query("ChatSendServerMessage", [msg]);
  xmlRpcWsClient.send(JSON.stringify({
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
      .updateStatus(Config.MATCH_STATUS_ENDED, Config.SERVER_STATUS_LIVE, isCancelled)
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

function addServer() {
  EsacApi
      .addServer(Config.TOKEN, Config.PORT)
      .then(() => {
        console.log("Dedicated Controller added to API.");
      }).catch(error => {
        console.log(error);
        console.log("Could not add Dedicated Controller to API.");
        process.exit();
      })
}

function cancelForInactivity() {
    MatchAlertService.createAlert(
        MatchData.getMatchId(),
        "Match cancelled due to inactivity.",
        "secondary"
    );
    endMatch("Match cancelled due to inactivity.", true);
}