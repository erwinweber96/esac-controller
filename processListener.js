const EsacApi = require("./esacApi");
const Config = require("./config");
let ProcessListener = {
    onExit: (xmlRpcWsClient) => {
        try {
            xmlRpcWsClient.send(JSON.stringify({
                'type': 'restart'
            }));
        } catch (err) {
            console.log(err);
        }

        return () => {
            EsacApi
                .updateStatus(Config.MATCH_STATUS_ENDED, Config.SERVER_STATUS_CLOSED)
                .then(() => {
                    console.log("Successfully updated status as CLOSED.")
                })
                .catch(() => {
                    console.log("Could not update status as CLOSED.")
                })
                .finally(() => {
                    console.log("Exiting.")
                });
        }
    },
    uncaughtException: (xmlRpcWsClient) => {
        try {
            xmlRpcWsClient.send(JSON.stringify({
                'type': 'restart'
            }));
        } catch (err) {
            console.log(err);
        }

        return error => {
            console.log(error.stack);
        }
    }
};

module.exports = ProcessListener;