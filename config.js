let Config = {
    MATCH_STATUS_UPCOMING   : 1,
    MATCH_STATUS_LIVE       : 2,
    MATCH_STATUS_ENDED      : 3,

    SERVER_STATUS_OPEN        : 1,
    SERVER_STATUS_RESERVED    : 2,
    SERVER_STATUS_CONFIGURING : 3,
    SERVER_STATUS_PRE_MATCH   : 4,
    SERVER_STATUS_LIVE        : 5,
    SERVER_STATUS_CLOSED      : 6,

    JOIN_LINK : process.env.JOIN_LINK,

    PORT                : process.env.HTTP_PORT, //process.env.BACKEND_SERVER
    DEDICATED_XML_PORT  : process.env.DEDICATED_XML_PORT,
    DEDICATED_IP        : '127.0.0.1',
    TOKEN               : 'xxxxxxxxxxxxxxxxxx', //TODO: refactor if not esac.gg
    WSS_PORT            : process.env.WSS_PORT,
    ROOM_NAME           : process.env.ROOM_NAME,

    DEDICATED_LOGIN    : 'xxxxxxxxxxxxxxx', //TODO:
    DEDICATED_PASSWORD : 'xxxxxxxxxxxxx', //TODO:

    PORTAINER_USER : 'xxxxxxxxxxxxx', //TODO:
    PORTAINER_PASSWORD : 'xxxxxxxxxxxxx' //TODO:
};

module.exports = Config;