let MatchData = {
    whitelist           : [],
    matchId             : null,
    players             : [],
    /**
     *  teamName, participantId
     */
    teams               : [],
    /**
     * @property {string} type
     */
    format              : "",

    /**
     * @property {int} max_maps_played
     * @property {int} points_reached
     * @property {int} number_of_players_with_points_reached
     */
    matchEndCondition                 : {},
    warmup                            : true,
    numberOfMapsPlayed                : 0,
    numberOfPlayersWithPointsReached  : 0,
    waitingForModeScriptChange        : false,
    matchSettings                     : [],
    matchHasEnded                     : false,
    realWarmupStarted                 : false,
    clubLinksWereSet                  : false,

    getWhitelist: () => {
        return MatchData.whitelist;
    },
    setWhitelist: whitelist => {
        MatchData.whitelist = whitelist;
    },
    getMatchId: () => {
        return MatchData.matchId;
    },
    setMatchId: matchId => {
        MatchData.matchId = matchId;
    },
    getPlayers: () => {
        return MatchData.players;
    },
    setPlayers: players => {
        MatchData.players = players;
    },
    getFormat: () => {
        return MatchData.format;
    },
    setFormat: format => {
        MatchData.format = format;
    },
    getMatchEndCondition: () => {
        return MatchData.matchEndCondition;
    },
    setMatchEndCondition: matchEndCondition => {
        MatchData.matchEndCondition = matchEndCondition;
    },
    isWarmup: () => {
        return MatchData.warmup;
    },
    setWarmup: warmup => {
        MatchData.warmup = warmup;
    },
    getNumberOfMapsPlayed: () => {
        return MatchData.numberOfMapsPlayed;
    },
    setNumberOfMapsPlayed: numberOfMapsPlayed => {
        MatchData.numberOfMapsPlayed = numberOfMapsPlayed;
    },
    getNumberOfPlayersWithPointsReached: () => {
        return MatchData.numberOfPlayersWithPointsReached;
    },
    setNumberOfPlayersWithPointsReached: numberOfPlayersWithPointsReached => {
        MatchData.numberOfPlayersWithPointsReached = numberOfPlayersWithPointsReached;
    },
    pushPlayer: player => {
        MatchData.players.push(player);
    },
    increaseNumberOfMapsPlayed: () => {
        MatchData.numberOfMapsPlayed++;
    },
    increaseNumberOfPlayersWithPointsReached: () => {
        MatchData.numberOfPlayersWithPointsReached++;
    },
    isWaitingForModeScriptChange: () => {
        //TODO: this is not enough
        return MatchData.waitingForModeScriptChange;
    },
    setWaitingForModeScriptChange: value => {
        MatchData.waitingForModeScriptChange = value;
    },
    getMatchSettings: () => {
        return MatchData.matchSettings;
    },
    setMatchSettings: matchSettings => {
        MatchData.matchSettings = matchSettings;
    },
    hasMatchEnded: () => {
        return MatchData.matchHasEnded;
    },
    setMatchHasEnded: matchHasEnded => {
        MatchData.matchHasEnded = matchHasEnded;
    },
    getRealWarmupStarted: () => {
        return MatchData.realWarmupStarted;
    },
    setRealWarmupStarted: realWarmupStarted => {
        MatchData.realWarmupStarted = realWarmupStarted;
    },
    setTeams: teams => {
        MatchData.teams = teams;
    },
    getTeams: () => {
        return MatchData.teams;
    },
    wereClubLinksSet: () => {
        return MatchData.clubLinksWereSet;
    },
    setClubLinksSet: value => {
        this.clubLinksWereSet = value;
    }
};

module.exports = MatchData;